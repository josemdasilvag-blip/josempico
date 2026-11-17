/* agenda.js — agenda propia de /agenda/ (17/11/2026).
 *
 * Pide los huecos al Apps Script de Jose (cuenta josempico90) y pinta todas las medias horas
 * del día: las libres se pueden pulsar; las ocupadas salen en gris, tachadas, con «Ocupado».
 * Al reservar, el script crea el evento con Meet e invitación y la página salta a /llamada-confirmada/.
 * Código del script: biblioteca-josepico/hotmart/llamadas/agenda.gs
 */
(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbygykH9Y7pkyz5L4TjHtnv2v44Xi-elAonbKgLmKp7nLJtT9Gu2GkCY2xqDsN__tcNe4g/exec';
  var $ = function (id) { return document.getElementById(id); };
  var zona = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Europe/Madrid';
  var dias = [];       // [{clave, fecha, huecos:[{inicio, estado}]}]
  var diaSel = null, horaSel = null;

  function mide(evento, datos) {
    try { if (window.umami && typeof window.umami.track === 'function') window.umami.track(evento, datos || {}); } catch (e) {}
  }

  function fmt(fecha, op) { return new Intl.DateTimeFormat('es-ES', Object.assign({ timeZone: zona }, op)).format(fecha); }
  function claveDia(fecha) { return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha); }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function carga() {
    fetch(API + '?accion=huecos', { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error('agenda');
        agrupa(d.huecos);
        var ciudad = zona.split('/').pop().replace(/_/g, ' ');
        $('zona').textContent = 'Horas en tu zona horaria (' + ciudad + ').';
        $('leyenda').hidden = false;
        var primero = dias.filter(function (x) { return x.libres > 0; })[0] || dias[0];
        pintaDias(); elige(primero ? primero.clave : null);
      })
      .catch(function () {
        $('zona').innerHTML = 'No se ha podido cargar la agenda. <a href="https://wa.me/34621321861?text=Hola%20Jose%2C%20quiero%20reservar%20mi%20llamada%20de%2030%20minutos">Escríbeme por WhatsApp</a> y te reservo la llamada.';
        mide('agenda-error-carga');
      });
  }

  function agrupa(huecos) {
    var porDia = {};
    huecos.forEach(function (h) {
      var f = new Date(h.inicio);
      var c = claveDia(f);
      if (!porDia[c]) { porDia[c] = { clave: c, fecha: f, huecos: [], libres: 0 }; dias.push(porDia[c]); }
      porDia[c].huecos.push({ inicio: h.inicio, fecha: f, estado: h.estado });
      if (h.estado === 'libre') porDia[c].libres++;
    });
    // Se quitan los días que ya pasaron del todo (hoy entero ocupado por la antelación de 24 h sigue saliendo).
    dias.sort(function (a, b) { return a.fecha - b.fecha; });
  }

  function pintaDias() {
    var cont = $('dias'); cont.innerHTML = '';
    dias.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'agenda-dia' + (d.libres ? '' : ' lleno');
      b.setAttribute('role', 'tab');
      b.innerHTML = capital(fmt(d.fecha, { weekday: 'short' })).replace('.', '') + ' ' + fmt(d.fecha, { day: 'numeric' }) +
        '<small>' + (d.libres ? d.libres + (d.libres === 1 ? ' libre' : ' libres') : 'Completo') + '</small>';
      b.setAttribute('aria-selected', 'false');
      b.dataset.clave = d.clave;
      b.onclick = function () { elige(d.clave); };
      cont.appendChild(b);
    });
  }

  function elige(clave) {
    diaSel = dias.filter(function (d) { return d.clave === clave; })[0];
    horaSel = null; $('form').hidden = true;
    [].forEach.call($('dias').children, function (b) {
      var si = b.dataset.clave === clave; b.setAttribute('aria-selected', si ? 'true' : 'false');
      if (si && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    var cont = $('horas'); cont.innerHTML = '';
    if (!diaSel) return;
    diaSel.huecos.forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      var hora = fmt(h.fecha, { hour: '2-digit', minute: '2-digit', hour12: false });
      if (h.estado === 'libre') {
        b.className = 'agenda-hora'; b.textContent = hora; b.setAttribute('aria-pressed', 'false');
        b.onclick = function () { eligeHora(h, b); };
      } else {
        b.className = 'agenda-hora ocupado'; b.disabled = true;
        b.innerHTML = hora + '<small>Ocupado</small>';
        b.setAttribute('aria-label', hora + ', ocupado');
      }
      cont.appendChild(b);
    });
  }

  function eligeHora(h, boton) {
    horaSel = h;
    [].forEach.call($('horas').querySelectorAll('.agenda-hora:not(.ocupado)'), function (b) { b.setAttribute('aria-pressed', b === boton ? 'true' : 'false'); });
    $('elegida').textContent = capital(fmt(h.fecha, { weekday: 'long', day: 'numeric', month: 'long' })) + ' a las ' +
      fmt(h.fecha, { hour: '2-digit', minute: '2-digit', hour12: false });
    $('error').hidden = true;
    $('form').hidden = false;
    $('nombre').focus({ preventScroll: true });
    $('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    mide('agenda-hora-elegida');
  }

  function error(txt) { $('error').textContent = txt; $('error').hidden = false; }

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!horaSel) return;
    var nombre = $('nombre').value.trim(), email = $('email').value.trim(), tel = $('telefono').value.trim();
    if (!nombre) { error('Escribe tu nombre.'); $('nombre').focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { error('Revisa tu correo: ahí te llega el enlace de Meet.'); $('email').focus(); return; }
    if (tel.replace(/\D/g, '').length < 8) { error('Escribe tu WhatsApp con el prefijo del país (por ejemplo, +34).'); $('telefono').focus(); return; }
    var boton = $('reservar'); boton.disabled = true; boton.textContent = 'Reservando…';
    fetch(API, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // sin preflight: Apps Script no lo acepta
      body: JSON.stringify({ accion: 'reservar', inicio: horaSel.inicio, nombre: nombre, email: email, telefono: tel, web: $('web').value })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) {
        mide('llamada_reservada', { origen: 'agenda-web' });
        setTimeout(function () { location.href = '/llamada-confirmada/'; }, 300);
        return;
      }
      boton.disabled = false; boton.textContent = 'Reservar mi llamada';
      error(d.mensaje || 'No se ha podido reservar. Inténtalo otra vez.');
      if (d.error === 'cogida') { dias = []; carga(); }
    }).catch(function () {
      boton.disabled = false; boton.textContent = 'Reservar mi llamada';
      error('No se ha podido reservar. Escríbeme por WhatsApp al +34 621 32 18 61 y te la reservo yo.');
    });
  });

  carga();
})();
