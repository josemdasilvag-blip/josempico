// Prueba local: node worker.test.mjs (Instagram y KV simulados).
import assert from 'node:assert';
import w, { ronda, regla } from './worker.js';

assert.ok(regla('Quiero el DIAGNÓSTICO!!'));
assert.ok(regla('recurso porfa'));
assert.equal(regla('qué buen vídeo'), null);

const kv = new Map();
const env = { IG_TOKEN: 't0', CLAVE_ESTADO: 'k', ESTADO: {
  get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
const ahora = Date.now();
const iso = d => new Date(ahora - d * 86400000).toISOString();
const llamadas = [];
globalThis.fetch = async (url, op = {}) => {
  const u = String(url); llamadas.push((op.method || 'GET') + ' ' + u.replace('https://graph.instagram.com/v23.0', ''));
  const ok = d => ({ ok: true, status: 200, json: async () => d });
  if (u.includes('refresh_access_token')) return ok({ access_token: 't1' });
  if (u.endsWith('/me?fields=user_id,username')) return ok({ user_id: '99', username: 'josempico' });
  if (u.includes('/me/media')) return ok({ data: [{ id: 'm1', comments_count: 5 }, { id: 'm2', comments_count: 0 }] });
  if (u.includes('/m1/comments')) return ok({ data: [
    { id: 'c1', text: 'Diagnóstico', timestamp: iso(1), from: { id: '1', username: 'ana' } },
    { id: 'c2', text: 'RECURSO', timestamp: iso(2), from: { id: '2', username: 'luis' } },
    { id: 'c3', text: 'me encanta', timestamp: iso(1), from: { id: '3', username: 'eva' } },
    { id: 'c4', text: 'diagnostico', timestamp: iso(9), from: { id: '4', username: 'viejo' } },
    { id: 'c5', text: 'diagnostico', timestamp: iso(1), from: { id: '99', username: 'josempico' } },
  ] });
  if (op.method === 'POST') return ok({ id: 'x' });
  return { ok: false, status: 404, json: async () => ({ error: 'no' }) };
};

const l1 = await ronda(env);
assert.deepEqual(l1.enviados, ['c1', 'c2'], JSON.stringify(l1));
assert.equal(l1.errores.length, 0, JSON.stringify(l1.errores));
assert.equal(kv.get('token'), 't1');
const dms = llamadas.filter(x => x.startsWith('POST /99/messages'));
assert.equal(dms.length, 2);
assert.equal(llamadas.filter(x => x.includes('/replies')).length, 2);
const l2 = await ronda(env);
assert.deepEqual(l2.enviados, [], 'no repite');
const r = await w.fetch(new Request('https://x/estado?clave=mal'), env);
assert.equal(r.status, 403);
console.log('OK', l1.enviados, 'revisados', l1.revisados);
