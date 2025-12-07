// routes/usuarios.js
const express = require('express');
const router = express.Router();
const ListadoXlsx = require('../models/ListadoXlsx');
const QRCode = require('qrcode'); // para generar códigos QR

// =======================================================
// HELPERS
// =======================================================

// Función helper para armar el objeto de respuesta de usuario
function mapRowToUsuario(row) {
  return {
    nombreCompleto: row.nombrecompleto,
    correo: row.correo,
    pais: row.pais,
    origen: row.origen,
    cargo: row.cargo,
    organizacion: row.organizacion,
    tipo_de_organizacion: row.tipo_de_organizacion,

    comtelca: row.comtelca,
    cumbre: row.cumbre,
    desayuno: row.desayuno,
    asamblea: row.asamblea,

    participaEn: row.participacion || row.evento,
    checkinComtelca: row.checkin_comtelca,
    checkinCumbre: row.checkin_cumbre,
    checkinDesayuno: row.checkin_desayuno,
    checkinAsamblea: row.checkin_asamblea,
    ultimaLecturaQr: row.ultima_lectura_qr
  };
}

// Asegúrate de que en tu modelo/tabla exista una columna TEXT llamada `qr_payload`
// para guardar el contenido textual del QR (el JSON).

// Extrae eventos a partir de flags/participación
function extractEventosFromSource({
  comtelca,
  cumbre,
  desayuno,
  asamblea,
  participacion,
  evento
}) {
  const eventos = [];
  const participaStr = String(participacion || evento || '').toUpperCase();
  const isX = (v) => String(v || '').trim().toUpperCase() === 'X';

  if (isX(comtelca) || participaStr.includes('COMTELCA')) eventos.push('COMTELCA');
  if (isX(cumbre)   || participaStr.includes('CUMBRE'))   eventos.push('CUMBRE');
  if (isX(desayuno) || participaStr.includes('DESAYUNO')) eventos.push('DESAYUNO');
  if (isX(asamblea) || participaStr.includes('ASAMBLEA')) eventos.push('ASAMBLEA');

  return eventos;
}

// Construir el payload textual del QR a partir de los datos de usuario
// 👉 Aquí metemos nombre, correo, país, origen y eventos.
function buildQrPayload({ nombreCompleto, correo, pais, origen, eventos }) {
  const payloadObj = {
    nombre: nombreCompleto || '',
    correo: correo || '',
    pais: pais || null,
    origen: origen || null,
    eventos: Array.isArray(eventos) ? eventos : []
  };

  // Usamos JSON para que sea parseable desde el front
  return JSON.stringify(payloadObj);
}

// Construir payload del QR a partir de un registro de la BD (Sequelize instance o JSON)
function buildQrPayloadFromUsuario(record) {
  const row = record.toJSON ? record.toJSON() : record;
  const usuarioDto = mapRowToUsuario(row);

  const eventos = extractEventosFromSource({
    comtelca: row.comtelca,
    cumbre: row.cumbre,
    desayuno: row.desayuno,
    asamblea: row.asamblea,
    participacion: row.participacion,
    evento: row.evento
  });

  return buildQrPayload({
    nombreCompleto: usuarioDto.nombreCompleto,
    correo: usuarioDto.correo,
    pais: usuarioDto.pais,
    origen: usuarioDto.origen,
    eventos
  });
}

// Genera DataURL de QR (para respuestas JSON)
async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    scale: 8
  });
}

// Genera buffer PNG de QR (para descargas)
async function generateQrPngBuffer(payload) {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 1,
    scale: 8
  });
}

// Garantiza que el registro tenga qr_payload; si no, lo genera y lo guarda.
async function ensureQrPayloadForUsuario(instance) {
  if (instance.qr_payload) {
    return instance.qr_payload;
  }
  const qrPayload = buildQrPayloadFromUsuario(instance);
  instance.qr_payload = qrPayload;
  await instance.save();
  return qrPayload;
}

// =======================================================
// GET /api/usuarios  -> lista todos
// =======================================================
router.get('/', async (req, res) => {
  try {
    const rows = await ListadoXlsx.findAll({
      order: [['nombrecompleto', 'ASC']]
    });

    const list = rows.map(r => {
      const row = r.toJSON();
      return mapRowToUsuario(row);
    });

    res.json(list);
  } catch (err) {
    console.error('[GET /api/usuarios] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

// =======================================================
// GET /api/usuarios/:correo/qr.png
// -> devuelve PNG del QR
// -> si no existe qr_payload en BD, lo genera, lo guarda y luego lo usa
// =======================================================
router.get('/:correo/qr.png', async (req, res) => {
  try {
    const correoParam = decodeURIComponent(req.params.correo);

    const usuario = await ListadoXlsx.findOne({ where:{ correo: correoParam } });
    if (!usuario) {
      return res.status(404).json({ ok:false, error:'Usuario no encontrado' });
    }

    // Asegurarnos de tener qr_payload en la BD (lazy-generate)
    const qrPayload = await ensureQrPayloadForUsuario(usuario);
    const pngBuffer = await generateQrPngBuffer(qrPayload);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="qr_${encodeURIComponent(correoParam)}.png"`
    );
    return res.send(pngBuffer);
  } catch (err) {
    console.error('[GET /api/usuarios/:correo/qr.png] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

// =======================================================
// POST /api/usuarios  -> crear nuevo y devolver también el QR
// =======================================================
router.post('/', async (req, res) => {
  try {
    const {
      nombreCompleto,
      correo,
      pais,
      origen,
      cargo,
      comtelca,
      cumbre,
      desayuno,
      asamblea,
      // check-ins manuales
      checkinComtelca,
      checkinCumbre,
      checkinDesayuno,
      checkinAsamblea,
    } = req.body;

    if (!nombreCompleto || !correo) {
      return res.status(400).json({
        ok:false,
        error:'nombreCompleto y correo son obligatorios'
      });
    }

    const existe = await ListadoXlsx.findOne({ where:{ correo } });
    if (existe) {
      return res.status(409).json({ ok:false, error:'Ya existe un usuario con ese correo' });
    }

    // 1) Determinar eventos a partir de lo que viene del FRONT
    const eventos = extractEventosFromSource({
      comtelca,
      cumbre,
      desayuno,
      asamblea,
      participacion: null,
      evento: null
    });

    // 2) Construir payload del QR con los datos del FRONT
    const qrPayload = buildQrPayload({
      nombreCompleto,
      correo,
      pais,
      origen,
      eventos
    });

    // 3) Crear el registro en la BD (incluyendo qr_payload)
    const nuevo = await ListadoXlsx.create({
      nombrecompleto: nombreCompleto,
      correo,
      pais,
      origen,
      cargo,
      comtelca: comtelca ? 'X' : '',
      cumbre:   cumbre   ? 'X' : '',
      desayuno: desayuno ? 'X' : '',
      asamblea: asamblea ? 'X' : '',
      checkin_comtelca:  checkinComtelca  ? 1 : 0,
      checkin_cumbre:    checkinCumbre    ? 1 : 0,
      checkin_desayuno:  checkinDesayuno  ? 1 : 0,
      checkin_asamblea:  checkinAsamblea  ? 1 : 0,
      qr_payload: qrPayload, // 👈 guardamos el payload del QR en la BD
    });

    const usuarioJson = nuevo.toJSON();
    const usuarioDto  = mapRowToUsuario(usuarioJson);

    // 4) DataURL del QR para mostrar en el front
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    // 5) URL para descargar el PNG desde la API
    const downloadUrl = `/api/usuarios/${encodeURIComponent(correo)}/qr.png`;

    res.status(201).json({
      ok: true,
      usuario: usuarioDto,
      qr: {
        payload: qrPayload,   // JSON con nombre, correo, pais, origen, eventos
        dataUrl: qrDataUrl,   // para <img src="...">
        downloadUrl           // para descarga
      }
    });
  } catch (err) {
    console.error('[POST /api/usuarios] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

// =======================================================
// PUT /api/usuarios/:correo  -> editar existente
//  - Actualiza datos del usuario
//  - Regenera y guarda el qr_payload con los datos actualizados
// =======================================================
router.put('/:correo', async (req, res) => {
  try {
    const correoParam = decodeURIComponent(req.params.correo);

    const usuario = await ListadoXlsx.findOne({ where:{ correo: correoParam } });
    if (!usuario) {
      return res.status(404).json({ ok:false, error:'Usuario no encontrado' });
    }

    const {
      nombreCompleto,
      correo,
      pais,
      origen,
      cargo,
      comtelca,
      cumbre,
      desayuno,
      asamblea,
      // check-ins manuales
      checkinComtelca,
      checkinCumbre,
      checkinDesayuno,
      checkinAsamblea,
    } = req.body;

    if (nombreCompleto !== undefined) usuario.nombrecompleto = nombreCompleto;
    if (correo        !== undefined) usuario.correo        = correo;
    if (pais          !== undefined) usuario.pais          = pais;
    if (origen        !== undefined) usuario.origen        = origen;
    if (cargo         !== undefined) usuario.cargo         = cargo;

    if (comtelca !== undefined) usuario.comtelca = comtelca ? 'X' : '';
    if (cumbre   !== undefined) usuario.cumbre   = cumbre   ? 'X' : '';
    if (desayuno !== undefined) usuario.desayuno = desayuno ? 'X' : '';
    if (asamblea !== undefined) usuario.asamblea = asamblea ? 'X' : '';

    if (checkinComtelca !== undefined) usuario.checkin_comtelca  = checkinComtelca  ? 1 : 0;
    if (checkinCumbre   !== undefined) usuario.checkin_cumbre    = checkinCumbre    ? 1 : 0;
    if (checkinDesayuno !== undefined) usuario.checkin_desayuno  = checkinDesayuno  ? 1 : 0;
    if (checkinAsamblea !== undefined) usuario.checkin_asamblea  = checkinAsamblea  ? 1 : 0;

    // Guardamos primero los cambios
    await usuario.save();

    // Regenerar y actualizar el payload del QR con los datos actualizados
    const qrPayload = buildQrPayloadFromUsuario(usuario);
    usuario.qr_payload = qrPayload;
    await usuario.save();

    const usuarioDto = mapRowToUsuario(usuario.toJSON());

    res.json({ ok:true, usuario: usuarioDto });
  } catch (err) {
    console.error('[PUT /api/usuarios/:correo] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

// =======================================================
// DELETE /api/usuarios/:correo  -> eliminar registro
// =======================================================
router.delete('/:correo', async (req, res) => {
  try {
    const correoParam = decodeURIComponent(req.params.correo);

    const usuario = await ListadoXlsx.findOne({ where:{ correo: correoParam } });
    if (!usuario) {
      return res.status(404).json({ ok:false, error:'Usuario no encontrado' });
    }

    await usuario.destroy();

    return res.json({
      ok: true,
      deleted: true,
      correo: correoParam
    });
  } catch (err) {
    console.error('[DELETE /api/usuarios/:correo] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

module.exports = router;
