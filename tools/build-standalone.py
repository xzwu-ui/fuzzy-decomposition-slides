#!/usr/bin/env python3
"""Embed every CSS/font/script dependency; standard library only."""
from pathlib import Path
import argparse,base64,re,mimetypes
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--entry',default='index.html',help='HTML entry, relative to the project root')
parser.add_argument('--output',default='standalone.html',help='Output file, relative to the project root')
args=parser.parse_args()
entry=(root/args.entry).resolve()
output=(root/args.output).resolve()
entry.relative_to(root)
output.relative_to(root)
html=entry.read_text(encoding='utf-8')
def inline_css(match):
 path=root/match[1]
 css=path.read_text(encoding='utf-8')
 def inline_url(m):
  value=m[1].strip('"\'')
  if value.startswith('data:'):return m[0]
  asset=(path.parent/value).resolve()
  mime={'woff':'font/woff','woff2':'font/woff2','ttf':'font/ttf'}.get(asset.suffix[1:],mimetypes.guess_type(asset.name)[0] or 'application/octet-stream')
  return 'url(data:'+mime+';base64,'+base64.b64encode(asset.read_bytes()).decode()+')'
 css=re.sub(r'url\(([^)]+)\)',inline_url,css)
 return '<style>'+css+'</style>'
html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',inline_css,html)
scripts=[]
def inline_js(match):
 scripts.append('<script>'+ (root/match[1]).read_text(encoding='utf-8').replace('</script','<\\/script')+'</script>')
 return ''
html=re.sub(r'<script defer src="([^"]+)"></script>',inline_js,html)
html=html.replace('</body>','\n'+ '\n'.join(scripts)+'\n</body>')
output.write_text(html,encoding='utf-8')
print('Built '+output.name+':',len(html.encode()),'bytes')
