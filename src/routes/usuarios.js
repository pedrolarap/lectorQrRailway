// routes/usuarios.js
const express = require('express');
const router = express.Router();

const ListadoXlsx = require('../models/ListadoXlsx');

// GET /api/usuarios
// Opcional: soporta ?limit=50&offset=0 para paginar
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 1000;   // máximo 1000 por defecto
    const offset = parseInt(req.query.offset, 10) || 0;

    const usuarios = await ListadoXlsx.findAll({
      limit,
      offset,
      order: [['nombreCompleto', 'ASC']],   // ordena por nombre
    });

    res.json({
      ok: true,
      count: usuarios.length,
      data: usuarios,
    });
  } catch (error) {
    console.error('[GET /api/usuarios] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'Error obteniendo usuarios',
      message: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

module.exports = router;
