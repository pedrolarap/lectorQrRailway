-- Crear BD (si aplica)
CREATE DATABASE IF NOT EXISTS qr_eventos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE qr_eventos;

-- Personas que portan tarjeta con QR
CREATE TABLE IF NOT EXISTS attendees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  document_id VARCHAR(64) NULL,
  qr_code VARCHAR(128) NOT NULL UNIQUE,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Eventos disponibles
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  location VARCHAR(150) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Permisos de acceso (muchos a muchos)
CREATE TABLE IF NOT EXISTS attendee_events (
  attendee_id INT NOT NULL,
  event_id INT NOT NULL,
  permitted TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (attendee_id, event_id),
  CONSTRAINT fk_ae_attendee FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
  CONSTRAINT fk_ae_event    FOREIGN KEY (event_id)    REFERENCES events(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Registro de escaneos / check-ins
CREATE TABLE IF NOT EXISTS scans (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  attendee_id INT NOT NULL,
  event_id INT NOT NULL,
  gate VARCHAR(120) NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_checkin (attendee_id, event_id),
  CONSTRAINT fk_s_attendee FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
  CONSTRAINT fk_s_event    FOREIGN KEY (event_id)    REFERENCES events(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Datos de ejemplo
INSERT INTO attendees (full_name, document_id, qr_code) VALUES
  ('Ana Pérez', '001-0000000-1', 'QR-ANA-001'),
  ('Luis Gómez', '001-0000000-2', 'QR-LUIS-002');

INSERT INTO events (name, starts_at, ends_at, location) VALUES
  ('Conferencia A', '2025-12-10 09:00:00', '2025-12-10 10:30:00', 'Salón 1'),
  ('Taller B',      '2025-12-10 11:00:00', '2025-12-10 13:00:00', 'Salón 2'),
  ('Panel C',       '2025-12-10 15:00:00', '2025-12-10 16:30:00', 'Auditorio');

INSERT INTO attendee_events (attendee_id, event_id, permitted)
SELECT a.id, e.id, 1
FROM attendees a
JOIN events e ON e.name IN ('Conferencia A', 'Panel C')
WHERE a.qr_code='QR-ANA-001';

INSERT INTO attendee_events (attendee_id, event_id, permitted)
SELECT a.id, e.id, 1
FROM attendees a
JOIN events e ON e.name IN ('Taller B')
WHERE a.qr_code='QR-LUIS-002';
