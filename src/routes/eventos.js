// routes/eventos.js
const express = require('express');
const router = express.Router();
const ListadoXlsx = require('../models/ListadoXlsx');

/**
 * Parsea el texto completo del QR y devuelve
 * { raw, correo, nombreCompleto, participaEn }
 */
function parseQr(raw) {
  if (!raw) return {};
  const text = String(raw).replace(/\r\n/g, '\n');

  const correoMatch = text.match(/Correo:\s*([^\s\n]+)/i);
  const correo = correoMatch ? correoMatch[1].trim() : null;

  const nombreMatch = text.match(/Nombre:\s*(.+)\n/i);
  const nombreCompleto = nombreMatch ? nombreMatch[1].trim() : null;

  const participaMatch = text.match(/Participa\s+en:\s*(.+)/i);
  const participaEn = participaMatch ? participaMatch[1].trim() : null;

  return { raw: text, correo, nombreCompleto, participaEn };
}

/**
 * Construye los eventos (COMTELCA, CUMBRE, DESAYUNO, ASAMBLEA)
 * a partir del registro de listado_xlsx
 */
function buildEventosFromRow(row) {
  const participaStr = (row.participacion || row.evento || '').toUpperCase();

  const map = [
    {
      key: 'COMTELCA',
      colFlag: 'comtelca',
      colCheck: 'checkin_comtelca',
      name: '160 Reunión Ordinaria Directiva COMTELCA'
    },
    {
      key: 'CUMBRE',
      colFlag: 'cumbre',
      colCheck: 'checkin_cumbre',
      name: 'Cumbre REGULATEL - ASIET - COMTELCA'
    },
    {
      key: 'DESAYUNO',
      colFlag: 'desayuno',
      colCheck: 'checkin_desayuno',
      name: 'Desayuno DIGI Americas: Inteligencia Artificial y Ciberseguridad'
    },
    {
      key: 'ASAMBLEA',
      colFlag: 'asamblea',
      colCheck: 'checkin_asamblea',
      name: '28 Asamblea Plenaria de REGULATEL'
    }
  ];

  const eventos = [];
  for (const cfg of map) {
    const registrado =
      (row[cfg.colFlag] && String(row[cfg.colFlag]).trim().toUpperCase() === 'X') ||
      participaStr.includes(cfg.key);

    const yaCheckin = !!row[cfg.colCheck];
    const checkinEn = yaCheckin ? row.ultima_lectura_qr : null;

    if (registrado || yaCheckin) {
      eventos.push({
        clave: cfg.key,
        nombre: cfg.name,
        registrado,
        yaCheckin,
        checkinEn
      });
    }
  }
  return eventos;
}

/**
 * Busca un participante en listado_xlsx usando correo o nombre
 */
async function buscarParticipante(infoQr) {
  let usuario = null;
  if (infoQr.correo) {
    usuario = await ListadoXlsx.findOne({ where: { correo: infoQr.correo } });
  }
  if (!usuario && infoQr.nombreCompleto) {
    usuario = await ListadoXlsx.findOne({
      where: { nombrecompleto: infoQr.nombreCompleto }
    });
  }
  return usuario;
}

/**
 * POST /api/eventos/preview
 * Body: { qr: "<texto completito del QR>" }
 * Devuelve datos del participante + eventos
 */
router.post('/preview', async (req, res) => {
  try {
    const textoQr = String(req.body.qr || '').trim();
    if (!textoQr) {
      return res.status(400).json({ ok: false, error: 'qr vacío' });
    }

    const infoQr = parseQr(textoQr);
    if (!infoQr.correo && !infoQr.nombreCompleto) {
      return res.status(400).json({
        ok: false,
        error: 'No se encontró correo ni nombre en el texto del QR'
      });
    }

    const usuario = await buscarParticipante(infoQr);
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        error: 'Participante no encontrado en listado_xlsx'
      });
    }

    // Actualizamos la última lectura
    usuario.ultima_lectura_qr = new Date();
    await usuario.save();

    const row = usuario.toJSON();
    const eventos = buildEventosFromRow(row);

    return res.json({
      ok: true,
      usuario: {
        nombreCompleto: row.nombrecompleto,
        correo: row.correo,
        organizacion: row.organizacion,
        tipoOrganizacion: row.tipo_de_organizacion,
        cargo: row.cargo,
        comtelca: row.comtelca,
        cumbre: row.cumbre,
        desayuno: row.desayuno,
        asamblea: row.asamblea,
        checkinComtelca: row.checkin_comtelca,
        checkinCumbre: row.checkin_cumbre,
        checkinDesayuno: row.checkin_desayuno,
        checkinAsamblea: row.checkin_asamblea,
        ultimaLecturaQr: row.ultima_lectura_qr,
        participaEn: row.participacion
      },
      eventos
    });
  } catch (err) {
    console.error('[POST /api/eventos/preview] Error:', err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/eventos/checkin
 * Body: { qr: "<texto qr>", evento: "COMTELCA|CUMBRE|DESAYUNO|ASAMBLEA" }
 */
router.post('/checkin', async (req, res) => {
  try {
    const textoQr = String(req.body.qr || '').trim();
    const claveEvento = String(req.body.evento || '').toUpperCase().trim();

    if (!textoQr || !claveEvento) {
      return res.status(400).json({
        ok: false,
        error: 'qr y evento son obligatorios'
      });
    }

    const infoQr = parseQr(textoQr);
    if (!infoQr.correo && !infoQr.nombreCompleto) {
      return res.status(400).json({
        ok: false,
        error: 'No se encontró correo ni nombre en el texto del QR'
      });
    }

    const usuario = await buscarParticipante(infoQr);
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        error: 'Participante no encontrado'
      });
    }

    const mapCols = {
      COMTELCA: 'checkin_comtelca',
      CUMBRE: 'checkin_cumbre',
      DESAYUNO: 'checkin_desayuno',
      ASAMBLEA: 'checkin_asamblea'
    };
    const colCheck = mapCols[claveEvento];

    if (!colCheck) {
      return res.status(400).json({
        ok: false,
        error: 'Evento inválido'
      });
    }

    // Si ya tiene check-in, no repetimos
    if (usuario[colCheck]) {
      return res.json({
        ok: true,
        status: 'already_checked_in',
        evento: claveEvento,
        fecha: usuario.ultima_lectura_qr
      });
    }

    // Marcamos check-in
    usuario[colCheck] = 1;
    usuario.ultima_lectura_qr = new Date();
    await usuario.save();

    return res.json({
      ok: true,
      status: 'checked_in',
      evento: claveEvento,
      fecha: usuario.ultima_lectura_qr
    });
  } catch (err) {
    console.error('[POST /api/eventos/checkin] Error:', err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

module.exports = router;
