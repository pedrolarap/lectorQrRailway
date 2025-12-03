import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { query } from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || '';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middlewares
app.use(helmet());
app.use(express.json({ limit: '512kb' }));
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, credentials: false }));

// Auth muy simple por API-KEY (Header: x-api-key)
app.use((req, res, next) => {
  if (!API_KEY) return next(); // sin API_KEY, no validamos (útil en pruebas)
  const key = req.header('x-api-key');
  if (key !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'qr-events-api', time: new Date().toISOString() });
});

/**
 * POST /api/lookup
 * Body: { qr: string }
 * Responde: datos del asistente y lista de eventos permitidos.
 */
app.post('/api/lookup', async (req, res) => {
  try {
    const { qr } = req.body || {};
    if (!qr || typeof qr !== 'string') {
      return res.status(400).json({ ok: false, error: 'qr es requerido' });
    }

    const attendee = await query(
      `SELECT id, full_name, document_id, qr_code, active
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
        qr_code: attendee[0].qr_code
      },
      events
    });
  } catch (err) {
    console.error('[lookup] error:', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

/**
 * POST /api/checkin
 * Body: { qr: string, event_id: number, gate?: string }
 * Valida permiso; si no hay check-in previo, lo registra. Devuelve estado.
 */
app.post('/api/checkin', async (req, res) => {
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
        scanned_at: exists[0].scanned_at
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

app.listen(PORT, () => {
  console.log(`QR API escuchando en :${PORT}`);
});
