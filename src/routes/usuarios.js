// routes/usuarios.js
const express = require('express');
const router = express.Router();
const ListadoXlsx = require('../models/ListadoXlsx');
const QRCode = require('qrcode'); // 👈 NUEVO: para generar códigos QR

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

// Función helper para construir el payload del QR
// ⚠️ Aquí usamos SOLO el correo, para que tu escáner pueda seguir
// usando ese valor y llamar a /api/eventos/preview con { qr: correo }.
function buildQrPayloadFromUsuario(usuarioRow) {
  return usuarioRow.correo;
}

// Función helper para generar DataURL de QR (para respuestas JSON)
async function generateQrDataUrl(payload) {
  // Puedes ajustar tamaño / margen si quieres
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    scale: 8
  });
}

// Función helper para generar buffer PNG de QR (para descargas)
async function generateQrPngBuffer(payload) {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 1,
    scale: 8
  });
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
// GET /api/usuarios/:correo/qr.png  -> genera y devuelve el PNG del QR
// Usa el correo como payload del QR
// =======================================================
router.get('/:correo/qr.png', async (req, res) => {
  try {
    const correoParam = decodeURIComponent(req.params.correo);

    const usuario = await ListadoXlsx.findOne({ where:{ correo: correoParam } });
    if (!usuario) {
      return res.status(404).json({ ok:false, error:'Usuario no encontrado' });
    }

    const qrPayload = buildQrPayloadFromUsuario(usuario); // normalmente el correo
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
      // NUEVO: check-ins manuales
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
      // guardar check-ins (0/1)
      checkin_comtelca:  checkinComtelca  ? 1 : 0,
      checkin_cumbre:    checkinCumbre    ? 1 : 0,
      checkin_desayuno:  checkinDesayuno  ? 1 : 0,
      checkin_asamblea:  checkinAsamblea  ? 1 : 0,
    });

    const usuarioJson = nuevo.toJSON();
    const usuarioDto  = mapRowToUsuario(usuarioJson);

    // 👉 Payload del QR (el texto que se codifica en el código)
    const qrPayload = buildQrPayloadFromUsuario(usuarioJson);

    // 👉 DataURL del QR para usarlo directamente en el frontend (<img src="...">)
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    // 👉 URL para descargar el PNG desde la API
    const downloadUrl = `/api/usuarios/${encodeURIComponent(correo)}/qr.png`;

    res.status(201).json({
      ok: true,
      usuario: usuarioDto,
      qr: {
        payload: qrPayload,
        dataUrl: qrDataUrl,
        downloadUrl
      }
    });
  } catch (err) {
    console.error('[POST /api/usuarios] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

// =======================================================
// PUT /api/usuarios/:correo  -> editar existente
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
      // NUEVO: check-ins manuales
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

    // guardar check-ins
    if (checkinComtelca !== undefined) usuario.checkin_comtelca  = checkinComtelca  ? 1 : 0;
    if (checkinCumbre   !== undefined) usuario.checkin_cumbre    = checkinCumbre    ? 1 : 0;
    if (checkinDesayuno !== undefined) usuario.checkin_desayuno  = checkinDesayuno  ? 1 : 0;
    if (checkinAsamblea !== undefined) usuario.checkin_asamblea  = checkinAsamblea  ? 1 : 0;

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

