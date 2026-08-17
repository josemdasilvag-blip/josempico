/* Medición de clics en los enlaces que sacan a la gente del sitio.
 *
 * Se apoya en el destino del enlace, no en atributos puestos a mano en el HTML.
 * Así, cuando se añada un botón nuevo de WhatsApp o un formulario, se mide solo
 * y no hay que acordarse de etiquetar nada.
 *
 * Si Umami no está cargado (o el visitante lo bloquea), esto no hace nada y la
 * página funciona igual: nunca debe impedir que un enlace se abra.
 */
(function () {
  var reglas = [
    { patron: /^https:\/\/wa\.me\//,  nombre: 'whatsapp' },
    { patron: /tally\.so/,            nombre: 'formulario' },
    { patron: /buy\.stripe\.com/,     nombre: 'pago-vibes' },
    { patron: /instagram\.com/,       nombre: 'instagram' },
    { patron: /^mailto:/,             nombre: 'email' },
    { patron: /maps\.google\.com/,    nombre: 'mapa' }
  ];

  document.addEventListener('click', function (e) {
    try {
      var enlace = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!enlace) return;
      if (!window.umami || typeof window.umami.track !== 'function') return;

      var destino = enlace.getAttribute('href') || '';

      for (var i = 0; i < reglas.length; i++) {
        if (reglas[i].patron.test(destino)) {
          window.umami.track(reglas[i].nombre, {
            pagina: location.pathname,
            texto: (enlace.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
          });
          return;
        }
      }
    } catch (err) {
      /* Medir nunca puede romper la navegación. */
    }
  }, true);
})();
