/* =====================================================================
   diagnostico-ui.js — interfaz común de las dos páginas del diagnóstico
   /diagnostico/ (pública) y /diagnostico/compradores/ (privada).

   La lógica y los textos están en /assets/diagnostico.js (window.Diagnostico).
   La página indica cuál es con <body data-pagina="publica|compradores">.
   La URL del programa y la del alta en MailerLite (SUSCRIBIR_URL) se cambian en diagnostico.js.
   ===================================================================== */
(function () {
  'use strict';
  var D = window.Diagnostico;
  var PAGINA = document.body.getAttribute('data-pagina') === 'compradores' ? 'compradores' : 'publica';
  var ENTRADA = { G0: 1, G1: 1, G2: 1, G3: 1 };

  var resp = {};
  var historial = [];     // [{q, ms, pos}]
  var ordenes = {};       // orden de opciones ya barajado por pregunta
  var inicio = 0;
  var resultado = null, informe = null;
  // Objetivos (solo página pública): tras el fallo, 2 o 3 preguntas de qué quiere lograr.
  var fase = 'diagnostico';   // 'diagnostico' | 'objetivos'
  var objPreg = [], objIdx = 0, objResp = {}, ref = '';

  function nuevoRef() {
    try {
      var a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    } catch (e) { return ''; }
  }

  function $(id) { return document.getElementById(id); }

  function ver(id) {
    ['portada', 'test', 'resultado'].forEach(function (p) {
      $(p).hidden = p !== id;
    });
    window.scrollTo(0, 0);
  }

  function actual() {
    var sec = D.secuencia(resp);
    // Hasta contestar G0-G2 no se sabe cuántas salen: se estima con un recorrido medio (15).
    var total = sec.length <= 3 ? 15 : sec.length;
    for (var i = 0; i < sec.length; i++) if (resp[sec[i]] == null) return { q: sec[i], i: i, total: total };
    return null;
  }

  function pinta() {
    var a = actual();
    if (!a) { termina(); return; }
    var p = D.pregunta(resp.G0, a.q);
    var ops = ordenes[a.q + resp.G0] || (ordenes[a.q + resp.G0] = D.opcionesEnOrden(p));
    $('progreso').style.width = Math.round(a.i / a.total * 100) + '%';
    $('barra').setAttribute('aria-valuenow', Math.round(a.i / a.total * 100));
    $('enunciado').textContent = p.texto;
    var cont = $('ops');
    cont.innerHTML = '';
    ops.forEach(function (o, n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'op';
      b.textContent = o.texto;
      b.onclick = function () { responde(a.q, o.id, n); };
      cont.appendChild(b);
    });
    $('atras').hidden = historial.length === 0;
    inicio = Date.now();
    $('enunciado').focus();
    pregunta(a.q, a.i + 1);
  }

  // Umami: «diagnostico-pregunta» cada vez que sale una pregunta en pantalla (17/11/2026).
  // Con la propiedad «pregunta» (id) y «n» (posición) se ve en qué pregunta abandona la gente:
  // vistas de una pregunta menos vistas de la siguiente. Sin respuestas ni datos personales.
  function pregunta(id, n) {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track('diagnostico-pregunta', { pregunta: id, n: n,
          sexo: resp.G0 ? (resp.G0 === 'm' ? 'mujer' : 'hombre') : '', pagina: PAGINA });
      }
    } catch (e) { /* medir nunca rompe el diagnóstico */ }
  }

  function responde(q, id, pos) {
    resp[q] = id;
    historial.push({ q: q, ms: Date.now() - inicio, pos: pos });
    pinta();
  }

  function atras() {
    if (fase === 'objetivos') {
      if (objIdx > 0) { objIdx--; delete objResp[objPreg[objIdx].id]; pintaObj(); return; }
      // En la primera de objetivo, atrás vuelve a la última del diagnóstico.
      fase = 'diagnostico'; objPreg = []; objResp = {};
    }
    var h = historial.pop();
    if (!h) return;
    delete resp[h.q];
    // Si cambia una respuesta de entrada, lo que dependía de ella se vuelve a preguntar.
    limpia();
    pinta();
  }

  // Quita respuestas de preguntas que ya no tocan (p. ej. al volver atrás y cambiar G1).
  function limpia() {
    var sec = D.secuencia(resp);
    Object.keys(resp).forEach(function (q) { if (sec.indexOf(q) < 0) delete resp[q]; });
    historial = historial.filter(function (h) { return resp[h.q] != null; });
  }

  function meta() {
    var cuest = historial.filter(function (h) { return !ENTRADA[h.q]; });
    return {
      preguntas: cuest.map(function (h) { return h.q; }),
      tiempos: cuest.map(function (h) { return h.ms; }),
      posiciones: cuest.map(function (h) { return h.pos; })
    };
  }

  // Contador en Umami (lo ve Jose en Events). Sin datos personales; si Umami no está, no hace nada.
  function cuenta(evento) {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(evento, { resultado: informe.titulo, principal: resultado.principal,
          sexo: resp.G0 === 'm' ? 'mujer' : 'hombre', pagina: PAGINA });
      }
    } catch (e) { /* medir nunca rompe el diagnóstico */ }
    // Píxel de Meta (solo si aceptó cookies): señales para que los anuncios aprendan con más volumen
    // que el Lead de Tally. CompleteRegistration = diagnóstico terminado; Contact = pidió la llamada.
    try {
      var FB = { 'diagnostico-completado': 'CompleteRegistration', 'diagnostico_a_preparacion': 'Contact' };
      if (FB[evento] && typeof window.fbq === 'function') {
        window.fbq('track', FB[evento], { content_name: resultado ? resultado.principal : '' });
      }
    } catch (e) { /* idem */ }
  }

  // Al contestar la última: el resultado sale directamente, sin pedir nada.
  function termina() {
    limpia();
    resultado = D.calcula(resp, meta());
    var preguntas = PAGINA === 'publica' ? D.objetivosDe(resp.G0, resultado.principal, resp.G1 === 'si') : [];
    if (preguntas.length) { empiezaObjetivos(preguntas); return; }
    cierra();
  }

  function cierra() {
    informe = D.informe(resultado, resp, { pagina: PAGINA, objetivos: PAGINA === 'publica' ? objResp : null });
    muestra();
    cuenta('diagnostico-completado');
  }

  // Preguntas de objetivo: se pintan en la misma pantalla de test, con su propio progreso.
  function empiezaObjetivos(preguntas) {
    fase = 'objetivos';
    objPreg = preguntas; objIdx = 0; objResp = {};
    if (!ref) ref = nuevoRef();       // al volver atrás y repetir, se sobrescribe la misma fila
    pintaObj();
  }

  function pintaObj() {
    if (objIdx >= objPreg.length) {
      fase = 'diagnostico';
      D.guardarObjetivo({ ref: ref, sexo: resp.G0, principal: resultado.principal, respuestas: objResp,
        diagnostico: { r: resp, s: resultado.secundario, a: resultado.etapaAjuste, m: resultado.motivos },
        pagina: PAGINA, fecha: new Date().toISOString() });
      cierra();
      return;
    }
    var q = objPreg[objIdx];
    ver('test');
    $('progreso').style.width = Math.round(objIdx / objPreg.length * 100) + '%';
    $('barra').setAttribute('aria-valuenow', Math.round(objIdx / objPreg.length * 100));
    $('enunciado').textContent = q.texto;
    var cont = $('ops');
    cont.innerHTML = '';
    q.ops.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'op';
      b.textContent = o.texto;
      b.onclick = function () { objResp[q.id] = o.id; objIdx++; pintaObj(); };
      cont.appendChild(b);
    });
    $('atras').hidden = false;
    $('enunciado').focus();
    pregunta('obj-' + q.id, historial.length + objIdx + 1);
  }

  // El email es opcional y va debajo del resultado.
  function enviaDatos(ev) {
    ev.preventDefault();
    var form = $('formDatos');
    if (!form.reportValidity()) return;
    D.enviarResultado({
      nombre: $('nombre').value.trim(),
      email: $('email').value.trim(),
      sexo: resp.G0,
      principal: resultado.principal,
      secundario: resultado.secundario,
      reto: informe.reto,
      pagina: PAGINA,
      origen: 'diagnostico',
      ref: ref,
      fecha: new Date().toISOString()
    });
    form.hidden = true;
    $('enviado').hidden = false;
    cuenta('diagnostico-correo');
  }

  function parrafo(html, clase) {
    var p = document.createElement('p');
    if (clase) p.className = clase;
    p.innerHTML = html;                       // HTML fijo del motor, sin datos de la persona
    return p;
  }

  function muestra() {
    $('titulo').textContent = informe.titulo;
    var cuerpo = $('cuerpo');
    cuerpo.innerHTML = '';
    informe.parrafos.forEach(function (h) { cuerpo.appendChild(parrafo(h)); });

    var aviso = $('aviso');
    aviso.innerHTML = '';
    aviso.hidden = !informe.aviso;
    if (informe.aviso) informe.aviso.forEach(function (h) { aviso.appendChild(parrafo(h)); });

    if (PAGINA === 'compradores') {
      $('modulo').textContent = informe.modulo;
      $('reto').textContent = 'Reto ' + informe.reto + ' · ' + informe.retoNombre.charAt(0).toUpperCase() + informe.retoNombre.slice(1);
    } else {
      // 17/11/2026 (Jose): vuelve el formulario. Con WhatsApp, 0 de 43 escribieron; con Tally + agenda,
      // 3 llamadas de 63. Cada uno va a su página de preparación (separadas por sexo), formulario y agenda.
      var destino = (resp.G0 === 'm' ? '/prepara-tu-llamada/' : '/prepara-tu-llamada-hombre/') + '?origen=diagnostico#solicitud';
      $('botonLlamada').href = destino;
      if ($('botonLlamada2')) $('botonLlamada2').href = destino;
      vigilaBoton();
      yaReservada();
    }
    if ($('gancho') && informe.gancho) $('gancho').textContent = informe.gancho;
    // Mientras no esté conectado el correo (SUSCRIBIR_URL vacío), no se ofrece guardar el resultado.
    $("datos").hidden = !D.SUSCRIBIR_URL;
    $('formDatos').hidden = false;
    $('enviado').hidden = true;
    ver('resultado');
    $('titulo').focus();
  }

  // Umami: «boton-llamada-visto» una vez por resultado, cuando la tarjeta entra en pantalla.
  var vistoBoton = false, observador = null;
  function vigilaBoton() {
    vistoBoton = false;
    var carta = $('cartaLlamada');
    if (!carta || typeof IntersectionObserver === 'undefined') return;
    if (observador) observador.disconnect();
    observador = new IntersectionObserver(function (es) {
      if (!vistoBoton && es.some(function (e) { return e.isIntersecting; })) {
        vistoBoton = true; cuenta('boton-llamada-visto'); observador.disconnect();
      }
    }, { threshold: 0.5 });
    observador.observe(carta);
  }

  function otraVez() {
    resp = {}; historial = []; ordenes = {}; resultado = null; informe = null;
    fase = 'diagnostico'; objPreg = []; objIdx = 0; objResp = {}; ref = '';
    ver('portada');
    $('empezar').focus();
  }

  $('empezar').onclick = function () {
    if (window.umami && typeof window.umami.track === 'function') window.umami.track('diagnostico-iniciado', { pagina: PAGINA });
    ver('test'); pinta();
  };
  // 21/11/2026 (Jose): reservar la llamada desde la portada, sin hacer antes el diagnóstico.
  // La agenda (assets/agenda.js) se monta al abrirla, con ids «ag-…» para no chocar con el formulario del correo.
  function reservada() { try { return sessionStorage.getItem('llamada-reservada') === '1'; } catch (e) { return false; } }
  // Quien ya reservó y luego hace el diagnóstico no ve otra vez «Pide tu llamada gratis».
  function yaReservada() {
    if (!reservada() || !$('cartaLlamada')) return;
    $('cartaLlamada').querySelector('h3').textContent = 'Ya tienes tu llamada reservada';
    $('cartaLlamada').querySelector('p').textContent = 'Te llegó la invitación por correo. Nos vemos en la llamada.';
    $('botonLlamada').hidden = true;
    if ($('botonLlamada2')) $('botonLlamada2').parentNode.hidden = true;
  }
  if ($('reservarPortada') && window.AgendaJP) {
    $('reservarPortada').onclick = function () {
      var abierta = !$('ag-agenda').hidden;
      if (!abierta) {
        $('ag-agenda').hidden = false;
        $('reservarPortada').setAttribute('aria-expanded', 'true');
        if (window.umami && typeof window.umami.track === 'function') window.umami.track('portada-reserva-abierta', { pagina: PAGINA });
        window.AgendaJP.monta({
          prefijo: 'ag-', origen: 'diagnostico-portada', conMotivo: true,
          alReservar: function () {
            try { sessionStorage.setItem('llamada-reservada', '1'); } catch (e) {}
            if (window.fbq) { try { window.fbq('track', 'Schedule'); } catch (e) {} }
            ['ag-zona', 'ag-dias', 'ag-horas', 'ag-leyenda', 'ag-form'].forEach(function (id) { $(id).hidden = true; });
            $('reservarPortada').hidden = true;
            $('ag-hecho').hidden = false;
            $('ag-hecho').focus();
          }
        });
      }
      $('ag-agenda').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
  $('atras').onclick = atras;
  $('formDatos').addEventListener('submit', enviaDatos);
  $('otra').onclick = otraVez;
  // Al pulsar "Pedir mi llamada": se cuenta (mismo evento que el camino Tally de antes, para
  // comparar) y se va a la página de preparación. 300 ms para que Umami registre el clic.
  function vaALlamada(ev, extra) {
    ev.preventDefault();
    var destino = ev.currentTarget.href;
    if (extra) cuenta(extra);
    cuenta('diagnostico_a_preparacion');
    setTimeout(function () { window.location.href = destino; }, 300);
  }
  if ($('botonLlamada')) $('botonLlamada').onclick = function (ev) { vaALlamada(ev); };
  if ($('botonLlamada2')) $('botonLlamada2').onclick = function (ev) { vaALlamada(ev, 'boton-llamada-repetido'); };
  var yaPlay = false;
  if ($('videoResultado')) $('videoResultado').addEventListener('play', function () {
    if (!yaPlay) { yaPlay = true; cuenta('video-resultado'); }
  });
  $('volver').onclick = function () { ver('test'); atras(); };
})();
