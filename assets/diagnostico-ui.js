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
  // 25/11/2026: la página pública hace la versión corta (12 como máximo); la de compradores, la completa.
  var OPC = { corto: PAGINA === 'publica' };

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
    ['portada', 'test', 'llave', 'resultado'].forEach(function (p) {
      if ($(p)) $(p).hidden = p !== id;
    });
    window.scrollTo(0, 0);
  }

  // 25/11/2026 (embudo «Elige tu camino»): quien llega desde /el/ o /ella/ trae ?sexo=h|m.
  // G0 ya va contestada y el test arranca sin la portada del diagnóstico.
  var CAMINO = (function () {
    try { var s = new URLSearchParams(location.search).get('sexo'); return s === 'h' || s === 'm' ? s : ''; }
    catch (e) { return ''; }
  })();

  // 25/11/2026: el correo se pide ANTES del resultado completo (en pantalla ya se ve el nombre del fallo).
  // Para volver al resultado sin correo, poner CANDADO = false.
  var CANDADO = true;
  var correoDado = false, datosCorreo = null;

  function actual() {
    var sec = D.secuencia(resp, OPC);
    // Hasta contestar G0-G2 no se sabe cuántas salen: se estima (versión corta: el límite, 12 + G0).
    var total = sec.length <= 3 ? (OPC.corto ? D.LIMITE_CORTO + 1 : 15) : sec.length;
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
    var sec = D.secuencia(resp, OPC);
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
    cuenta('diagnostico-completado');
    if (PAGINA === 'publica' && CANDADO && D.SUSCRIBIR_URL && !correoDado && $('llave')) { muestraLlave(); return; }
    muestra();
  }

  // Pantalla del correo: título del resultado + formulario. Al confirmar el Worker, sale el resultado completo.
  function muestraLlave() {
    $('llaveTitulo').textContent = informe.titulo;
    if (informe.gancho) $('llaveGancho').textContent = informe.gancho;
    $('formLlave').hidden = false;
    $('errorLlave').hidden = true;
    ver('llave');
    $('llaveTitulo').focus();
    cuenta('diagnostico-llave-vista');
  }

  function mandaCorreo(nombre, email) {
    return D.enviarResultado({
      nombre: nombre,
      email: email,
      sexo: resp.G0,
      principal: resultado.principal,
      secundario: resultado.secundario,
      reto: informe.reto,
      pagina: PAGINA,
      origen: CAMINO ? 'diagnostico-camino' : 'diagnostico',
      ref: ref,
      fecha: new Date().toISOString()
    });
  }

  function enviaLlave(ev) {
    ev.preventDefault();
    var form = $('formLlave');
    if (!form.reportValidity()) return;
    var boton = form.querySelector('button[type="submit"]');
    var textoBoton = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    $('errorLlave').hidden = true;
    var nombre = $('llaveNombre').value.trim(), email = $('llaveEmail').value.trim();
    mandaCorreo(nombre, email).then(function (ok) {
      boton.disabled = false;
      boton.textContent = textoBoton;
      if (ok) {
        correoDado = true;
        datosCorreo = { nombre: nombre, email: email };
        cuenta('diagnostico-correo');
        try { if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: resultado.principal }); } catch (e) {}
        muestra();
      } else {
        $('errorLlave').hidden = false;
        cuenta('diagnostico-correo-error');
      }
    });
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
    // «Hecho» solo cuando el Worker confirma (25/11/2026: antes salía siempre, y 7 de 8 correos se perdían).
    var boton = form.querySelector('button[type="submit"]');
    var textoBoton = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    var aviso = $('errorCorreo');
    if (aviso) aviso.hidden = true;
    mandaCorreo($('nombre').value.trim(), $('email').value.trim()).then(function (ok) {
      boton.disabled = false;
      boton.textContent = textoBoton;
      if (ok) {
        form.hidden = true;
        $('enviado').hidden = false;
        cuenta('diagnostico-correo');
      } else {
        if (aviso) aviso.hidden = false;
        cuenta('diagnostico-correo-error');
      }
    });
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
      // 24/11/2026 (Jose): la agenda va dentro del resultado (sin Tally ni páginas de preparación).
      // Del 17 al 23/11, con botón → /prepara-tu-llamada/ → Tally → /agenda/: 3 clics de 47 y 0 reservas.
      montaAgendaResultado();
      vigilaBoton();
      yaReservada();
    }
    if ($('gancho') && informe.gancho) $('gancho').textContent = informe.gancho;
    // Mientras no esté conectado el correo (SUSCRIBIR_URL vacío), no se ofrece guardar el resultado.
    // Si ya dejó el correo en la pantalla anterior, no se le vuelve a pedir: solo el aviso.
    $("datos").hidden = !D.SUSCRIBIR_URL || correoDado;
    $('formDatos').hidden = false;
    $('enviado').hidden = true;
    if ($('yaEnviado')) $('yaEnviado').hidden = !correoDado;
    // La agenda del resultado sale ya con su nombre y su correo.
    if (datosCorreo) {
      if ($('re-nombre') && !$('re-nombre').value) $('re-nombre').value = datosCorreo.nombre;
      if ($('re-email') && !$('re-email').value) $('re-email').value = datosCorreo.email;
    }
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
    if (CAMINO) { resp.G0 = CAMINO; ver('test'); pinta(); return; }
    ver('portada');
    $('empezar').focus();
  }

  function empieza() {
    if (CAMINO) resp.G0 = CAMINO;
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track('diagnostico-iniciado', { pagina: PAGINA, camino: CAMINO ? (CAMINO === 'm' ? 'ella' : 'el') : '' });
    }
    ver('test'); pinta();
  }
  $('empezar').onclick = empieza;
  if ($('formLlave')) $('formLlave').addEventListener('submit', enviaLlave);
  if ($('volverLlave')) $('volverLlave').onclick = function () { ver('test'); atras(); };
  // Solo aparece si falla el envío: nunca se deja a nadie sin su resultado por un error nuestro.
  if ($('sinCorreo')) $('sinCorreo').onclick = function () { cuenta('diagnostico-sin-correo'); muestra(); };
  if (CAMINO && PAGINA === 'publica') empieza();
  // 21/11/2026 (Jose): reservar la llamada desde la portada, sin hacer antes el diagnóstico.
  // La agenda (assets/agenda.js) se monta al abrirla, con ids «ag-…» para no chocar con el formulario del correo.
  function reservada() { try { return sessionStorage.getItem('llamada-reservada') === '1'; } catch (e) { return false; } }
  // Quien ya reservó y luego hace el diagnóstico no ve otra vez «Pide tu llamada gratis».
  function yaReservada() {
    if (!reservada() || !$('cartaLlamada')) return;
    // Quien reservó aquí mismo ya ve «Hecho…» dentro de la agenda; quien reservó antes (portada o /hablemos/) ve esto.
    if ($('re-hecho') && !$('re-hecho').hidden) return;
    $('cartaLlamada').querySelector('h3').textContent = 'Ya tienes tu llamada reservada';
    $('cartaTexto').textContent = 'Te llegó la invitación por correo. Llego a la llamada con tu resultado ya leído.';
    if ($('re-agenda')) $('re-agenda').hidden = true;
    if ($('resWhatsappP')) $('resWhatsappP').hidden = true;
  }
  // Agenda del resultado (ids «re-…»). Se monta una vez; el motivo lleva el resultado que salga en ese momento.
  function montaAgendaResultado() {
    if (!$('re-agenda') || !window.AgendaJP || reservada()) return;
    window.AgendaJP.monta({
      prefijo: 're-', origen: 'diagnostico-resultado',
      motivo: function () { return 'Hizo el diagnóstico: ' + (informe && informe.titulo ? informe.titulo : '') + ' (' + (resp.G0 === 'm' ? 'mujer' : 'hombre') + ')'; },
      alReservar: function () {
        try { sessionStorage.setItem('llamada-reservada', '1'); } catch (e) {}
        if (window.fbq) { try { window.fbq('track', 'Schedule'); } catch (e) {} }
        ['re-zona', 're-dias', 're-horas', 're-leyenda', 're-form'].forEach(function (id) { $(id).hidden = true; });
        $('cartaTexto').hidden = true;
        if ($('resWhatsappP')) $('resWhatsappP').hidden = true;
        $('re-hecho').hidden = false;
        $('re-hecho').focus();
      }
    });
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
  // El clic en «Escríbeme por WhatsApp» lo mide medir.js como «whatsapp» (pagina /diagnostico/); además, este:
  if ($('resWhatsapp')) $('resWhatsapp').addEventListener('click', function () { cuenta('resultado-whatsapp'); });
  $('volver').onclick = function () { ver('test'); atras(); };
})();
