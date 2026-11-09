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

-- Qué quiere lograr cada persona en el diagnóstico (página pública). ref = id aleatorio de la visita.
-- respuestas = JSON {pregunta: opción}; email y nombre se rellenan si luego deja su correo con ese ref.
CREATE TABLE IF NOT EXISTS objetivos (
  ref        TEXT PRIMARY KEY,
  creado     INTEGER NOT NULL,
  sexo       TEXT NOT NULL,
  fallo      TEXT NOT NULL,
  respuestas TEXT NOT NULL,
  pagina     TEXT,
  email      TEXT,
  nombre     TEXT
);
