// routes/usuarios.js
const express = require('express');
const router = express.Router();
const ListadoXlsx = require('../models/ListadoXlsx');

// GET /api/usuarios  -> lista todos
router.get('/', async (req, res) => {
  try {
    const rows = await ListadoXlsx.findAll({
      order: [['nombrecompleto', 'ASC']]
    });

    const list = rows.map(r => {
      const row = r.toJSON();
      return {
        nombreCompleto: row.nombrecompleto,
        correo: row.correo,
        pais: row.pais,
        origen: row.origen,                 // 👈 NUEVO
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
    });

    res.json(list);
  } catch (err) {
    console.error('[GET /api/usuarios] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

// POST /api/usuarios  -> crear nuevo
router.post('/', async (req, res) => {
  try {
    const {
      nombreCompleto,
      correo,
      pais,
      origen,           // 👈 NUEVO
      cargo,
      comtelca,
      cumbre,
      desayuno,
      asamblea,
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
      origen,          // 👈 NUEVO
      cargo,
      comtelca: comtelca ? 'X' : '',
      cumbre:   cumbre   ? 'X' : '',
      desayuno: desayuno ? 'X' : '',
      asamblea: asamblea ? 'X' : ''
    });

    res.status(201).json({ ok:true, usuario:nuevo.toJSON() });
  } catch (err) {
    console.error('[POST /api/usuarios] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

// PUT /api/usuarios/:correo  -> editar existente
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
      origen,          // 👈 NUEVO
      cargo,
      comtelca,
      cumbre,
      desayuno,
      asamblea,
    } = req.body;

    if (nombreCompleto !== undefined) usuario.nombrecompleto = nombreCompleto;
    if (correo        !== undefined) usuario.correo        = correo;
    if (pais          !== undefined) usuario.pais          = pais;
    if (origen        !== undefined) usuario.origen        = origen;   // 👈 NUEVO
    if (cargo         !== undefined) usuario.cargo         = cargo;

    if (comtelca !== undefined) usuario.comtelca = comtelca ? 'X' : '';
    if (cumbre   !== undefined) usuario.cumbre   = cumbre   ? 'X' : '';
    if (desayuno !== undefined) usuario.desayuno = desayuno ? 'X' : '';
    if (asamblea !== undefined) usuario.asamblea = asamblea ? 'X' : '';

    await usuario.save();

    res.json({ ok:true, usuario:usuario.toJSON() });
  } catch (err) {
    console.error('[PUT /api/usuarios/:correo] Error:', err);
    res.status(500).json({ ok:false, error:'Error interno del servidor' });
  }
});

module.exports = router;
