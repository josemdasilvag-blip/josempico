// Puente web → MailerLite + series de correos propias (josempico.com/api/suscribir).
// La web no puede llevar tokens (serían públicos): los guarda este Worker como secretos
// ML_TOKEN (MailerLite) y BREVO_KEY (envío). GRUPOS (variable) = JSON {clave: idDeGrupo}, de montar.py.
// DB (D1) = contactos de las series; esquema en esquema.sql. Correos en correos.js (correos-build.py).
//
// POST, cuerpo (JSON o formulario): email, nombre, sexo, origen ('diagnostico' | 'prueba'),
//   y según el origen: principal, secundario, reto  |  campo, resultado, momento, reto.
//   Entra en el grupo «diag_<principal>» o «prueba_<campo>» de MailerLite. Si viene del diagnóstico,
//   además empieza la serie de su resultado: correo 1 al momento, 2–8 los días 2, 4, …, 14.
// GET/POST ?baja=<token>: baja de la serie (enlace «Darme de baja» y List-Unsubscribe en un clic).
// Cron (wrangler.toml): manda los correos que tocan. Responde siempre JSON salvo la página de baja.

import CORREOS from './correos.js';

const ORIGENES = ['https://josempico.com', 'https://www.josempico.com'];
const API = 'https://connect.mailerlite.com/api';
const BREVO = 'https://api.brevo.com/v3/smtp/email';
const URL_BAJA = 'https://josempico.com/api/suscribir?baja=';
const REMITE = { name: 'Jose Pico', email: 'jose@josempico.com' };
const SERIE_DE = { P1: 'imagen', P2: 'perfil', P3: 'conversaciones', P4: 'cita', P5: 'retener',
  S: 'primer-perfil', ajuste: 'nada-roto' };
const ULTIMO = 8;              // correos por serie
const POR_RONDA = 30;          // tope de envíos por ejecución del cron (límite de subpeticiones)

function cors(origin) {
  const ok = ORIGENES.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } : {};
}

function json(data, status, extra) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

const corto = (v, n) => (v === undefined || v === null ? '' : String(v)).trim().slice(0, n || 120);
const escapa = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dia = ms => Math.floor(ms / 86400000);               // día natural (UTC)

// ---------- Series ----------

function correo(serie, n, sexo) {
  const s = CORREOS[serie] || {};
  return s[n + '-' + (sexo === 'm' ? 'M' : 'H')] || s[String(n)] || null;
}

async function enviar(env, c, n) {
  const plantilla = correo(c.serie, n, c.sexo);
  if (!plantilla) { console.log('Sin plantilla', c.serie, n, c.sexo); return false; }
  const baja = URL_BAJA + c.token;
  const nombre = (c.nombre || '').split(/\s+/)[0];
  const html = plantilla.html
    .replace(nombre ? '{$name}' : ' {$name}', nombre ? escapa(nombre) : '')
    .split('{$unsubscribe}').join(baja);
  const r = await fetch(BREVO, {
    method: 'POST',
    headers: { 'api-key': env.BREVO_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      sender: REMITE, replyTo: REMITE,
      to: [{ email: c.email, ...(nombre ? { name: nombre } : {}) }],
      subject: plantilla.asunto, htmlContent: html,
      headers: { 'List-Unsubscribe': '<' + baja + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      tags: ['serie-' + c.serie, 'correo-' + n]
    })
  });
  if (!r.ok) { console.log('Brevo', r.status, (await r.text()).slice(0, 300)); return false; }
  await env.DB.prepare('UPDATE contactos SET enviados = ?, ultimo = ? WHERE email = ?')
    .bind(n, Date.now(), c.email).run();
  return true;
}

async function empezarSerie(env, email, nombre, sexo, principal) {
  const serie = SERIE_DE[principal];
  if (!serie || !env.DB || !env.BREVO_KEY) return;
  const token = crypto.randomUUID().replace(/-/g, '');
  // Si ya estaba (repite el diagnóstico), no se reinicia ni se duplica.
  const r = await env.DB.prepare(
    'INSERT OR IGNORE INTO contactos (email, nombre, sexo, serie, inicio, enviados, baja, token) VALUES (?, ?, ?, ?, ?, 0, 0, ?)')
    .bind(email, nombre, sexo === 'm' ? 'm' : 'h', serie, Date.now(), token).run();
  if (!r.meta.changes) return;
  await enviar(env, { email, nombre, sexo, serie, token }, 1);
}

async function ronda(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM contactos WHERE baja = 0 AND enviados >= 1 AND enviados < ? ORDER BY inicio LIMIT 500')
    .bind(ULTIMO).all();
  const hoy = dia(Date.now());
  let mandados = 0;
  for (const c of results) {
    if (mandados >= POR_RONDA) break;
    // Correo n (n ≥ 2) el día 2·(n−1) desde la entrada; como mucho uno al día por contacto.
    const n = c.enviados + 1;
    if (hoy - dia(c.inicio) < 2 * (n - 1)) continue;
    if (c.ultimo && dia(c.ultimo) === hoy) continue;
    if (await enviar(env, c, n)) mandados++;
  }
  if (mandados) console.log('Ronda:', mandados, 'enviados');
}

async function darDeBaja(env, token) {
  if (!/^[a-f0-9]{32}$/.test(token || '')) return null;
  const c = await env.DB.prepare('SELECT email FROM contactos WHERE token = ?').bind(token).first();
  if (!c) return null;
  await env.DB.prepare('UPDATE contactos SET baja = 1 WHERE token = ?').bind(token).run();
  // También en MailerLite, para que no quede como activo allí.
  await fetch(API + '/subscribers', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.ML_TOKEN, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: c.email, status: 'unsubscribed' })
  }).catch(() => {});
  return c.email;
}

function paginaBaja(ok) {
  const texto = ok ? 'Listo. No vas a recibir más correos de esta serie.' : 'Este enlace de baja no es válido.';
  return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Baja</title><body style="margin:0;background:#0F0F0F;color:#F5F2EC;font:17px/1.6 'Segoe UI',Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px">
<main style="max-width:440px;text-align:center"><p>${texto}</p><p><a href="https://josempico.com" style="color:#C9A961">josempico.com</a></p></main></body></html>`,
    { status: ok ? 200 : 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ---------- Entrada ----------

export default {
  async fetch(req, env, ctx) {
    const baja = new URL(req.url).searchParams.get('baja');
    if (baja !== null && (req.method === 'GET' || req.method === 'POST')) {
      return paginaBaja(!!(await darDeBaja(env, baja)));
    }

    const origin = req.headers.get('Origin');
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST') return json({ ok: false, error: 'metodo' }, 405, h);

    let d = {};
    const tipo = req.headers.get('Content-Type') || '';
    try {
      if (tipo.includes('application/json')) d = await req.json();
      else d = Object.fromEntries(await req.formData());
    } catch (e) { return json({ ok: false, error: 'cuerpo' }, 400, h); }

    if (d.web) return json({ ok: true }, 200, h);                      // trampa para bots
    const email = corto(d.email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'email' }, 400, h);

    const grupos = JSON.parse(env.GRUPOS || '{}');
    const origen = d.origen === 'prueba' ? 'prueba' : 'diagnostico';
    const clave = origen === 'prueba' ? 'prueba_' + corto(d.campo, 20) : 'diag_' + corto(d.principal, 20);
    const ids = [grupos[clave] || grupos['sin_clasificar']].filter(Boolean);

    const fields = { name: corto(d.nombre, 80), sexo: corto(d.sexo, 2), origen };
    if (origen === 'prueba') {
      Object.assign(fields, { prueba_campo: corto(d.campo, 20), prueba_resultado: corto(d.resultado, 40),
        prueba_momento: corto(d.momento, 40), reto: corto(d.reto, 10) });
    } else {
      Object.assign(fields, { resultado: corto(d.principal, 20), secundario: corto(d.secundario, 20),
        reto: corto(d.reto, 10) });
    }

    const r = await fetch(API + '/subscribers', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.ML_TOKEN, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, fields, groups: ids })
    });
    if (!r.ok) console.log('MailerLite', r.status, (await r.text()).slice(0, 300));

    // La serie no depende de MailerLite: si allí falla, el correo 1 sale igual.
    if (origen === 'diagnostico') {
      ctx.waitUntil(empezarSerie(env, email, corto(d.nombre, 80), corto(d.sexo, 2), corto(d.principal, 20))
        .catch(e => console.log('Serie', e && e.message)));
    }
    return r.ok || origen === 'diagnostico' ? json({ ok: true }, 200, h) : json({ ok: false, error: 'mailerlite' }, 502, h);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(ronda(env));
  }
};
