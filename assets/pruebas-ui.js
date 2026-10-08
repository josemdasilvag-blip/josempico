/* =====================================================================
   pruebas-ui.js — interfaz común de las cuatro pruebas de paso
   /prueba/imagen/ · /prueba/perfil/ · /prueba/conversacion/ · /prueba/cita/

   La lógica y los textos están en /assets/pruebas.js (window.Pruebas).
   La página indica su campo con <body data-campo="imagen|perfil|conversacion|cita">.
   La URL del alta en MailerLite (SUSCRIBIR_URL) se cambia en pruebas.js.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Pruebas;
  var CAMPO = document.body.getAttribute('data-campo');

  var resp = {};
  var historial = [];     // ids contestados, en orden
  var ordenes = {};       // orden de opciones ya barajado por pregunta
  var res = null;

  function $(id) { return document.getElementById(id); }

  function ver(id) {
    ['portada', 'test', 'resultado'].forEach(function (p) {
      $(p).hidden = p !== id;
    });
    window.scrollTo(0, 0);
  }

  function baraja(ops) {
    var a = ops.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function actual() {
    var sec = P.secuencia(CAMPO, resp);
    // Hasta saber sexo y momento no se sabe cuántas salen: se estima con 12.
    var total = sec.length <= 3 ? 12 : sec.length;
    for (var i = 0; i < sec.length; i++) if (resp[sec[i]] == null) return { q: sec[i], i: i, total: total };
    return null;
  }

  function pinta() {
    var a = actual();
    if (!a) { limpia(); res = P.evalua(CAMPO, resp); muestra(); return; }
    var p = P.pregunta(CAMPO, resp, a.q);
    var clave = a.q + (resp.sexo || '') + (resp.momento || '') + (resp.reto || '');
    var ops = ordenes[clave] || (ordenes[clave] = p.barajar ? baraja(p.ops) : p.ops);
    var pct = Math.round(a.i / a.total * 100);
    $('progreso').style.width = pct + '%';
    $('barra').setAttribute('aria-valuenow', pct);
    $('enunciado').textContent = p.texto;

    var lista = $('lista');
    lista.innerHTML = '';
    lista.hidden = !p.lista;
    (p.lista || []).forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      lista.appendChild(li);
    });
    $('ayuda').textContent = p.ayuda || '';
    $('ayuda').hidden = !p.ayuda;

    var cont = $('ops');
    cont.innerHTML = '';
    ops.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'op';
      b.textContent = o.texto;
      b.onclick = function () { responde(a.q, o.id); };
      cont.appendChild(b);
    });
    $('atras').hidden = historial.length === 0;
    $('enunciado').focus();
  }

  function responde(q, id) {
    resp[q] = id;
    historial.push(q);
    pinta();
  }

  // Quita respuestas de preguntas que ya no tocan (p. ej. al volver atrás y cambiar el sexo).
  function limpia() {
    var sec = P.secuencia(CAMPO, resp);
    Object.keys(resp).forEach(function (q) { if (sec.indexOf(q) < 0) delete resp[q]; });
    historial = historial.filter(function (q) { return resp[q] != null; });
  }

  function atras() {
    var q = historial.pop();
    if (!q) return;
    delete resp[q];
    limpia();
    pinta();
  }

  function enviaDatos(ev) {
    ev.preventDefault();
    if (!$('formDatos').reportValidity()) return;
    var respuestas = {};
    Object.keys(resp).forEach(function (k) { respuestas[k] = resp[k]; });
    P.enviarResultado({
      nombre: $('nombre').value.trim(),
      email: $('email').value.trim(),
      sexo: resp.sexo,
      campo: CAMPO,
      momento: resp.momento,
      reto: res.reto,
      resultado: res.codigo,
      respuestas: respuestas,
      origen: 'prueba',
      fecha: new Date().toISOString()
    });
    $('formDatos').hidden = true;
    $('enviado').hidden = false;
  }

  function parrafo(html, clase) {
    var p = document.createElement('p');
    if (clase) p.className = clase;
    p.innerHTML = html;                       // HTML fijo del motor, sin datos de la persona
    return p;
  }

  function bloque(titulo, items) {
    var d = document.createElement('div');
    d.className = 'carta tareas';
    var h = document.createElement('h3');
    h.textContent = titulo;
    d.appendChild(h);
    var ul = document.createElement('ul');
    items.forEach(function (it) {
      var li = document.createElement('li');
      if (it.dia) {
        var b = document.createElement('b');
        b.textContent = /^\d/.test(it.dia)
          ? (/ y /.test(it.dia) ? 'Días ' : 'Día ') + it.dia
          : it.dia.charAt(0).toUpperCase() + it.dia.slice(1).replace(/ y (\d)/, ' y día $1');
        li.appendChild(b);
      }
      li.appendChild(document.createTextNode(it.texto));
      ul.appendChild(li);
    });
    d.appendChild(ul);
    return d;
  }

  function muestra() {
    $('titulo').textContent = res.titulo;
    $('reto').textContent = res.reto;
    var cuerpo = $('cuerpo');
    cuerpo.innerHTML = '';
    res.parrafos.forEach(function (h) { cuerpo.appendChild(parrafo(h)); });
    if (res.rehacer.length) cuerpo.appendChild(bloque('Rehaz esto', res.rehacer));
    if (res.pendiente.length) cuerpo.appendChild(bloque('Te queda por hacer', res.pendiente));
    $('parada').hidden = !res.notaParada;
    $('parada').textContent = res.notaParada || '';
    $('formDatos').hidden = false;
    $('enviado').hidden = true;
    ver('resultado');
    $('titulo').focus();
  }

  function otraVez() {
    resp = {}; historial = []; ordenes = {}; res = null;
    ver('portada');
    $('empezar').focus();
  }

  $('empezar').onclick = function () { ver('test'); pinta(); };
  $('atras').onclick = atras;
  $('formDatos').addEventListener('submit', enviaDatos);
  $('otra').onclick = otraVez;
  $('volver').onclick = function () { ver('test'); atras(); };
})();
