import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { query } from './db.js'; // Aseguramos que esta función use pool.execute

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || '';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middlewares
app.use(helmet());
app.use(express.json({ limit: '512kb' }));
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
    credentials: false,
  })
);

// --- Middleware de Auth Global ---
const checkGlobalApiKey = (req, res, next) => {
  if (!API_KEY) return next();
  const key = req.header('x-api-key');
  if (key !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
};

// Health (No requiere autenticación)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'qr-events-api', time: new Date().toISOString() });
});

// ----------------------------------------------------------------------------------
// RUTA CORREGIDA: /api/attendees
// Solución a ER_WRONG_ARGUMENTS y ER_PARSE_ERROR.
// ----------------------------------------------------------------------------------
/**
 * GET /api/attendees
 * Lista asistentes para la UI del generador (id, full_name, organization, qr_code).
 */
app.get('/api/attendees', async (req, res) => {
  try {
    // 1. Conversión de Tipos
    const active = typeof req.query.active === 'undefined' ? 1 : Number(req.query.active) ? 1 : 0;
    const q = (req.query.q || '').toString().trim();
    
    // Aseguramos que limit y offset sean números enteros
    const limit = Math.min(Math.max(parseInt(req.query.limit || '1000', 10), 1), 5000);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    // 2. Construcción Dinámica
    const params = [];
    const whereClauses = []; // Usamos un array para construir las condiciones

    // Condición 'active' (1 placeholder: ?)
    if (active === 0 || active === 1) {
      whereClauses.push('a.active = ?');
      params.push(active);
    }

    // Condición 'q' (3 placeholders: ?, ?, ?)
    if (q) {
      // búsqueda simple por nombre, organización o document_id
      whereClauses.push('(a.full_name LIKE ? OR a.organization LIKE ? OR a.document_id LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    // 3. Construcción de la cláusula WHERE y la consulta
    // Si hay condiciones, las unimos con ' AND ', sino, la dejamos vacía.
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // 4. Añadir Paginación (2 parámetros: LIMIT y OFFSET)
    params.push(limit, offset);

    // 5. Consulta final (sin indentación interna para evitar ER_PARSE_ERROR)
    const sqlQuery = `
SELECT a.id, a.full_name, a.organization, a.qr_code
FROM attendees a
${whereSql}
ORDER BY a.full_name IS NULL, a.full_name
LIMIT ? OFFSET ?
`;

    const rows = await query(sqlQuery, params);

    res.json(rows || []);
  } catch (err) {
    console.error('[attendees] error:', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});
// ----------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------
// RUTA PROTEGIDA (Se mantiene la API Key)
// ----------------------------------------------------------------------------------
/**
 * POST /api/attendees/ensure-qr
 * Genera qr_code (uuid sin guiones) para asistentes que no tengan.
 */
app.post('/api/attendees/ensure-qr', checkGlobalApiKey, async (req, res) => {
  try {
    const onlyActive = typeof req.body?.only_active === 'boolean' ? req.body.only_active : true;

    // ... (resto de la lógica de ensure-qr) ...
    // Asegurar que exista la columna qr_code
    await query(
      `CREATE TABLE IF NOT EXISTS __noop__ (id INT);` // no-op para asegurar conexión
    );
    const col = await query(
      `SELECT COUNT(*) AS n
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'attendees'
         AND COLUMN_NAME = 'qr_code'`
    );
    if (!col?.[0]?.n) {
      await query(`ALTER TABLE attendees ADD COLUMN qr_code VARCHAR(64) NULL`);
    }

    // Generar para faltantes
    const cond = onlyActive ? 'AND active = 1' : '';
    const result = await query(
      `
      UPDATE attendees
          SET qr_code = REPLACE(UUID(), '-', '')
        WHERE (qr_code IS NULL OR qr_code = '')
          ${cond}
      `
    );

    // Crear índice único si no existe
    const idx = await query(
      `SELECT COUNT(*) AS n
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'attendees'
         AND INDEX_NAME = 'uq_qr_code'`
    );
    if (!idx?.[0]?.n) {
      try {
        await query(`ALTER TABLE attendees ADD UNIQUE KEY uq_qr_code (qr_code)`);
      } catch {
        // si hay colisiones, las ignora; idealmente limpiar duplicados antes
      }
    }

    res.json({ ok: true, updated: result?.affectedRows ?? 0 });
  } catch (err) {
    console.error('[ensure-qr] error:', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// ----------------------------------------------------------------------------------
// RUTA PROTEGIDA (Se mantiene la API Key)
// ----------------------------------------------------------------------------------
/**
 * POST /api/lookup
 * Body: { qr: string }
 * Responde: datos del asistente y lista de eventos permitidos.
 */
app.post('/api/lookup', checkGlobalApiKey, async (req, res) => {
  try {
    const { qr } = req.body || {};
    if (!qr || typeof qr !== 'string') {
      return res.status(400).json({ ok: false, error: 'qr es requerido' });
    }

    const attendee = await query(
      `SELECT id, full_name, document_id, organization, qr_code, active
         FROM attendees
       WHERE qr_code = ?`,
      [qr]
    );

    if (attendee.length === 0) {
      return res.status(404).json({ ok: false, error: 'QR no encontrado' });
    }
    if (attendee[0].active !== 1) {
      return res.status(403).json({ ok: false, error: 'Asistente inactivo' });
    }

    const events = await query(
      `SELECT e.id, e.name, e.starts_at, e.ends_at, e.location, e.active,
               ae.permitted
         FROM attendee_events ae
         JOIN events e ON e.id = ae.event_id
        WHERE ae.attendee_id = ? AND ae.permitted = 1 AND e.active = 1
        ORDER BY e.starts_at IS NULL, e.starts_at`,
      [attendee[0].id]
    );

    res.json({
      ok: true,
      attendee: {
        id: attendee[0].id,
        full_name: attendee[0].full_name,
        document_id: attendee[0].document_id,
        organization: attendee[0].organization,
        qr_code: attendee[0].qr_code,
      },
      events,
    });
  } catch (err) {
    console.error('[lookup] error:', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// ----------------------------------------------------------------------------------
// RUTA PROTEGIDA (Se mantiene la API Key)
// ----------------------------------------------------------------------------------
/**
 * POST /api/checkin
 * Body: { qr: string, event_id: number, gate?: string }
 * Valida permiso; si no hay check-in previo, lo registra. Devuelve estado.
 */
app.post('/api/checkin', checkGlobalApiKey, async (req, res) => {
  const conn = await (await import('./db.js')).getConnection().catch(() => null);
  if (!conn) {
    return res.status(500).json({ ok: false, error: 'No hay conexión a la BD' });
  }

  try {
    const { qr, event_id, gate } = req.body || {};
    if (!qr || !event_id) {
      return res.status(400).json({ ok: false, error: 'qr y event_id son requeridos' });
    }

    await conn.beginTransaction();

    const [attendees] = await conn.execute(
      `SELECT id, full_name, active FROM attendees WHERE qr_code = ? FOR UPDATE`,
      [qr]
    );
    if (attendees.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: 'QR no encontrado' });
    }
    const attendee = attendees[0];
    if (attendee.active !== 1) {
      await conn.rollback();
      return res.status(403).json({ ok: false, error: 'Asistente inactivo' });
    }

    const [perm] = await conn.execute(
      `SELECT permitted FROM attendee_events WHERE attendee_id = ? AND event_id = ?`,
      [attendee.id, event_id]
    );
    if (perm.length === 0 || perm[0].permitted !== 1) {
      await conn.rollback();
      return res.status(403).json({ ok: false, error: 'No autorizado para este evento' });
    }

    // ¿Ya tiene check-in?
    const [exists] = await conn.execute(
      `SELECT id, scanned_at FROM scans WHERE attendee_id = ? AND event_id = ?`,
      [attendee.id, event_id]
    );
    if (exists.length > 0) {
      await conn.commit();
      return res.json({
        ok: true,
        status: 'already_checked_in',
        scanned_at: exists[0].scanned_at,
      });
    }

    await conn.execute(
      `INSERT INTO scans (attendee_id, event_id, gate) VALUES (?, ?, ?)`,
      [attendee.id, event_id, gate || null]
    );

    await conn.commit();
    return res.json({ ok: true, status: 'checked_in' });
  } catch (err) {
    console.error('[checkin] error:', err);
    try { await conn.rollback(); } catch {}
    res.status(500).json({ ok: false, error: 'Error interno' });
  } finally {
    try { conn.release(); } catch {}
  }
});
// ----------------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`QR API escuchando en :${PORT}`);
});