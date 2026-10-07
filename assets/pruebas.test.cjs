// Pruebas del motor de pruebas.js
// Correr:  node --test assets/pruebas.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const P = require('./pruebas.js');

const CAMPOS = ['imagen', 'perfil', 'conversacion', 'cita'];

// Contesta todo lo que salga con la primera opción ✅ (o la primera sin "corta").
function todoBien(campo, base) {
  const r = Object.assign({}, base);
  for (let i = 0; i < 80; i++) {
    const sec = P.secuencia(campo, r);
    const falta = sec.find(id => r[id] == null);
    if (!falta) return r;
    const p = P.pregunta(campo, r, falta);
    const o = p.ops.find(o => o.ok === true) || p.ops.find(o => !o.corta);
    r[falta] = o.id;
  }
  throw new Error('no termina');
}

test('todas las opciones tienen id único dentro de su pregunta, y los ids de pregunta no se repiten', () => {
  for (const campo of CAMPOS) for (const sexo of ['h', 'm']) for (const momento of ['dia8', 'medir']) for (const reto of ['48', '57']) {
    const l = P.preguntas(campo, { sexo, momento, reto });
    const ids = l.map(p => p.id);
    assert.strictEqual(new Set(ids).size, ids.length, `${campo} ${sexo} ${momento}: ids repetidos`);
    for (const p of l) {
      const os = p.ops.map(o => o.id);
      assert.strictEqual(new Set(os).size, os.length, `${campo} ${p.id}: opciones repetidas`);
      if (p.tipo === 'clave' || p.tipo === 'detalle') assert.ok(p.fallo || p.ops.every(o => o.ok !== false || o.corta), `${campo} ${p.id}: sin texto de fallo`);
    }
  }
});

test('perfil pregunta qué reto; los demás no', () => {
  assert.ok(P.secuencia('perfil', {}).includes('reto'));
  assert.ok(!P.secuencia('imagen', {}).includes('reto'));
});

test('día 8 con todo bien → a medir, en los cuatro campos y los dos sexos', () => {
  for (const campo of CAMPOS) for (const sexo of ['h', 'm']) {
    const r = todoBien(campo, { sexo, momento: 'dia8', reto: '48' });
    assert.strictEqual(P.evalua(campo, r).codigo, 'a_medir', `${campo} ${sexo}`);
  }
});

test('día 8: cuatro días o menos corta la prueba y manda terminar el reto', () => {
  const r = { sexo: 'h', momento: 'dia8', D1: 'cuatro_menos' };
  const sec = P.secuencia('imagen', r);
  assert.strictEqual(sec[sec.length - 1], 'D1');
  assert.strictEqual(P.evalua('imagen', r).codigo, 'terminar');
});

test('día 8: una clave mal → rehacer, con el día', () => {
  const r = todoBien('imagen', { sexo: 'h', momento: 'dia8' });
  r.pelo = 'sin_cita';
  const res = P.evalua('imagen', r);
  assert.strictEqual(res.codigo, 'rehacer');
  assert.deepStrictEqual(res.rehacer.map(x => x.dia), ['2']);
});

test('día 8: solo un detalle mal → a medir, con el consejo', () => {
  const r = todoBien('imagen', { sexo: 'h', momento: 'dia8' });
  r.perfume = 'no';
  const res = P.evalua('imagen', r);
  assert.strictEqual(res.codigo, 'a_medir');
  assert.strictEqual(res.pendiente.length, 1);
});

test('imagen mujeres día 8: pelo (dos meses) y color (un mes) son claves', () => {
  const r = todoBien('imagen', { sexo: 'm', momento: 'dia8' });
  r.color = 'sin_cita';
  assert.strictEqual(P.evalua('imagen', r).codigo, 'rehacer');
  r.color = 'no_tino'; r.pelo = 'sin_cita';
  assert.strictEqual(P.evalua('imagen', r).codigo, 'rehacer');
  r.pelo = 'cita';
  assert.strictEqual(P.evalua('imagen', r).codigo, 'a_medir');
});

test('cita día 8: no llegué a tener la cita → reto de conversaciones', () => {
  const r = { sexo: 'm', momento: 'dia8', hasta: 'sin_cita' };
  assert.strictEqual(P.secuencia('cita', r).length, 3);
  assert.strictEqual(P.evalua('cita', r).codigo, 'sin_cita');
});

test('perfil 57 día 8 usa sus preguntas (likes) y no las del 48 (quitar)', () => {
  const sec = P.secuencia('perfil', { sexo: 'h', momento: 'dia8', reto: '57' });
  assert.ok(sec.includes('likes') && !sec.includes('quitar'));
});

// ---------- Medición ----------

function imagenMedida(sexo, cambios) {
  const base = sexo === 'h'
    ? { sexo, momento: 'medir', entrenar: 'cuatro', comida: 'dieta', pelo: 'menos_mes', escriben: 'igual', excusas: 'igual', comentan: 'nadie', foto: 'igual' }
    : { sexo, momento: 'medir', entrenar: 'cuatro', comida: 'dieta', pelo: 'menos_dos', color: 'no_tino', acercan: 'igual', miran: 'no', comentan: 'nadie', foto: 'igual' };
  return P.evalua('imagen', Object.assign(base, cambios));
}

test('imagen medición: cumple y un hecho mejora → pasa', () => {
  assert.strictEqual(imagenMedida('h', { escriben: 'mas' }).codigo, 'pasa');
  assert.strictEqual(imagenMedida('m', { miran: 'claramente' }).codigo, 'pasa');
  assert.strictEqual(imagenMedida('h', { comentan: 'una' }).codigo, 'pasa');
  assert.strictEqual(imagenMedida('m', { miran: 'algo' }).codigo, 'seguir', '"algo" no cuenta como mejora');
});

test('imagen medición: cumple sin mejora → otras cuatro semanas, día 7', () => {
  const r = imagenMedida('h', {});
  assert.strictEqual(r.codigo, 'seguir');
  assert.strictEqual(r.rehacer[0].dia, '7');
});

test('imagen medición: falla entrenar y comida → corrección días 5 y 6, con regla de parada', () => {
  const r = imagenMedida('h', { entrenar: 'dos_menos', comida: 'deje', escriben: 'mas' });
  assert.strictEqual(r.codigo, 'correccion');
  assert.deepStrictEqual(r.rehacer.map(x => x.dia), ['5', '6']);
  assert.ok(r.notaParada);
});

test('imagen medición: la mitad de los días cumple la comida', () => {
  assert.strictEqual(imagenMedida('h', { comida: 'mitad', escriben: 'mas' }).codigo, 'pasa');
});

function perfil(sexo, cambios) {
  const base = { sexo, momento: 'medir', reto: '48', antes: 'igual', buenas: 'dos_tres', primera: 'preparada' };
  if (sexo === 'h') base.respuesta = 'mitad_mas'; else base.parados = 'pocos';
  return P.evalua('perfil', Object.assign(base, cambios));
}

test('perfil medición: los cortes de normal (H 7+, M 40+)', () => {
  assert.strictEqual(perfil('h', { matches: '7_9' }).codigo, 'pasa');
  assert.strictEqual(perfil('h', { matches: '4_6' }).codigo, 'imagen');
  assert.strictEqual(perfil('m', { matches: '40_54' }).codigo, 'pasa');
  assert.strictEqual(perfil('m', { matches: '25_39' }).codigo, 'imagen');
});

test('perfil medición: más que antes sin llegar → solo fotos; igual con fotos malas → completa', () => {
  assert.strictEqual(perfil('h', { matches: '0_3', antes: 'algo' }).codigo, 'correccion_fotos');
  assert.strictEqual(perfil('h', { matches: '0_3', buenas: 'una' }).codigo, 'correccion');
  const r = perfil('h', { matches: '0_3', antes: 'algo', primera: 'selfie' });
  assert.deepStrictEqual(r.rehacer.map(x => x.dia), ['1 y 5', '2']);
});

test('perfil 57: no pregunta "comparado con antes"; por debajo de normal → reto 48', () => {
  assert.ok(!P.secuencia('perfil', { sexo: 'h', momento: 'medir', reto: '57' }).includes('antes'));
  assert.strictEqual(P.evalua('perfil', { sexo: 'h', momento: 'medir', reto: '57', matches: '4_6', buenas: 'una', primera: 'selfie', respuesta: 'casi_ninguno' }).codigo, 'reto48');
  assert.strictEqual(P.evalua('perfil', { sexo: 'm', momento: 'medir', reto: '57', matches: '70_mas', buenas: 'una', primera: 'selfie', parados: 'muchos' }).codigo, 'pasa');
});

test('conversación medición hombres', () => {
  const b = { sexo: 'h', momento: 'medir', propuse: 'tres_cinco', dijeron_si: 'mitad_mas', de_que: 'todo', citas: 'una' };
  assert.strictEqual(P.evalua('conversacion', b).codigo, 'pasa');
  assert.strictEqual(P.evalua('conversacion', Object.assign({}, b, { dijeron_si: 'menos_mitad' })).codigo, 'pasa_secundario');
  const c = P.evalua('conversacion', Object.assign({}, b, { citas: 'ninguna', propuse: 'una_dos', de_que: 'dia' }));
  assert.strictEqual(c.codigo, 'correccion');
  assert.deepStrictEqual(c.rehacer.map(x => x.dia), ['7', '4']);
});

test('conversación medición mujeres: siempre ella no pasa aunque le propongan', () => {
  const b = { sexo: 'm', momento: 'medir', empieza: 'ambos', proponen: 'bastantes', de_que: 'todo', citas: 'dos_mas' };
  assert.strictEqual(P.evalua('conversacion', b).codigo, 'pasa');
  assert.strictEqual(P.evalua('conversacion', Object.assign({}, b, { empieza: 'yo' })).codigo, 'pasa_secundario');
  assert.strictEqual(P.evalua('conversacion', Object.assign({}, b, { citas: 'ninguna', empieza: 'nunca' })).rehacer[0].dia, '2');
});

test('cita medición', () => {
  assert.strictEqual(P.evalua('cita', { sexo: 'h', momento: 'medir', segunda: 'sin_citas' }).codigo, 'sin_citas');
  assert.strictEqual(P.secuencia('cita', { sexo: 'h', momento: 'medir', segunda: 'sin_citas' }).length, 3);
  assert.strictEqual(P.evalua('cita', { sexo: 'm', momento: 'medir', segunda: 'una', despues: 'escribi', quien: 'nadie' }).codigo, 'pasa');
  assert.strictEqual(P.evalua('cita', { sexo: 'h', momento: 'medir', segunda: 'ninguna_queria', despues: 'ritmo', cuando: 'tercer_cuarto', pago: 'yo' }).codigo, 'siguiente_cita');
  const r = P.evalua('cita', { sexo: 'h', momento: 'medir', segunda: 'ninguna_queria', despues: 'mucho', cuando: 'no', pago: 'ella' });
  assert.strictEqual(r.codigo, 'correccion');
  assert.deepStrictEqual(r.rehacer.map(x => x.dia), ['4 y 5', '6 y 7', 'antes de empezar y 3']);
  assert.ok(!r.notaParada, 'en cita no se aplica la regla de parada');
});

test('enviarResultado: sin URL no hace nada; con URL manda POST JSON', async () => {
  assert.strictEqual(await P.enviarResultado({ a: 1 }, ''), false);
  let llamada;
  const ok = await P.enviarResultado({ email: 'x@y.z' }, 'https://ejemplo.test/h', (u, o) => { llamada = [u, o]; return Promise.resolve({}); });
  assert.strictEqual(ok, true);
  assert.strictEqual(llamada[0], 'https://ejemplo.test/h');
  assert.strictEqual(llamada[1].method, 'POST');
  assert.strictEqual(JSON.parse(llamada[1].body).email, 'x@y.z');
});
