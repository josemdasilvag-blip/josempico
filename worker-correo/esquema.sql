-- Contactos de las series de correos (D1 «josepico-correo»).
-- inicio y ultimo en milisegundos; enviados = último correo mandado (0–8); baja = 1 si se dio de baja.
CREATE TABLE IF NOT EXISTS contactos (
  email    TEXT PRIMARY KEY,
  nombre   TEXT,
  sexo     TEXT NOT NULL,
  serie    TEXT NOT NULL,
  inicio   INTEGER NOT NULL,
  enviados INTEGER NOT NULL DEFAULT 0,
  ultimo   INTEGER,
  baja     INTEGER NOT NULL DEFAULT 0,
  token    TEXT NOT NULL UNIQUE
);
