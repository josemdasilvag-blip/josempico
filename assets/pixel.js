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
    caja.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;' +
      'background:#171617;color:#fcfcfc;border:1px solid #525252;border-radius:8px;padding:18px 20px;' +
      'font:14px/1.5 Inter,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    caja.innerHTML =
      '<p style="margin:0 0 14px">Uso cookies de Meta para saber qué anuncios te traen hasta aquí y mostrar los míos ' +
      'a quien le puedan servir. Solo se activan si aceptas. <a href="/privacidad/#cookies" style="color:#c9a961">Más información</a>.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button type="button" data-v="si" style="flex:1;min-width:120px;padding:11px;border-radius:8px;border:0;background:#c9a961;color:#080808;font-weight:700;cursor:pointer">Aceptar</button>' +
      '<button type="button" data-v="no" style="flex:1;min-width:120px;padding:11px;border-radius:8px;border:1px solid #525252;background:transparent;color:#fcfcfc;cursor:pointer">Rechazar</button>' +
      '</div>';
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
