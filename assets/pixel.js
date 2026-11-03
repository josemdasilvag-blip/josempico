/* Píxel de Meta (conjunto de datos «Jose Pico web», ID 1590177373123205).
 *
 * Solo se carga si la persona acepta en el aviso de cookies: el píxel instala cookies
 * publicitarias y en España eso exige consentimiento previo. Si rechaza, no se carga nada.
 * La elección se guarda en este navegador; desde /privacidad/ se puede cambiar
 * (cualquier enlace con data-cookies abre otra vez el aviso).
 *
 * Eventos: PageView en todas las páginas, Lead al enviar la solicitud (Tally)
 * y Schedule en /llamada-confirmada/.
 */
(function () {
  var PIXEL = '1590177373123205';
  var CLAVE = 'cookies-publicidad';

  function leer() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) {} }

  function cargarPixel() {
    if (window.fbq) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL);
    fbq('track', 'PageView');
    if (location.pathname.indexOf('/llamada-confirmada') === 0) fbq('track', 'Schedule');
  }

  // La solicitud se envía dentro del iframe de Tally, que avisa a la página.
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://tally.so' || !window.fbq) return;
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (_) { return; } }
    if (d && d.event === 'Tally.FormSubmitted') fbq('track', 'Lead');
  });

  function aviso() {
    if (document.getElementById('avisoCookies')) return;
    var caja = document.createElement('div');
    caja.id = 'avisoCookies';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', 'Aviso de cookies');
    // Arriba y compacto: abajo tapaba el botón «Empezar» del diagnóstico en el móvil.
    caja.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#171617;color:#fcfcfc;' +
      'border-bottom:1px solid #525252;padding:10px 16px;font:13px/1.4 Inter,system-ui,sans-serif;' +
      'display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 4px 18px rgba(0,0,0,.5)';
    var boton = 'padding:7px 14px;border-radius:6px;font:inherit;cursor:pointer;';
    caja.innerHTML =
      '<span style="flex:1 1 220px;max-width:560px">Uso cookies de Meta para medir mis anuncios. ' +
      '<a href="/privacidad/#cookies" style="color:#c9a961">Más info</a></span>' +
      '<span style="display:flex;gap:8px">' +
      '<button type="button" data-v="si" style="' + boton + 'border:0;background:#c9a961;color:#080808;font-weight:700">Aceptar</button>' +
      '<button type="button" data-v="no" style="' + boton + 'border:1px solid #525252;background:transparent;color:#fcfcfc">Rechazar</button>' +
      '</span>';
    caja.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (!v) return;
      var antes = leer();
      guardar(v);
      caja.remove();
      if (v === 'si') cargarPixel();
      else if (antes === 'si') location.reload(); // retirar el consentimiento descarga el píxel
    });
    document.body.appendChild(caja);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-cookies]');
    if (a) { e.preventDefault(); aviso(); }
  });

  function iniciar() {
    var v = leer();
    if (v === 'si') cargarPixel();
    else if (v !== 'no') aviso();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
