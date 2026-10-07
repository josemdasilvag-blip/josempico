/* =====================================================================
   diagnostico-ui.js — interfaz común de las dos páginas del diagnóstico
   /diagnostico/ (pública) y /diagnostico/compradores/ (privada).

   La lógica y los textos están en /assets/diagnostico.js (window.Diagnostico).
   La página indica cuál es con <body data-pagina="publica|compradores">.
   La URL del curso y el webhook de Hotmart Send se cambian en diagnostico.js.
   ===================================================================== */
(function () {
  'use strict';
  var D = window.Diagnostico;
  var PAGINA = document.body.getAttribute('data-pagina') === 'compradores' ? 'compradores' : 'publica';
  var ENTRADA = { G0: 1, G1: 1, G2: 1 };

  var resp = {};
  var historial = [];     // [{q, ms, pos}]
  var ordenes = {};       // orden de opciones ya barajado por pregunta
  var inicio = 0;
  var resultado = null, informe = null;

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
  }

  function responde(q, id, pos) {
    resp[q] = id;
    historial.push({ q: q, ms: Date.now() - inicio, pos: pos });
    pinta();
  }

  function atras() {
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
      tiempos: cuest.map(function (h) { return h.ms; }),
      posiciones: cuest.map(function (h) { return h.pos; })
    };
  }

  // Al contestar la última: el resultado sale directamente, sin pedir nada.
  function termina() {
    limpia();
    resultado = D.calcula(resp, meta());
    informe = D.informe(resultado, resp, { pagina: PAGINA });
    muestra();
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
      fecha: new Date().toISOString()
    });
    form.hidden = true;
    $('enviado').hidden = false;
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
      var url = D.URL_CURSO;
      $('retoCurso').textContent = informe.retoNombre.charAt(0).toUpperCase() + informe.retoNombre.slice(1);
      $('botonCurso').hidden = !url;
      if (url) $('botonCurso').href = url;
      $('pronto').hidden = !!url;
      // La llamada se pide por WhatsApp: el mensaje lleva el nombre y el resultado.
      $('avisoNombre').hidden = true;
    }
    // Mientras no esté conectado el correo (WEBHOOK_URL vacío), no se ofrece guardar el resultado.
    $('datos').hidden = !D.WEBHOOK_URL;
    $('formDatos').hidden = false;
    $('enviado').hidden = true;
    ver('resultado');
    $('titulo').focus();
  }

  function otraVez() {
    resp = {}; historial = []; ordenes = {}; resultado = null; informe = null;
    ver('portada');
    $('empezar').focus();
  }

  $('empezar').onclick = function () { ver('test'); pinta(); };
  $('atras').onclick = atras;
  $('formDatos').addEventListener('submit', enviaDatos);
  $('otra').onclick = otraVez;
  // Al pulsar "Pedir mi llamada": exige el nombre y monta el mensaje en ese momento.
  if ($('botonLlamada')) $('botonLlamada').onclick = function (ev) {
    var nombre = $('nombreLlamada').value.trim();
    if (!nombre) {
      ev.preventDefault();
      $('avisoNombre').hidden = false;
      $('nombreLlamada').focus();
      return;
    }
    var mayus = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    var texto = 'Hola Jose! Soy ' + nombre + ' y he hecho el diagnóstico.\n' +
      'Soy ' + (resp.G0 === 'm' ? 'mujer' : 'hombre') + '.\n' +
      'Mi resultado: ' + informe.titulo + '\n' +
      'Por dónde empiezo: ' + mayus(informe.retoNombre) + '\n' +
      'Quiero la llamada gratis de 15 minutos.';
    this.href = 'https://wa.me/34621321861?text=' + encodeURIComponent(texto);
  };
  $('volver').onclick = function () { ver('test'); atras(); };
})();
