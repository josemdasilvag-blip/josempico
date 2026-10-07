// Pruebas del motor de diagnostico.js
// Correr:  node --test assets/diagnostico.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const D = require('./diagnostico.js');

// Orden del anexo (notas/47-diagnostico-revision-v3-2.md):
// G1 · G2 · x1a · x1b · x2a · x2b · x2c · x2d · x3a · x3b · x3c · x4a · x4b · x4c · x5a · x5b · x5c · x5d · xF
const CAMPOS = ['G1', 'G2', '1a', '1b', '2a', '2b', '2c', '2d', '3a', '3b', '3c', '4a', '4b', '4c', '5a', '5b', '5c', '5d', 'F'];
function persona(sexo, lista) {
  const r = { G0: sexo };
  CAMPOS.forEach((c, i) => { if (lista[i] != null) r[c] = lista[i]; });
  return r;
}
const _ = null;
const LENTO = { tiempos: Array(12).fill(6000), posiciones: [0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 0, 1] };
const RAPIDO = { tiempos: Array(12).fill(1000), posiciones: [0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 0, 1] };

// [id, sexo, respuestas, principal esperado, secundario esperado, meta]
const ANEXO = [
  ['H01', 'h', ['no', 'ninguna', 'no_propongo', 'ninguna', _, _, _, _, 'no_hablo', 'no_hablo', 'no_hablo', _, _, _, 'una', 'si', 'enfrio', 'mitad', 'no_he_quedado'], 'S', 'P5'],
  ['H02', 'h', ['si', 'una_dos', 'casi_ninguna', 'una_dos', 'regular', 'una', 'dia_a_dia', 'reciente', 'una_dos', 'pocos', 'el_dia', 'mitad_mas', 'quedamos', 'yo', 'ninguna', _, _, _, 'nunca'], 'P2', 'P3'],
  ['H03', 'h', ['si', 'ninguna', 'mayoria', 'una_dos', 'normal', 'cuatro_mas', 'preparada', 'reciente', 'tres_cinco', 'excusas', 'de_todo', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'P3', null],
  ['H04', 'h', ['si', 'ninguna', 'no_propongo', 'ninguna', 'bajo', 'ninguna', 'selfie', 'reciente', 'ninguna', 'pocos', 'el_dia', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'P2', 'P1'],
  ['H05', 'h', ['si', 'ninguna', 'mayoria', 'ninguna', 'bajo', 'cuatro_mas', 'preparada', 'reciente', 'tres_cinco', 'excusas', 'de_todo', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'P1', null],
  ['H06', 'h', ['si', 'una_dos', 'casi_ninguna', 'tres_mas', 'bajo', 'una', 'primer_plano', 'reciente', 'tres_cinco', 'pocos', 'de_todo', 'mitad_mas', 'quedamos', 'yo', 'ninguna', _, _, _, 'nunca'], 'P2', null],
  ['H07', 'h', ['no', 'tres_mas', 'algunas', 'una_dos', _, _, _, _, 'tres_cinco', 'no_mueren', 'de_todo', 'casi_ninguna_queria', 'escribi_mucho', 'yo', 'ninguna', _, _, _, 'no_he_quedado'], 'P4', 'S'],
  ['H08', 'h', ['si', 'tres_mas', 'casi_ninguna', 'una_dos', 'normal', 'dos_tres', 'preparada', 'reciente', 'tres_cinco', 'no_mueren', 'de_todo', 'menos_mitad', 'excusas', 'medias', 'una', 'si', 'enfrio', 'mitad', 'nunca'], 'P4', 'P5'],
  ['H09', 'h', ['si', 'tres_mas', 'casi_ninguna', 'una_dos', 'normal', 'cuatro_mas', 'preparada', 'reciente', 'seis_mas', 'no_mueren', 'de_todo', 'mitad_mas', 'escribi_mucho', 'medias', 'dos_mas', 'si', 'diluyo', 'casi_todas', 'nunca'], 'P5', null],
  ['H10', 'h', ['si', 'una_dos', 'casi_ninguna', 'una_dos', 'normal', 'cuatro_mas', 'preparada', 'reciente', 'una_dos', 'no_propongo', 'el_dia', 'casi_ninguna_queria', 'hablamos', 'yo', 'ninguna', _, _, _, 'nunca'], 'P3', 'P4'],
  ['H11', 'h', ['si', 'tres_mas', 'algunas', 'una_dos', 'regular', 'dos_tres', 'preparada', 'reciente', 'tres_cinco', 'la_dejo', 'de_todo', 'casi_ninguna_queria', 'hablamos', 'yo', 'ninguna', _, _, _, 'una'], 'P4', 'P2'],
  ['H12', 'h', ['si', 'tres_mas', 'casi_ninguna', 'una_dos', 'normal', 'cuatro_mas', 'preparada', 'reciente', 'seis_mas', 'la_dejo', 'de_todo', 'mitad_mas', 'quedamos', 'yo', 'dos_mas', 'a_medias', 'lo_deje', 'alguna', 'nunca'], 'ajuste', null],
  ['H13', 'h', ['si', 'ninguna', 'casi_ninguna', 'ninguna', 'bajo', 'ninguna', 'selfie', 'reciente', 'ninguna', 'pocos', 'el_dia', _, _, _, 'ninguna', _, _, _, 'nunca'], 'P2', null, RAPIDO],
  ['H14', 'h', ['no', 'ninguna', 'mayoria', 'ninguna', _, _, _, _, 'no_hablo', 'no_hablo', 'no_hablo', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'S', 'P1'],
  ['H15', 'h', ['si', 'una_dos', 'casi_ninguna', 'una_dos', 'normal', 'dos_tres', 'preparada', 'reciente', 'tres_cinco', 'no_mueren', 'de_todo', 'mitad_mas', 'quedamos', 'yo', 'dos_mas', 'si', 'discutir', 'casi_todas', 'nunca'], 'P5', null],
  ['M16', 'm', ['no', 'ninguna', 'no_hablo', 'una_dos', _, _, _, _, 'no_hablo', 'no_hablo', 'no_hablo', _, _, _, 'una', 'si', 'enfrio', 'mitad', 'no_he_quedado'], 'S', 'P5'],
  ['M17', 'm', ['si', 'una_dos', 'pocos', 'una_dos', 'regular', 'una', 'selfie', 'reciente', 'a_veces', 'pocos', 'el_dia', 'mitad_mas', 'quedamos', 'contesto', 'ninguna', _, _, _, 'nunca'], 'P2', 'P3'],
  ['M18', 'm', ['si', 'ninguna', 'casi_ninguno', 'una_dos', 'normal', 'cuatro_mas', 'preparada', 'reciente', 'nunca_yo', 'no_propone', 'de_todo', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'P3', null],
  ['M19', 'm', ['si', 'ninguna', 'pocos', 'ninguno', 'bajo', 'cuatro_mas', 'preparada', 'reciente', 'a_veces', 'pocos', 'de_todo', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'P1', null],
  ['M20', 'm', ['si', 'una_dos', 'bastantes', 'tres_mas', 'bajo', 'ninguna', 'gente', 'reciente', 'a_veces', 'pocos', 'reimos', 'mitad_mas', 'quedamos', 'contesto', 'ninguna', _, _, _, 'nunca'], 'P2', null],
  ['M21', 'm', ['si', 'tres_mas', 'bastantes', 'una_dos', 'normal', 'dos_tres', 'preparada', 'reciente', 'a_veces', 'la_dejo', 'de_todo', 'casi_ninguna_queria', 'espere', 'espero', 'una', 'si', 'no_serio', 'mitad', 'nunca'], 'P4', 'P5'],
  ['M22', 'm', ['si', 'tres_mas', 'bastantes', 'una_dos', 'normal', 'cuatro_mas', 'preparada', 'reciente', 'a_veces', 'la_dejo', 'de_todo', 'mitad_mas', 'escribi_yo', 'escribo', 'dos_mas', 'si', 'enfrio', 'casi_todas', 'nunca'], 'P5', 'P4'],
  ['M23', 'm', ['si', 'una_dos', 'bastantes', 'una_dos', 'normal', 'dos_tres', 'preparada', 'reciente', 'a_veces', 'no_mueren', 'reimos', 'casi_ninguna_queria', 'escribi_yo', 'escribo', 'ninguna', _, _, _, 'nunca'], 'P4', null],
  ['M24', 'm', ['si', 'tres_mas', 'bastantes', 'una_dos', 'normal', 'dos_tres', 'preparada', 'dos_cinco', 'a_veces', 'la_dejo', 'de_todo', 'casi_ninguna_queria', 'hablamos', 'contesto', 'ninguna', _, _, _, 'una'], 'P4', 'P2'],
  ['M25', 'm', ['no', 'una_dos', 'bastantes', 'una_dos', _, _, _, _, 'a_veces', 'no_mueren', 'de_todo', 'mitad_mas', 'quedamos', 'contesto', 'una', 'si', 'va_bien', 'ninguna', 'no_he_quedado'], 'ajuste', 'S'],
  ['M26', 'm', ['si', 'tres_mas', 'bastantes', 'tres_mas', 'normal', 'cuatro_mas', 'preparada', 'reciente', 'a_veces', 'la_dejo', 'de_todo', 'mitad_mas', 'quedamos', 'contesto', 'dos_mas', 'a_medias', 'diluyo', 'alguna', 'nunca'], 'ajuste', null],
  ['M27', 'm', ['si', 'ninguna', 'casi_ninguno', 'ninguno', 'bajo', 'ninguna', 'selfie', 'reciente', 'siempre_yo', 'pocos', 'el_dia', _, _, _, 'ninguna', _, _, _, 'nunca'], 'P2', null, RAPIDO],
  ['M28', 'm', ['si', 'ninguna', 'pocos', 'ninguno', 'bajo', 'una', 'primer_plano', 'reciente', 'a_veces', 'pocos', 'reimos', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'P2', 'P1'],
  ['M29', 'm', ['no', 'ninguna', 'no_hablo', 'una_dos', _, _, _, _, 'no_hablo', 'no_hablo', 'no_hablo', _, _, _, 'ninguna', _, _, _, 'no_he_quedado'], 'S', null],
  ['M30', 'm', ['si', 'tres_mas', 'pocos', 'una_dos', 'normal', 'dos_tres', 'preparada', 'reciente', 'a_veces', 'no_propone', 'de_todo', 'mitad_mas', 'quedamos', 'contesto', 'dos_mas', 'si', 'no_serio', 'mitad', 'nunca'], 'P5', null]
];

const P = {};
ANEXO.forEach(([id, s, l]) => { P[id] = persona(s, l); });
const calc = (resp, meta) => D.calcula(resp, meta || LENTO);
const con = (id, cambios) => Object.assign({}, P[id], cambios);

/* ------------------------------------------------------------------ */
/* Las 30 personas del anexo                                          */
/* ------------------------------------------------------------------ */

ANEXO.forEach(([id, , , principal, secundario, meta]) => {
  test(`anexo ${id} → ${principal}${secundario ? ' (sec. ' + secundario + ')' : ''}`, () => {
    const r = calc(P[id], meta);
    assert.equal(r.principal, principal, `${id} principal`);
    assert.equal(r.secundario, secundario, `${id} secundario`);
  });
});

test('anexo: cada respuesta del anexo existe como opción de su pregunta', () => {
  for (const [id, s] of ANEXO) {
    const r = P[id];
    for (const q of Object.keys(r)) {
      if (q === 'G0') continue;
      assert.ok(D.opcion(s, q, r[q]), `${id}: ${q}=${r[q]} no existe`);
    }
  }
});

test('anexo: las respuestas coinciden con las preguntas que salen (secuencia)', () => {
  for (const [id] of ANEXO) {
    const r = P[id];
    const sec = D.secuencia(r);
    for (const q of Object.keys(r)) assert.ok(sec.includes(q), `${id}: ${q} contestada pero no sale`);
    for (const q of sec) if (q !== '4p') assert.ok(r[q] != null, `${id}: ${q} sale pero no está contestada`);  // 4p (quién pagó, mujeres) es posterior al anexo y no puntúa
  }
});

test('anexo: H13 y M27 salen como baja confianza (no leen)', () => {
  assert.equal(calc(P.H13, RAPIDO).bajaConfianza, true);
  assert.equal(calc(P.M27, RAPIDO).bajaConfianza, true);
  for (const [id, , , , , meta] of ANEXO) if (!meta) assert.equal(calc(P[id]).bajaConfianza, false, id);
});

test('anexo: cálculos clave del anexo (sumas de etapa)', () => {
  assert.equal(calc(P.H02).etapas[3].suma, 7);
  assert.equal(calc(P.H08).etapas[4].suma, 6);
  assert.equal(calc(P.H08).etapas[5].suma, 5);
  assert.equal(calc(P.M22).etapas[4].suma, 6);
  assert.equal(calc(P.H09).etapas[4].suma, 5);
  assert.equal(calc(P.M30).etapas[3].suma, 5);
  assert.equal(calc(P.H03).etapas[3].suma, 6);
  assert.equal(calc(P.H10).etapas[3].suma, 8);
  assert.equal(calc(P.H11).etapas[4].suma, 5);
  assert.equal(calc(P.H05).etapas[1].suma, 5);
  assert.equal(calc(P.M18).etapas[3].suma, 8);
  assert.equal(calc(P.M23).etapas[4].suma, 9);
  assert.equal(calc(P.H12).etapas[5].suma, 1);
});

/* ------------------------------------------------------------------ */
/* Preguntas y orden                                                   */
/* ------------------------------------------------------------------ */

test('secuencia: entre 7 y 17 preguntas tras G0-G2', () => {
  assert.equal(D.secuencia(P.M29).length - 3, 7);
  assert.equal(D.secuencia(P.H09).length - 3, 17);
});

test('secuencia: sin apps no sale la etapa 2; sin citas no sale la 4; x5b-d detrás de x5a', () => {
  const s1 = D.secuencia(P.H01);
  assert.ok(!s1.some(q => q.charAt(0) === '2'));
  assert.ok(!s1.some(q => q.charAt(0) === '4'));
  const i = s1.indexOf('5a');
  assert.deepEqual(s1.slice(i, i + 4), ['5a', '5b', '5c', '5d']);
  assert.ok(!D.secuencia(P.H14).includes('5b'));
});

test('secuencia: nunca dos de la misma etapa seguidas (salvo x5a→x5d)', () => {
  const s = D.secuencia(P.H09).slice(3);
  for (let i = 1; i < s.length; i++) {
    if (s[i].charAt(0) === '5' && s[i - 1].charAt(0) === '5') continue;
    assert.notEqual(s[i].charAt(0), s[i - 1].charAt(0), s.join(' '));
  }
});

test('opciones: escalas ordenadas no se barajan; n/p al final; el resto se baraja', () => {
  const rng = () => 0;
  const h1a = D.opcionesEnOrden(D.pregunta('h', '1a'), rng).map(o => o.id);
  assert.deepEqual(h1a, ['casi_ninguna', 'algunas', 'mayoria', 'casi_todas', 'no_propongo']);
  const h3b = D.opcionesEnOrden(D.pregunta('h', '3b'), rng).map(o => o.id);
  assert.equal(h3b[h3b.length - 1], 'no_hablo');
  assert.notDeepEqual(h3b.slice(0, 5), ['pocos', 'no_propongo', 'excusas', 'la_dejo', 'no_mueren']);
  assert.equal(new Set(h3b).size, 6);
});

test('textos: ninguna forma de vosotros en preguntas ni frases', () => {
  const vos = /\b(\w+áis|\w+éis|\w+asteis|\w+isteis|erais|conoceros|vosotros|vuestr\w*)\b/i;
  const textos = [];
  for (const s of ['h', 'm']) for (const q of Object.values(D.PREGUNTAS[s])) {
    textos.push(q.texto, ...q.ops.map(o => o.texto));
  }
  textos.push(...Object.values(D.FRASES));
  for (const t of textos) assert.ok(!vos.test(t), t);
});

/* ------------------------------------------------------------------ */
/* Reglas del cálculo, casos límite                                    */
/* ------------------------------------------------------------------ */

test('cortes 2-4: rota con dos tercios del máximo (2→4, 3→6, 4→8)', () => {
  // H10: etapa 4 = 3+1+0 = 4 de 9 → no rota
  assert.equal(calc(P.H10).etapas[4].rota, false);
  // H07: etapa 4 = 6 de 9 → rota
  assert.equal(calc(P.H07).etapas[4].rota, true);
  // etapa 3 con 4 respuestas: 8 rota, 7 no
  assert.equal(calc(P.H10).etapas[3].items.length, 4);
  assert.equal(calc(P.H10).etapas[3].rota, true);
  const siete = calc(con('H10', { '3c': 'reimos', '3a': 'una_dos', '3b': 'no_propongo' }));
  assert.equal(siete.etapas[3].suma, 6);
  assert.equal(siete.etapas[3].rota, false);
});

test('etapas sin datos: menos de 2 preguntas que puntúan', () => {
  const r = calc(P.H14);
  assert.equal(r.etapas[3].datos, false);
  assert.equal(r.etapas[5].datos, false);
});

test('H1a "no suelo proponer" cuenta en la etapa 3 con 2', () => {
  const e3 = calc(P.H04).etapas[3];
  const it = e3.items.find(i => i.q === '1a');
  assert.equal(it.v, 2);
  assert.ok(!calc(P.H04).etapas[1].items.some(i => i.q === '1a'));
});

test('H3b "excusas" vale 3 solo con H2a normal', () => {
  assert.equal(calc(P.H03).etapas[3].items.find(i => i.q === '3b').v, 3);
  assert.equal(calc(P.H05).etapas[3].items.find(i => i.q === '3b').v, 2);
});

test('si hay matches, atraes: x1a pasa a la etapa 3 y P1 no puede ser principal', () => {
  const r = calc(con('H05', { '2a': 'normal', '1a': 'casi_todas' }));
  assert.ok(r.etapas[3].items.some(i => i.q === '1a' && i.v === 3));
  assert.notEqual(r.principal, 'P1');
});

test('excusas con matches regulares (hombres): H1a a la etapa 3 y P1 bloqueado', () => {
  const r = calc(con('H05', { '2a': 'regular', '1a': 'casi_todas', '3b': 'excusas' }));
  assert.equal(r.senales.excusasRegulares, true);
  assert.ok(r.etapas[3].items.some(i => i.q === '1a'));
  assert.notEqual(r.principal, 'P1');
});

test('traspaso mujeres: x2a bajo y perfil roto → M1a pasa a la etapa 2', () => {
  const r = calc(P.M20);
  assert.equal(r.senales.traspasoPerfil, true);
  assert.ok(r.etapas[2].items.some(i => i.q === '1a'));
  assert.ok(!r.etapas[1].items.some(i => i.q === '1a'));
});

test('señal de imagen: +2 a la etapa 1; con señal de atracción, a la etapa 2', () => {
  assert.equal(calc(P.H05).etapas[1].extra, 2);
  const r = calc(con('H05', { '1b': 'tres_mas' }));
  assert.equal(r.etapas[1].extra, 0);
  assert.equal(r.etapas[2].extra, 2);
});

test('fotos que fallan con matches regulares → etapa 2 rota aunque no llegue al corte', () => {
  const r = calc(P.M17);
  assert.ok(r.etapas[2].suma < 8);
  assert.equal(r.etapas[2].rota, true);
});

test('atrae fuera y no hace matches → etapa 2 rota aunque las fotos estén bien', () => {
  const r = calc(con('H06', { '2b': 'cuatro_mas', '2c': 'preparada' }));
  assert.equal(r.etapas[2].rota, true);
  assert.equal(r.principal, 'P2');
});

test('etapa 5: rota con 4; sin interés real → x5c vale 0 y no sale P5', () => {
  assert.equal(calc(P.H15).etapas[5].rota, true);
  const r = calc(con('H15', { '5b': 'a_medias' }));
  assert.equal(r.etapas[5].items.find(i => i.q === '5c').v, 0);
  assert.notEqual(r.principal, 'P5');
  assert.notEqual(r.secundario, 'P5');
});

test('etapa 4 y 5 rotas: manda la 4, salvo x4a = la mitad o más', () => {
  assert.equal(calc(P.H08).principal, 'P4');
  assert.equal(calc(P.M22).principal, 'P5');
});

test('etapa 4 y 5 rotas con una o dos citas: manda también sobre ese filtro', () => {
  // Sin probar en el anexo (ambigüedad 4): G2 una o dos, E4 rota con x4a la mitad o más, E5 rota.
  const r = calc(con('M22', { G2: 'una_dos' }));
  assert.equal(r.principal, 'P5');
  assert.equal(r.secundario, 'P4');
  const r2 = calc(con('H08', { G2: 'una_dos' }));
  assert.equal(r2.principal, 'P4');
  assert.equal(r2.secundario, 'P5');
});

test('filtro sin apps y sin citas → S; sec P5 si la etapa 5 está rota, si no P1 con E1 ≥ 2', () => {
  assert.equal(calc(P.H01).secundario, 'P5');
  assert.equal(calc(P.H14).secundario, 'P1');
  assert.equal(calc(con('H14', { '1b': 'tres_mas' })).secundario, null);   // señal de atracción
  assert.equal(calc(P.M29).secundario, null);                              // E1 propia = 1
});

test('sin apps con citas → S siempre de secundario', () => {
  assert.equal(calc(P.H07).secundario, 'S');
  assert.equal(calc(P.M25).secundario, 'S');
});

test('regla de las fotos: x2d > 5 años o xF más de una vez → P2 de fotos, salte el filtro que salte', () => {
  const a = calc(con('H11', { '2d': 'mas_cinco' }));
  assert.equal(a.principal, 'P2'); assert.equal(a.fotos, true);
  const b = calc(con('H07', { F: 'mas_una' }));        // sin apps y con 3+ citas
  assert.equal(b.principal, 'P2'); assert.equal(b.fotos, true);
});

test('regla de las fotos: no fuerza P4 de secundario (manda sobre la cita sin segunda)', () => {
  // H10: una o dos citas y x4a "casi ninguna" (caso 4 → P4 sec.). Con la regla de las fotos,
  // P4 no se fuerza: el secundario sale por la regla general (E3 rota → P3).
  assert.equal(calc(P.H10).secundario, 'P4');
  const r = calc(con('H10', { '2d': 'mas_cinco' }));
  assert.equal(r.principal, 'P2');
  assert.equal(r.secundario, 'P3');
});

test('tres o más citas: P1 y P2 no pueden ser principal', () => {
  const r = calc(con('H05', { G2: 'tres_mas', '4a': 'mitad_mas', '4b': 'quedamos', '4c': 'yo' }));
  assert.equal(r.etapas[1].rota, true);
  assert.notEqual(r.principal, 'P1');
  assert.notEqual(r.principal, 'P2');
});

test('mujeres M1b ninguno y x2a bajo → P1 (sec. P2 si hay prueba), aunque tenga 3+ citas', () => {
  const r = calc(con('M19', { G2: 'tres_mas', '4a': 'mitad_mas', '4b': 'quedamos', '4c': 'contesto' }));
  assert.equal(r.principal, 'P1');
  const f = calc(con('M19', { '2b': 'una' }));         // fotos que fallan → al revés
  assert.equal(f.principal, 'P2');
  assert.equal(f.secundario, 'P1');
});

test('sin matches y sin citas: P3 y P4 ni principal ni secundario', () => {
  const r = calc(con('H04', { '3a': 'ninguna', '3b': 'no_propongo', '3c': 'el_dia' }));
  assert.equal(r.etapas[3].rota, true);
  assert.equal(r.principal, 'P2');
  assert.equal(r.secundario, 'P1');
});

test('señal de atracción: P1 ni principal ni secundario', () => {
  const r = calc(con('H05', { '1b': 'tres_mas', '1a': 'casi_todas' }));
  assert.notEqual(r.principal, 'P1');
  assert.notEqual(r.secundario, 'P1');
});

test('una o dos citas: P4 solo es principal si no hay otra etapa rota', () => {
  assert.equal(calc(P.M23).principal, 'P4');
  assert.equal(calc(P.H10).principal, 'P3');
});

test('ajuste anulado por una respuesta de 3 (H11, M24) y ajuste normal (H12, M26)', () => {
  assert.equal(calc(P.H11).principal, 'P4');
  assert.equal(calc(P.H12).principal, 'ajuste');
  assert.equal(calc(P.M26).etapaAjuste, 3);
});

test('ajuste: la etapa 5 no es la del ajuste con "va bien" ni con sin interés real', () => {
  assert.notEqual(calc(P.M25).etapaAjuste, 5);
  assert.notEqual(calc(P.H12).etapaAjuste, 5);
});

test('ajuste anulado por dos respuestas de 2 y la mitad del máximo', () => {
  // Etapa 4 = menos de la mitad (2) + excusas (2) + pagué yo (0) = 4 de 9 (no rota, < mitad: sigue ajuste)
  const a = calc(con('H12', { '4a': 'menos_mitad', '4b': 'excusas', '5b': 'si', '5c': 'va_bien', '5d': 'ninguna' }));
  assert.equal(a.principal, 'ajuste');
  // Con 3 respuestas de 2 → 6 de 9 → rota → P4 normal
  const b = calc(con('H12', { '4a': 'menos_mitad', '4b': 'excusas', '4c': 'medias', '5b': 'si', '5c': 'va_bien', '5d': 'ninguna' }));
  assert.equal(b.principal, 'P4');
});

test('empate 3 frente a 4: con una o dos citas, la 3 con un 3 gana aunque la 4 puntúe más', () => {
  // Sin rotas, G2 una o dos. E3 con un 3 (3c el día), E4 más proporción sin 3.
  const r = calc(con('H15', { '3a': 'tres_cinco', '3b': 'no_mueren', '3c': 'el_dia',
    '4a': 'menos_mitad', '4b': 'excusas', '4c': 'yo', '5a': 'ninguna', '5b': _, '5c': _, '5d': _ }));
  assert.equal(r.principal, 'P3');
});

test('aviso de fotos: xF una vez y x4a mala → P2 de secundario', () => {
  assert.equal(calc(P.M24).secundario, 'P2');
  assert.equal(calc(con('M24', { F: 'nunca' })).secundario, null);
});

test('cita sin segunda: una o dos citas y x4a mala → P4 de secundario', () => {
  assert.equal(calc(P.H10).secundario, 'P4');
});

test('matches regulares con fotos flojas → P3 de secundario con una respuesta de 2', () => {
  assert.equal(calc(P.M17).secundario, 'P3');
  const r = calc(con('M17', { '3b': 'no_mueren', '3c': 'de_todo' }));
  assert.notEqual(r.secundario, 'P3');
});

/* ------------------------------------------------------------------ */
/* Control de descuido y ruta conservadora                             */
/* ------------------------------------------------------------------ */

test('descuido: menos de 3 s de media', () => {
  assert.deepEqual(D.descuido(P.H09, { tiempos: [2000, 3000, 3500] }), ['rapido']);
  assert.deepEqual(D.descuido(P.H09, { tiempos: [3000, 3000] }), []);
});

test('descuido: 80% o más en la misma posición', () => {
  assert.ok(D.descuido(P.H09, { posiciones: [0, 0, 0, 0, 1] }).includes('posicion'));
  assert.ok(!D.descuido(P.H09, { posiciones: [0, 0, 0, 1, 1] }).includes('posicion'));
});

test('descuido: incoherencias de hombres y mujeres', () => {
  assert.ok(D.descuido(con('H09', { '3a': 'seis_mas', '3b': 'no_propongo' }), {}).includes('incoherente'));
  assert.ok(D.descuido(con('M18', { '1a': 'casi_todos', '3b': 'no_propone' }), {}).includes('incoherente'));
});

test('ruta conservadora: 3+ citas → P4; sin apps → S; con apps → P2; nunca P1, sin secundario', () => {
  const a = calc(P.H09, RAPIDO); assert.equal(a.principal, 'P4'); assert.equal(a.secundario, null);
  const b = calc(P.H14, RAPIDO); assert.equal(b.principal, 'S');
  const c = calc(P.H05, RAPIDO); assert.equal(c.principal, 'P2');
});

/* ------------------------------------------------------------------ */
/* Informes                                                            */
/* ------------------------------------------------------------------ */

const txt = h => h.replace(/<[^>]+>/g, '');
const inf = (id, pagina, meta) => D.informe(calc(P[id], meta), P[id], { pagina: pagina || 'compradores' });

test('informe: título, reto y módulo según principal y sexo', () => {
  const a = inf('H10'); assert.equal(a.titulo, 'Las conversaciones se apagan'); assert.equal(a.reto, '49'); assert.equal(a.modulo, 'Módulo 4 · Primeras conversaciones');
  const b = inf('M17'); assert.equal(b.reto, '48b');
  const c = inf('M16'); assert.equal(c.reto, '57b'); assert.equal(c.modulo, 'Módulo 2 · Tu perfil digital');
  const d = inf('M22'); assert.equal(d.reto, '58b');
  const e = inf('H05'); assert.equal(e.reto, '51');
  const f = inf('H12'); assert.equal(f.titulo, 'No hay nada roto');
});

test('informe: lo que funciona, como mucho dos y nunca de la etapa principal ni secundaria', () => {
  const r = calc(P.H08);                                   // P4 sec P5
  const l = D.loQueFunciona(r, P.H08);
  assert.ok(l.length <= 2);
  assert.ok(!l.includes('tus primeras citas tienen segunda'));
  assert.ok(!l.includes('llegas a la tercera cita'));
  assert.deepEqual(l, ['hay mujeres que te buscan', 'tu perfil consigue matches']);
});

test('informe: sin nada que funcione arranca con "Ya has hecho lo más difícil"', () => {
  assert.equal(txt(inf('H04').parrafos[0]), 'Ya has hecho lo más difícil, que es mirarlo.');
});

test('informe: citas, como mucho dos, las de más puntos', () => {
  const cs = inf('H10').citas;                            // E3: 3a 2, 3b 3, 3c 3
  assert.equal(cs.length, 2);
  assert.deepEqual(cs.map(c => c.q), ['3b', '3c']);
});

test('informe: H3a no se cita junto a H3b "excusas"', () => {
  const resp = con('H03', { '3a': 'ninguna' });
  const cs = D.informe(calc(resp), resp, {}).citas.map(c => c.q);
  assert.ok(!(cs.includes('3a') && cs.includes('3b')), cs.join());
});

test('informe: M4b no se cita junto a M4c', () => {
  const cs = inf('M23').citas.map(c => c.q);
  assert.ok(!(cs.includes('4b') && cs.includes('4c')), cs.join());
  assert.equal(cs.length, 2);                              // 4a y la de más puntos del par
});

test('informe P2 de fotos: cita x2d y sustituye el párrafo "Traducido"; sin "no es tu problema"', () => {
  const resp = con('H11', { '2d': 'mas_cinco' });
  const i = D.informe(calc(resp), resp, {});
  const t = i.parrafos.map(txt).join('\n');
  assert.ok(t.includes('tu foto más antigua es de hace más de cinco años'));
  assert.ok(t.includes('Tus fotos enseñan a alguien'));
  assert.ok(!t.includes('Traducido'));
  assert.ok(!t.includes('No necesitas cambiar cómo hablas'));
});

test('informe: "no es tu problema" se quita si su etapa está rota o suma 4', () => {
  const t = inf('H02').parrafos.map(txt).join('\n');     // P2 con E3 rota
  assert.ok(!t.includes('No necesitas cambiar cómo hablas'));
  const t2 = inf('H06').parrafos.map(txt).join('\n');    // P2 con E3 = 3
  assert.ok(t2.includes('No necesitas cambiar cómo hablas'));
});

test('informe P3: explicación sacada de una respuesta citada', () => {
  assert.ok(inf('H10').parrafos.map(txt).join(' ').includes('Se ha quedado en un cuestionario'));
  assert.ok(inf('M18').parrafos.map(txt).join(' ').includes('él no da el paso'));
});

test('informe: secundario con su frase; baja confianza con aviso y sin secundario', () => {
  assert.ok(inf('H10').parrafos.map(txt).join(' ').includes('Y otra cosa que también flojea: lo que pasa después de la primera cita.'));
  const b = inf('H13', 'compradores', RAPIDO);
  assert.ok(b.aviso && b.aviso.length === 2);
  assert.ok(!b.parrafos.join(' ').includes('también flojea'));
});

test('informe: la página pública no habla de "toda la biblioteca"', () => {
  assert.ok(!inf('H10', 'publica').parrafos.join(' ').includes('biblioteca'));
  assert.ok(inf('H10', 'compradores').parrafos.join(' ').includes('toda la biblioteca está abierta'));
});

test('informe: todas las personas del anexo generan informe completo, en las dos páginas', () => {
  for (const [id, , , , , meta] of ANEXO) for (const pag of ['publica', 'compradores']) {
    const i = inf(id, pag, meta);
    assert.ok(i.titulo && i.reto && i.modulo && i.parrafos.length >= 3, id);
    assert.ok(!i.parrafos.join(' ').includes('undefined'), id);
  }
});

/* ------------------------------------------------------------------ */
/* Envío                                                                */
/* ------------------------------------------------------------------ */

test('enviarResultado: sin URL no llama a nada ni rompe', async () => {
  let llamado = false;
  const ok = await D.enviarResultado({ email: 'a@b.c' }, '', () => { llamado = true; });
  assert.equal(ok, false);
  assert.equal(llamado, false);
  assert.equal(D.WEBHOOK_URL, '');
});

test('enviarResultado: POST JSON en el cuerpo, nunca en la URL; los errores no rompen', async () => {
  let visto;
  const datos = { nombre: 'Ana', email: 'ana@ejemplo.com', sexo: 'm', principal: 'P3', secundario: null, pagina: 'publica', fecha: '2026-09-30' };
  await D.enviarResultado(datos, 'https://hook.ejemplo/x', (url, o) => { visto = { url, o }; return Promise.resolve({}); });
  assert.equal(visto.url, 'https://hook.ejemplo/x');
  assert.equal(visto.o.method, 'POST');
  assert.deepEqual(JSON.parse(visto.o.body), datos);
  assert.ok(!visto.url.includes('ana'));
  const r = await D.enviarResultado(datos, 'https://hook.ejemplo/x', () => Promise.reject(new Error('red')));
  assert.equal(r, false);
});

test('mujeres: "quién pagó" (4p) sale solo a mujeres con citas y no cambia el resultado', () => {
  const m = P.M21;
  assert.ok(D.secuencia(m).includes('4p'));
  assert.ok(!D.secuencia(P.H05).includes('4p'));
  assert.ok(!D.secuencia(Object.assign({}, m, { G2: 'ninguna' })).includes('4p'));
  const a = calc(m), b = calc(Object.assign({}, m, { '4p': 'yo' }));
  assert.equal(a.principal, b.principal);
  assert.equal(a.secundario, b.secundario);
});

test('2d ya no tiene "No lo sé"', () => {
  assert.ok(!D.pregunta('h', '2d').ops.some(o => o.id === 'no_se'));
});
