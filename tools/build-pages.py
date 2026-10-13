"""Build the lecture and presentation for GitHub Pages; standard library only."""
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
bundler = root / 'tools' / 'build-standalone.py'
for entry, output in [('index.html', 'standalone.html'), ('web.html', 'web-standalone.html')]:
    subprocess.run([sys.executable, str(bundler), '--entry', entry, '--output', output], check=True)

site = root / '_site'
site.mkdir(exist_ok=True)
lecture = (root / 'web-standalone.html').read_text(encoding='utf-8')
assert 'href="index.html"' in lecture, 'Lecture presentation link is missing'
lecture = lecture.replace('href="index.html"', 'href="presentation.html"')
presentation = (root / 'standalone.html').read_text(encoding='utf-8')
for name, content in [('index.html', lecture), ('presentation.html', presentation),
                      ('web-standalone.html', lecture), ('standalone.html', presentation)]:
    (site / name).write_text(content, encoding='utf-8')
(site / '.nojekyll').write_text('', encoding='utf-8')
licenses = site / 'licenses'
licenses.mkdir(exist_ok=True)
(licenses / 'katex.txt').write_bytes((root / 'assets' / 'vendor' / 'katex' / 'LICENSE').read_bytes())
(licenses / 'fonts.txt').write_bytes((root / 'assets' / 'FONT-LICENSE.txt').read_bytes())
reports = site / 'reports'
reports.mkdir(exist_ok=True)
for name in ['fuzzy-cut-report.pdf']:
    shutil.copyfile(root / 'reports' / name, reports / name)
print('Built GitHub Pages: lecture homepage, presentation, offline versions and report files.')
