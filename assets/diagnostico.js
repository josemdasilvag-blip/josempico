/* =====================================================================
   diagnostico.js — motor del diagnóstico de entrada (v3.3, algoritmo cerrado)

   Especificación: biblioteca-josepico/guias/47-diagnostico-borrador.md
   Este archivo es puro (sin DOM). Funciona en el navegador
   (window.Diagnostico) y en Node (require).

   BLOQUES:
   0. CONFIGURACIÓN  → URL del programa y alta en MailerLite
   1. PREGUNTAS      → textos exactos del borrador (vosotros → ustedes)
   2. MOTOR          → no tocar sin correr:  node --test assets/diagnostico.test.cjs
   3. INFORMES       → plantillas del borrador
   4. ENVÍO          → enviarResultado()
   ===================================================================== */
(function (root) {
  'use strict';

  /* ================================================================
     0. CONFIGURACIÓN
     ================================================================ */

  // Página de venta del curso. Vacía: la página pública no enseña el botón
  // y pone "Muy pronto".
  var URL_CURSO = '';

  // Alta en MailerLite a través del Worker de josempico.com (worker-correo/). Vacío: no se envía nada.
  var SUSCRIBIR_URL = 'https://josempico.com/api/suscribir';

  /* ================================================================
     1. PREGUNTAS
     Cada opción: id, texto, v (puntos; null = n/p), np (va al final).
     orden:true = escala ordenada, no se baraja (de menos a más).
     ================================================================ */

  var ENTRADA = {
    G0: { id: 'G0', texto: 'Eres…', orden: true, ops: [
      { id: 'h', texto: 'Hombre' },
      { id: 'm', texto: 'Mujer' }
    ] },
    G1: { id: 'G1', texto: '¿Usas alguna app de citas ahora mismo?', orden: true, ops: [
      { id: 'si', texto: 'Sí' },
      { id: 'no', texto: 'No' }
    ] },
    G2: { id: 'G2', texto: 'En los últimos tres meses, ¿cuántas primeras citas has tenido?', orden: true, ops: [
      { id: 'ninguna', texto: 'Ninguna' },
      { id: 'una_dos', texto: 'Una o dos' },
      { id: 'tres_mas', texto: 'Tres o más' }
    ] }
  };

  var NO_HABLO = { id: 'no_hablo', texto: 'Ahora mismo no hablo con nadie', v: null, np: true };

  function fotoMasAntigua() {
    return { texto: '¿De cuándo es la foto más antigua de tu perfil?', orden: true, ops: [
      { id: 'reciente', texto: 'De este año o del anterior', v: 0 },
      { id: 'dos_cinco', texto: 'De hace entre dos y cinco años', v: 0 },
      { id: 'mas_cinco', texto: 'De hace más de cinco años', v: 3 }
    ] };
  }
  function conversacionesVan() {
    return { texto: 'Pasados los primeros días, ¿de qué suelen ir tus conversaciones?', ops: [
      { id: 'el_dia', texto: 'Siempre de lo mismo: qué tal el día, qué hiciste, qué vas a hacer. No dan juego', v: 3 },
      { id: 'reimos', texto: 'Hablamos de nuestras cosas y cae alguna broma, pero sin piques ni tonteo', v: 1 },
      { id: 'de_todo', texto: 'De todo un poco, con bromas y piques', v: 0 },
      NO_HABLO
    ] };
  }
  function cuantasSegunda(ella) {
    return { texto: 'De tus últimas primeras citas, ¿cuántas tuvieron segunda?', ops: [
      { id: 'casi_ninguna_queria', texto: 'Casi ninguna, y yo sí quería', v: 3 },
      { id: 'menos_mitad', texto: 'Menos de la mitad', v: 2 },
      { id: 'mixto', texto: 'Unas no quise yo y otras no quiso ' + ella, v: 1 },
      { id: 'mitad_mas', texto: 'La mitad o más', v: 0 },
      { id: 'casi_ninguna_no_quise', texto: 'Casi ninguna, pero porque yo no quise', v: 0 }
    ] };
  }
  function tercerasCitas(cuantas, ninguna) {
    return { texto: 'En el último año, ¿con ' + cuantas + ' has llegado a la tercera cita o más?', orden: true, ops: [
      { id: 'ninguna', texto: ninguna },
      { id: 'una', texto: ninguna === 'Ninguna' ? 'Una' : 'Uno' },
      { id: 'dos_mas', texto: 'Dos o más' }
    ] };
  }
  function interesReal(ultima) {
    return { texto: 'Piensa en ' + ultima + '. ¿Te interesaba de verdad? ¿Cumplía con tus expectativas?', orden: true, ops: [
      { id: 'si', texto: 'Sí', v: null },
      { id: 'a_medias', texto: 'A medias, o no mucho', v: null }
    ] };
  }
  function quePaso(conQuien, enfrio) {
    return { texto: '¿Qué pasó con ' + conQuien + '?', ops: [
      { id: 'va_bien', texto: 'Seguimos, y va bien', v: 0 },
      { id: 'enfrio', texto: enfrio, v: 3 },
      { id: 'diluyo', texto: 'No llegamos a hablar de qué éramos y se fue diluyendo', v: 3 },
      { id: 'no_serio', texto: 'Me dijo que no buscaba nada serio', v: 2 },
      { id: 'discutir', texto: 'Empezamos a discutir y se rompió', v: 2 },
      { id: 'lo_deje', texto: 'Lo dejé yo', v: 0 }
    ] };
  }
  function seCayeron() {
    return { texto: 'De las veces que has llegado a varias citas con alguien que te interesaba, ¿cuántas se cayeron antes de ser algo?', orden: true, ops: [
      { id: 'ninguna', texto: 'Ninguna', v: 0 },
      { id: 'alguna', texto: 'Alguna', v: 1 },
      { id: 'mitad', texto: 'La mitad', v: 2 },
      { id: 'casi_todas', texto: 'Casi todas', v: 3 }
    ] };
  }
  function preguntaFotos() {
    return { texto: 'Cuando has quedado con alguien que conociste por una app o por redes, ¿te han dicho, o has notado, que no te parecías a tus fotos?', orden: true, ops: [
      { id: 'nunca', texto: 'Nunca', v: null },
      { id: 'una', texto: 'Una vez', v: null },
      { id: 'mas_una', texto: 'Más de una vez', v: null },
      { id: 'no_he_quedado', texto: 'No he quedado con nadie así', v: null, np: true }
    ] };
  }

  var PREGUNTAS = {
    h: {
      '1a': { texto: 'De cada 10 veces que propones una cita, ¿cuántas te dicen que no, te ponen excusas o no contestan?', orden: true, ops: [
        { id: 'casi_ninguna', texto: 'Casi ninguna (0 a 2)', v: 0 },
        { id: 'algunas', texto: 'Algunas (3 a 5)', v: 1 },
        { id: 'mayoria', texto: 'La mayoría (6 a 8)', v: 2 },
        { id: 'casi_todas', texto: 'Casi todas (9 o 10)', v: 3 },
        { id: 'no_propongo', texto: 'No suelo proponer yo', v: null, np: true }
      ] },
      '1b': { texto: 'En los últimos tres meses, ¿cuántas mujeres han empezado ellas la conversación contigo? En persona, por redes o en las apps.', orden: true, ops: [
        { id: 'ninguna', texto: 'Ninguna', v: 1 },
        { id: 'una_dos', texto: 'Una o dos', v: 0 },
        { id: 'tres_mas', texto: 'Tres o más', v: 0 }
      ] },
      '2a': { texto: 'De cada 100 likes que das, ¿cuántos acaban en match, más o menos?', orden: true, ops: [
        { id: 'bajo', texto: 'Entre 0 y 3', v: 3 },
        { id: 'regular', texto: 'Entre 4 y 6', v: 1 },
        { id: 'normal', texto: '7 o más', v: 0 }
      ] },
      '2b': { texto: '¿Cuántas fotos de tu perfil cumplen todo esto: no sale nadie más que tú, luz de frente, y se te ve de cintura para arriba o de cuerpo entero?', orden: true, ops: [
        { id: 'ninguna', texto: 'Ninguna', v: 3 },
        { id: 'una', texto: 'Una', v: 2 },
        { id: 'dos_tres', texto: 'Dos o tres', v: 1 },
        { id: 'cuatro_mas', texto: 'Cuatro o más', v: 0 }
      ] },
      '2c': { texto: '¿Qué foto tienes la primera en tu perfil?', ops: [
        { id: 'selfie', texto: 'Un selfie, o una foto del espejo', v: 3 },
        { id: 'gente', texto: 'Una foto con más gente, con gafas de sol, o de lejos', v: 3 },
        { id: 'primer_plano', texto: 'Un primer plano de la cara', v: 3 },
        { id: 'dia_a_dia', texto: 'Una foto de mi día a día: en casa, en el trabajo, en un sitio random', v: 2 },
        { id: 'preparada', texto: 'Una foto preparada: arreglado, en un sitio elegido para la foto, o haciendo lo que sé hacer', v: 0 }
      ] },
      '2d': fotoMasAntigua(),
      '3a': { texto: 'De tus últimas 10 conversaciones con un match o con un número, ¿en cuántas llegaste a proponer una cita?', orden: true, ops: [
        { id: 'ninguna', texto: 'En ninguna', v: 3 },
        { id: 'una_dos', texto: 'En una o dos', v: 2 },
        { id: 'tres_cinco', texto: 'En tres a cinco', v: 1 },
        { id: 'seis_mas', texto: 'En seis o más', v: 0 },
        NO_HABLO
      ] },
      '3b': { texto: 'Cuando una conversación se te muere, ¿cuándo suele pasar?', ops: [
        { id: 'pocos', texto: 'A los pocos mensajes, se va apagando', v: 2 },
        { id: 'no_propongo', texto: 'Llevamos días hablando y no llego a proponer una cita', v: 3 },
        { id: 'excusas', texto: 'Propongo una cita y me pone excusas', v: 2 },   // 3 con H2a normal (motor)
        { id: 'la_dejo', texto: 'Casi siempre la dejo morir yo, porque no me interesa', v: 0 },
        { id: 'no_mueren', texto: 'No se me suelen morir', v: 0 },
        NO_HABLO
      ] },
      '3c': conversacionesVan(),
      '4a': cuantasSegunda('ella'),
      '4b': { texto: 'Después de tu última primera cita, ¿qué pasó en los días siguientes?', ops: [
        { id: 'escribi_mucho', texto: 'Le escribí mucho, o con muchas ganas, y se fue enfriando', v: 3 },
        { id: 'excusas', texto: 'Propuse la segunda y me puso excusas', v: 2 },
        { id: 'nadie', texto: 'No escribió nadie y se murió sola', v: 2 },
        { id: 'hablamos', texto: 'Hablamos, pero la segunda no llegó', v: 1 },
        { id: 'quedamos', texto: 'Quedamos otra vez', v: 0 },
        { id: 'no_quise', texto: 'No quise volver a verla', v: 0 }
      ] },
      '4c': { texto: 'En tu última primera cita, ¿quién pagó?', ops: [
        { id: 'ella', texto: 'Pagó ella', v: 3 },
        { id: 'medias', texto: 'Pagamos a medias', v: 2 },
        { id: 'yo', texto: 'Pagué yo', v: 0 },
        { id: 'nada', texto: 'No hubo nada que pagar', v: null, np: true }
      ] },
      '5a': tercerasCitas('cuántas mujeres', 'Ninguna'),
      '5b': interesReal('la última mujer con la que llegaste a la tercera cita'),
      '5c': quePaso('ella', 'Se fue enfriando ella y se acabó, y yo quería seguir'),
      '5d': seCayeron(),
      'F': preguntaFotos()
    },
    m: {
      '1a': { texto: 'De cada 10 hombres con los que hablas, ¿cuántos te proponen una cita?', orden: true, ops: [
        { id: 'casi_ninguno', texto: 'Casi ninguno (0 o 1)', v: 3 },
        { id: 'pocos', texto: 'Pocos (2 a 4)', v: 2 },
        { id: 'bastantes', texto: 'Bastantes (5 a 7)', v: 1 },
        { id: 'casi_todos', texto: 'Casi todos (8 a 10)', v: 0 },
        NO_HABLO
      ] },
      '1b': { texto: 'En los últimos tres meses, fuera de las apps, ¿cuántos hombres se te han acercado, te han pedido el número o te han escrito sin conocerse?', orden: true, ops: [
        { id: 'ninguno', texto: 'Ninguno', v: 3 },
        { id: 'una_dos', texto: 'Uno o dos', v: 1 },
        { id: 'tres_mas', texto: 'Tres o más', v: 0 }
      ] },
      '2a': { texto: 'De cada 100 likes que das, ¿cuántos acaban en match, más o menos?', orden: true, ops: [
        { id: 'bajo', texto: 'Entre 0 y 24', v: 3 },
        { id: 'regular', texto: 'Entre 25 y 39', v: 1 },
        { id: 'normal', texto: '40 o más', v: 0 }
      ] },
      '2b': { texto: '¿Cuántas fotos de tu perfil cumplen todo esto: sales tú sola, luz de frente, y se te ve de cintura para arriba o de cuerpo entero?', orden: true, ops: [
        { id: 'ninguna', texto: 'Ninguna', v: 3 },
        { id: 'una', texto: 'Una', v: 2 },
        { id: 'dos_tres', texto: 'Dos o tres', v: 1 },
        { id: 'cuatro_mas', texto: 'Cuatro o más', v: 0 }
      ] },
      '2c': { texto: '¿Qué foto tienes la primera en tu perfil?', ops: [
        { id: 'selfie', texto: 'Un selfie, o una foto del espejo', v: 3 },
        { id: 'gente', texto: 'Una foto con más gente, con gafas de sol, o de lejos', v: 3 },
        { id: 'primer_plano', texto: 'Un primer plano de la cara', v: 3 },
        { id: 'dia_a_dia', texto: 'Una foto de mi día a día: en casa, en el trabajo, en un sitio random', v: 2 },
        { id: 'preparada', texto: 'Una foto preparada: arreglada, en un sitio elegido para la foto', v: 0 }
      ] },
      '2d': fotoMasAntigua(),
      '3a': { texto: '¿Quién suele empezar tus conversaciones?', ops: [
        { id: 'siempre_yo', texto: 'Siempre yo', v: 3 },
        { id: 'nunca_yo', texto: 'Nunca escribo yo primero', v: 2 },
        { id: 'a_veces', texto: 'A veces yo, a veces él', v: 0 },
        NO_HABLO
      ] },
      '3b': { texto: 'Cuando una conversación se te muere, ¿cuándo suele pasar?', ops: [
        { id: 'pocos', texto: 'A los pocos mensajes, se va apagando', v: 2 },
        { id: 'no_propone', texto: 'Llevamos días hablando y no propone una cita', v: 3 },
        { id: 'excusas', texto: 'Propongo yo la cita y me pone excusas', v: 2 },
        { id: 'la_dejo', texto: 'Casi siempre la dejo morir yo, porque no me interesa', v: 0 },
        { id: 'no_mueren', texto: 'No se me suelen morir', v: 0 },
        NO_HABLO
      ] },
      '3c': conversacionesVan(),
      '4a': cuantasSegunda('él'),
      '4b': { texto: 'Después de tu última primera cita, ¿qué pasó en los días siguientes?', ops: [
        { id: 'escribi_yo', texto: 'Le escribí yo al día siguiente, con muchas ganas, y se fue enfriando', v: 3 },
        { id: 'espere', texto: 'Esperé y no escribió', v: 2 },
        { id: 'hablamos', texto: 'Hablamos, pero la segunda no llegó', v: 1 },
        { id: 'quedamos', texto: 'Quedamos otra vez', v: 0 },
        { id: 'no_quise', texto: 'No quise volver a verle', v: 0 }
      ] },
      // Solo informa (no puntúa): dice con qué hombres está quedando, para filtrar.
      '4p': { texto: 'En tu última primera cita, ¿quién pagó?', ops: [
        { id: 'el', texto: 'Pagó él', v: null },
        { id: 'medias', texto: 'Pagamos a medias', v: null },
        { id: 'yo', texto: 'Pagué yo', v: null },
        { id: 'nada', texto: 'No hubo nada que pagar', v: null, np: true }
      ] },
      '4c': { texto: 'En los días después de una primera cita que te gustó, ¿qué sueles hacer?', ops: [
        { id: 'escribo', texto: 'Le escribo yo, y bastante', v: 3 },
        { id: 'espero', texto: 'Espero a que haga todo él, sin demostrarle nada', v: 2 },
        { id: 'contesto', texto: 'Le escribo yo, pero sin mucha intensidad', v: 0 }
      ] },
      '5a': tercerasCitas('cuántos hombres', 'Ninguno'),
      '5b': interesReal('el último hombre con el que llegaste a la tercera cita'),
      '5c': quePaso('él', 'Se fue enfriando él y se acabó, y yo quería seguir'),
      '5d': seCayeron(),
      'F': preguntaFotos()
    }
  };
  ['h', 'm'].forEach(function (s) {
    Object.keys(PREGUNTAS[s]).forEach(function (k) { PREGUNTAS[s][k].id = k; });
  });

  // Orden intercalado. x5b, x5c y x5d van justo detrás de x5a si x5a no es "ninguna".
  var ORDEN = ['2a', '3a', '1b', '4a', '2b', '3c', '1a', '5a', '4b', '2c', '3b', '4p', '4c', '2d', 'F'];

  /* ================================================================
     2. MOTOR
     ================================================================ */

  function etapaDe(q) { return q === 'F' ? 0 : +q.charAt(0); }

  // Las preguntas que tocan, según lo contestado hasta ahora.
  function secuencia(resp) {
    resp = resp || {};
    var sec = ['G0', 'G1', 'G2'];
    if (!resp.G0 || !resp.G1 || !resp.G2) return sec;
    ORDEN.forEach(function (q) {
      var e = etapaDe(q);
      if (e === 2 && resp.G1 !== 'si') return;
      if (e === 4 && resp.G2 === 'ninguna') return;
      if (!pregunta(resp.G0, q)) return;      // preguntas de un solo sexo (4p: solo mujeres)
      sec.push(q);
      if (q === '5a' && resp['5a'] && resp['5a'] !== 'ninguna') sec.push('5b', '5c', '5d');
    });
    return sec;
  }

  function pregunta(sexo, id) {
    return ENTRADA[id] || (PREGUNTAS[sexo] && PREGUNTAS[sexo][id]) || null;
  }

  function opcion(sexo, q, id) {
    var p = pregunta(sexo, q);
    if (!p || id == null) return null;
    for (var i = 0; i < p.ops.length; i++) if (p.ops[i].id === id) return p.ops[i];
    return null;
  }

  // Barajado: escalas ordenadas tal cual; el resto, al azar; n/p siempre al final.
  function opcionesEnOrden(p, rng) {
    rng = rng || Math.random;
    var normales = p.ops.filter(function (o) { return !o.np; });
    var finales = p.ops.filter(function (o) { return o.np; });
    if (!p.orden) {
      for (var i = normales.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var t = normales[i]; normales[i] = normales[j]; normales[j] = t;
      }
    }
    return normales.concat(finales);
  }

  var MALA_SEGUNDA = { casi_ninguna_queria: 1, menos_mitad: 1 };

  // Construye las etapas con sus respuestas que puntúan y todas las señales.
  function analiza(resp) {
    var s = resp.G0, apps = resp.G1 === 'si', g2 = resp.G2;
    function val(q) {
      var o = opcion(s, q, resp[q]);
      return o ? o.v : null;
    }
    var x2a = apps ? resp['2a'] || null : null;
    var v2c = apps ? val('2c') : null;
    var x2b = apps ? resp['2b'] : null;
    var hay5 = !!resp['5a'] && resp['5a'] !== 'ninguna';

    var f = {
      sexo: s, apps: apps, g2: g2, x2a: x2a,
      senalAtraccion: resp['1b'] === 'tres_mas',
      fotosFallan: apps && (x2a === 'bajo' || x2a === 'regular') &&
        (x2b === 'ninguna' || x2b === 'una' || (v2c != null && v2c >= 2)),
      senalImagen: apps && x2a === 'bajo' && (x2b === 'dos_tres' || x2b === 'cuatro_mas') && v2c === 0,
      reglaFotos: (apps && resp['2d'] === 'mas_cinco') || resp.F === 'mas_una',
      sinInteres: hay5 && resp['5b'] === 'a_medias',
      excusasRegulares: s === 'h' && x2a === 'regular' && resp['3b'] === 'excusas',
      sinMatchesSinCitas: apps && x2a === 'bajo' && g2 === 'ninguna',
      reglaMujeres: s === 'm' && resp['1b'] === 'ninguno' && x2a === 'bajo',
      traspasoPerfil: false
    };
    f.hayMatches = x2a === 'normal' || f.excusasRegulares;

    function item(q, v, extra) {
      var it = { q: q, op: resp[q], v: v };
      if (extra) for (var k in extra) it[k] = extra[k];
      return it;
    }
    var E = {};
    for (var k = 1; k <= 5; k++) E[k] = { k: k, items: [], extra: 0 };

    // x1a: dónde puntúa
    var v1a = val('1a');
    var x1aDestino = null;          // 1, 2, 3 o null
    if (s === 'h' && resp['1a'] === 'no_propongo') x1aDestino = 'np3';
    else if (v1a != null) x1aDestino = f.hayMatches ? 3 : 1;

    // Etapa 1
    if (x1aDestino === 1) E[1].items.push(item('1a', v1a));
    if (val('1b') != null) E[1].items.push(item('1b', val('1b')));
    f.e1Propia = (v1a != null ? v1a : 0) + (val('1b') || 0);
    if (f.senalImagen) {
      if (f.senalAtraccion) E[2].extra += 2; else E[1].extra += 2;
    }

    // Etapa 2
    if (apps) ['2a', '2b', '2c', '2d'].forEach(function (q) {
      if (val(q) != null) E[2].items.push(item(q, val(q)));
    });

    // Etapa 3
    ['3a', '3b', '3c'].forEach(function (q) {
      var v = val(q);
      if (q === '3b' && resp['3b'] === 'excusas' && s === 'h' && x2a === 'normal') v = 3;
      if (v != null) E[3].items.push(item(q, v));
    });
    if (x1aDestino === 'np3') E[3].items.push(item('1a', 2, { noPropone: true }));
    if (x1aDestino === 3) E[3].items.push(item('1a', v1a, { traspasado: true }));

    // Etapa 4
    if (g2 !== 'ninguna') {
      ['4a', '4b', '4c'].forEach(function (q) { if (val(q) != null) E[4].items.push(item(q, val(q))); });
      if (resp.F === 'una') E[4].extra += 1;       // suma sin contar como pregunta
    }

    // Etapa 5
    if (hay5) {
      var v5c = f.sinInteres ? 0 : val('5c');
      if (v5c != null) E[5].items.push(item('5c', v5c));
      if (val('5d') != null) E[5].items.push(item('5d', val('5d')));
    }

    function cierra(e) {
      e.suma = e.extra;
      e.items.forEach(function (it) { e.suma += it.v; });
      var n = e.items.length;
      if (e.k === 1) { e.datos = true; e.max = 6; e.rota = e.suma >= 4; }
      else if (e.k === 5) { e.datos = hay5 && n > 0; e.max = 6; e.rota = e.datos && e.suma >= 4; }
      else {
        e.datos = n >= 2; e.max = 3 * n;
        e.rota = e.datos && e.suma >= 2 * n;     // dos tercios del máximo
      }
      e.prop = e.max ? e.suma / e.max : 0;
      e.tiene3 = e.items.some(function (it) { return it.v === 3; });
      e.dosDe2 = e.items.filter(function (it) { return it.v >= 2; }).length >= 2 && e.suma * 2 >= e.max;
    }
    for (k = 1; k <= 5; k++) cierra(E[k]);

    // Reglas de la etapa 2
    if (E[2].datos && (f.fotosFallan || (x2a === 'bajo' && f.senalAtraccion))) E[2].rota = true;

    // Traspaso (mujeres, perfil roto): M1a pasa a la etapa 2
    if (s === 'm' && x2a === 'bajo' && E[2].rota && x1aDestino === 1) {
      E[1].items = E[1].items.filter(function (it) { return it.q !== '1a'; });
      E[2].items.push(item('1a', v1a, { traspasado: true }));
      f.traspasoPerfil = true;
      cierra(E[1]); cierra(E[2]);
      E[2].rota = true;
    }
    return { E: E, f: f };
  }

  // Control de descuido. meta.tiempos: ms por pregunta del cuestionario (sin G0-G2);
  // meta.posiciones: índice en pantalla de la opción elegida (sin G0-G2).
  function descuido(resp, meta) {
    meta = meta || {};
    var motivos = [];
    var t = meta.tiempos || [];
    if (t.length) {
      var media = t.reduce(function (a, b) { return a + b; }, 0) / t.length;
      if (media < 3000) motivos.push('rapido');
    }
    var p = meta.posiciones || [];
    if (p.length) {
      var cuenta = {};
      p.forEach(function (x) { cuenta[x] = (cuenta[x] || 0) + 1; });
      var max = 0;
      for (var x in cuenta) if (cuenta[x] > max) max = cuenta[x];
      if (max / p.length >= 0.8) motivos.push('posicion');
    }
    if (resp.G0 === 'h' && resp['3a'] === 'seis_mas' && resp['3b'] === 'no_propongo') motivos.push('incoherente');
    if (resp.G0 === 'm' && resp['1a'] === 'casi_todos' && resp['3b'] === 'no_propone') motivos.push('incoherente');
    return motivos;
  }

  var ETAPA_DE = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, S: null };
  var POS = { P1: 1, P2: 2, S: 2.5, P3: 3, P4: 4, P5: 5 };

  function calcula(resp, meta) {
    var a = analiza(resp), E = a.E, f = a.f;
    var r = {
      principal: null, secundario: null, etapaAjuste: null,
      fotos: false, bajaConfianza: false, motivos: [], etapas: E, senales: f
    };

    // 6. Control de descuido → ruta conservadora
    r.motivos = descuido(resp, meta);
    if (r.motivos.length) {
      r.bajaConfianza = true;
      r.principal = f.g2 === 'tres_mas' ? 'P4' : (!f.apps ? 'S' : 'P2');
      return r;
    }

    function tiene3(k) { return E[k].tiene3; }
    // ¿gana a sobre b? (a, b: números de etapa)
    function gana(a, b) {
      var tres = (a === 3 && b === 4) || (a === 4 && b === 3);
      if (tres && f.g2 === 'una_dos' && tiene3(3)) return a === 3;
      if (E[a].prop !== E[b].prop) return E[a].prop > E[b].prop;
      if (tres && tiene3(3) !== tiene3(4)) return tiene3(a);
      return a < b;
    }
    function mejor(cands) {
      var m = null;
      cands.forEach(function (k) { if (m === null || gana(k, m)) m = k; });
      return m;
    }
    var rotas = [1, 2, 3, 4, 5].filter(function (k) { return E[k].rota; });
    var ambas45 = E[4].rota && E[5].rota;

    function permitida(k) {
      if (!E[k].datos) return false;
      if (k === 1) return !f.hayMatches && f.g2 !== 'tres_mas' && !f.senalAtraccion;
      if (k === 2) return f.apps && f.g2 !== 'tres_mas';
      if (k === 3) return !f.sinMatchesSinCitas;
      if (k === 4) {
        if (f.sinMatchesSinCitas) return false;
        if (f.g2 === 'una_dos') {
          // "Etapa 4 rota y etapa 5 rota ... manda también sobre el filtro de una o dos"
          var otras = rotas.filter(function (x) { return x !== 4 && !(ambas45 && x === 5); });
          return otras.length === 0;
        }
        return true;
      }
      if (k === 5) return !f.sinInteres;
      return false;
    }

    // 3. Filtros que fijan el principal
    var ruta = 'normal';
    if (f.reglaFotos) { r.principal = 'P2'; r.fotos = true; ruta = 'fotos'; }
    else if (!f.apps && f.g2 === 'ninguna') { r.principal = 'S'; ruta = 'sinAppsSinCitas'; }
    else if (f.reglaMujeres) { r.principal = f.fotosFallan ? 'P2' : 'P1'; ruta = 'mujeres'; }
    else if (f.sinMatchesSinCitas) {
      // Con señal de atracción P1 queda vetado y la etapa 2 está rota: P2.
      r.principal = (f.fotosFallan || f.senalAtraccion) ? 'P2' : 'P1';
      ruta = 'sinMatches';
    } else {
      // 4. El principal: la primera rota permitida, de arriba abajo
      for (var i = 0; i < rotas.length && !r.principal; i++) {
        var k = rotas[i];
        if (!permitida(k)) continue;
        if (k === 4 && ambas45 && resp['4a'] === 'mitad_mas' && permitida(5)) k = 5;
        r.principal = 'P' + k;
      }
      if (!r.principal) {
        var perm = [1, 2, 3, 4, 5].filter(permitida);
        if (rotas.length || (f.apps && f.g2 === 'ninguna')) {
          // Solo rotas bloqueadas, o sin citas y con apps: la de más proporción.
          var m = mejor(perm);
          r.principal = m ? 'P' + m : (f.apps ? 'P2' : 'S');
        } else {
          // Informe de ajuste
          var cands = perm.filter(function (k) {
            if (k === 1) return false;
            if (k === 5 && (resp['5c'] === 'va_bien' || f.sinInteres)) return false;
            return true;
          });
          var todasCero = cands.every(function (k) { return E[k].suma === 0; });
          var ka = todasCero ? cands[cands.length - 1] : mejor(cands);
          if (ka == null) ka = 3;
          if (E[ka].tiene3 || E[ka].dosDe2) r.principal = 'P' + ka;
          else { r.principal = 'ajuste'; r.etapaAjuste = ka; }
        }
      }
    }

    r.secundario = secundario(r, resp, E, f, ruta);
    r.ruta = ruta;
    return r;
  }

  // 5. El secundario
  function secundario(r, resp, E, f, ruta) {
    var p = r.principal;
    var vetoSec = {
      P1: f.senalAtraccion, P3: f.sinMatchesSinCitas, P4: f.sinMatchesSinCitas, P5: f.sinInteres
    };
    function ok(x) { return x && x !== p && !vetoSec[x] && !(p === 'ajuste' && ETAPA_DE[x] === r.etapaAjuste); }
    var pruebaP2 = (E[2].rota || f.fotosFallan) && !f.senalImagen;
    var pruebaP1Mujeres = !f.senalAtraccion && f.e1Propia >= 2;

    // Caso 1 · los que fija un filtro
    if (!f.apps && f.g2 !== 'ninguna') return ok('S') ? 'S' : null;
    if (!f.apps && f.g2 === 'ninguna') {
      if (E[5].rota && ok('P5')) return 'P5';
      if (!f.senalAtraccion && f.e1Propia >= 2 && ok('P1')) return 'P1';
      return null;
    }
    if (f.sinMatchesSinCitas || f.reglaMujeres) {
      if (p === 'P2' && ok('P1')) {
        if (f.sinMatchesSinCitas && !f.senalAtraccion) return 'P1';
        if (f.reglaMujeres && pruebaP1Mujeres) return 'P1';
      }
      if (p === 'P1' && pruebaP2 && ok('P2')) return 'P2';
    }
    // Caso 2 · aviso de fotos
    if (resp.F === 'una' && MALA_SEGUNDA[resp['4a']] && p !== 'P2' && f.g2 !== 'ninguna') return 'P2';
    // Caso 3 · matches regulares con fotos flojas
    if (p === 'P2' && !f.reglaFotos && f.fotosFallan && f.x2a === 'regular' && ok('P3') &&
        E[3].items.some(function (it) { return it.v >= 2; })) return 'P3';
    // Caso 4 · cita sin segunda (no con la regla de las fotos)
    if (!f.reglaFotos && f.g2 === 'una_dos' && MALA_SEGUNDA[resp['4a']] && ok('P4')) return 'P4';

    // Regla general: siguiente rota por debajo; si no, la primera rota por encima.
    var rotas = [];
    for (var k = 1; k <= 5; k++) if (E[k].rota) rotas.push('P' + k);
    if (f.reglaFotos && rotas.indexOf('P2') < 0) rotas.push('P2');
    if (!f.apps) rotas.push('S');
    // "Excusas con matches regulares": P1 de secundario solo con señal de imagen
    if (f.excusasRegulares && !(resp['1b'] === 'ninguna' || f.senalImagen)) {
      rotas = rotas.filter(function (x) { return x !== 'P1'; });
    }
    rotas = rotas.filter(ok).sort(function (a, b) { return POS[a] - POS[b]; });
    var pos = p === 'ajuste' ? r.etapaAjuste : POS[p];
    var debajo = rotas.filter(function (x) { return POS[x] > pos; });
    if (debajo.length) return debajo[0];
    var encima = rotas.filter(function (x) { return POS[x] < pos; });
    return encima.length ? encima[0] : null;
  }

  /* ================================================================
     3. INFORMES
     Todo el texto sale del borrador. Se devuelve HTML con <strong>;
     no se inserta nada que haya escrito la persona.
     ================================================================ */

  var TITULOS = {
    P1: 'Tienes dificultad para atraer',
    P2: 'Tu perfil no está funcionando',
    P3: 'Las conversaciones se apagan',
    P4: 'Llegas a la cita y ahí se acaba',
    P5: 'Empieza algo y se te cae',
    S: 'Todavía no estás en la app',
    ajuste: 'No hay nada roto'
  };

  var RETOS = {
    P1: { h: '51', m: '51b', nombre: 'el reto de 7 días de imagen', modulo: 'Módulo 1 · Tu imagen y tu mejor versión' },
    P2: { h: '48', m: '48b', nombre: 'el reto de 7 días de perfil', modulo: 'Módulo 2 · Tu perfil digital' },
    P3: { h: '49', m: '49b', nombre: 'el reto de 7 días de conversaciones', modulo: 'Módulo 4 · Primeras conversaciones' },
    P4: { h: '50', m: '50b', nombre: 'el reto de 7 días de citas', modulo: 'Módulo 5 · La cita y mantener el interés inicial' },
    P5: { h: '58b', m: '58b', nombre: 'el reto de 7 días para retener', modulo: 'Módulo 6 · Retener, cuando ya llevan un tiempo saliendo' },
    S: { h: '57', m: '57b', nombre: 'el reto de 7 días de tu primer perfil', modulo: 'Módulo 2 · Tu perfil digital' }
  };

  // Nombres de etapa del borrador; P5 y S no tienen nombre en el borrador (ver notas).
  var NOMBRE_ETAPA = {
    P1: 'cómo atraes', P2: 'tu perfil', P3: 'tus conversaciones',
    P4: 'lo que pasa después de la primera cita',
    P5: 'lo que pasa cuando ya hay algo empezando',
    S: 'que todavía no estás en ninguna app'
  };

  // Frases para citar las respuestas. Clave: sexo|pregunta|opción (sexo * = los dos).
  var FRASES = {
    'h|1a|casi_todas': 'de cada diez veces que propones una cita, casi todas te dicen que no',
    'h|1a|mayoria': 'de cada diez veces que propones una cita, la mayoría te dicen que no',
    'h|1a|no_propongo': 'casi nunca propones tú la cita',
    'm|1a|casi_ninguno': 'de cada diez hombres con los que hablas, casi ninguno te propone una cita',
    'm|1a|pocos': 'de cada diez hombres con los que hablas, pocos te proponen una cita',
    'm|1b|ninguno': 'en tres meses, fuera de las apps, ningún hombre se te ha acercado ni te ha escrito sin conocerse',
    '*|F|mas_una': 'más de una vez te han dicho, o has notado, que no te parecías a tus fotos',
    'h|2a|bajo': 'de cada cien likes, te llegan tres matches o menos',
    'm|2a|bajo': 'de cada cien likes, te llegan menos de veinticinco matches',
    'h|5c|enfrio': 'con la última, se fue enfriando ella cuando tú querías seguir',
    'm|5c|enfrio': 'con el último, se fue enfriando él cuando tú querías seguir',
    '*|5c|diluyo': 'con la última persona no llegaron a hablar de qué eran, y se diluyó',
    '*|5c|no_serio': 'te dijo que no buscaba nada serio',
    '*|5c|discutir': 'empezaron a discutir y se rompió',
    '*|5d|casi_todas': 'casi todas las veces que llegas a varias citas con alguien que te interesa, se cae antes de ser algo',
    '*|5d|mitad': 'la mitad de las veces que llegas a varias citas con alguien que te interesa, se cae antes de ser algo',
    '*|2b|ninguna': 'ninguna foto de tu perfil cumple lo básico',
    '*|2b|una': 'solo una foto de tu perfil cumple lo básico',
    '*|2c|selfie': 'tu primera foto es un selfie o del espejo',
    '*|2c|gente': 'en tu primera foto no se te ve bien a ti',
    '*|2c|primer_plano': 'tu primera foto es un primer plano',
    '*|2c|dia_a_dia': 'tu primera foto es de tu día a día',
    '*|2d|mas_cinco': 'tu foto más antigua es de hace más de cinco años',
    'h|3a|ninguna': 'de tus últimas diez conversaciones, en casi ninguna llegaste a proponer una cita',
    'h|3a|una_dos': 'de tus últimas diez conversaciones, en casi ninguna llegaste a proponer una cita',
    'h|3b|excusas': 'propones una cita y te ponen excusas',
    'm|3a|siempre_yo': 'casi siempre abres y retomas tú las conversaciones',
    'm|3a|nunca_yo': 'no escribes nunca tú, y muchos matches se quedan parados',
    '*|3b|pocos': 'tus conversaciones se mueren a los pocos mensajes',
    'h|3b|no_propongo': 'llevan días hablando y no llegas a proponer la cita',
    'm|3b|no_propone': 'llevan días hablando y él no propone la cita',
    'm|3b|excusas': 'propones tú la cita y te pone excusas',
    '*|3c|el_dia': 'tus conversaciones se quedan en qué tal el día',
    '*|4a|casi_ninguna_queria': 'casi ninguna de tus primeras citas ha tenido segunda, y tú sí querías',
    '*|4a|menos_mitad': 'menos de la mitad de tus primeras citas han tenido segunda',
    'h|4b|escribi_mucho': 'después escribiste mucho, con muchas ganas, y se enfrió',
    'm|4b|escribi_yo': 'después escribiste mucho, con muchas ganas, y se enfrió',
    'h|4b|excusas': 'propusiste la segunda y te puso excusas',
    'h|4b|nadie': 'después de la cita no escribió nadie',
    'm|4b|espere': 'esperaste y no escribió',
    'h|4c|ella': 'en la última no pagaste tú',
    'h|4c|medias': 'en la última no pagaste tú',
    'm|4c|escribo': 'después de una cita que te gusta, le escribes tú, y bastante',
    'm|4c|espero': 'después de una cita que te gusta, no le demuestras nada'
  };
  function frase(s, q, op) { return FRASES[s + '|' + q + '|' + op] || FRASES['*|' + q + '|' + op] || null; }

  // Respuestas de una etapa que se citan: valen 2 o más, con frase; como mucho `max`.
  function citas(r, resp, k, max) {
    var s = resp.G0, E = r.etapas, elegidas = [];
    if (r.fotos && k === 2) {
      if (resp['2d'] === 'mas_cinco') elegidas.push({ q: '2d', op: 'mas_cinco', v: 3 });
      if (resp.F === 'mas_una') elegidas.push({ q: 'F', op: 'mas_una', v: 3 });
    }
    var orden = E[k].items.filter(function (it) {
      return it.v >= 2 && frase(s, it.q, it.op) &&
        !elegidas.some(function (e) { return e.q === it.q; });
    }).sort(function (a, b) {
      if (b.v !== a.v) return b.v - a.v;
      if (a.q.charAt(1) !== b.q.charAt(1)) return a.q.charAt(1) < b.q.charAt(1) ? -1 : 1;
      return a.q < b.q ? -1 : 1;
    });
    function choca(a, b) {
      var par = [a.q + ':' + a.op, b.q + ':' + b.op];
      if (s === 'h' && a.q !== b.q) {
        var tiene3a = par.some(function (x) { return x.indexOf('3a:') === 0; });
        var excusas = par.indexOf('3b:excusas') >= 0;
        if (tiene3a && excusas) return true;
      }
      if (s === 'm' && ((a.q === '4b' && b.q === '4c') || (a.q === '4c' && b.q === '4b'))) return true;
      return false;
    }
    orden.forEach(function (it) {
      if (elegidas.length >= max) return;
      if (elegidas.some(function (e) { return choca(e, it); })) return;
      elegidas.push(it);
    });
    return elegidas.slice(0, max).map(function (it) {
      return { q: it.q, op: it.op, v: it.v, texto: frase(s, it.q, it.op) };
    });
  }

  function loQueFunciona(r, resp) {
    var s = resp.G0;
    var fuera = {};
    [r.principal, r.secundario].forEach(function (x) { if (ETAPA_DE[x]) fuera[ETAPA_DE[x]] = 1; });
    if (r.etapaAjuste) fuera[r.etapaAjuste] = 1;
    var tabla = [
      [s === 'h' && (resp['1b'] === 'una_dos' || resp['1b'] === 'tres_mas'), 'hay mujeres que te buscan', 1],
      [s === 'm' && resp['1b'] === 'tres_mas', 'los hombres se te acercan', 1],
      [s === 'h' && resp.G1 === 'si' && resp['2a'] === 'normal', 'tu perfil consigue matches', 2],
      [resp.G2 === 'tres_mas', 'consigues citas', 3],
      [s === 'h' && (resp['3a'] === 'tres_cinco' || resp['3a'] === 'seis_mas'), 'llegas a proponer la cita', 3],
      [resp.G2 !== 'ninguna' && resp['4a'] === 'mitad_mas', 'tus primeras citas tienen segunda', 4],
      [!!resp['5a'] && resp['5a'] !== 'ninguna', 'llegas a la tercera cita', 5]
    ];
    return tabla.filter(function (t) { return t[0] && !fuera[t[2]]; })
      .slice(0, 2).map(function (t) { return t[1]; });
  }

  function mayus(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function b(t) { return '<strong>' + t + '</strong>'; }

  function parrafoFunciona(lista) {
    if (!lista.length) return 'Ya has hecho lo más difícil, que es mirarlo.';
    return mayus(lista.join(' y ')) + '.';
  }
  function meHasDicho(cs) {
    if (!cs.length) return null;
    return 'Me has dicho que ' + cs[0].texto + (cs[1] ? ' y que ' + cs[1].texto : '') + '.';
  }
  // "No es tu problema": se quita si la etapa de la que habla está rota o suma 4 o más.
  function libre(r, ks) {
    return ks.every(function (k) { var e = r.etapas[k]; return !e.rota && e.suma < 4; });
  }

  function explicacionP3(cs, s) {
    function tiene(q, ops) { return cs.some(function (c) { return c.q === q && ops.indexOf(c.op) >= 0; }); }
    if (tiene('3c', ['el_dia'])) return 'Se ha quedado en un cuestionario, y los cuestionarios se apagan solos.';
    if (s === 'h' && (tiene('3b', ['no_propongo']) || tiene('3a', ['ninguna', 'una_dos']) || tiene('1a', ['no_propongo'])))
      return 'Hay conversación, pero no llega el momento de proponer.';
    if (s === 'h' && tiene('3b', ['excusas'])) return 'Llegas a proponer, pero la conversación no ha creado las ganas de decirte que sí.';
    if (s === 'm' && tiene('3b', ['no_propone'])) return 'Hay conversación, pero él no da el paso, y a ti te toca abrirle la puerta.';
    if (tiene('3b', ['pocos'])) return 'Se apaga antes de coger ritmo.';
    if (s === 'm' && tiene('3a', ['siempre_yo', 'nunca_yo'])) return 'El equilibrio de quién abre está roto.';
    return null;
  }

  // pagina: 'publica' | 'compradores'
  function informe(r, resp, opciones) {
    opciones = opciones || {};
    var s = resp.G0, p = r.principal, P = [];
    var clave = p === 'ajuste' ? 'P' + r.etapaAjuste : p;
    var reto = RETOS[clave];
    var funciona = parrafoFunciona(loQueFunciona(r, resp));
    var cs = ETAPA_DE[p] ? citas(r, resp, ETAPA_DE[p], 2) : [];
    var dicho = meHasDicho(cs);
    var sec = r.secundario ? b('Y otra cosa que también flojea: ' + NOMBRE_ETAPA[r.secundario] + '.') +
      ' Pero déjala para después: se nota mucho más cuando lo primero está resuelto.' : null;

    if (p === 'ajuste') {
      var lf = loQueFunciona(r, resp);
      P.push(b('Tu recorrido funciona.') + (lf.length ? ' ' + parrafoFunciona(lf) : ''));
      var c1 = citas(r, resp, r.etapaAjuste, 1);
      P.push('Lo que sí hay es margen, y está en ' + b(NOMBRE_ETAPA[clave]) + '.' + (c1.length ? ' ' + meHasDicho(c1) : ''));
      P.push('No es un problema. Es lo siguiente que afinar.');
      P.push(b('Tu siguiente paso: ' + reto.nombre + '.'));
    } else {
      P.push(b(funciona));
      if (p === 'P1') {
        if (dicho) P.push(dicho);
        P.push('Eso tiene una lectura clara: ' + b('te está costando atraer.') + ' Y atraer, antes que ninguna otra cosa, es imagen: la física, lo que ven cuando te tienen delante, y la que proyectas — cómo estás en persona.');
        P.push('La buena noticia es que ' + b('la imagen es lo que más se puede trabajar') + ', y lo que más rápido se nota.');
        if (libre(r, [3])) P.push(b('No te hace falta aprender frases nuevas ni cambiar cómo escribes.') + ' Mientras esto no cambie, eso no va a mover nada.');
        P.push(b('Tu siguiente paso: el reto de 7 días de imagen.') + ' Siete acciones pequeñas, la mayoría gratis, y al final una foto tuya al lado de otra del primer día.');
      } else if (p === 'P2') {
        if (dicho) P.push(dicho);
        if (r.fotos) {
          P.push(b('Tus fotos enseñan a alguien que no es exactamente quien llega a la cita.') + ' Con ellas atraes, y por eso haces match. Pero quien queda contigo espera ver a esa persona, la diferencia se nota en el primer segundo, y por eso no hay segunda. ' + b('Lo primero es cambiar esas fotos.'));
        } else {
          P.push('Traducido: ' + b('tu perfil no está enseñando lo que tienes.') + ' Ahí se pierde la gente antes de llegar a leerte.');
          if (libre(r, [3])) P.push(b('No necesitas cambiar cómo hablas.') + ' Necesitas que la primera puerta de la app funcione.');
        }
        P.push(b('Tu siguiente paso: el reto de 7 días de perfil.') + ' Los cuatro primeros días no cuestan nada y se hacen desde el sofá.');
      } else if (p === 'P3') {
        if (dicho) P.push(dicho);
        var ex = explicacionP3(cs, s);
        P.push('Eso tiene una lectura concreta: ' + b('la conversación no está llevando a ningún sitio.') + (ex ? ' ' + ex : ''));
        if (r.senales.apps && r.senales.x2a !== 'bajo' && libre(r, [2])) P.push(b('No necesitas más matches.') + ' Necesitas que los que ya tienes lleguen a una mesa.');
        P.push(b('Tu siguiente paso: el reto de 7 días de conversaciones.') + ' No toca ni una foto: va entero de lo que escribes.');
      } else if (p === 'P4') {
        if (dicho) P.push(dicho);
        P.push('Aquí hay algo que conviene saber: ' + b('lo que tumba una segunda cita casi nunca pasa en la primera. Pasa en los días de después.'));
        if (libre(r, [1, 3])) P.push(b('No tienes que cambiar cómo atraes ni cómo escribes.') + ' Llegar a la cita ya lo tienes.');
        P.push(b('Tu siguiente paso: el reto de 7 días de citas.') + ' Gira alrededor de una cita real, y el trabajo de verdad está en los días de después.');
      } else if (p === 'P5') {
        if (dicho) P.push(dicho);
        P.push('Llegar a la tercera cita no es poco: atraes, conversas y tienes segundas. ' + b('Lo que falla viene después, cuando ya hay algo empezando:') + ' leer si el interés es real, ponerle nombre a lo que tienen y el primer roce.');
        if (libre(r, [2, 3])) P.push(b('No tienes que cambiar tu perfil ni cómo consigues citas.'));
        P.push(b('Tu siguiente paso: el reto de 7 días para retener.') + ' Una semana para mirar qué pasó las últimas veces y qué vas a hacer distinto. Y si ahora mismo estás con alguien, ve directo al de 4 semanas, que está en el mismo módulo.');
      } else if (p === 'S') {
        P.push('Lo primero es estar en una app. Pero no te la descargues esta noche y subas lo primero que tengas en la galería: ' + b('primero se construye la imagen, y después se abre la app.'));
        P.push(b('Tu siguiente paso: el reto de 7 días de tu primer perfil.') + ' Al séptimo día tienes un perfil hecho bien desde cero, y un número que te dice por dónde seguir.');
      }
      if (sec) P.push(sec);
    }
    P.push(opciones.pagina === 'publica'
      ? 'Te recomiendo empezar por aquí.'
      : 'Te recomiendo empezar por aquí. Si prefieres otra cosa, toda la biblioteca está abierta.');

    var aviso = r.bajaConfianza ? [
      'Por cómo has contestado, este resultado puede no ser del todo fiable: has ido muy rápido, o algunas respuestas no encajan entre sí.',
      'Te doy el resultado igualmente, pero ' + b('te recomiendo repetirlo con calma') + '. Son tres minutos.'
    ] : null;

    return {
      titulo: TITULOS[p],
      clave: clave,
      reto: reto[s],
      retoNombre: reto.nombre,
      modulo: reto.modulo,
      parrafos: P,
      aviso: aviso,
      citas: cs
    };
  }

  /* ================================================================
     4. ENVÍO a MailerLite (vía Worker)
     datos: { nombre, email, sexo, principal, secundario, pagina, fecha, reto }
     POST JSON, nunca en la URL. Sin URL no hace nada.
     ================================================================ */
  function enviarResultado(datos, url, fetchImpl) {
    url = url === undefined ? SUSCRIBIR_URL : url;
    fetchImpl = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!url || !fetchImpl) return Promise.resolve(false);
    // JSON al Worker de josempico.com, que lo pasa a MailerLite (el token vive allí, no en la web).
    try {
      return Promise.resolve(fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
        keepalive: true
      })).then(function (r) { return !!(r && (r.ok === undefined || r.ok)); }, function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  var Diagnostico = {
    URL_CURSO: URL_CURSO, SUSCRIBIR_URL: SUSCRIBIR_URL,
    ENTRADA: ENTRADA, PREGUNTAS: PREGUNTAS, ORDEN: ORDEN,
    TITULOS: TITULOS, RETOS: RETOS, NOMBRE_ETAPA: NOMBRE_ETAPA, FRASES: FRASES,
    secuencia: secuencia, pregunta: pregunta, opcion: opcion, opcionesEnOrden: opcionesEnOrden,
    analiza: analiza, descuido: descuido, calcula: calcula,
    citas: citas, loQueFunciona: loQueFunciona, informe: informe,
    enviarResultado: enviarResultado
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Diagnostico;
  else root.Diagnostico = Diagnostico;

})(typeof window !== 'undefined' ? window : this);
