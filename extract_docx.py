import zipfile, re, html
from pathlib import Path

base = Path(__file__).parent / 'примеры текстовой части'
for docx in sorted(base.glob('*.docx')):
    with zipfile.ZipFile(docx) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    xml = re.sub(r'</w:p>', '\n', xml)
    xml = re.sub(r'<w:tab[^>]*/>', '\t', xml)
    text = re.sub(r'<[^>]+>', '', xml)
    text = html.unescape(text)
    lines = [line.strip() for line in text.splitlines()]
    text = '\n'.join(line for line in lines if line)
    out = base / (docx.stem + '.txt')
    out.write_text(text, encoding='utf-8')
    print(out.name, len(text), 'chars', len(text.splitlines()), 'lines')
