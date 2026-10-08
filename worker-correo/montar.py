"""Crea en MailerLite los campos y grupos que usa el Worker (idempotente) y escribe grupos.json.
Token: ~/.claude/mailerlite.key (no se imprime nunca). Uso: python -I montar.py"""
import json, pathlib, urllib.request, urllib.error
TOK = (pathlib.Path.home() / '.claude' / 'mailerlite.key').read_text(encoding='utf-8').strip()
API = 'https://connect.mailerlite.com/api'

def call(m, path, body=None):
    r = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, method=m,
        headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json', 'Accept': 'application/json',
                 'User-Agent': 'josempico-montar/1.0'})
    try:
        with urllib.request.urlopen(r) as f: return json.load(f)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{m} {path} -> {e.code} {e.read().decode()[:300]}')

CAMPOS = ['sexo', 'origen', 'resultado', 'secundario', 'reto', 'prueba_campo', 'prueba_resultado', 'prueba_momento']
GRUPOS = {
    'diag_P1': 'Diagnóstico · Imagen', 'diag_P2': 'Diagnóstico · Perfil', 'diag_P3': 'Diagnóstico · Conversaciones',
    'diag_P4': 'Diagnóstico · La cita', 'diag_P5': 'Diagnóstico · Retener', 'diag_S': 'Diagnóstico · Primer perfil',
    'diag_ajuste': 'Diagnóstico · Nada roto',
    'prueba_imagen': 'Prueba de paso · Imagen', 'prueba_perfil': 'Prueba de paso · Perfil',
    'prueba_conversacion': 'Prueba de paso · Conversaciones', 'prueba_cita': 'Prueba de paso · Cita',
    'sin_clasificar': 'Web · Sin clasificar',
}

hay = {f['key'] for f in call('GET', '/fields?limit=100')['data']}
for c in CAMPOS:
    if c not in hay:
        call('POST', '/fields', {'name': c, 'type': 'text'}); print('campo creado:', c)

existentes = {g['name']: g['id'] for g in call('GET', '/groups?limit=100')['data']}
ids = {}
for clave, nombre in GRUPOS.items():
    ids[clave] = existentes.get(nombre) or call('POST', '/groups', {'name': nombre})['data']['id']
pathlib.Path('grupos.json').write_text(json.dumps(ids, ensure_ascii=False), encoding='utf-8')
print('grupos:', len(ids), '-> grupos.json')
