// routes/eventos.js
const express = require('express');
const router = express.Router();

const ListadoXlsx = require('../models/ListadoXlsx');

// Lee el texto del QR que tú generaste
function parseQrText(qrText) {
  const data = {
    nombre: '',
    correo: '',
    pais: '',
    tipoOrganizacion: '',
    eventoPrincipal: '',
    eventosMarcados: '',   // string de "CUMBRE, DIGI AMERICAS (DESAYUNO)"
  };

  if (!qrText || typeof qrText !== 'string') return data;

  const lines = qrText.split('\n').map(l => l.trim());

  for (const line of lines) {
    if (line.startsWith('Nombre:')) {
      data.nombre = line.replace('Nombre:', '').trim();
    } else if (line.startsWith('Correo:')) {
      data.correo = line.replace('Correo:', '').trim();
    } else if (line.startsWith('País:')) {
      data.pais = line.replace('País:', '').trim();
    } else if (line.startsWith('Tipo de organización:')) {
      data.tipoOrganizacion = line.replace('Tipo de organización:', '').trim();
    } else if (line.startsWith('Evento a participar:')) {
      data.eventoPrincipal = line.replace('Evento a participar:', '').trim();
    } else if (line.startsWith('Participa en:')) {
      data.eventosMarcados = line.replace('Participa en:', '').trim();
    }
  }

  return data;
}

function normalizeEventoName(raw) {
  if (!raw) return '';
  const text = raw.toUpperCase();

  if (text.includes('COMTELCA') && !text.includes('CUMBRE')) {
    return 'COMTELCA';
  }
  if (text.includes('CUMBRE')) {
    return 'CUMBRE';
  }
  if (text.includes('DESAYUNO') || text.includes('DIGI AMERICAS')) {
    return 'DESAYUNO'; // nuestro alias interno para DIGI AMERICAS (DESAYUNO)
  }
  if (text.includes('ASAMBLEA')) {
    return 'ASAMBLEA';
  }
  return text;
}

/**
 * POST /api/eventos/checkin
 *
 * Body esperado:
 * {
 *   "qrText": "=== REGISTRO DE EVENTO ===\nNombre: ...",
 *   "eventoEscaneado": "COMTELCA"   // o CUMBRE, DIGI AMERICAS (DESAYUNO), ASAMBLEA
 * }
 */
router.post('/checkin', async (req, res) => {
  try {
    const { qrText, eventoEscaneado } = req.body;

    if (!qrText) {
      return res.status(400).json({ ok: false, error: 'qrText es requerido' });
    }

    const parsed = parseQrText(qrText);

    if (!parsed.correo) {
      return res.status(400).json({
        ok: false,
        error: 'El QR no contiene un correo válido',
      });
    }

    // Buscar a la persona en listado_xlsx por correo
    const persona = await ListadoXlsx.findOne({
      where: { correo: parsed.correo },
    });

    if (!persona) {
      return res.status(404).json({
        ok: false,
        error: 'Persona no encontrada en listado_xlsx',
        parsed,
      });
    }

    // Determinar qué evento marcar como asistiendo
    const eventoNorm = normalizeEventoName(eventoEscaneado);

    const updates = { ultimaLecturaQr: new Date() };

    switch (eventoNorm) {
      case 'COMTELCA':
        updates.checkinComtelca = true;
        break;
      case 'CUMBRE':
        updates.checkinCumbre = true;
        break;
      case 'DESAYUNO':
        updates.checkinDesayuno = true;
        break;
      case 'ASAMBLEA':
        updates.checkinAsamblea = true;
        break;
      default:
        // si no mandaste eventoEscaneado, no marcamos nada, solo devolvemos info
        break;
    }

    if (Object.keys(updates).length > 1) {
      await persona.update(updates);
    }

    // Además, devolvemos la lista de eventos donde la persona está registrada
    const registrados = parsed.eventosMarcados
      ? parsed.eventosMarcados
          .split(',')
          .map(e => e.trim())
          .filter(Boolean)
      : [];

    return res.json({
      ok: true,
      message: 'Check-in procesado correctamente',
      parsed,
      registrados,          // eventos que dice el QR "Participa en"
      dbRow: persona,       // registro actualizado de listado_xlsx
      eventoEscaneado: eventoNorm,
    });
  } catch (error) {
    console.error('[eventos/checkin] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'Error registrando participación',
      message: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

module.exports = router;
