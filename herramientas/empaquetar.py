"""Une el HTML, CSS y JS compilados de un prototipo en un solo archivo HTML publicable.
Uso: python3 herramientas/empaquetar.py 02-pelea "Clan · Pelea" salida.html
"""
import glob, re, sys

pagina, titulo, salida = sys.argv[1], sys.argv[2], sys.argv[3]
base = f'dist-paginas/{pagina}'
html = open(f'{base}/index.html').read()
js = open(glob.glob(f'{base}/assets/*.js')[0]).read()
assert not re.match(r'^\s*import', js), 'el JS todavía importa otros archivos'
css = ''.join(open(f).read() for f in glob.glob(f'{base}/assets/*.css'))
body = html.split('<body>')[1].split('</body>')[0]
body = re.sub(r'<script[^>]*></script>', '', body)
js = js.replace('</script', '<\\/script')
open(salida, 'w').write(f'''<title>{titulo}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>:root{{color-scheme:dark}} body{{background:#0c1328;margin:0}}
{css}</style>
{body}
<script type="module">{js}</script>
''')
print(salida, len(js) // 1024, 'KB de JS')
