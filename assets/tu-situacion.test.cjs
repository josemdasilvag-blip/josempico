// Pruebas del motor de tu-situacion.js
// Correr:  node --test assets/tu-situacion.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const S = require('./tu-situacion.js');

test('expone las 11 constantes de patrón', () => {
  assert.equal(S.PATRONES.length, 11);
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

test('pesoInicial devuelve las 11 claves a 0 para patron', () => {
  const p = S.pesoInicial('patron');
  assert.equal(Object.keys(p).length, 11);
  assert.ok(S.PATRONES.every(k => p[k] === 0));
});

test('pesoInicial aplica el empujón de la rama ahora (valores calibrados)', () => {
  const p = S.pesoInicial('ahora');
  assert.equal(p.orbiting, 2);
  assert.equal(p.zombieing, -1);
  assert.equal(p.ghosting, 0); // no listado => 0
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

// --- Tarea 3: calcula ---

function puntosDesde(pares) {
  const p = {}; S.PATRONES.forEach(k => p[k] = 0);
  Object.assign(p, pares);
  return p;
}

test('gana el patrón con más puntos', () => {
  const r = S.calcula(puntosDesde({ ghosting: 9, benching: 3 }), 'pasado');
  assert.equal(r.primario, 'ghosting');
});

test('empate: gana el más específico (PRIORIDAD), no ghosting', () => {
  const r = S.calcula(puntosDesde({ ghosting: 6, ghostlighting: 6 }), 'pasado');
  assert.equal(r.primario, 'ghostlighting');
});

test('empate entre dos específicos respeta el orden de PRIORIDAD', () => {
  const r = S.calcula(puntosDesde({ zombieing: 5, futurefaking: 5 }), 'patron');
  assert.equal(r.primario, 'zombieing'); // zombieing va antes que futurefaking
});

test('secundario sale solo si está a <=2 del primario y >= UMBRAL_COMBO', () => {
  const cerca = S.calcula(puntosDesde({ lovebombing: 8, futurefaking: 6 }), 'patron');
  assert.equal(cerca.secundario, 'futurefaking');
  const lejos = S.calcula(puntosDesde({ lovebombing: 8, futurefaking: 3 }), 'patron');
  assert.equal(lejos.secundario, null); // no llega a UMBRAL_COMBO
  const gap = S.calcula(puntosDesde({ lovebombing: 9, futurefaking: 5 }), 'patron');
  assert.equal(gap.secundario, null);   // 9-5 = 4 > 2
});

test('tibio cuando el máximo no llega a UMBRAL_TIBIO', () => {
  assert.equal(S.calcula(puntosDesde({ ghosting: 2, benching: 1 }), 'ahora').tibio, true);
  assert.equal(S.calcula(puntosDesde({ ghosting: 9 }), 'pasado').tibio, false);
});

test('orden incluye los 11 patrones sin repetir', () => {
  const r = S.calcula(puntosDesde({ ghosting: 3 }), 'pasado');
  assert.equal(r.orden.length, 11);
  assert.equal(new Set(r.orden).size, 11);
});

test('recorrido completo de una rama: respuestas de ghosting -> ghosting', () => {
  const rama = 'pasado';
  let p = S.pesoInicial(rama);
  S.aplica(p, S.PREGUNTAS.porRama[rama][0].ops[0].set); // "dejó de contestar de un día para otro"
  S.aplica(p, S.PREGUNTAS.porRama[rama][1].ops[1].set); // "uno o dos meses" (neutro)
  S.aplica(p, S.PREGUNTAS.comunes[0].ops[2].set);       // "silencio total"
  S.aplica(p, S.PREGUNTAS.comunes[6].ops[0].set);       // "corte limpio y definitivo"
  const r = S.calcula(p, rama);
  assert.equal(r.primario, 'ghosting');
});

test('recorrido completo hacia slow fading: se distingue de ghosting', () => {
  const rama = 'pasado';
  let p = S.pesoInicial(rama);
  S.aplica(p, S.PREGUNTAS.porRama[rama][0].ops[4].set); // "fue apagándose poco a poco"
  S.aplica(p, S.PREGUNTAS.porRama[rama][1].ops[1].set); // "uno o dos meses" (neutro)
  S.aplica(p, S.PREGUNTAS.comunes[0].ops[5].set);       // "cada vez tarda más y escribe menos"
  S.aplica(p, S.PREGUNTAS.comunes[6].ops[5].set);       // "no ha habido un corte, cada vez hay menos"
  const r = S.calcula(p, rama);
  assert.equal(r.primario, 'slowfading');
});

// --- Tarea 4: regresión de la distribución (semilla fija) ---

test('distribución: cada patrón alcanzable en la rama patron (20k tiradas, semilla fija)', () => {
  let seed = 12345;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const rnd = a => a[Math.floor(rand() * a.length)];
  const N = 20000, cuenta = {};
  S.PATRONES.forEach(k => cuenta[k] = 0);
  for (let i = 0; i < N; i++) {
    let p = S.pesoInicial('patron');
    S.PREGUNTAS.porRama.patron.forEach(q => S.aplica(p, rnd(q.ops).set));
    S.PREGUNTAS.comunes.forEach(q => S.aplica(p, rnd(q.ops).set));
    cuenta[S.calcula(p, 'patron').primario]++;
  }
  for (const k of S.PATRONES) {
    assert.ok(cuenta[k] / N >= 0.025, `${k} sale solo ${(100 * cuenta[k] / N).toFixed(1)}%`);
  }
});
