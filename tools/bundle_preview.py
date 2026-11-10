#!/usr/bin/env python3
"""Bundle public/ into worker/preview.js (the preview Worker: every file inline, served under /erp/ or /).
Run after tools/build.py (which pulls the catalogue first):  python3 tools/build.py && python3 tools/bundle_preview.py   — Cedwyn editors"""
import json, pathlib, mimetypes
ROOT = pathlib.Path(__file__).resolve().parent.parent; PUB = ROOT / 'public'
TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml'}
import re
ver = re.search(r"VERSION = '([^']+)'", (ROOT / 'tools' / 'build.py').read_text()).group(1)
river = re.search(r"RIVER_VERSION = '([^']+)'", (ROOT / 'tools' / 'build.py').read_text()).group(1)
F = {}
for p in sorted(PUB.rglob('*')):
    if p.is_file() and p.suffix in TYPES:
        F['/' + p.relative_to(PUB).as_posix()] = [TYPES[p.suffix], p.read_text()]
js = ('const F=' + json.dumps(F) + ';\nexport default{async fetch(req){const u=new URL(req.url);let p=u.pathname.replace(/^\\/erp(?=\\/|$)/,\'\');if(p===\'\'||p===\'/\')p=\'/index.html\';const f=F[p];if(!f)return new Response(\'Not found\',{status:404});'
      'return new Response(f[1],{headers:{\'content-type\':f[0],\'cache-control\':\'no-store\',\'x-robots-tag\':\'noindex\',\'x-bfe-erp\':\'' + ver + '+river-' + river + '\'}})}};\n')
(ROOT / 'worker' / 'preview.js').write_text(js)
print(json.dumps({'files': len(F), 'bytes': len(js.encode())}))
