/* =====================================================================
   pruebas.js — motor de las pruebas de paso (versión 2)

   Especificación: biblioteca-josepico/PRUEBAS-FORMULARIOS.md
   Correcciones:   biblioteca-josepico/PRUEBAS-DE-PASO.md
   Este archivo es puro (sin DOM). Funciona en el navegador
   (window.Pruebas) y en Node (require).

   BLOQUES:
   0. CONFIGURACIÓN  → webhook de Hotmart Send
   1. CAMPOS         → nombres, retos, cuándo se mide y el siguiente campo
   2. PREGUNTAS      → textos exactos del formulario (ok: true = ✅, false = ❌)
   3. MOTOR          → no tocar sin correr:  node --test assets/pruebas.test.cjs
   4. ENVÍO          → enviarResultado()
   ===================================================================== */
(function (root) {
  'use strict';

  /* ================================================================
     0. CONFIGURACIÓN
     ================================================================ */

  // Webhook de Hotmart Send. Vacío: no se envía nada y no rompe.
  var WEBHOOK_URL = 'https://handler.send.hotmart.com/convert/wlTKLA7';
  // Token de esa integración («Integraciones vía webhook» en Hotmart Send). Va en el cuerpo, nunca en la URL.
  var HOTTOK = 'f2094df2-1ac2-4c45-bbe5-5b826b0ca9c6';

  /* ================================================================
     1. CAMPOS
     ================================================================ */

  var CAMPOS = {
    imagen: {
      nombre: 'imagen', siguiente: 'perfil',
      reto: { h: 'Reto 51 · Tu imagen', m: 'Reto 51b · Tu imagen' },
      medir: 'Han pasado cuatro semanas desde que acabé el reto',
      cuando: 'Vuelve aquí <strong>a las cuatro semanas</strong> de acabar el reto. Mientras tanto, entrena y sigue tu dieta: es lo que se mide.'
    },
    perfil: {
      nombre: 'perfil', siguiente: 'conversación',
      reto: { h: 'Reto 48 · Tu perfil', m: 'Reto 48b · Tu perfil' },
      medir: 'Di 100 likes con el perfil nuevo y han pasado siete días desde el último, sin pagar impulsos',
      cuando: 'Vuelve aquí cuando hayas dado <strong>100 likes con el perfil nuevo</strong> y hayan pasado <strong>siete días desde el último</strong>. Sin pagar impulsos: si no, no se puede comparar.'
    },
    conversacion: {
      nombre: 'conversación', siguiente: 'cita',
      reto: { h: 'Reto 49 · Tus conversaciones', m: 'Reto 49b · Tus conversaciones' },
      medir: 'Llevo diez conversaciones nuevas, o han pasado cuatro semanas',
      cuando: 'Vuelve aquí cuando lleves <strong>diez conversaciones nuevas</strong>, o a las <strong>cuatro semanas</strong>, lo que llegue antes.'
    },
    cita: {
      nombre: 'cita', siguiente: 'retener',
      reto: { h: 'Reto 50 · Tu cita', m: 'Reto 50b · Tu cita' },
      medir: 'Tuve mis dos próximas primeras citas, o han pasado seis semanas',
      cuando: 'Vuelve aquí después de tus <strong>dos próximas primeras citas</strong>, o a las <strong>seis semanas</strong>, lo que llegue antes.'
    }
  };

  var PARADA = 'Si esta misma corrección te falla dos veces, no insistas: el problema suele estar un campo antes.';

  /* ================================================================
     2. PREGUNTAS
     tipo: 'clave' (bloquea la medición), 'detalle' (sale como consejo),
           'hecho' (medición: lo evalúa el motor de cada campo).
     ok:true = cumple · ok:false = no cumple · sin ok = no decide.
     corta: la prueba se acaba ahí, con ese resultado.
     barajar: true = opciones sin orden natural (se barajan en pantalla).
     ================================================================ */

  function op(id, texto, ok, extra) {
    var o = { id: id, texto: texto };
    if (ok !== undefined) o.ok = ok;
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  function q(id, texto, ops, extra) {
    var p = { id: id, texto: texto, ops: ops, tipo: 'hecho' };
    if (extra) for (var k in extra) p[k] = extra[k];
    return p;
  }

  // Entrada, común a los cuatro
  function entrada(campo) {
    var c = CAMPOS[campo];
    var lista = [
      q('sexo', 'Eres…', [op('h', 'Hombre'), op('m', 'Mujer')]),
      q('momento', '¿En qué momento estás?', [
        op('dia8', 'Acabo de terminar los siete días del reto (es el día 8)'),
        op('medir', c.medir + ': toca medir')
      ])
    ];
    if (campo === 'perfil') {
      lista.push(q('reto', '¿Qué reto hiciste?', [
        op('48', 'El de tu perfil: ya tenía perfil y lo arreglé'),
        op('57', 'El de tu primer perfil: empecé de cero')
      ]));
    }
    return lista;
  }

  var D1 = q('D1', 'De las siete acciones del reto, ¿cuántas hiciste?', [
    op('siete', 'Las siete', true),
    op('cinco_seis', 'Cinco o seis', true),
    op('cuatro_menos', 'Cuatro o menos', false, { corta: 'terminar' })
  ], { tipo: 'clave', ayuda: 'Si un día se te pasó y lo hiciste al siguiente, cuenta.' });

  /* ---------- 2.1 IMAGEN ---------- */

  function entrenarDia8() {
    return q('entrenar', '¿Has empezado a entrenar?', [
      op('guiadas', 'Sí, en clases guiadas (CrossFit, Hyrox u otras)', true),
      op('cuenta', 'Sí, por mi cuenta (gimnasio, casa, correr…)', true),
      op('antes', 'Ya entrenaba antes del reto y sigo', true),
      op('no', 'Todavía no', false)
    ], { tipo: 'clave', dia: '5', fallo: 'Empieza a entrenar: en clases guiadas o por tu cuenta, pero empieza esta semana.' });
  }
  function comidaDia8() {
    return q('comida', '¿Cómo estás comiendo?', [
      op('sigo', 'Calculé mis macros, tengo la dieta y la estoy siguiendo', true),
      op('antes', 'Ya seguía una dieta antes del reto y sigo', true),
      op('no_sigo', 'Tengo la dieta, pero todavía no la sigo', false),
      op('no', 'No la he hecho', false)
    ], { tipo: 'detalle', dia: '6', fallo: 'Calcula tus macros, monta tu dieta y empieza a seguirla.' });
  }
  function fotosDia8() {
    return q('fotos', '¿Tienes las dos fotos de cuerpo entero, la del día 1 y la de hoy?', [
      op('dos', 'Las dos', true),
      op('una', 'Solo una', false)
    ], { tipo: 'detalle', dia: '1 y 8', fallo: 'Hazte la foto que te falta: sin las dos no tendrás con qué compararte cuando midas.' });
  }
  function conjuntosDia8(h) {
    return q('conjuntos', '¿Cuántos conjuntos completos para salir tienes montados, de arriba abajo' + (h ? ', con zapatos y no zapatillas?' : '?'), [
      op('tres_mas', 'Tres o más', true),
      op('dos', 'Dos', true),
      op('uno', 'Uno', false),
      op('ninguno', 'Ninguno', false)
    ], { tipo: 'clave', dia: '4', fallo: 'Monta al menos dos conjuntos completos para salir, de arriba abajo' + (h ? ', con zapatos.' : '.') });
  }

  function imagenDia8(s) {
    if (s === 'h') return [
      D1,
      q('pelo', '¿Cuándo te cortaste el pelo por última vez?', [
        op('reto', 'Durante la semana del reto', true),
        op('una_dos', 'Antes del reto, hace una o dos semanas', true),
        op('tres_cuatro', 'Antes del reto, hace tres o cuatro semanas', true),
        op('cita', 'Hace más de un mes, pero ya tengo cita pedida', true),
        op('sin_cita', 'Hace más de un mes, y no tengo cita', false),
        op('rapo', 'Me rapo yo, o no tengo pelo', true)
      ], { tipo: 'clave', dia: '2', fallo: 'Pide cita para cortarte el pelo. Y a partir de ahora, una vez al mes.' }),
      q('barba', '¿Cuándo te arreglaste la barba por última vez?', [
        op('no_llevo', 'No llevo barba', true),
        op('semana', 'Esta semana', true),
        op('mas', 'Hace más de una semana', false)
      ], { tipo: 'clave', dia: '2', fallo: 'Arréglate la barba, y a partir de ahora cada semana.' }),
      q('unas', '¿Llevas las uñas cortas y limpias?', [
        op('si', 'Sí', true), op('no', 'No', false)
      ], { tipo: 'detalle', dia: '2', fallo: 'Uñas cortas y limpias, siempre.' }),
      q('crema', '¿Te pones crema hidratante?', [
        op('manana', 'Cada mañana', true),
        op('algunos', 'Algunos días', false),
        op('no', 'No uso', false)
      ], { tipo: 'detalle', dia: '2', fallo: 'Crema hidratante cada mañana.' }),
      q('perfume', '¿Y perfume?', [
        op('salir', 'Tengo y me lo pongo para salir', true),
        op('no_pongo', 'Tengo, pero no me lo pongo', false),
        op('no', 'No tengo', false)
      ], { tipo: 'detalle', dia: '2', fallo: 'Hazte con un perfume y póntelo para salir.' }),
      q('armario', 'En tu montón de ropa para salir, ¿queda algo de esto?', [
        op('nada', 'Nada', true),
        op('alguna', 'Alguna cosa', false)
      ], { tipo: 'detalle', dia: '3', lista: ['Camisetas con dibujos o letras', 'Vaqueros pitillo', 'Pantalones caídos o grandes', 'Zapatillas de deporte'],
           fallo: 'Saca del montón de salir lo que queda de esa lista.' }),
      conjuntosDia8(true),
      entrenarDia8(),
      comidaDia8(),
      fotosDia8()
    ];
    return [
      D1,
      q('pelo', '¿Cuándo te cortaste el pelo o saneaste puntas por última vez?', [
        op('reto', 'Durante la semana del reto', true),
        op('menos_dos', 'Antes del reto, hace menos de dos meses', true),
        op('cita', 'Hace más de dos meses, pero ya tengo cita pedida', true),
        op('sin_cita', 'Hace más de dos meses, y no tengo cita', false)
      ], { tipo: 'clave', dia: '2', fallo: 'Pide cita en la peluquería. Y a partir de ahora, el corte cada dos meses.' }),
      q('color', '¿Cuándo te retocaste el color o las raíces por última vez?', [
        op('no_tino', 'No me tiño', true),
        op('menos_mes', 'Hace menos de un mes', true),
        op('cita', 'Hace más de un mes, pero ya tengo cita pedida', true),
        op('sin_cita', 'Hace más de un mes, y no tengo cita', false)
      ], { tipo: 'clave', dia: '2', fallo: 'Pide cita para el color. Y a partir de ahora, cada mes.' }),
      q('manos', '¿Tienes las manos y los pies hechos?', [
        op('las_dos', 'Las dos cosas', true),
        op('manos', 'Solo las manos', false),
        op('ninguna', 'Ninguna', false)
      ], { tipo: 'clave', dia: '2', fallo: 'Hazte las manos y los pies. Las dos cosas, siempre.' }),
      q('piel', '¿Tienes una rutina para la piel?', [
        op('cada_dia', 'Sí, y la hago cada día', true),
        op('algunos', 'La hago algunos días', false),
        op('no', 'No tengo', false)
      ], { tipo: 'detalle', dia: '2', fallo: 'Una rutina de piel, y hacerla cada día.' }),
      q('maquillaje', '¿Tienes claro tu maquillaje para salir y sabes hacértelo?', [
        op('si', 'Sí', true),
        op('mas_menos', 'Más o menos', false),
        op('no', 'No', false)
      ], { tipo: 'detalle', dia: '2', fallo: 'Ten claro tu maquillaje para salir y practícalo hasta que te salga sola.' }),
      q('armario', '¿Separaste tu ropa en los dos montones y sacaste lo que ya no te queda bien?', [
        op('si', 'Sí', true),
        op('sin_sacar', 'La separé, pero no saqué nada', false),
        op('no', 'No', false)
      ], { tipo: 'detalle', dia: '3', fallo: 'Separa la ropa en los dos montones y saca lo que ya no te queda bien.' }),
      conjuntosDia8(false),
      q('vestido', '¿Alguno de tus conjuntos es con vestido?', [
        op('vestido', 'Sí', true),
        op('falda', 'No, pero hay uno con falda', true),
        op('ninguno', 'Ni vestido ni falda', false)
      ], { tipo: 'detalle', dia: '4', fallo: 'Que al menos uno de tus conjuntos sea con vestido o falda.' }),
      q('calzado', '¿Con qué calzado van tus conjuntos?', [
        op('tacon', 'Tacones o sandalias altas', true),
        op('planos', 'Planos', false)
      ], { tipo: 'detalle', dia: '4', fallo: 'Para salir, tacones o sandalias altas.' }),
      entrenarDia8(),
      comidaDia8(),
      fotosDia8()
    ];
  }

  function imagenMedir(s) {
    var l = [
      q('entrenar', 'En estas cuatro semanas, ¿cuántas semanas has entrenado al menos tres días?', [
        op('cuatro', 'Las cuatro', true),
        op('tres', 'Tres', true),
        op('dos_menos', 'Dos o menos', false)
      ]),
      q('comida', '¿Cómo has comido estas cuatro semanas?', [
        op('dieta', 'Según mi dieta, con una o dos comidas libres a la semana', true),
        op('mitad', 'Según mi dieta, la mitad de los días', true),
        op('deje', 'La dejé, o casi nunca la sigo', false)
      ]),
      s === 'h'
        ? q('pelo', '¿Cuándo te cortaste el pelo por última vez?', [
            op('menos_mes', 'Hace menos de un mes', true),
            op('mas_mes', 'Hace más de un mes', false)
          ], { tipo: 'detalle', fallo: 'Córtate el pelo una vez al mes.' })
        : q('pelo', '¿Cuándo te cortaste el pelo por última vez?', [
            op('menos_dos', 'Hace menos de dos meses', true),
            op('mas_dos', 'Hace más de dos meses', false)
          ], { tipo: 'detalle', fallo: 'El corte, cada dos meses.' })
    ];
    if (s === 'm') l.push(q('color', '¿Y el color o las raíces?', [
      op('no_tino', 'No me tiño', true),
      op('menos_mes', 'Retocado hace menos de un mes', true),
      op('mas_mes', 'Hace más de un mes', false)
    ], { tipo: 'detalle', fallo: 'El color, cada mes.' }));
    if (s === 'h') {
      l.push(q('escriben', 'Comparado con antes del reto, ¿te escriben primero más mujeres, en persona, por redes o en las apps?', [
        op('mas', 'Más que antes'), op('igual', 'Igual'), op('menos', 'Menos')
      ]));
      l.push(q('excusas', 'Comparado con antes, cuando propones una cita, ¿te dicen que no o te ponen excusas…?', [
        op('menos', 'Menos que antes'), op('igual', 'Igual'), op('mas', 'Más'), op('no_propuse', 'No he propuesto')
      ]));
    } else {
      l.push(q('acercan', 'Comparado con antes del reto, fuera de las apps, ¿se te acercan, te piden el número o te escriben sin conoceros…?', [
        op('mas', 'Más que antes'), op('igual', 'Igual'), op('menos', 'Menos')
      ]));
      l.push(q('miran', 'Cuando sales, ¿notas que te miran más que antes?', [
        op('claramente', 'Sí, claramente'), op('algo', 'Algo'), op('no', 'No')
      ]));
    }
    l.push(q('comentan', '¿Te ha dicho alguien algo de tu cambio?', [
      op('varias', 'Sí, más de una persona'), op('una', 'Una'), op('nadie', 'Nadie')
    ]));
    l.push(q('foto', 'Pon la foto del día 8 al lado de la del día 1. ¿Cómo te ves?', [
      op('mucho', 'Mucho mejor'), op('algo', 'Algo mejor'), op('igual', 'Igual')
    ]));
    return l;
  }

  /* ---------- 2.2 PERFIL ---------- */

  function primeraFotoDia8(s) {
    var ops = s === 'h' ? [
      op('estatus', 'Estatus: bien vestido, en un sitio top', true),
      op('autoridad', 'Autoridad: hablando ante un público', true),
      op('viaje', 'De un viaje', false),
      op('deporte', 'Haciendo deporte', false),
      op('otra', 'Otra', false)
    ] : [
      op('llamativa', 'Una llamativa: arreglada, bien vestida, con una pose que te favorece', true),
      op('deporte', 'Haciendo deporte', false),
      op('viaje', 'De un viaje', false),
      op('otra', 'Otra', false)
    ];
    return q('primera', '¿Qué foto tienes ahora la primera?', ops, {
      tipo: 'clave', dia: '2', barajar: true,
      fallo: s === 'h' ? 'Pon de primera una foto de estatus (bien vestido, en un sitio top) o de autoridad.'
                       : 'Pon de primera una foto llamativa: arreglada, bien vestida y con una pose que te favorezca.'
    });
  }
  var IA = q('ia', '¿Cuántas de tus fotos están hechas o retocadas con IA?', [
    op('ninguna', 'Ninguna', true),
    op('alguna', 'Alguna, pero la mayoría son reales', true),
    op('todas', 'Todas o casi todas', false)
  ], { tipo: 'clave', dia: '2 y 5', fallo: 'Tu perfil no puede estar hecho entero con IA: cambia fotos de IA por fotos reales.' });
  var BIO = q('bio', '¿Cómo tienes la bio?', [
    op('blanco', 'En blanco', true),
    op('corta', 'Corta y que suma, sin nada negativo', true),
    op('mal', 'Tiene algo negativo, lo que busco, frases genéricas, política, religión o que fumo', false)
  ], { tipo: 'detalle', dia: '3', fallo: 'Deja la bio en blanco o corta y que sume: sin nada negativo, sin lo que buscas y sin frases genéricas.' });
  var CAMPOS_PERFIL = q('campos', '¿Tienes todo esto relleno?', [
    op('todo', 'Todo', true),
    op('parte', 'Una parte', false),
    op('no', 'No', false)
  ], { tipo: 'detalle', dia: '4', lista: ['Todos los intereses', 'Los principales', 'Qué buscas', 'Ciudad y trabajo', 'Política y religión, en blanco'],
       fallo: 'Rellena los campos que te faltan de esa lista.' });

  function mensajesDia8(s) {
    return s === 'h'
      ? q('mensajes', '¿A cuántos matches escribiste primero?', [
          op('uno_tres', 'Entre uno y tres, con algo sacado de su perfil', true),
          op('sin_matches', 'A ninguno: no tenía matches nuevos ni sin escribir', true),
          op('ninguno', 'A ninguno', false)
        ], { tipo: 'detalle', dia: '6', fallo: 'Escribe primero a tus matches, con algo sacado de su perfil.' })
      : q('mensajes', '¿A cuántos matches escribiste primero?', [
          op('tres', 'A tres', true),
          op('menos', 'A menos de tres, porque no tenía más', true),
          op('ninguno', 'A ninguno', false)
        ], { tipo: 'detalle', dia: '6', fallo: 'Escribe tú primero a tres matches.' });
  }

  function perfilDia8(s, reto) {
    var l = [D1];
    if (reto === '57') {
      l.push(q('numero', '¿Cuántas fotos subiste?', [
        op('cinco_seis', 'Cinco o seis', true),
        op('cuatro', 'Cuatro', true),
        op('tres_menos', 'Tres o menos', false),
        op('siete_mas', 'Siete o más', false)
      ], { tipo: 'clave', dia: '1 y 2', fallo: 'Entre cuatro y seis fotos. Si solo tienes cuatro buenas, cuatro: mejor cuatro buenas que ocho regulares.' }));
      l.push(primeraFotoDia8(s), IA, BIO, CAMPOS_PERFIL);
      l.push(q('instagram', '¿Revisaste tu Instagram (abierto, y lo que resta, archivado)?', [
        op('si', 'Sí', true), op('no', 'No', false)
      ], { tipo: 'detalle', dia: '3', fallo: 'Pon tu Instagram abierto y archiva lo que te resta.' }));
      l.push(q('likes', '¿Cuántos likes diste entre los dos días?', [
        op('menos_20', 'Menos de 20', false),
        op('20_50', 'Entre 20 y 50', true),
        op('mas_50', 'Más de 50', false)
      ], { tipo: 'clave', dia: '4 y 5', fallo: 'Entre 10 y 25 likes al día, eligiendo: ni a todo lo que sale ni a casi nadie.' }));
      l.push(mensajesDia8(s));
      l.push(q('cuenta', '¿Hiciste la cuenta de matches por cada 100 likes?', [
        op('si', 'Sí', true), op('no', 'No', false)
      ], { tipo: 'detalle', dia: '7', fallo: 'Haz la cuenta de matches por cada 100 likes: es tu punto de partida.' }));
      return l;
    }
    l.push(q('quitar', '¿Queda en tu perfil alguna de estas fotos?', [
      op('ninguna', 'Ninguna', true),
      op('una', 'Una', false),
      op('dos_mas', 'Dos o más', false)
    ], { tipo: 'clave', dia: '1', lista: ['Espejo', 'Primer plano de cara', 'Cama, sofá, ascensor o parking', 'Grupo donde hay que buscarte', 'Contraluz', 'Captura de pantalla', 'Una en la que ya no te pareces a como eres hoy (más de cinco años)'],
         fallo: 'Quita las fotos de esa lista que te quedan en el perfil.' }));
    l.push(primeraFotoDia8(s), IA, BIO, CAMPOS_PERFIL);
    l.push(s === 'h'
      ? q('altura', '¿Y la altura?', [
          op('llego', 'La puse: llego al rango (1,75 en España, 1,70 en Latinoamérica)', true),
          op('no_llego', 'No la puse porque no llego', true),
          op('sin_llegar', 'La puse sin llegar', false),
          op('llego_no', 'No la puse aunque llego', false)
        ], { tipo: 'detalle', dia: '4', barajar: true, fallo: 'La altura, solo si llegas al rango (1,75 en España, 1,70 en Latinoamérica).' })
      : q('altura', '¿Y la altura?', [
          op('puse', 'La puse', true),
          op('alta', 'No la puse porque soy muy alta y no me importa la diferencia', true),
          op('no', 'No la puse', false)
        ], { tipo: 'detalle', dia: '4', fallo: 'Pon tu altura.' }));
    l.push(q('nueva', '¿Te hiciste al menos una foto nueva de verdad, sin IA?', [
      op('si', 'Sí', true), op('no', 'No', false)
    ], { tipo: 'clave', dia: '5', fallo: 'Hazte al menos una foto nueva de verdad, sin IA.' }));
    l.push(mensajesDia8(s));
    l.push(s === 'h'
      ? q('cita', '¿Propusiste una cita con día, hora y sitio?', [
          op('si', 'Sí', true),
          op('no_fluida', 'No: ninguna conversación iba fluida', true),
          op('no_atrevi', 'No: la había y no me atreví', false),
          op('sin_cerrar', 'Propuse, pero sin cerrar («¿quedamos algún día?»)', false)
        ], { tipo: 'detalle', dia: '7', fallo: 'Cuando una conversación vaya fluida, propón la cita con día, hora y sitio.' })
      : q('cita', '¿Qué pasó con la cita?', [
          op('dije_si', 'Él la propuso y le dije que sí, con día, hora y sitio', true),
          op('di_pie', 'Le di pie («¿qué haces el sábado?»)', true),
          op('no_fluida', 'Nada: ninguna conversación iba fluida', true),
          op('no_pie', 'Había feeling y no le di pie', false)
        ], { tipo: 'detalle', dia: '7', fallo: 'Cuando haya feeling, dale pie («¿qué haces el sábado?»).' }));
    return l;
  }

  var TRAMOS = {
    h: [op('0_3', 'De 0 a 3'), op('4_6', 'De 4 a 6'), op('7_9', 'De 7 a 9'), op('10_14', 'De 10 a 14'), op('15_mas', '15 o más')],
    m: [op('0_24', 'De 0 a 24'), op('25_39', 'De 25 a 39'), op('40_54', 'De 40 a 54'), op('55_69', 'De 55 a 69'), op('70_mas', '70 o más')]
  };

  function perfilMedir(s, reto) {
    var l = [q('matches', 'De esos 100 likes, ¿cuántos acabaron en match?', TRAMOS[s])];
    if (reto !== '57') l.push(q('antes', '¿Te salen más matches que con tu perfil anterior?', [
      op('bastantes', 'Bastantes más'), op('algo', 'Algo más'), op('igual', 'Igual o menos')
    ]));
    l.push(q('buenas', '¿Cuántas fotos de tu perfil cumplen todo esto?', [
      op('ninguna', 'Ninguna'), op('una', 'Una'), op('dos_tres', 'Dos o tres'), op('cuatro_mas', 'Cuatro o más')
    ], { lista: s === 'h'
      ? ['No sale nadie más que tú', 'Luz de frente', 'Se te ve de cintura para arriba o de cuerpo entero']
      : ['Sales tú sola', 'Luz de frente', 'Se te ve de cintura para arriba o de cuerpo entero'] }));
    l.push(q('primera', '¿Cuál es tu primera foto?', [
      op('selfie', 'Un selfie o una foto de espejo'),
      op('gente', 'Una con más gente, con gafas de sol o de lejos'),
      op('primer_plano', 'Un primer plano de la cara'),
      op('dia_a_dia', 'Una de tu día a día'),
      op('preparada', 'Una preparada')
    ], { barajar: true }));
    l.push(s === 'h'
      ? q('respuesta', 'De los matches a los que escribiste primero, ¿cuántos te contestaron?', [
          op('casi_ninguno', 'Casi ninguno'), op('menos_mitad', 'Menos de la mitad'), op('mitad_mas', 'La mitad o más')
        ])
      : q('parados', '¿Cuántos matches tienes ahora parados, sin que haya escrito nadie?', [
          op('ninguno', 'Ninguno o casi ninguno'), op('pocos', 'Unos pocos'), op('muchos', 'Muchos')
        ]));
    return l;
  }

  /* ---------- 2.3 CONVERSACIÓN ---------- */

  var LEER = q('leer', '¿Leíste tus últimas conversaciones muertas, las tuyas y las suyas?', [
    op('diez', 'Sí, unas diez', true),
    op('menos', 'Las que tenía, aunque eran menos', true),
    op('no', 'No', false)
  ], { tipo: 'detalle', dia: '1', fallo: 'Lee tus últimas conversaciones muertas y apunta dónde se murieron.' });
  var RITMO = q('ritmo', '¿Igualaste su ritmo de respuesta?', [
    op('si', 'Sí: si tardaba horas, yo también', true),
    op('fluida', 'Ya teníamos una conversación fluida', true),
    op('no', 'Seguí contestando al momento', false)
  ], { tipo: 'detalle', dia: '4', fallo: 'Iguala su ritmo: si tarda horas en contestar, tú también.' });
  var INSTAGRAM = q('instagram', '¿Pasaste alguna conversación a Instagram o WhatsApp?', [
    op('si', 'Sí', true),
    op('no_quiso', 'Lo pedí y no quiso', true),
    op('ninguna', 'No lo pedí: ninguna iba fluida', true),
    op('no', 'No lo pedí', false)
  ], { tipo: 'detalle', dia: '5 y 6', fallo: 'Cuando una conversación vaya fluida, pásala a Instagram o WhatsApp.' });

  function retomar(s) {
    return q('retomar', '¿Retomaste una conversación parada o de «¿qué tal el día?»?', [
      op('tema', 'Sí, por un tema que ya había salido o por algo de su perfil', true),
      op('normal', 'Sí, con normalidad («¿qué tal la semana?»), porque nunca hubo tema', true),
      op('no_tenia', 'No tenía ninguna parada', true),
      op('no', 'No', false)
    ], { tipo: 'detalle', dia: '3', fallo: 'Retoma una conversación parada, por un tema que ya salió o por algo de su perfil.' });
  }

  function conversacionDia8(s) {
    if (s === 'h') return [
      D1, LEER,
      q('primeros', '¿Cuántos primeros mensajes escribiste, sacados de su perfil?', [
        op('tres_cinco', 'Entre tres y cinco', true),
        op('uno_dos', 'Uno o dos, porque no tenía más matches', true),
        op('ninguno', 'Ninguno', false)
      ], { tipo: 'clave', dia: '2', fallo: 'Escribe entre tres y cinco primeros mensajes, sacados de su perfil.' }),
      retomar(s), RITMO, INSTAGRAM,
      q('cita', '¿Propusiste la cita con día, hora y sitio?', [
        op('si', 'Sí, y me dijo que sí o me propuso otro día', true),
        op('excusas', 'Sí, y me puso excusas', true),
        op('nadie', 'No: todavía no noté a nadie cómodo', true),
        op('no_atrevi', 'No: lo noté y no me atreví', false),
        op('sin_cerrar', 'Propuse sin cerrar («¿quedamos algún día?»)', false)
      ], { tipo: 'clave', dia: '7', fallo: 'Cuando notes que está cómoda, propón la cita con día, hora y sitio. Sin «¿quedamos algún día?».' })
    ];
    return [
      D1, LEER,
      q('primeros', '¿Cuántos primeros mensajes escribiste tú primero?', [
        op('tres_cinco', 'Entre tres y cinco', true),
        op('uno_dos', 'Uno o dos, porque no tenía más', true),
        op('ninguno', 'Ninguno', false)
      ], { tipo: 'clave', dia: '2', fallo: 'Escribe tú primero a entre tres y cinco matches.' }),
      q('insistir', '¿Volviste a escribir a alguno que no te contestó?', [
        op('no', 'No', true), op('si', 'Sí', false)
      ], { tipo: 'detalle', dia: '2', fallo: 'Si no contesta, no se le vuelve a escribir.' }),
      retomar(s), RITMO, INSTAGRAM,
      q('quien', 'Esta semana, cuando una conversación se apagaba, ¿quién la retomaba?', [
        op('ambos', 'A veces yo, a veces él', true),
        op('yo', 'Siempre yo', false),
        op('nadie', 'Nadie: se quedaban paradas', false)
      ], { tipo: 'detalle', fallo: 'Que no seas siempre tú la que retoma, pero tampoco dejes que todo se pare.' }),
      q('cita', '¿Qué pasó con la cita?', [
        op('dije_si', 'Él la propuso y le dije que sí, con día, hora y sitio', true),
        op('di_pie', 'Le di pie («¿qué haces el sábado?»)', true),
        op('propuse', 'La propuse yo directamente', true),
        op('sin_feeling', 'Nada: ninguna conversación iba con feeling', true),
        op('no_pie', 'Había feeling y no le di pie', false)
      ], { tipo: 'clave', dia: '7', fallo: 'Cuando haya feeling, dale pie («¿qué haces el sábado?») o proponla tú.' })
    ];
  }

  var DE_QUE = q('de_que', '¿De qué iban esas conversaciones?', [
    op('dia', 'Siempre de lo mismo: qué tal el día, qué hiciste… No daban juego'),
    op('reimos', 'De nuestras cosas, con alguna broma, pero sin piques ni tonteo'),
    op('todo', 'De todo, con bromas y piques')
  ]);
  var CITAS_CERRADAS = q('citas', '¿Cuántas primeras citas cerraste?', [
    op('ninguna', 'Ninguna'), op('una', 'Una'), op('dos_mas', 'Dos o más')
  ]);

  function conversacionMedir(s) {
    if (s === 'h') return [
      q('propuse', 'De esas conversaciones, ¿en cuántas propusiste cita?', [
        op('ninguna', 'En ninguna'), op('una_dos', 'En una o dos'), op('tres_cinco', 'En tres a cinco'), op('seis_mas', 'En seis o más')
      ]),
      q('dijeron_si', '¿Cuántas te dijeron que sí?', [
        op('ninguna', 'Ninguna'), op('menos_mitad', 'Menos de la mitad'), op('mitad_mas', 'La mitad o más'), op('no_propuse', 'No propuse')
      ], { ayuda: 'Si te propuso otro día, cuenta como sí.' }),
      DE_QUE, CITAS_CERRADAS
    ];
    return [
      q('empieza', '¿Quién empieza y retoma las conversaciones?', [
        op('yo', 'Siempre yo, y las retomo yo'),
        op('nunca', 'Nunca yo, y se quedan paradas'),
        op('ambos', 'A veces yo, a veces él')
      ], { barajar: true }),
      q('proponen', '¿Cuántos te propusieron cita? Cuenta también los que la propusieron después de que les dieras pie.', [
        op('casi_ninguno', 'Casi ninguno'), op('pocos', 'Pocos'), op('bastantes', 'Bastantes'), op('casi_todos', 'Casi todos')
      ]),
      DE_QUE, CITAS_CERRADAS
    ];
  }

  /* ---------- 2.4 CITA ---------- */

  function citaDia8(s) {
    var l = [
      q('hasta', '¿Hasta dónde llegaste con el reto?', [
        op('siete', 'Hice los siete días', true),
        op('dia4', 'Hasta el día 4: la cita fue mal y el reto se acaba ahí', true),
        op('salte', 'Me salté días', false, { corta: 'terminar' }),
        op('sin_cita', 'No llegué a tener la cita', false, { corta: 'sin_cita' })
      ], { tipo: 'clave' })
    ];
    if (s === 'h') {
      l.push(q('como', '¿Cómo la propusiste?', [
        op('cerrada', 'Con día, hora y sitio', true),
        op('sin_cerrar', 'Sin cerrar («¿quedamos algún día?»)', false)
      ], { tipo: 'detalle', dia: 'antes de empezar', fallo: 'La próxima, con día, hora y sitio.' }));
      l.push(q('plan', '¿Qué plan fue?', [
        op('cafe', 'Café', true), op('cena', 'Cena', true), op('copas', 'Copas', true),
        op('largo', 'Cine, concierto, teatro o algo largo', false)
      ], { tipo: 'detalle', dia: 'antes de empezar', barajar: true, fallo: 'Para una primera cita, café, cena o copas. Nada de cine, concierto ni planes largos, salvo un monólogo o algo interactivo.' }));
      l.push(q('cuenta', '¿Quién pagó?', [
        op('yo', 'Pagué yo', true), op('medias', 'A medias', false), op('ella', 'Pagó ella', false)
      ], { tipo: 'detalle', dia: '3', fallo: 'En la próxima, pagas tú.' }));
      l.push(q('noche', '¿Qué le escribiste esa noche?', [
        op('corto', 'Un mensaje corto («lo he pasado muy bien, gracias»)', true),
        op('largo', 'Un mensaje largo, contándole lo que me gustó', false),
        op('nada', 'Nada', false)
      ], { tipo: 'clave', dia: '3', barajar: true, fallo: 'Esa noche, un mensaje corto: «lo he pasado muy bien, gracias».' }));
      l.push(q('despues', '¿Y a los dos días?', [
        op('ligero', 'Algo ligero, un par de bromas, y lo corté yo', true),
        op('no_escribi', 'No escribí: no lo tenía claro, o fue mal', true),
        op('mucho', 'Le escribí mucho', false)
      ], { tipo: 'clave', dia: '4', barajar: true, fallo: 'A los dos días, algo ligero, un par de bromas, y córtalo tú.' }));
      l.push(q('segunda', '¿Propusiste la segunda cita?', [
        op('tercer_cuarto', 'Sí, al tercer o cuarto día, con día, hora y sitio', true),
        op('antes', 'Sí, pero antes del tercer día', false),
        op('menos_semana', 'Sí, pero para menos de una semana desde la primera', false),
        op('enfrio', 'No: se fue enfriando', true),
        op('no_propuse', 'No: iba bien y no la propuse', false),
        op('mal', 'La cita fue mal: no tocaba', true)
      ], { tipo: 'clave', dia: '6 y 7', fallo: 'Propón la segunda al tercer o cuarto día, con día, hora y sitio, y para al menos una semana después de la primera.' }));
      l.push(q('distinto', '¿La segunda es un plan distinto al de la primera?', [
        op('si', 'Sí', true), op('no', 'No', false), op('no_hay', 'No hay segunda')
      ], { tipo: 'detalle', fallo: 'Que la segunda sea un plan distinto al de la primera.' }));
      return l;
    }
    l.push(q('plan', '¿Qué plan fue?', [
      op('cafe', 'Café, cena o copas', true),
      op('cambie', 'Él propuso cine o algo largo, y lo cambié por un café o unas copas', true),
      op('largo', 'Cine, concierto, teatro o algo largo', false)
    ], { tipo: 'detalle', dia: 'antes de empezar', fallo: 'Si te propone cine o algo largo para la primera, cámbialo por un café o unas copas.' }));
    l.push(q('cuenta', '¿Quién pagó?', [
      op('gesto', 'Pagó él, y yo hice el gesto de pagar', true),
      op('sin_gesto', 'Pagó él sin que yo hiciera el gesto', false),
      op('medias', 'A medias', false),
      op('yo', 'Pagué yo', false)
    ], { tipo: 'detalle', dia: '3', fallo: 'En la próxima, deja que pague él, pero haz el gesto de pagar.' }));
    l.push(q('noche', '¿Qué pasó esa noche por mensaje?', [
      op('corto', 'Le escribí un mensaje corto, o le contesté corto al suyo', true),
      op('largo', 'Le escribí un mensaje largo', false),
      op('nada', 'Nada, ni contesté', false)
    ], { tipo: 'detalle', dia: '3', barajar: true, fallo: 'Esa noche, un mensaje corto, o contesta corto al suyo.' }));
    l.push(q('despues', '¿Y al día siguiente?', [
      op('espere', 'Esperé a que escribiera él', true),
      op('escribi', 'Le escribí yo', false)
    ], { tipo: 'clave', dia: '4', fallo: 'Al día siguiente, espera a que escriba él: ese mensaje es información.' }));
    l.push(q('segunda', '¿Qué pasó con la segunda cita?', [
      op('tercer_cuarto', 'Él la propuso al tercer o cuarto día', true),
      op('otro_dia', 'La propuso para menos de una semana y le ofrecí otro día', true),
      op('acepte', 'La propuso para menos de una semana y acepté', false),
      op('la_propuse', 'No la propuso, había feeling y la propuse yo el día 7', true),
      op('enfrio', 'No la propuso y se enfrió: no la propuse', true),
      op('no_propuse', 'No la propuso, había feeling y no la propuse', false),
      op('mal', 'La cita fue mal: no tocaba', true)
    ], { tipo: 'clave', dia: '6 y 7', fallo: 'Si te propone la segunda para menos de una semana, ofrécele otro día. Y si hay feeling y no la propone, proponla tú el día 7.' }));
    return l;
  }

  function citaMedir(s) {
    var l = [
      q('segunda', '¿Cuántas de tus dos últimas primeras citas tuvieron segunda?', [
        op('ninguna_queria', 'Ninguna, y yo sí quería'),
        op('una', 'Una'),
        op('dos', 'Las dos'),
        op('ninguna_no_quise', 'Ninguna, pero porque yo no quise'),
        op('sin_citas', 'No he tenido primeras citas en estas seis semanas', undefined, { corta: 'sin_citas' })
      ])
    ];
    if (s === 'h') {
      l.push(q('despues', '¿Qué hiciste después de cada cita?', [
        op('mucho', 'Le escribí mucho'),
        op('ritmo', 'Igualé su ritmo'),
        op('nada', 'No escribí ni el mensaje de esa noche')
      ], { barajar: true }));
      l.push(q('cuando', '¿Cuándo propusiste la segunda?', [
        op('tercer_cuarto', 'Al tercer o cuarto día'),
        op('antes', 'Antes'),
        op('semana', 'Pasada una semana'),
        op('no', 'No la propuse')
      ]));
      l.push(q('pago', '¿Quién pagó?', [
        op('yo', 'Yo, en todas'),
        op('ella', 'Alguna fue a medias o pagó ella')
      ]));
    } else {
      l.push(q('despues', '¿Qué hiciste después de cada cita?', [
        op('escribi', 'Le escribí yo, y bastante'),
        op('ganas', 'Le contesté con ganas, sin ser yo la que escribe siempre'),
        op('espere', 'Esperé a que hiciera todo él, sin demostrarle nada')
      ], { barajar: true }));
      l.push(q('quien', '¿Quién propuso la segunda?', [
        op('el', 'Él'),
        op('yo', 'Yo, porque él no lo hizo'),
        op('nadie', 'Nadie')
      ]));
    }
    return l;
  }

  /* ================================================================
     3. MOTOR
     ================================================================ */

  // Lista completa de preguntas para unas respuestas dadas (incluye la entrada).
  function preguntas(campo, resp) {
    resp = resp || {};
    var l = entrada(campo);
    var s = resp.sexo, m = resp.momento;
    if (!s || !m || (campo === 'perfil' && !resp.reto)) return l;
    var resto;
    if (campo === 'imagen') resto = m === 'dia8' ? imagenDia8(s) : imagenMedir(s);
    else if (campo === 'perfil') resto = m === 'dia8' ? perfilDia8(s, resp.reto) : perfilMedir(s, resp.reto);
    else if (campo === 'conversacion') resto = m === 'dia8' ? conversacionDia8(s) : conversacionMedir(s);
    else resto = m === 'dia8' ? citaDia8(s) : citaMedir(s);
    return l.concat(resto);
  }

  function opcion(p, id) {
    for (var i = 0; i < p.ops.length; i++) if (p.ops[i].id === id) return p.ops[i];
    return null;
  }

  // Ids de las preguntas que tocan, en orden. Se corta tras una opción "corta".
  function secuencia(campo, resp) {
    var l = preguntas(campo, resp), ids = [];
    for (var i = 0; i < l.length; i++) {
      ids.push(l[i].id);
      var o = resp && resp[l[i].id] != null ? opcion(l[i], resp[l[i].id]) : null;
      if (o && o.corta) break;
    }
    return ids;
  }

  function pregunta(campo, resp, id) {
    var l = preguntas(campo, resp);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  // Pendiente por hacer: { dia, texto }
  function item(p) { return { dia: p.dia || '', texto: p.fallo }; }

  function fallos(lista, resp, tipo) {
    var r = [];
    lista.forEach(function (p) {
      if (p.tipo !== tipo || resp[p.id] == null) return;
      var o = opcion(p, resp[p.id]);
      if (o && o.ok === false && !o.corta) r.push(item(p));
    });
    return r;
  }

  function corte(lista, resp) {
    for (var i = 0; i < lista.length; i++) {
      var o = resp[lista[i].id] != null ? opcion(lista[i], resp[lista[i].id]) : null;
      if (o && o.corta) return o.corta;
    }
    return null;
  }

  function siguienteTexto(campo) {
    var sig = CAMPOS[campo].siguiente;
    return 'Pasa al siguiente campo: el que te salió como secundario en el diagnóstico o, si no tenías, <strong>' + sig + '</strong>.';
  }

  /* ---------- Día 8 (igual en los cuatro) ---------- */
  function evaluaDia8(campo, resp, lista) {
    var c = corte(lista, resp);
    if (c === 'terminar') return {
      codigo: 'terminar',
      titulo: 'Todavía no: termina el reto',
      parrafos: ['Con los días que llevas todavía no hay nada que medir. Retoma el reto donde lo dejaste y vuelve aquí el día 8.']
    };
    if (c === 'sin_cita') return {
      codigo: 'sin_cita',
      titulo: 'El problema va un paso antes',
      parrafos: ['Si no llegaste a tener la cita, todavía no hay nada que medir aquí. Lo que toca es el <strong>reto de tus conversaciones</strong>: es el que te lleva hasta la cita.']
    };
    var claves = fallos(lista, resp, 'clave');
    var detalles = fallos(lista, resp, 'detalle');
    if (claves.length) return {
      codigo: 'rehacer',
      titulo: 'Antes de medir, rehaz esto',
      parrafos: ['Has hecho buena parte del reto, pero hay días clave que no están. Sin ellos, lo que midas no te va a decir nada. Rehaz esto y vuelve a hacer la prueba del día 8.'],
      rehacer: claves,
      pendiente: detalles
    };
    return {
      codigo: 'a_medir',
      titulo: 'Reto hecho: ahora toca medir',
      parrafos: [CAMPOS[campo].cuando],
      pendiente: detalles
    };
  }

  /* ---------- Medición: imagen ---------- */
  function evaluaImagen(resp, lista) {
    var entrena = resp.entrenar !== 'dos_menos';
    var come = resp.comida !== 'deje';
    var mejora = resp.escriben === 'mas' || resp.excusas === 'menos' || resp.acercan === 'mas' ||
                 resp.miran === 'claramente' || resp.comentan === 'varias' || resp.comentan === 'una';
    var pendiente = fallos(lista, resp, 'detalle');
    if (entrena && come && mejora) return {
      codigo: 'pasa', titulo: 'Pasas',
      parrafos: ['Cumples con el entrenamiento y la comida, y ya se nota fuera: eso es lo que se buscaba.', siguienteTexto('imagen')],
      pendiente: pendiente
    };
    if (entrena && come) return {
      codigo: 'seguir', titulo: 'Cumples, pero todavía no se nota',
      parrafos: ['Haces lo que toca, pero fuera todavía no ha cambiado nada. No repites el reto: sigues con imagen <strong>otras cuatro semanas</strong> y vuelves a medir.'],
      rehacer: [{ dia: '7', texto: 'Cómo estás en persona: es lo único que repites.' }],
      pendiente: pendiente
    };
    var r = [];
    if (!entrena) r.push({ dia: '5', texto: 'Entrenar, con un plan más pequeño: tres días por semana, dos semanas seguidas.' });
    if (!come) r.push({ dia: '6', texto: 'La comida: un solo cambio, mantenido dos semanas.' });
    return {
      codigo: 'correccion', titulo: 'Reto de corrección',
      parrafos: ['No repites el reto entero: solo lo que ha fallado. Después vuelves a medir con esta misma prueba.'],
      rehacer: r, pendiente: pendiente, parada: true
    };
  }

  /* ---------- Medición: perfil ---------- */
  function evaluaPerfil(resp, s) {
    var tramos = TRAMOS[s].map(function (o) { return o.id; });
    var normal = tramos.indexOf(resp.matches) >= 2;
    var preparada = resp.primera === 'preparada';
    var fotosOk = (resp.buenas === 'dos_tres' || resp.buenas === 'cuatro_mas') && preparada;
    var extra = [];
    if (s === 'h' && resp.respuesta === 'casi_ninguno') extra.push({ dia: '6', texto: 'Diez primeros mensajes sacados de su perfil: casi nadie te contesta.' });
    if (s === 'm' && resp.parados === 'muchos') extra.push({ dia: '6', texto: 'Escribe tú primero a cinco matches parados.' });
    var cifra = s === 'h' ? 'siete o más matches por cada 100 likes' : 'cuarenta o más matches por cada 100 likes';

    if (resp.reto === '57') {
      if (normal) return {
        codigo: 'pasa', titulo: 'Pasas',
        parrafos: ['Tu primer perfil ya da ' + cifra + ': está en lo normal o por encima.', siguienteTexto('perfil')],
        pendiente: extra
      };
      return {
        codigo: 'reto48', titulo: 'Ahora toca arreglarlo',
        parrafos: ['Tu primer perfil todavía no llega a lo normal (' + cifra + '). Es lo que dice el día 7: ahora haces <strong>el reto de tu perfil</strong>, el que arregla uno que ya existe.'],
        pendiente: extra
      };
    }
    if (normal && fotosOk) return {
      codigo: 'pasa', titulo: 'Pasas',
      parrafos: ['Tu perfil da ' + cifra + ', con fotos buenas y la primera preparada.', siguienteTexto('perfil')],
      pendiente: extra
    };
    var fotos = [{ dia: '1 y 5', texto: 'Las fotos: tres buenas como mínimo.' }];
    if (!preparada) fotos.push({ dia: '2', texto: 'Una primera foto preparada.' });
    if (resp.antes === 'bastantes' || resp.antes === 'algo') return {
      codigo: 'correccion_fotos', titulo: 'Vas mejor: corrige solo las fotos',
      parrafos: ['Te salen más matches que antes, pero todavía no llegas a lo normal (' + cifra + '). Repites solo los días de fotos y vuelves a medir.'],
      rehacer: fotos, pendiente: extra, parada: true
    };
    if (fotosOk) return {
      codigo: 'imagen', titulo: 'El problema va antes que el perfil',
      parrafos: ['Tus fotos ya cumplen y aun así los matches no se mueven. Eso quiere decir que lo que falla no es el perfil, sino lo que sale en él: te toca el <strong>campo de imagen</strong>.'],
      pendiente: extra
    };
    return {
      codigo: 'correccion', titulo: 'Reto de corrección completo',
      parrafos: ['Los matches siguen igual y las fotos todavía fallan. Repite el reto de tu perfil entero, sobre todo esto:'],
      rehacer: fotos, pendiente: extra, parada: true
    };
  }

  /* ---------- Medición: conversación ---------- */
  function evaluaConversacion(resp, s) {
    var cita = resp.citas === 'una' || resp.citas === 'dos_mas';
    var r = [];
    var segundo;
    if (s === 'h') {
      segundo = (resp.propuse === 'tres_cinco' || resp.propuse === 'seis_mas') && resp.dijeron_si === 'mitad_mas';
      if (resp.propuse === 'ninguna' || resp.propuse === 'una_dos') r.push({ dia: '7', texto: 'Propón la cita en las tres próximas conversaciones que pasen de unos días.' });
      if (resp.dijeron_si === 'ninguna' || resp.dijeron_si === 'menos_mitad') r.push({ dia: '5 y 6', texto: 'Iguala su ritmo y pásala a Instagram antes de proponer.' });
      if (resp.de_que === 'dia') r.push({ dia: '4', texto: 'Saca tres conversaciones del formulario, con una broma.' });
    } else {
      segundo = (resp.proponen === 'bastantes' || resp.proponen === 'casi_todos') && resp.empieza !== 'yo';
      if (resp.empieza === 'yo') r.push({ dia: '5', texto: 'Deja de retomar tú: iguala su ritmo.' });
      if (resp.empieza === 'nunca') r.push({ dia: '2', texto: 'Escribe tú primero a cinco matches.' });
      if (resp.proponen === 'casi_ninguno' || resp.proponen === 'pocos') r.push({ dia: '4 y 7', texto: 'Saca las conversaciones del formulario y deja la puerta abierta en tres.' });
      if (resp.de_que === 'dia') r.push({ dia: '4', texto: 'Tres conversaciones con algo suyo y una broma.' });
    }
    if (cita && segundo) return {
      codigo: 'pasa', titulo: 'Pasas',
      parrafos: ['Cierras citas, y no por casualidad: la conversación hace su trabajo.', siguienteTexto('conversacion')]
    };
    if (cita) return {
      codigo: 'pasa_secundario', titulo: 'Pasas a la cita',
      parrafos: ['Has cerrado al menos una cita, así que pasas al <strong>campo de cita</strong>. Pero la conversación todavía no está fina: te la quedas como secundario y vas trabajando esto.'],
      pendiente: r
    };
    if (!r.length) r.push({ dia: '7', texto: 'Propón la cita en las tres próximas conversaciones que pasen de unos días.' });
    return {
      codigo: 'correccion', titulo: 'Reto de corrección',
      parrafos: ['Sin ninguna cita cerrada no pasas. No repites el reto entero: solo lo que ha fallado. Después vuelves a medir con esta misma prueba.'],
      rehacer: r, parada: true
    };
  }

  /* ---------- Medición: cita ---------- */
  function evaluaCita(resp, s) {
    if (resp.segunda === 'sin_citas') return {
      codigo: 'sin_citas', titulo: 'El problema va antes',
      parrafos: ['Sin primeras citas no hay nada que medir aquí. Lo que toca es el <strong>campo de conversación</strong>: es el que te lleva hasta la cita.']
    };
    if (resp.segunda === 'una' || resp.segunda === 'dos') return {
      codigo: 'pasa', titulo: 'Pasas',
      parrafos: ['Ya tienes segundas citas con alguien que te gusta. El siguiente paso es <strong>retener</strong>: que eso se convierta en algo.']
    };
    var r = [];
    if (s === 'h') {
      if (resp.despues === 'mucho') r.push({ dia: '4 y 5', texto: 'En la próxima cita, escribe lo justo esa noche e iguala su ritmo.' });
      if (resp.despues === 'nada') r.push({ dia: '3', texto: 'En la próxima cita, esa noche un mensaje corto: «lo he pasado muy bien, gracias».' });
      if (resp.cuando && resp.cuando !== 'tercer_cuarto') r.push({ dia: '6 y 7', texto: 'Propón la segunda en los tres días siguientes, con un plan concreto.' });
      if (resp.pago === 'ella') r.push({ dia: 'antes de empezar y 3', texto: 'En la próxima cita, pagas tú.' });
    } else {
      if (resp.despues === 'escribi') r.push({ dia: '4 y 5', texto: 'Contesta con ganas, sin ser tú la que escribe siempre.' });
      if (resp.despues === 'espere') r.push({ dia: '5', texto: 'Contesta con ganas y déjale ver que te gustó.' });
      if (resp.quien === 'nadie') r.push({ dia: '6 y 7', texto: 'Si él no propone la segunda en unos días, proponla tú.' });
    }
    if (!r.length) return {
      codigo: 'siguiente_cita', titulo: 'Sin segunda, pero hiciste lo que tocaba',
      parrafos: ['Una segunda cita no depende solo de ti. ' + (resp.segunda === 'ninguna_no_quise' ? 'Si no la hubo porque tú no quisiste, ' : 'Si hiciste lo que tocaba, ') +
                 'no hay nada que corregir: sigues igual y vuelves a medir con tus próximas primeras citas.']
    };
    return {
      codigo: 'correccion', titulo: 'Reto de corrección',
      parrafos: ['No repites el reto entero: solo lo que ha fallado, en tu próxima cita. Después vuelves a medir con esta misma prueba.'],
      rehacer: r
    };
  }

  // Resultado final. resp debe tener todas las preguntas de secuencia() contestadas.
  function evalua(campo, resp) {
    var lista = preguntas(campo, resp);
    var r;
    if (resp.momento === 'dia8') r = evaluaDia8(campo, resp, lista);
    else if (campo === 'imagen') r = evaluaImagen(resp, lista);
    else if (campo === 'perfil') r = evaluaPerfil(resp, resp.sexo);
    else if (campo === 'conversacion') r = evaluaConversacion(resp, resp.sexo);
    else r = evaluaCita(resp, resp.sexo);
    r.rehacer = r.rehacer || [];
    r.pendiente = r.pendiente || [];
    if (r.parada) r.notaParada = PARADA;
    r.campo = campo;
    r.reto = CAMPOS[campo].reto[resp.sexo] || '';
    return r;
  }

  /* ================================================================
     4. ENVÍO a Hotmart Send
     datos: { nombre, email, sexo, campo, momento, reto, resultado, respuestas, fecha }
     POST de formulario, nunca en la URL. Sin URL no hace nada.
     ================================================================ */
  function enviarResultado(datos, url, fetchImpl) {
    url = url === undefined ? WEBHOOK_URL : url;
    fetchImpl = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!url || !fetchImpl) return Promise.resolve(false);
    // Hotmart Send no responde a CORS: se manda como formulario (petición simple, sin preflight)
    // y en modo no-cors. Pide «hottok» y «email» en el cuerpo; el nombre va como «name».
    var cuerpo = new URLSearchParams();
    cuerpo.append('hottok', HOTTOK);
    Object.keys(datos).forEach(function (k) {
      var v = datos[k];
      if (v === undefined || v === null) return;
      cuerpo.append(k === 'nombre' ? 'name' : k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    try {
      return Promise.resolve(fetchImpl(url, {
        method: 'POST',
        mode: 'no-cors',
        body: cuerpo,
        keepalive: true
      })).then(function () { return true; }, function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  var Pruebas = {
    CAMPOS: CAMPOS,
    preguntas: preguntas,
    secuencia: secuencia,
    pregunta: pregunta,
    evalua: evalua,
    enviarResultado: enviarResultado
  };

  root.Pruebas = Pruebas;
  if (typeof module !== 'undefined' && module.exports) module.exports = Pruebas;
})(typeof window !== 'undefined' ? window : this);
