/* =====================================================================
   tu-situacion.js — motor y contenido del test «Ponle nombre a lo que te hacen»

   DOS BLOQUES:
   1. CONTENIDO  → se puede editar el texto libremente
   2. MOTOR      → no tocar sin correr:  node --test assets/tu-situacion.test.cjs

   Funciona en el navegador (window.TuSituacion) y en Node (require).
   ===================================================================== */
(function (root) {
  'use strict';

  /* ================================================================
     1. CONTENIDO
     ================================================================ */

  var PATRONES = ['ghosting','zombieing','benching','orbiting','situationship',
                  'ghostlighting','lovebombing','futurefaking','breadcrumbing','pocketing'];

  var WHATSAPP = '34621321861';

  // Desempate: el más específico gana. ghosting es el genérico y va el último.
  var PRIORIDAD = ['ghostlighting','zombieing','futurefaking','lovebombing','pocketing',
                   'benching','breadcrumbing','orbiting','situationship','ghosting'];

  // Peso que la rama (P1) pone antes de empezar. Es un empujón, no un filtro:
  // un patrón con peso negativo todavía puede ganar si la conducta lo grita.
  var PESO_RAMA = {
    ahora:  { situationship:1, benching:1, breadcrumbing:1, pocketing:1, orbiting:2, lovebombing:1, futurefaking:1, zombieing:-1 },
    pasado: { ghosting:2, zombieing:1, ghostlighting:2, orbiting:2, situationship:1, pocketing:2, futurefaking:1, lovebombing:1, benching:1 },
    patron: {}
  };

  var ENCUADRE = {
    ahora:  { kicker:'Lo que te están haciendo', frase:'Todavía estás a tiempo de cambiarlo:' },
    pasado: { kicker:'Lo que te hicieron',       frase:'Ya pasó. Para la próxima:' },
    patron: { kicker:'Tu patrón',                frase:'Te ha pasado más de una vez. El corte está aquí:' }
  };

  var FICHAS = {
    ghosting: {
      nombre:'Ghosting', gloss:'Desaparición',
      que_es:'Un día está y al siguiente no. Sin discusión, sin «esto no funciona», sin nada. Te deja hablando solo y no vuelve a dar señales.',
      te_pasa:'Veníais bien, o eso creías. Escribiste y no llegó respuesta. Escribiste otra vez y tampoco. No hubo bronca ni motivo: dejó de existir para ti. Lo peor no es que se fuera, es que te toca cerrar tú una puerta que dejó abierta.',
      veredicto:'No va a ningún lado. Quien se va así ya lo había decidido; lo que te ahorró fue la conversación, no la relación.',
      que_hacer:'No escribas más. Da la conversación por terminada tú, con la claridad que a él le faltó. Si algún día reaparece —pasa—, ya sabes cuánto vale su palabra.',
      remate:'Te bloqueó el duelo, no a ti. Un detalle.',
      imagen_frase:'Un día estaba. Al siguiente, no.'
    },
    zombieing: {
      nombre:'Zombieing', gloss:'El que vuelve',
      que_es:'Te hizo ghosting. Lo diste por muerto. Y meses después resucita en tus mensajes con un «hey, cuánto tiempo» como si no hubiera pasado nada.',
      te_pasa:'Desapareció sin explicación y acabaste pasando página a pulso. Justo cuando ya no dolía, volvió: un mensaje ligero, sin disculpa, sin mencionar el vacío que dejó. Quiere retomar en el punto en que le vino bien irse.',
      veredicto:'No vuelve por ti, vuelve porque se le acabó otra cosa o se aburrió. Sin una disculpa clara y un porqué, es una segunda parte con el mismo final.',
      que_hacer:'Antes de contestar con ilusión, pregúntate qué ha cambiado. Puedes decirlo directo: «desapareciste sin decir nada, ¿qué pasó?». Cómo responde a eso te dice todo.',
      remate:'Los muertos que escriben «hey» no quieren una relación. Quieren atención.',
      imagen_frase:'Desapareció. Meses después: «hey, cuánto tiempo».'
    },
    benching: {
      nombre:'Benching', gloss:'El banquillo',
      que_es:'No te titulariza ni te suelta. Te da lo justo para que no te vayas mientras mira si le sale algo mejor. Estás en la reserva.',
      te_pasa:'Contesta, pero tarde. Queda, pero cuando le viene. Nunca dice que no y nunca da el paso. Cada vez que vas a rendirte aparece con la dosis exacta de atención para que sigas esperando.',
      veredicto:'No va a ningún lado mientras haya banquillo. Solo saltarías al campo si su titular falla, y eso no es lo que quieres ser.',
      que_hacer:'Pon una prueba concreta: propón un plan con día y hora. Si lo esquiva o lo deja en «ya te digo», tienes la respuesta. Deja de estar disponible para quien te tiene de repuesto.',
      remate:'El banquillo se calienta solo. Levántate.',
      imagen_frase:'Te da lo justo para que no te vayas.'
    },
    orbiting: {
      nombre:'Orbiting', gloss:'En órbita',
      que_es:'Cortó el contacto de verdad —no escribe, no queda— pero no se va del todo. Ve todas tus stories, te da like a la foto de hace tres años, reacciona a todo. Mira sin entrar.',
      te_pasa:'Dejasteis de hablar, pero ahí sigue: el primero en ver cada story, un like suelto a horas raras, visto y nunca contestado. Suficiente para que no lo olvides, nada para poder contar con él.',
      veredicto:'No va a ningún lado. Si quisiera hablar, hablaría; mirar es gratis y no compromete.',
      que_hacer:'Si su sombra te tiene enganchado, quítale el escenario. No es un castigo, es dejar de actuar para un público que solo mira. El mejor castigo es dejarle ver sin que te importe ni te genere ninguna emoción, y sin contestarle absolutamente nada. Pero si eso te genera ansiedad, mejor siléncialo, restríngelo o bloquéalo.',
      remate:'Ver tus stories no es una relación, aunque no falle ni una.',
      imagen_frase:'No escribe. Pero es el primero en ver tus stories.'
    },
    situationship: {
      nombre:'Situationship', gloss:'El sinnombre',
      que_es:'Hacéis todo lo de una pareja menos llamarlo pareja. Sin etiqueta, sin conversación, sin definición. Y no es un descuido: la falta de nombre es la estrategia.',
      te_pasa:'Dormís juntos, os contáis el día, hay rutina. Pero cada vez que asoma el «qué somos», el tema se escurre: una broma, un cambio de tema, un «estamos bien así, ¿no?». Querías saber y te quedaste sin saber otra vez.',
      veredicto:'Puede ir a algún lado, pero solo si se nombra. Mientras no haya conversación de verdad, sigue indefinido hasta que uno se canse. Suele cansarse quien quería el nombre.',
      que_hacer:'Ten la conversación una vez, clara, sin ultimátum pero sin rodeos: «yo quiero X, ¿tú qué quieres?». Si no puede responder, ya te respondió.',
      remate:'«Estamos bien así» lo dice siempre el que está mejor.',
      imagen_frase:'Todo lo de una pareja menos la palabra «pareja».'
    },
    ghostlighting: {
      nombre:'Ghostlighting', gloss:'Desaparecer y negarlo',
      que_es:'Te hizo ghosting y, cuando reaparece o le pides explicaciones, te convence de que el raro fuiste tú. «No desaparecí, te has rayado tú». Ghosting con manual de negación.',
      te_pasa:'Se esfumó, lo pasaste mal, y cuando lograste hablarlo le dio la vuelta él: que si eran imaginaciones tuyas, que si exageras, que si él estuvo «igual que siempre». Saliste de la conversación pidiendo perdón por algo que te hicieron a ti.',
      veredicto:'No va a ningún lado, y encima desgasta. Alguien que borra lo que hizo mientras lo estás viviendo no lo va a hacer distinto la próxima vez.',
      que_hacer:'Fíate de tu registro, no del suyo. Los hechos son simples: cuántos días sin contestar, cuántos mensajes tuyos sin respuesta. Eso no lo discute nadie. Si intenta reescribirlo, es la señal para salir.',
      remate:'Si tienes que guardar capturas para creerte a ti mismo, ya sabes lo que es.',
      imagen_frase:'Desapareció. Y encima te convenció de que fuiste tú.'
    },
    lovebombing: {
      nombre:'Love bombing', gloss:'El bombardeo',
      que_es:'Un principio irreal: mensajes a todas horas, regalos, «nunca había sentido esto por nadie», planes de futuro en la primera semana. Demasiado, demasiado pronto. La intensidad no es amor, es prisa por engancharte.',
      te_pasa:'Te llegó todo de golpe y fue mareante en el buen sentido: te hizo sentir elegido, único, visto como nadie. Fue tan rápido que no te dio tiempo a preguntarte si esa persona te convenía. Ahora que ha bajado el volumen, notas el bajón.',
      veredicto:'Depende de lo que venga después del subidón. Si se convierte en algo estable y tranquilo, bien. Si se apaga de golpe o la usa para pedirte cosas, era un anzuelo. Lo que dice tiene que ser coherente con lo que hace.',
      que_hacer:'No confundas intensidad con compatibilidad. Baja tú el ritmo y mira si la cosa aguanta el paso normal. Quien te quiere de verdad no necesita deslumbrarte en una semana. Si sus acciones son coherentes con lo que te dice, sigue adelante. Si sientes que no lo son, déjalo ahí.',
      remate:'Si te tratan como el amor de su vida antes de saber tu segundo apellido, no eres tú: es el guion.',
      imagen_frase:'Demasiado, demasiado pronto. La prisa no era amor.'
    },
    futurefaking: {
      nombre:'Future faking', gloss:'El futuro de mentira',
      que_es:'Te pinta un futuro entero —el viaje, mudaros juntos, conocer a sus padres, el perro— y no cumple nada. Las promesas no son planes, son pegamento para que te quedes.',
      te_pasa:'Hablabais del futuro con detalle: fechas, ciudades, nombres. Te lo creíste porque estaba muy concreto. Pero llegaban las fechas y siempre había un motivo, y otro. Los planes se renovaban en palabras y nunca en calendario.',
      veredicto:'No va a ningún lado. Quien quiere ese futuro da el primer paso pequeño; quien solo lo describe está comprando tiempo.',
      que_hacer:'Mira lo que hace, no lo que dice que hará. Pon una fecha real a algo concreto y pequeño. Si se deshace, ya sabes cuánto valen las promesas grandes. Evalúa si hay coherencia entre sus palabras y sus acciones.',
      remate:'El viaje a Japón lleva dos años en «a ver si lo miramos».',
      imagen_frase:'Te prometió un futuro entero. No cumplió ni la primera fecha.'
    },
    breadcrumbing: {
      nombre:'Breadcrumbing', gloss:'Migajas',
      que_es:'Un mensaje suelto cada tanto, un like, un «te tengo que llamar» que no llega. Lo justo para que no te vayas y nunca lo suficiente para que pase algo. Te alimenta con migas.',
      te_pasa:'Desaparece días y vuelve con un meme. Justo cuando decides olvidarlo, cae un «cuánto tiempo, tenemos que vernos» que no lleva a ninguna parte. Cada miga reinicia tu espera. Llevas meses así y no habéis quedado.',
      veredicto:'No va a ningún lado por definición. Las migas están calculadas para mantenerte a la espera, no para avanzar.',
      que_hacer:'Responde a una miga con una propuesta concreta, una sola vez. Si no la coge, deja de contestar. No estás perdiéndote nada: no había pan, solo migas.',
      remate:'«Tenemos que vernos» no es un plan. Es un salvapantallas.',
      imagen_frase:'Un mensaje cada tres semanas, justo cuando ibas a olvidarlo.'
    },
    pocketing: {
      nombre:'Pocketing', gloss:'En el bolsillo',
      que_es:'Lleváis tiempo, pero para el mundo no existís. No te presenta a sus amigos, no sube ni una foto, no coincidís con nadie de su vida. Te lleva en el bolsillo, guardado.',
      te_pasa:'En privado todo va bien. Pero nunca has conocido a un amigo suyo, su familia no sabe tu nombre, y en sus redes no hay rastro de ti. Cuando lo mencionas, lo quita con un «no me van esas cosas».',
      veredicto:'Casi nunca va a algún lado. Esconder a alguien meses no es timidez: o no lo tiene claro, o hay algo que no quiere que se cruce contigo.',
      que_hacer:'Pide un paso concreto y normal: conocer a un amigo, un plan con más gente. La reacción a algo tan pequeño te dice si eres una relación o un secreto.',
      remate:'Si no sales ni en una story, no eres pareja, eres archivo.',
      imagen_frase:'Lleváis meses. Su gente no sabe que existes.'
    }
  };

  // Cada op: { texto, set:{patron:delta}, rama? }.  rama solo en P1.
  var PREGUNTAS = {
    rama: {
      texto:'¿En qué situación estás?',
      ops:[
        { texto:'Sigue pasando ahora mismo', rama:'ahora', set:{} },
        { texto:'Ya se acabó', rama:'pasado', set:{} },
        { texto:'Me pasa una y otra vez, con gente distinta', rama:'patron', set:{} }
      ]
    },
    porRama:{
      ahora:[
        { texto:'¿Cuánto lleváis en esto?', ops:[
          { texto:'Unas semanas', set:{ lovebombing:1 } },
          { texto:'Un par de meses', set:{ situationship:1 } },
          { texto:'Medio año o más', set:{ pocketing:2 } },
          { texto:'Ni lo sé, ha sido a rachas', set:{ breadcrumbing:2, benching:1 } }
        ]},
        { texto:'¿Habéis hablado de qué sois?', ops:[
          { texto:'Sí, y quedó en nada concreto', set:{ situationship:2 } },
          { texto:'Lo saqué y lo esquivó', set:{ benching:2 } },
          { texto:'Ni se ha mencionado', set:{ pocketing:2 } },
          { texto:'Se lo tomó a broma', set:{ situationship:1, benching:1 } }
        ]}
      ],
      pasado:[
        { texto:'¿Cómo se acabó?', ops:[
          { texto:'Dejó de contestar de un día para otro', set:{ ghosting:3 } },
          { texto:'Se fue apagando sin más', set:{ breadcrumbing:2, ghosting:1 } },
          { texto:'Lo hablamos y cortó', set:{ ghosting:-2, situationship:1 } },
          { texto:'Desapareció y luego reapareció', set:{ zombieing:2 } }
        ]},
        { texto:'¿Cuánto duró?', ops:[
          { texto:'Un par de semanas', set:{ lovebombing:2, ghosting:1 } },
          { texto:'Uno o dos meses', set:{} },
          { texto:'Más de tres meses', set:{ situationship:1, pocketing:2, futurefaking:1 } },
          { texto:'A rachas durante un año o más', set:{ breadcrumbing:2, benching:2, zombieing:1 } }
        ]}
      ],
      patron:[
        { texto:'¿En qué momento se suele torcer?', ops:[
          { texto:'Justo cuando empieza a ir en serio', set:{ ghosting:2, pocketing:1 } },
          { texto:'Después de un principio intensísimo', set:{ lovebombing:3, futurefaking:1 } },
          { texto:'Nunca llega a arrancar del todo', set:{ breadcrumbing:2, situationship:1 } },
          { texto:'Cuando pido algo claro', set:{ benching:2, situationship:1, ghostlighting:1 } }
        ]},
        { texto:'¿Qué tienen en común esas personas?', ops:[
          { texto:'Acaban desapareciendo', set:{ ghosting:2, zombieing:1, orbiting:1 } },
          { texto:'No sueltan pero no avanzan', set:{ benching:2, breadcrumbing:1 } },
          { texto:'Prometen mucho', set:{ futurefaking:2, lovebombing:1 } },
          { texto:'Me tienen en segundo plano', set:{ pocketing:2, benching:1 } }
        ]}
      ]
    },
    comunes:[
      { texto:'¿Cómo aparece cuando aparece?', ops:[
        { texto:'Un mensaje suelto cada dos o tres semanas', set:{ breadcrumbing:3, benching:1 } },
        { texto:'Ve mis stories y reacciona, pero no escribe', set:{ orbiting:3 } },
        { texto:'Nada. Silencio total, no hay señales', set:{ ghosting:3 } },
        { texto:'Está y contesta, pero nunca propone nada', set:{ benching:2, situationship:1 } },
        { texto:'Reapareció después de meses fuera', set:{ zombieing:3 } }
      ]},
      { texto:'Normalmente, ¿quién escribe primero?', ops:[
        { texto:'Siempre yo. Si no escribo, no hay nada', set:{ benching:2, breadcrumbing:1 } },
        { texto:'Aparece justo cuando iba a pasar página', set:{ breadcrumbing:2, zombieing:1 } },
        { texto:'Iba parejo al principio, luego se apagó su parte', set:{ ghosting:1, situationship:1, breadcrumbing:1, orbiting:1 } },
        { texto:'Él, todo el rato, sin parar', set:{ lovebombing:2 } }
      ]},
      { texto:'¿Hubo planes de futuro?', ops:[
        { texto:'Sí: viajes, mudarnos, conocer a su gente', set:{ futurefaking:3, lovebombing:1 } },
        { texto:'Planes vagos que nunca se concretaban', set:{ futurefaking:2, situationship:1 } },
        { texto:'Ninguno. Se vivía el momento', set:{ situationship:2 } },
        { texto:'Sí, y se cumplían', set:{ ghosting:-1, benching:-1, breadcrumbing:-1, futurefaking:-1, pocketing:-1 } }
      ]},
      { texto:'¿Te presenta a su gente? ¿Os ve alguien juntos?', ops:[
        { texto:'No conozco a nadie de su vida', set:{ pocketing:3 } },
        { texto:'Nada en redes, nunca salimos en grupo', set:{ pocketing:2, situationship:1 } },
        { texto:'Me presentó como «un amigo» / «una amiga»', set:{ pocketing:2, situationship:1 } },
        { texto:'Sí, con normalidad', set:{ pocketing:-2 } }
      ]},
      { texto:'¿Cómo fue el arranque?', ops:[
        { texto:'Intensísimo. Demasiado, demasiado rápido', set:{ lovebombing:3 } },
        { texto:'Regalos, mensajes sin parar, «nunca había sentido esto»', set:{ lovebombing:2, futurefaking:1 } },
        { texto:'Normal, fue subiendo poco a poco', set:{ lovebombing:-1 } },
        { texto:'Frío. Yo siempre tirando del carro', set:{ benching:1, breadcrumbing:1 } }
      ]},
      { texto:'Cuando pediste claridad, ¿qué hizo?', ops:[
        { texto:'Cambió de tema o se lo tomó a risa', set:{ situationship:2, benching:1 } },
        { texto:'Me dijo que me estaba montando películas', set:{ ghostlighting:3 } },
        { texto:'Desapareció justo después', set:{ ghosting:2, ghostlighting:1 } },
        { texto:'Dijo lo correcto y luego nada cambió', set:{ futurefaking:2, benching:1 } }
      ]},
      { texto:'¿Ha habido cortes y regresos?', ops:[
        { texto:'Un corte limpio y definitivo, sin explicación', set:{ ghosting:3 } },
        { texto:'Desapareció y volvió como si nada, meses después', set:{ zombieing:3 } },
        { texto:'No escribe, pero sigue ahí mirándolo todo', set:{ orbiting:3 } },
        { texto:'Va y viene constantemente', set:{ breadcrumbing:2, benching:1 } },
        { texto:'Le planté cara y negó que hubiera pasado algo raro', set:{ ghostlighting:3 } }
      ]}
    ]
  };

  /* ================================================================
     2. MOTOR  — no tocar sin correr las pruebas
     ================================================================ */

  var UMBRAL_TIBIO = 4;   // por debajo de esto, "aún no tiene forma" (se afina en calibración)
  var UMBRAL_COMBO = 4;   // el 2º debe llegar aquí para salir como "...y un poco de X"

  function pesoInicial(rama) {
    var p = {};
    PATRONES.forEach(function (k) { p[k] = 0; });
    var w = PESO_RAMA[rama] || {};
    Object.keys(w).forEach(function (k) { p[k] += w[k]; });
    return p;
  }

  function aplica(puntos, set) {
    Object.keys(set || {}).forEach(function (k) {
      puntos[k] = (puntos[k] || 0) + set[k];
    });
    return puntos;
  }

  function calcula(puntos, rama) {
    var orden = PATRONES.slice().sort(function (a, b) {
      if (puntos[b] !== puntos[a]) return puntos[b] - puntos[a];
      return PRIORIDAD.indexOf(a) - PRIORIDAD.indexOf(b);
    });
    var primario = orden[0];
    var segundo = orden[1];
    var max = puntos[primario];
    var secundario = (puntos[segundo] >= max - 2 && puntos[segundo] >= UMBRAL_COMBO) ? segundo : null;
    return {
      primario: primario,
      secundario: secundario,
      tibio: max < UMBRAL_TIBIO,
      orden: orden,
      puntos: puntos
    };
  }

  var TuSituacion = {
    PATRONES: PATRONES, PRIORIDAD: PRIORIDAD, PESO_RAMA: PESO_RAMA,
    FICHAS: FICHAS, ENCUADRE: ENCUADRE, PREGUNTAS: PREGUNTAS, WHATSAPP: WHATSAPP,
    UMBRAL_TIBIO: UMBRAL_TIBIO, UMBRAL_COMBO: UMBRAL_COMBO,
    pesoInicial: pesoInicial, aplica: aplica, calcula: calcula
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TuSituacion;
  else root.TuSituacion = TuSituacion;

})(typeof window !== 'undefined' ? window : this);
