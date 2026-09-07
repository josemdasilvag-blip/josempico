// Pruebas del motor de tu-situacion.js
// Correr:  node --test assets/tu-situacion.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const S = require('./tu-situacion.js');

test('expone las 10 constantes de patrón', () => {
  assert.equal(S.PATRONES.length, 10);
  assert.deepEqual([...S.PRIORIDAD].sort(), [...S.PATRONES].sort());
});

test('cada opción de cada pregunta puntúa solo patrones válidos', () => {
  const validos = new Set(S.PATRONES);
  const preguntas = [
    S.PREGUNTAS.rama,
    ...S.PREGUNTAS.porRama.ahora,
    ...S.PREGUNTAS.porRama.pasado,
    ...S.PREGUNTAS.porRama.patron,
    ...S.PREGUNTAS.comunes,
  ];
  for (const p of preguntas) {
    for (const op of p.ops) {
      for (const k of Object.keys(op.set || {})) {
        assert.ok(validos.has(k), `patrón desconocido: ${k} en "${p.texto}"`);
      }
    }
  }
});

test('P1 tiene 3 opciones, una por rama', () => {
  const ramas = S.PREGUNTAS.rama.ops.map(o => o.rama).sort();
  assert.deepEqual(ramas, ['ahora', 'pasado', 'patron']);
});

test('cada rama aporta 2 preguntas propias y hay 7 comunes', () => {
  assert.equal(S.PREGUNTAS.porRama.ahora.length, 2);
  assert.equal(S.PREGUNTAS.porRama.pasado.length, 2);
  assert.equal(S.PREGUNTAS.porRama.patron.length, 2);
  assert.equal(S.PREGUNTAS.comunes.length, 7);
});

test('cada patrón tiene ficha completa', () => {
  for (const id of S.PATRONES) {
    const f = S.FICHAS[id];
    assert.ok(f, `falta ficha: ${id}`);
    for (const campo of ['nombre','gloss','que_es','te_pasa','veredicto','que_hacer','remate','imagen_frase']) {
      assert.equal(typeof f[campo], 'string');
      assert.ok(f[campo].length > 0, `${id}.${campo} vacío`);
    }
  }
});

// --- Tarea 2: pesoInicial y aplica ---

test('pesoInicial devuelve las 10 claves a 0 para patron', () => {
  const p = S.pesoInicial('patron');
  assert.equal(Object.keys(p).length, 10);
  assert.ok(S.PATRONES.every(k => p[k] === 0));
});

test('pesoInicial aplica el empujón de la rama ahora', () => {
  const p = S.pesoInicial('ahora');
  assert.equal(p.situationship, 2);
  assert.equal(p.zombieing, -2);
  assert.equal(p.orbiting, 0); // no listado => 0
});

test('pesoInicial con rama desconocida no revienta', () => {
  const p = S.pesoInicial('lo-que-sea');
  assert.ok(S.PATRONES.every(k => p[k] === 0));
});

test('aplica suma deltas y arranca claves nuevas desde 0', () => {
  const p = S.pesoInicial('patron');
  S.aplica(p, { ghosting: 3, orbiting: 1 });
  S.aplica(p, { ghosting: 2 });
  assert.equal(p.ghosting, 5);
  assert.equal(p.orbiting, 1);
});

test('aplica tolera set vacío o ausente', () => {
  const p = S.pesoInicial('patron');
  S.aplica(p, {});
  S.aplica(p, undefined);
  assert.ok(S.PATRONES.every(k => p[k] === 0));
});
