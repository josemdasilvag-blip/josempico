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
                  'ghostlighting','lovebombing','futurefaking','breadcrumbing','pocketing','slowfading',
                  'blocking','caspering','friendzone','finaltext'];

  var WHATSAPP = '34621321861';

  // Desempate: el más específico gana. blocking es lo más verificable que hay
  // (o te bloqueó o no) y va primero. finaltext va el último de todos —es la
  // única salida "sana" de la lista, y no queremos que gane un empate por
  // defecto: solo gana cuando sus respuestas dominan de verdad.
  var PRIORIDAD = ['blocking','ghostlighting','caspering','zombieing','futurefaking','lovebombing',
                   'pocketing','benching','breadcrumbing','orbiting','friendzone','situationship',
                   'slowfading','ghosting','finaltext'];

  // Peso que la rama (P1) pone antes de empezar. Es un empujón, no un filtro:
  // un patrón con peso negativo todavía puede ganar si la conducta lo grita.
  var PESO_RAMA = {
    ahora:  { situationship:1, benching:1, breadcrumbing:1, pocketing:1, orbiting:2, lovebombing:1, futurefaking:1, zombieing:-1, slowfading:2, blocking:-2, caspering:1, friendzone:2, finaltext:-3 },
    pasado: { ghosting:2, zombieing:1, ghostlighting:2, orbiting:2, situationship:1, pocketing:2, futurefaking:1, lovebombing:1, benching:1, slowfading:1, blocking:2, caspering:2, friendzone:1, finaltext:2 },
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
    },
    slowfading: {
      nombre:'Slow fading', gloss:'El apagón lento',
      que_es:'No corta de golpe: se va apagando. Contesta cada vez más tarde, escribe cada vez menos, hasta que un día ya no queda casi nada que cortar.',
      te_pasa:'Antes contestaba rápido y con ganas. Ahora tarda un día, luego dos, y donde había una frase llega un «jaja» o un emoji. No ha habido bronca ni motivo: solo cada vez menos. Notas la caída mensaje a mensaje, como quien ve bajar el volumen sin que nadie toque el mando.',
      veredicto:'No va a ningún lado. Es el mismo sitio al que lleva el ghosting, solo que por el camino largo: así nadie tiene que dar la cara ni decir que se acabó.',
      que_hacer:'No compitas por una atención que ya se está yendo. Si notas la caída, pregunta directo: «¿esto te sigue interesando?». La respuesta —o el silencio— te ahorra los próximos dos meses de mensajes cada vez más cortos.',
      remate:'No hace falta apagar la luz si la vas bajando un poco cada día.',
      imagen_frase:'Cada vez tarda más. Cada vez dice menos.'
    },
    blocking: {
      nombre:'Blocking', gloss:'Bloqueo',
      que_es:'Más que ghosting. No solo deja de contestar: te bloquea. No puedes escribirle, no puedes ver su perfil, no puedes ni comprobar si sigue activo. Es una puerta que no solo se cierra, se sella.',
      te_pasa:'Un día decides escribir, o solo entrar a ver su perfil, y ya no está. No hay foto, no hay «en línea hace 3 h», no hay nada: para la aplicación, es como si nunca hubiera existido. No tuviste ni el hueco de duda que deja el ghosting: aquí la puerta se cerró con pestillo.',
      veredicto:'No va a ningún lado, y esta vez ni tú puedes forzarlo. Bloquear es una decisión activa, no una desidia: alguien tuvo que pararse, abrir el menú y elegirlo. Eso dice más que cualquier explicación.',
      que_hacer:'No hay mensaje que valga, ni cuenta nueva desde la que escribir. Un bloqueo es la frase más clara que existe en esto: se acabó, y sin posibilidad de apelar. Respeta la puerta cerrada, aunque no te haya gustado cómo se cerró.',
      remate:'Al menos no te deja dudas. Es el único que no miente sobre lo que quiere.',
      imagen_frase:'No solo dejó de contestar. Te bloqueó.'
    },
    caspering: {
      nombre:'Caspering', gloss:'El fantasma bueno',
      que_es:'Es un ghosting con aviso. Te manda un mensaje diciendo que esto se acaba, claro y sin rodeos. La diferencia con el ghosting normal: si le escribes después, contesta — solo que la respuesta siempre es la misma, que ya se acabó. No es la peor forma de dejarlo, pero tampoco es un cierre real.',
      te_pasa:'Te llegó el mensaje: esto no sigue. Fue directo, no te dejó a medias sobre si había esperanza. Pero como encima contesta si le escribes, es fácil quedarse enganchado a esa respuesta amable, esperando que algún día diga otra cosa. Nunca la dice.',
      veredicto:'No va a ningún lado, aunque duela menos que un ghosting a secas. Te avisó, y eso se agradece. Pero que conteste no es una puerta abierta: es solo buena educación de quien ya decidió no seguir.',
      que_hacer:'Quédate con lo bueno: al menos sabes a qué atenerte, que ya es más de lo que dan la mayoría de estos patrones. No le escribas esperando que la siguiente respuesta sea distinta — va a ser la misma. Si necesitas cerrarlo del todo, el silencio también es una opción, y esta vez la eliges tú.',
      remate:'Contestar no es lo mismo que querer seguir hablando.',
      imagen_frase:'Te dijo que se acababa. Y si escribes, contesta. Nada más.'
    },
    friendzone: {
      nombre:'Friendzone', gloss:'Amistad de verdad',
      que_es:'No sintió lo mismo, y en vez de dejarte a medias, te lo dijo y te ofreció algo real: su amistad. No es una trampa ni una migaja — si lo aceptas, de verdad eres su amigo o amiga a partir de ahora. Es de las formas más honestas de esta lista.',
      te_pasa:'Te dejó claro que no hay nada romántico, sin ambigüedad ni esperanza fingida. Y a partir de ahí, hay amistad de verdad: te escribe, cuenta contigo, se ríe contigo. No es un premio de consolación disfrazado — es una relación distinta a la que tú querías, pero sincera.',
      veredicto:'No va a ir a ningún lado en el plano romántico, y esta vez no es mala gestión suya: es honestidad. La pregunta no es si te quiere de otra forma —ya te ha contestado—, es si tú puedes con la amistad tal y como es.',
      que_hacer:'Decide con la cabeza fría si puedes ser su amigo o amiga sin que te cueste, o si necesitas algo de distancia para dejar de esperar otra cosa. Ninguna de las dos opciones está mal. Lo que no vale es quedarte ahí fingiendo que solo son amigos mientras sigues esperando que cambie.',
      remate:'Que no quisiera lo mismo no la convierte en mala persona. A veces solo es que no era eso.',
      imagen_frase:'No quiso lo mismo. Y aun así, se quedó — como amigo de verdad.'
    },
    finaltext: {
      nombre:'Final text', gloss:'El portazo con aviso',
      que_es:'Te manda un último mensaje, cortante pero claro: esto se acaba. Y ahí se queda. No hay nada más después, ni aunque le escribas — dijo lo que tenía que decir y desapareció. Tiene algo de responsabilidad afectiva, la justa: te avisó antes de irse, pero no se quedó a hablarlo.',
      te_pasa:'Llegó el mensaje sin avisar: esto no sigue. Puede que contestaras, puede que hicieras preguntas. No volvió nada. Ni un «ya hablamos», ni una última palabra: un mensaje, y silencio detrás para siempre.',
      veredicto:'No va a ningún lado, como casi todo en esta lista. Se lleva algo de mérito por decírtelo en vez de desaparecer sin más — pero un mensaje y luego nada tampoco es una conversación. Es un ghosting con un aviso delante.',
      que_hacer:'Agradece el aviso, que ya es más de lo que dan muchos de estos patrones. Pero no esperes respuesta a lo que le contestaste: ya dijo todo lo que iba a decir. Si te quedaron preguntas, vas a tener que hacer las paces con no tener respuesta.',
      remate:'Un mensaje de salida sigue siendo una salida.',
      imagen_frase:'Un último mensaje cortante. Y después, silencio para siempre.'
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
          { texto:'Se lo tomó a broma', set:{ situationship:1, benching:1 } },
          { texto:'Me dijo que me ve «solo como amigo/a»', set:{ friendzone:3, situationship:-1 } }
        ]}
      ],
      pasado:[
        { texto:'¿Cómo se acabó?', ops:[
          { texto:'Dejó de contestar de un día para otro', set:{ ghosting:3 } },
          { texto:'Se fue apagando sin más', set:{ breadcrumbing:2, ghosting:1 } },
          { texto:'Lo hablamos y cortó', set:{ ghosting:-2, situationship:1 } },
          { texto:'Desapareció y luego reapareció', set:{ zombieing:2 } },
          { texto:'Fue apagándose poco a poco, hasta que ya no había nada que cortar', set:{ slowfading:3 } },
          { texto:'Me bloqueó, sin más', set:{ blocking:3 } },
          { texto:'Me mandó un último mensaje cortante y ya no contestó más', set:{ finaltext:4 } }
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
          { texto:'Cuando pido algo claro', set:{ benching:2, situationship:1, ghostlighting:1 } },
          { texto:'Poco a poco, va bajando el ritmo hasta que se apaga solo', set:{ slowfading:2 } },
          { texto:'Nunca llega a ser pareja, aunque yo quiera', set:{ friendzone:3 } },
          { texto:'No se tuerce: cuando se acaba, me lo dicen claro', set:{ finaltext:4 } },
          { texto:'Cuando toca hablar de verdad, directamente me bloquea', set:{ blocking:3 } }
        ]},
        { texto:'¿Qué tienen en común esas personas?', ops:[
          { texto:'Acaban desapareciendo', set:{ ghosting:2, zombieing:1, orbiting:1 } },
          { texto:'No sueltan pero no avanzan', set:{ benching:2, breadcrumbing:1 } },
          { texto:'Prometen mucho', set:{ futurefaking:2, lovebombing:1 } },
          { texto:'Me tienen en segundo plano', set:{ pocketing:2, benching:1 } },
          { texto:'Se van apagando en vez de cortar de golpe', set:{ slowfading:2 } },
          { texto:'Me quieren de verdad, pero como amigo o amiga, no como pareja', set:{ friendzone:3 } },
          { texto:'Son buena gente hasta que hay que dar la cara', set:{ caspering:2 } }
        ]}
      ]
    },
    comunes:[
      { texto:'¿Cómo aparece cuando aparece?', ops:[
        { texto:'Un mensaje suelto cada dos o tres semanas', set:{ breadcrumbing:3, benching:1 } },
        { texto:'Ve mis stories y reacciona, pero no escribe', set:{ orbiting:3 } },
        { texto:'Nada. Silencio total, no hay señales', set:{ ghosting:3 } },
        { texto:'Está y contesta, pero nunca propone nada', set:{ benching:2, situationship:1 } },
        { texto:'Reapareció después de meses fuera', set:{ zombieing:3 } },
        { texto:'Cada vez tarda más en contestar y escribe menos, pero no ha cortado del todo', set:{ slowfading:3 } },
        { texto:'Fue sincero sobre no sentir lo mismo, pero sigue apareciendo poco y con buenas formas', set:{ caspering:3 } }
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
        { texto:'Sí, y se cumplían', set:{ ghosting:-1, benching:-1, breadcrumbing:-1, futurefaking:-1, pocketing:-1 } },
        { texto:'No, porque siempre ha dicho que solo somos amigos', set:{ friendzone:3 } }
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
        { texto:'Dijo lo correcto y luego nada cambió', set:{ futurefaking:2, benching:1 } },
        { texto:'Me dijo que se acababa, y si le escribo después, me contesta', set:{ caspering:4 } },
        { texto:'Me dijo que se acababa, y desde entonces no ha vuelto a contestar nunca más', set:{ finaltext:4 } }
      ]},
      { texto:'¿Ha habido cortes y regresos?', ops:[
        { texto:'Un corte limpio y definitivo, sin explicación', set:{ ghosting:3 } },
        { texto:'Desapareció y volvió como si nada, meses después', set:{ zombieing:3 } },
        { texto:'No escribe, pero sigue ahí mirándolo todo', set:{ orbiting:3 } },
        { texto:'Va y viene constantemente', set:{ breadcrumbing:2, benching:1 } },
        { texto:'Le planté cara y negó que hubiera pasado algo raro', set:{ ghostlighting:3 } },
        { texto:'No ha habido un corte: simplemente cada vez hay menos', set:{ slowfading:3, breadcrumbing:1 } },
        { texto:'Me bloqueó. No puedo ni verle el perfil', set:{ blocking:3 } }
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
