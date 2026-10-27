// Comentario → DM de Instagram (@josempico), hecho en casa.
// Meta Business Suite no pasa los comentarios a sus automatizaciones para negocios en Europa (respuesta de
// soporte, caso 1416799176574201), así que este Worker hace lo mismo leyendo la API oficial de Instagram:
// cada 5 minutos (cron) mira los comentarios de los últimos reels y, si uno contiene una palabra clave,
// manda la respuesta privada (DM) y contesta en público al comentario. Una sola vez por comentario.
//
// API de Instagram con inicio de sesión de Instagram (graph.instagram.com), app de Meta en modo desarrollo
// (solo la cuenta de Jose: no hace falta revisión de Meta). Permisos: instagram_business_basic,
// instagram_business_manage_comments, instagram_business_manage_messages.
// Secreto IG_TOKEN = token de larga duración (60 días). El Worker lo renueva solo y guarda el vigente en KV.
// KV (binding ESTADO): «token», «token_renovado» y «c:<id de comentario>» (ya atendido, caduca a los 8 días).
// GET /estado (con ?clave=<CLAVE_ESTADO>): resumen de la última ronda, para comprobar que funciona.

const API = 'https://graph.instagram.com/v23.0';

// Palabras clave → mensaje privado. Se comparan sin tildes ni mayúsculas y como palabras completas.
const REGLAS = [
  {
    palabras: ['diagnostico'],
    dm: '¡Hola! 🙌 Aquí tienes el diagnóstico:\n\njosempico.com/diagnostico/?utm_source=instagram\n\n' +
        'Son 3 minutos y te dice dónde se te está cayendo todo: la imagen, el perfil, las conversaciones o la cita.\n\n' +
        'Al final tienes una llamada conmigo para verlo juntos.',
    respuesta: '¡Te lo acabo de mandar por DM! 📩',
  },
  {
    palabras: ['guia'],
    dm: '¡Hola! 🙌 Aquí tienes la guía:\n\nhttps://josempico.com/recursos/guia-patrones-de-interes.pdf?v=6e5ec82\n\n' +
        'Léela con calma y, si te surge cualquier duda, me escribes por aquí.',
    respuesta: '¡Te la acabo de mandar por DM! 📩',
  },
  {
    palabras: ['recurso'],
    dm: '¡Hola! 🙌 Aquí tienes la guía:\n\nhttps://josempico.com/recursos/guia-cuando-se-apaga.pdf?v=620b79f\n\n' +
        'Léela con calma y, si te surge cualquier duda, me escribes por aquí.',
    respuesta: '¡Te la acabo de mandar por DM! 📩',
  },
];

const REELS = 10;            // publicaciones recientes que se revisan
const DIAS = 7;              // Instagram solo deja responder en privado durante 7 días
const POR_RONDA = 25;        // tope de respuestas por ejecución
const RENOVAR_CADA = 20;     // días entre renovaciones del token (caduca a los 60)

export const normaliza = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function regla(texto) {
  const t = normaliza(texto);
  return REGLAS.find(r => r.palabras.some(p => new RegExp(`\\b${p}\\b`).test(t))) || null;
}

async function ig(env, token, ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(opciones.headers || {}) },
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${opciones.method || 'GET'} ${ruta.split('?')[0]} → ${r.status} ${JSON.stringify(datos.error || datos).slice(0, 300)}`);
  return datos;
}

async function tokenVigente(env) {
  return (await env.ESTADO.get('token')) || env.IG_TOKEN;
}

async function renovarToken(env, token) {
  const ultima = Number(await env.ESTADO.get('token_renovado')) || 0;
  if (Date.now() - ultima < RENOVAR_CADA * 86400000) return token;
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error('No se pudo renovar el token: ' + JSON.stringify(d).slice(0, 200));
  await env.ESTADO.put('token', d.access_token);
  await env.ESTADO.put('token_renovado', String(Date.now()));
  return d.access_token;
}

export async function ronda(env) {
  const log = { inicio: new Date().toISOString(), revisados: 0, enviados: [], errores: [] };
  let token = await tokenVigente(env);
  try { token = await renovarToken(env, token); } catch (e) { log.errores.push(String(e.message || e)); }

  const yo = await ig(env, token, '/me?fields=user_id,username');
  const limite = Date.now() - DIAS * 86400000;
  const medios = await ig(env, token, `/me/media?fields=id,timestamp,comments_count&limit=${REELS}`);

  for (const m of medios.data || []) {
    if (!m.comments_count) continue;
    let url = `/${m.id}/comments?fields=id,text,timestamp,from&limit=50`;
    for (let pagina = 0; url && pagina < 4; pagina++) {
      const c = await ig(env, token, url);
      for (const com of c.data || []) {
        log.revisados++;
        if (Date.parse(com.timestamp) < limite) continue;
        if (com.from && (com.from.id === yo.user_id || com.from.username === yo.username)) continue;
        const r = regla(com.text);
        if (!r) continue;
        const clave = 'c:' + com.id;
        if (await env.ESTADO.get(clave)) continue;
        if (log.enviados.length >= POR_RONDA) break;
        try {
          await ig(env, token, `/${yo.user_id}/messages`, {
            method: 'POST',
            body: JSON.stringify({ recipient: { comment_id: com.id }, message: { text: r.dm } }),
          });
          await env.ESTADO.put(clave, '1', { expirationTtl: 8 * 86400 });
          log.enviados.push(com.id);
          try {
            await ig(env, token, `/${com.id}/replies`, { method: 'POST', body: JSON.stringify({ message: r.respuesta }) });
          } catch (e) { log.errores.push('respuesta pública ' + com.id + ': ' + e.message); }
        } catch (e) {
          log.errores.push('DM ' + com.id + ': ' + e.message);
        }
      }
      const sig = c.paging && c.paging.next;
      url = sig ? sig.replace(/^https:\/\/graph\.instagram\.com\/v[\d.]+/, '') : null;
    }
  }
  log.fin = new Date().toISOString();
  await env.ESTADO.put('ultima_ronda', JSON.stringify(log));
  return log;
}

export default {
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(ronda(env).catch(async e => {
      await env.ESTADO.put('ultima_ronda', JSON.stringify({ inicio: new Date().toISOString(), error: String(e.message || e) }));
    }));
  },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!env.CLAVE_ESTADO || u.searchParams.get('clave') !== env.CLAVE_ESTADO) return new Response('No', { status: 403 });
    if (u.pathname.endsWith('/ahora')) {
      try { return Response.json(await ronda(env)); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }
    }
    return new Response((await env.ESTADO.get('ultima_ronda')) || '{}', { headers: { 'Content-Type': 'application/json' } });
  },
};
