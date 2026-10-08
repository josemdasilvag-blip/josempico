// Puente web → MailerLite (josempico.com/api/suscribir).
// La web no puede llevar el token de MailerLite (sería público): lo guarda este Worker
// como secreto ML_TOKEN. GRUPOS (variable) = JSON {clave: idDeGrupo}, creado por montar.py.
//
// Cuerpo (JSON o formulario): email, nombre, sexo, origen ('diagnostico' | 'prueba'),
//   y según el origen: principal, secundario, reto  |  campo, resultado, momento, reto.
// Entra en el grupo «diag_<principal>» o «prueba_<campo>». Responde siempre JSON.

const ORIGENES = ['https://josempico.com', 'https://www.josempico.com'];
const API = 'https://connect.mailerlite.com/api';

function cors(origin) {
  const ok = ORIGENES.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } : {};
}

function json(data, status, extra) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

const corto = (v, n) => (v === undefined || v === null ? '' : String(v)).trim().slice(0, n || 120);

export default {
  async fetch(req, env) {
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
    if (!r.ok) {
      console.log('MailerLite', r.status, (await r.text()).slice(0, 300));
      return json({ ok: false, error: 'mailerlite' }, 502, h);
    }
    return json({ ok: true }, 200, h);
  }
};
