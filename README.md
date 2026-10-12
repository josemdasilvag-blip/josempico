# josempico.com

Código de [josempico.com](https://josempico.com/), la web de Jose Pico (José Manuel Da Silva) sobre relaciones y búsqueda de pareja.

## Qué hay en la web

- Mentoría individual para analizar una situación y definir próximos pasos.
- Match Link, un servicio de presentaciones personales.
- VIBES, encuentros presenciales para solteros.
- Recursos y pruebas gratuitas sobre fotos, perfil y conversaciones.

La web está publicada en [josempico.com](https://josempico.com/). Este repositorio contiene el sitio y el código del Worker de correo; no es una plantilla ni una demo ficticia.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `index.html` | Página principal |
| `assets/` | Estilos, scripts, imágenes y pruebas del sitio |
| `mentoria/`, `match-link/`, `vibes/`, `recursos/`, `clases/` | Páginas de las distintas áreas |
| `worker-correo/` | Worker de Cloudflare para suscripciones y secuencias de correo |
| `DESIGN.md` | Decisiones de diseño visual |

Las páginas son HTML, CSS y JavaScript. La publicación del sitio usa el dominio indicado en `CNAME`. El Worker se despliega por separado y utiliza Cloudflare D1; sus credenciales se configuran como secretos, fuera del repositorio.

## Revisar en local

Para las páginas estáticas, abre `index.html` en un servidor local. Algunas funciones, como la suscripción por correo, necesitan el Worker y sus servicios configurados. Las pruebas de JavaScript del sitio están en archivos `*.test.cjs` de `assets/`; el Worker tiene `worker-correo/worker.test.mjs`.

## Autor

José Manuel Da Silva · [josempico.com](https://josempico.com/)
