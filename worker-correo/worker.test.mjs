// Prueba del Worker con D1 y fetch simulados. Uso: node worker.test.mjs
import assert from 'node:assert/strict';
import W from './worker.js';

// --- D1 mínimo en memoria (solo las consultas que usa el Worker) ---
const filas = new Map();
const DB = {
  prepare(sql) {
    let args = [];
    const st = {
      bind(...a) { args = a; return st; },
      async run() {
        if (sql.startsWith('INSERT OR IGNORE')) {
          const [email, nombre, sexo, serie, inicio, token] = args;
          if (filas.has(email)) return { meta: { changes: 0 } };
          filas.set(email, { email, nombre, sexo, serie, inicio, enviados: 0, ultimo: null, baja: 0, token });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith('UPDATE contactos SET enviados')) {
          const f = filas.get(args[2]); f.enviados = args[0]; f.ultimo = args[1]; return { meta: { changes: 1 } };
        }
        if (sql.startsWith('UPDATE contactos SET baja')) {
          for (const f of filas.values()) if (f.token === args[0]) f.baja = 1;
          return { meta: { changes: 1 } };
        }
        throw new Error('SQL no simulado: ' + sql);
      },
      async all() {
        return { results: [...filas.values()].filter(f => !f.baja && f.enviados >= 1 && f.enviados < args[0]).map(f => ({ ...f })) };
      },
      async first() { return [...filas.values()].find(f => f.token === args[0]) || null; }
    };
    return st;
  }
};

// --- fetch y reloj simulados ---
const enviados = [];
let mlPeticiones = 0;
globalThis.fetch = async (url, opt) => {
  const body = JSON.parse(opt.body);
  if (url.includes('brevo')) { enviados.push(body); return new Response('{}', { status: 201 }); }
  mlPeticiones++; return new Response('{}', { status: 200 });
};
let ahora = Date.UTC(2026, 9, 11, 22, 30);
Date.now = () => ahora;
const DIA = 86400000;

const env = { DB, BREVO_KEY: 'x', ML_TOKEN: 'y', GRUPOS: '{"diag_P1":"1","sin_clasificar":"9"}' };
const pend = [];
const ctx = { waitUntil: p => pend.push(p) };
const espera = async () => { while (pend.length) await pend.shift(); };

async function alta(datos) {
  const r = await W.fetch(new Request('https://josempico.com/api/suscribir', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://josempico.com' },
    body: JSON.stringify(datos) }), env, ctx);
  await espera(); return r;
}
const cron = async () => { await W.scheduled({}, env, ctx); await espera(); };

// 1. Alta de una mujer con resultado P1: correo 1-M al momento, con su nombre y enlace de baja.
let r = await alta({ email: 'Ana@Ejemplo.com', nombre: 'Ana <b>López</b>', sexo: 'm', principal: 'P1', origen: 'diagnostico' });
assert.equal(r.status, 200);
assert.equal(enviados.length, 1);
assert.equal(enviados[0].subject, 'Tus 7 cambios para atraer');
assert.equal(enviados[0].to[0].email, 'ana@ejemplo.com');
assert.match(enviados[0].htmlContent, /Hola Ana,/);
assert.ok(!enviados[0].htmlContent.includes('{$'));
const token = filas.get('ana@ejemplo.com').token;
assert.ok(enviados[0].htmlContent.includes('?baja=' + token));
assert.match(enviados[0].headers['List-Unsubscribe'], /baja=/);

// 2. Repetir el diagnóstico no reinicia ni duplica.
await alta({ email: 'ana@ejemplo.com', nombre: 'Ana', sexo: 'm', principal: 'P3', origen: 'diagnostico' });
assert.equal(enviados.length, 1);

// 3. Sin nombre: «Hola,» y hombre con serie «nada roto» (correos sin sufijo).
await alta({ email: 'pepe@ejemplo.com', sexo: 'h', principal: 'ajuste', origen: 'diagnostico' });
assert.equal(enviados.length, 2);
assert.match(enviados[1].htmlContent, /Hola,<\/p>/);

// 4. Las pruebas de paso no empiezan serie.
await alta({ email: 'luis@ejemplo.com', sexo: 'h', campo: 'imagen', origen: 'prueba' });
assert.equal(enviados.length, 2);

// 5. Calendario: correo n el día 2·(n−1). Cron cada hora durante 16 días.
const dias = { 'ana@ejemplo.com': [], 'pepe@ejemplo.com': [] };
const inicio = ahora;
for (let h = 1; h <= 16 * 24; h++) {
  ahora = inicio + h * 3600000;
  const antes = enviados.length;
  await cron();
  for (const e of enviados.slice(antes)) {
    dias[e.to[0].email].push([Math.floor(ahora / DIA) - Math.floor(inicio / DIA), e.subject]);
  }
}
assert.deepEqual(dias['ana@ejemplo.com'].map(x => x[0]), [2, 4, 6, 8, 10, 12, 14]);
assert.equal(dias['ana@ejemplo.com'][1][1], 'Cambio 2: cuida los detalles');        // 3-M
assert.equal(dias['pepe@ejemplo.com'].length, 7);
assert.equal(filas.get('ana@ejemplo.com').enviados, 8);

// 6. Baja: página 200, contacto marcado; token falso 404.
await alta({ email: 'eva@ejemplo.com', nombre: 'Eva', sexo: 'm', principal: 'P2', origen: 'diagnostico' });
const t = filas.get('eva@ejemplo.com').token;
r = await W.fetch(new Request('https://josempico.com/api/suscribir?baja=' + t), env, ctx);
assert.equal(r.status, 200);
assert.equal(filas.get('eva@ejemplo.com').baja, 1);
r = await W.fetch(new Request('https://josempico.com/api/suscribir?baja=nada', { method: 'POST' }), env, ctx);
assert.equal(r.status, 404);
const n = enviados.length;
ahora += 3 * DIA; await cron();
assert.equal(enviados.length, n);

console.log('OK: alta, nombre, repetición, pruebas, calendario 2–14, baja');
