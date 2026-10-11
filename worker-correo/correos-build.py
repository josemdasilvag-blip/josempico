# Empaqueta los correos de las 7 series en correos.js para el Worker.
# Fuente: biblioteca-josepico/hotmart/series/html/<serie>/<n>[-H|-M].html (salen de correos-html.py).
# Asunto = <title> de cada correo. Uso: python -I correos-build.py
import json, pathlib, re

AQUI = pathlib.Path(__file__).resolve().parent
FUENTE = AQUI.parents[1] / 'biblioteca-josepico' / 'hotmart' / 'series' / 'html'
SERIES = ['imagen', 'perfil', 'conversaciones', 'cita', 'retener', 'primer-perfil', 'nada-roto']

salida = {}
for serie in SERIES:
    salida[serie] = {}
    for f in sorted((FUENTE / serie).glob('*.html')):
        html = f.read_text(encoding='utf-8')
        asunto = re.search(r'<title>([^<]*)</title>', html).group(1).strip()
        for marca in ('{$name}', '{$unsubscribe}'):
            if marca not in html:
                raise SystemExit(f'{serie}/{f.name}: falta {marca}')
        salida[serie][f.stem] = {'asunto': asunto, 'html': html}
    for n in range(1, 9):
        if str(n) not in salida[serie] and not {f'{n}-H', f'{n}-M'} <= salida[serie].keys():
            raise SystemExit(f'{serie}: falta el correo {n}')

(AQUI / 'correos.js').write_text(
    '// GENERADO por correos-build.py. No editar a mano.\nexport default ' +
    json.dumps(salida, ensure_ascii=False) + ';\n', encoding='utf-8')
print('correos.js:', sum(len(v) for v in salida.values()), 'correos en', len(salida), 'series')
