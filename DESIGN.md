# DESIGN.md — josempico.com

Sistema visual de la web desde el 25/09/2026. Sale del estilo de Refero Styles
«Branding» (SVZ): https://styles.refero.design/style/4d4772a3-e1da-415f-a6d7-658dcefdcecd
Se toma el lenguaje visual, no la marca ajena.

> Galería negra, puntuación en oro. Tipografía enorme en blanco sobre un fondo casi
> negro, un único acento rojo y una itálica serif como contrapunto.

## Colores

| Nombre | Hex | Uso |
|---|---|---|
| Void | `#080808` | Fondo de página |
| Absolute | `#000000` | Lo más hondo: fondos de imagen |
| Charcoal | `#171617` | Tarjetas, pie, superficies elevadas |
| Smoke | `#262525` | Superficie secundaria |
| Graphite | `#393939` | Elevación sutil |
| Iron | `#525252` | Subrayados, separadores finos |
| Pebble | `#B5B2B2` | Texto terciario, metadatos |
| Ash | `#D4D2D2` | Texto secundario, etiquetas del menú, bordes |
| Linen | `#F3EFEF` | Única superficie clara (texto `#080808` encima) |
| Bone | `#FCFCFC` | Texto principal |
| **Oro** | `#C9A961` | **Único acento** (en la referencia era rojo `#FE1E34`; cambiado al oro de la marca por decisión de Jose, 25/09). Solo bordes finos en uno o dos elementos destacados por página y el punto de marca. Nunca texto ni relleno |

## Tipografía

- **Principal:** Kmr Waldenburg → sustituta **Inter** (300, 400, 700).
- **Contrapunto:** Editorial New itálica 300 → sustituta **Playfair Display itálica**.
- Nunca más de dos familias.
- Titulares grandes: 700, mayúsculas, interlineado 0,90–1,05, tracking negativo (-0,05 a -0,08 em).
- Etiquetas de 10–12 px: mayúsculas con tracking abierto (+0,07 a +0,3 em).
- Palabras conectoras dentro de un titular, en itálica serif (la marca del sistema).

Escala: 10 · 12 · 14 · 16/17 (lectura) · 24 · 32 · 42 · 64 · 80 · 160.

## Forma y espacio

- Unidad 8 px. Separación entre secciones 48–64 px (hasta 80). Relleno de tarjetas 12–24 px.
- Radios: 3 px (menú, enlaces), 8 px (tarjetas y botones), 14,4 px como máximo.
- Sin sombras, sin degradados, sin botones rellenos. Como mucho el brillo interior
  `rgba(255,255,255,.2) 0 2px 5px inset` en tarjetas oscuras.

## Componentes

- **Llamada a la acción fantasma:** texto en mayúsculas 12 px con tracking y flecha ↗. Sin fondo.
- **Botón con borde:** borde de 1px (Ash, o rojo en la acción principal), radio 8 px, mayúsculas.
- **Tarjeta:** fondo Charcoal, borde fino, radio 8 px. La destacada, con borde rojo.
- **Enlaces:** subrayado en Iron. El hover cambia posición o peso, no color.
- **Punto de acento:** círculo rojo de 8–24 px junto a la marca.

## No

- Rojo como texto o relleno. Botones rellenos. Sombras. Radios grandes. Negro puro como texto
  sobre fondo oscuro.
