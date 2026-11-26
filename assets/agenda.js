/* agenda.js — agenda propia de josempico.com (17/11/2026; montable desde el 21/11/2026).
 *
 * Pide los huecos al Apps Script de Jose (cuenta josempico90) y pinta todas las medias horas
 * del día: las libres se pueden pulsar; las ocupadas salen en gris, tachadas, con «Ocupado».
 * Al reservar, el script crea el evento con Meet e invitación.
 * Código del script: biblioteca-josepico/hotmart/llamadas/agenda.gs
 *
 * Uso: AgendaJP.monta({prefijo, origen, conMotivo, alReservar})
 *  - prefijo: se antepone a cada id (''  en /agenda/, 'ag-' en la portada de /diagnostico/).
 *  - origen: va en el POST y en el evento llamada_reservada de Umami.
 *  - conMotivo: muestra la pregunta opcional «¿Qué te gustaría resolver?» (ids motivo y motivoTexto).
 *  - alReservar(hora): si existe, se llama en vez de saltar a /llamada-confirmada/.
 *  - motivo(): opcional (24/11/2026), texto que se antepone al motivo (resultado del diagnóstico, página de origen).
 */
(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbygykH9Y7pkyz5L4TjHtnv2v44Xi-elAonbKgLmKp7nLJtT9Gu2GkCY2xqDsN__tcNe4g/exec';
  var zona = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Europe/Madrid';
  var montadas = {};

  // [código ISO, prefijo, nombre]. En el desplegable salen por orden alfabético (26/11/2026, Jose);
  // el país de la persona se preselecciona por la zona horaria.
  var PAISES = [
    ['ES', '34', 'España'], ['MX', '52', 'México'], ['CO', '57', 'Colombia'], ['AR', '54', 'Argentina'],
    ['CL', '56', 'Chile'], ['PE', '51', 'Perú'], ['VE', '58', 'Venezuela'], ['EC', '593', 'Ecuador'],
    ['US', '1', 'Estados Unidos'], ['DO', '1', 'República Dominicana'], ['PR', '1', 'Puerto Rico'],
    ['GT', '502', 'Guatemala'], ['CU', '53', 'Cuba'], ['BO', '591', 'Bolivia'], ['HN', '504', 'Honduras'],
    ['PY', '595', 'Paraguay'], ['SV', '503', 'El Salvador'], ['NI', '505', 'Nicaragua'], ['CR', '506', 'Costa Rica'],
    ['PA', '507', 'Panamá'], ['UY', '598', 'Uruguay'], ['CA', '1', 'Canadá'], ['BR', '55', 'Brasil'],
    ['PT', '351', 'Portugal'], ['AD', '376', 'Andorra'], ['FR', '33', 'Francia'], ['IT', '39', 'Italia'],
    ['DE', '49', 'Alemania'], ['GB', '44', 'Reino Unido'], ['IE', '353', 'Irlanda'], ['CH', '41', 'Suiza'],
    ['BE', '32', 'Bélgica'], ['NL', '31', 'Países Bajos']
  ];
  var ZONAS = {
    'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES', 'America/Bogota': 'CO', 'America/Santiago': 'CL',
    'America/Lima': 'PE', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'America/Guatemala': 'GT', 'America/Havana': 'CU',
    'America/La_Paz': 'BO', 'America/Santo_Domingo': 'DO', 'America/Tegucigalpa': 'HN', 'America/Asuncion': 'PY',
    'America/El_Salvador': 'SV', 'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA',
    'America/Montevideo': 'UY', 'America/Puerto_Rico': 'PR', 'America/Sao_Paulo': 'BR', 'Europe/Lisbon': 'PT',
    'Europe/Andorra': 'AD', 'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Berlin': 'DE', 'Europe/London': 'GB',
    'Europe/Dublin': 'IE', 'Europe/Zurich': 'CH', 'Europe/Brussels': 'BE', 'Europe/Amsterdam': 'NL', 'America/Toronto': 'CA'
  };
  function paisPorZona(z) {
    if (ZONAS[z]) return ZONAS[z];
    if (/^America\/Argentina\//.test(z) || z === 'America/Buenos_Aires') return 'AR';
    if (/^America\/(Mexico_City|Monterrey|Cancun|Merida|Chihuahua|Tijuana|Hermosillo|Mazatlan|Matamoros|Bahia_Banderas)$/.test(z)) return 'MX';
    if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Detroit|Anchorage|Indiana\/.*|Kentucky\/.*|Boise)$/.test(z) || z === 'Pacific/Honolulu') return 'US';
    return 'ES';
  }

  function mide(evento, datos) {
    try { if (window.umami && typeof window.umami.track === 'function') window.umami.track(evento, datos || {}); } catch (e) {}
  }
  function fmt(fecha, op) { return new Intl.DateTimeFormat('es-ES', Object.assign({ timeZone: zona }, op)).format(fecha); }
  function claveDia(fecha) { return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha); }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function monta(op) {
    op = op || {};
    var prefijo = op.prefijo || '';
    var origen = op.origen || 'agenda-web';
    if (montadas[prefijo]) return;
    montadas[prefijo] = true;

    var $ = function (id) { return document.getElementById(prefijo + id); };
    var dias = [];       // [{clave, fecha, huecos:[{inicio, estado}]}]
    var diaSel = null, horaSel = null;

    // Solo en /agenda/: si viene de enviar el formulario de Tally, ya tenemos nombre, correo y WhatsApp
    // (los guarda /prepara-tu-llamada/ en este navegador): solo hace falta confirmar.
    var BOTON = 'Reservar mi llamada';
    if (prefijo === '') {
      try {
        var s = JSON.parse(sessionStorage.getItem('solicitud-llamada') || '{}');
        if (s.nombre && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email || '') && String(s.telefono || '').replace(/\D/g, '').length >= 8) {
          $('nombre').value = s.nombre; $('email').value = s.email; $('telefono').value = s.telefono;
          $('campos').hidden = true;
          $('conocido').innerHTML = 'Te llega la invitación a <strong></strong>. <button type="button" id="cambiarDatos">¿Datos distintos?</button>';
          $('conocido').querySelector('strong').textContent = s.email;
          $('conocido').hidden = false;
          document.getElementById('cambiarDatos').onclick = function () { $('campos').hidden = false; $('conocido').hidden = true; $('nombre').focus(); };
          BOTON = 'Confirmar mi llamada';
          $('reservar').textContent = BOTON;
        }
      } catch (e) { /* sin datos guardados: se piden en la agenda */ }
    }

    // Pregunta opcional de un toque: se pueden marcar varias (21/11/2026, Jose) y desmarcarlas.
    if (op.conMotivo && $('motivo')) {
      [].forEach.call($('motivo').querySelectorAll('button'), function (b) {
        b.setAttribute('aria-pressed', 'false');
        b.onclick = function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); };
      });
    }
    function motivosMarcados() {
      if (!$('motivo')) return '';
      return [].filter.call($('motivo').querySelectorAll('button'), function (b) { return b.getAttribute('aria-pressed') === 'true'; })
        .map(function (b) { return b.textContent.trim(); }).join(', ');
    }

    // Prefijo del país en un desplegable (21/11/2026, Jose): sin prefijo no sabemos a qué país escribir.
    // Se preselecciona por la zona horaria del navegador.
    if ($('prefijo')) {
      var pais = paisPorZona(zona);
      PAISES.slice().sort(function (x, y) { return x[2].localeCompare(y[2], 'es'); }).forEach(function (p) {
        var o = document.createElement('option');
        o.value = p[1]; o.textContent = p[2] + ' +' + p[1];
        if (p[0] === pais) o.selected = true;
        $('prefijo').appendChild(o);
      });
    }
    // Número completo con prefijo. Si la persona ya escribió +… o 00…, se respeta lo que puso.
    function telefonoCompleto() {
      var t = $('telefono').value.trim();
      if (/^\+/.test(t)) return '+' + t.replace(/\D/g, '');
      if (/^00/.test(t)) return '+' + t.replace(/\D/g, '').slice(2);
      if (!$('prefijo')) return t;
      return '+' + $('prefijo').value + t.replace(/\D/g, '').replace(/^0+/, '');
    }

    function carga() {
      fetch(API + '?accion=huecos', { redirect: 'follow' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) throw new Error('agenda');
          dias = [];
          agrupa(d.huecos);
          var ciudad = zona.split('/').pop().replace(/_/g, ' ');
          $('zona').textContent = 'Horas en tu zona horaria (' + ciudad + ').';
          $('leyenda').hidden = false;
          var primero = dias.filter(function (x) { return x.libres > 0; })[0] || dias[0];
          pintaDias(); elige(primero ? primero.clave : null);
        })
        .catch(function () {
          $('zona').innerHTML = 'No se ha podido cargar la agenda. <a href="https://wa.me/34621321861?text=Hola%20Jose%2C%20quiero%20reservar%20mi%20llamada%20de%2030%20minutos">Escríbeme por WhatsApp</a> y te reservo la llamada.';
          mide('agenda-error-carga', { origen: origen });
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
        // Solo se desplaza la fila de días, no la página (24/11/2026: scrollIntoView movía la página al cargar
        // y, dentro del resultado del diagnóstico, se saltaba el texto del resultado).
        if (si) { var fila = $('dias'); fila.scrollLeft = Math.max(0, b.offsetLeft - fila.offsetLeft - 8); }
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
      ($('campos').hidden ? $('reservar') : $('nombre')).focus({ preventScroll: true });
      $('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      mide('agenda-hora-elegida', { origen: origen });
    }

    function error(txt) { $('error').textContent = txt; $('error').hidden = false; }

    $('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!horaSel) return;
      var nombre = $('nombre').value.trim(), email = $('email').value.trim(), tel = telefonoCompleto();
      if (!nombre) { error('Escribe tu nombre.'); $('nombre').focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { error('Revisa tu correo: ahí te llega el enlace de Meet.'); $('email').focus(); return; }
      if (tel.replace(/\D/g, '').length < 8 || !/^\+/.test(tel)) { error($('prefijo') ? 'Elige tu país y escribe tu número de WhatsApp.' : 'Escribe tu WhatsApp con el prefijo del país (por ejemplo, +34).'); $('telefono').focus(); return; }
      var cuerpo = { accion: 'reservar', inicio: horaSel.inicio, nombre: nombre, email: email, telefono: tel, web: $('web').value, origen: origen };
      var partes = [];
      // op.motivo(): texto fijo que pone la página (p. ej. el resultado del diagnóstico o de dónde viene).
      if (typeof op.motivo === 'function') { try { partes.push(op.motivo() || ''); } catch (e) {} }
      if (op.conMotivo) {
        partes.push(motivosMarcados());
        partes.push($('motivoTexto') ? $('motivoTexto').value.trim() : '');
      }
      var motivo = partes.filter(Boolean).join(' · ');
      if (motivo) cuerpo.motivo = motivo;
      var boton = $('reservar'); boton.disabled = true; boton.textContent = 'Reservando…';
      var hora = horaSel;
      fetch(API, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // sin preflight: Apps Script no lo acepta
        body: JSON.stringify(cuerpo)
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) {
          mide('llamada_reservada', { origen: origen });
          if (typeof op.alReservar === 'function') { op.alReservar(hora); return; }
          setTimeout(function () { location.href = '/llamada-confirmada/'; }, 300);
          return;
        }
        boton.disabled = false; boton.textContent = BOTON;
        error(d.mensaje || 'No se ha podido reservar. Inténtalo otra vez.');
        if (d.error === 'cogida') carga();
      }).catch(function () {
        boton.disabled = false; boton.textContent = BOTON;
        error('No se ha podido reservar. Escríbeme por WhatsApp al +34 621 32 18 61 y te la reservo yo.');
      });
    });

    carga();
  }

  window.AgendaJP = { monta: monta };
})();
