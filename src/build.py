# сборка из одних исходников — две страницы:
#  A) gh-potolki/index.html — демо для GitHub Pages: переключатель 7 смет, фото/видео внешними файлами из media/
#  B) potolki-platform.html — макет для OpMax (assets/custom-kp/vysokiy-uroven.html): всё инлайном до 1,9 МБ,
#     12–13 фото библиотеки и фото команды в base64, без видео (ролик приходит из KP_CONFIG.media),
#     одна смета-пример (gaiduk) без номера и сроков — для предпросмотра {demo:true}.
import os, shutil, re, json, io, base64
S = os.path.dirname(os.path.abspath(__file__))
O = S + '/gh-potolki' if os.path.isdir(S + '/gh-potolki') else os.path.dirname(S)  # из scratchpad или из src/ репозитория
IN_SRC = os.path.abspath(S) == os.path.abspath(O + '/src')
MEDIA = O + '/media'
KP_DIR = os.environ.get('OPMAX_CUSTOM_KP', '/Users/aleks/Desktop/project KP-feat-contacts/assets/custom-kp')
LIMIT = 1_900_000  # байт: контракт спец-заказа — до 2 МБ, держим запас

def rd(f): return open(S + '/' + f, encoding='utf-8').read()
css = rd('potolki-css.txt'); b = rd('potolki-body.html')
d = rd('potolki-data.js'); pr = rd('potolki-profile.js'); a = rd('potolki-app.js')
mark = rd('mark.svg')

def check(html, name, platform):
    """Строгая CSP платформы: ни одного on*-атрибута и javascript:-ссылки; разметка блоков для тепловой карты."""
    bad = re.findall(r'\son[a-z]+\s*=', html, re.I)
    assert not bad, name + ': on*-атрибуты ' + str(bad[:5])
    assert 'javascript:' not in html.lower(), name + ': javascript:-ссылка'
    blocks = re.findall(r'data-kp-block="([^"]*)"', html)
    assert len(blocks) >= 5 and len(set(blocks)) == len(blocks) and all(x.strip() for x in blocks), name + ': data-kp-block ' + str(blocks)
    assert html.count('<script') == 1, name + ': «<script» внутри кода сломает подпись nonce на платформе'
    assert not re.search(r'setDate\s*\(\s*\w+\.getDate\s*\(\s*\)\s*\+', html), name + ': срок от «сегодня»'
    if platform:
        assert '{{' not in html, name + ': «{{» — платформа подставляет переменные'
        assert not re.search(r'<(head|body|title|meta|link)[\s>/]', html, re.I), name + ': обвязка документа — на платформе её вырезают'

# ---------- A. демо для GitHub Pages ----------
from urllib.parse import quote
fav = 'data:image/svg+xml,' + quote(mark)
URL = 'https://adelchik1337-jpg.github.io/potolki-kp/'
head = ('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
 '<title>Натяжной потолок — коммерческое предложение «Высокий уровень»</title>\n'
 '<link rel="icon" href="' + fav + '">\n'
 '<meta property="og:title" content="Натяжной потолок — коммерческое предложение">\n'
 '<meta property="og:description" content="«Высокий уровень», Новороссийск: смета, разрез потолка, наши объекты и видео.">\n'
 '<meta property="og:image" content="' + URL + 'media/og.jpg">\n<meta property="og:type" content="website">\n')
html = head + css + '\n' + b + '\n<script>\n' + d + '\n' + pr + '\n' + a + '\n</script>\n'
check(html, 'index.html', False)
open(O + '/index.html', 'w', encoding='utf-8').write(html)
if not IN_SRC:
    os.makedirs(O + '/src', exist_ok=True)
    for f in ['potolki-css.txt', 'potolki-body.html', 'potolki-data.js', 'potolki-profile.js', 'potolki-app.js', 'build.py', 'mark.svg']:
        shutil.copy(S + '/' + f, O + '/src/' + f)
print('index.html', len(html) // 1024, 'KB')

# ---------- B. макет для OpMax ----------
try:
    from PIL import Image
except ImportError:
    Image = None
if IN_SRC or Image is None:
    print('potolki-platform.html: пропущено', '(сборка из src/)' if IN_SRC else '(нет Pillow)')
    raise SystemExit(0)

prof = json.loads(pr[pr.index('{'):pr.rindex('}') + 1])

# подборка библиотеки: по тегам — теневой×2, парящий×2, линии×2, трек×2, карниз×2, подсветка, люстра, точечный свет.
# Внутри тега — лучший score; фото с чужими «фишками» (страница уводит их назад, если этого нет в смете) штрафуются,
# у одиночных общих тегов (подсветка, люстра, точки) берём «чистое» фото — оно подходит к простой смете.
SIGN = {'shadow', 'float', 'seamless', 'line', 'track', 'cornice', 'two-level', 'gloss'}
SLOTS = [('shadow', 2), ('float', 2), ('line', 2), ('track', 2), ('cornice', 2), ('led', 1), ('chandelier', 1), ('spot', 1)]
def extra(p, tag): return len((set(p['tags']) & SIGN) - {tag})
picked = []
for tag, n in SLOTS:
    c = [p for p in prof['photos'] if tag in p['tags'] and p not in picked]
    if tag in SIGN: c.sort(key=lambda p: -(p.get('score', 0) - 3 * extra(p, tag)))
    else: c.sort(key=lambda p: (extra(p, tag), -p.get('score', 0)))
    picked += c[:n]
picked.sort(key=lambda p: prof['photos'].index(p))

def jpeg_uri(path, side, q):
    im = Image.open(path).convert('RGB')
    im.thumbnail((side, side), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

# одна смета-пример для предпросмотра макета: без адреса, номера и сроков — их даёт только платформа
m = re.search(r"\{ key:'gaiduk'.*?(?=\n\{ key:|\n\];)", d, re.S)
g = m.group(0).rstrip().rstrip(',')
first, _, rest = g.partition('\n')   # чистим только шапку записи — у вариантов свои title
g = re.sub(r"(title|addr|num|date|until):'[^']*', ", '', first) + '\n' + rest
demos = ('/* Пример сметы для предпросмотра макета в OpMax (KP_CONFIG.demo): реальная смета «стандарт / теневой», '
         'без адреса, номера и сроков */\nvar DEMOS = [\n' + g + '\n];')

def build(q_photo, n_photos):
    p2 = dict(prof)
    p2.pop('contacts', None)   # контакты у каждого менеджера свои — только из KP_CONFIG.contacts
    p2['video'] = None         # ролик — из загрузок КП (KP_CONFIG.media), инлайном не везём
    p2['team'] = dict(prof['team'], photo=jpeg_uri(MEDIA + '/team.jpg', 1000, 60))
    p2['photos'] = [dict(p, src=jpeg_uri(O + '/' + p['src'], 900, q_photo)) for p in picked[:n_photos]]
    js = ('/* Профиль компании «Высокий уровень» для OpMax: логотип, команда и подборка фото объектов — инлайном.\n'
          '   Контакты менеджера — из KP_CONFIG.contacts, видео и свои фото КП — из KP_CONFIG.media. */\n'
          'var DEMO_PROFILE = ' + json.dumps(p2, ensure_ascii=False) + ';')
    return ('<!-- «Высокий уровень» (Новороссийск) — КП на натяжной потолок. Макет спец-заказа OpMax, собран build.py '
            'из исходников potolki-*; руками не править. Смета, номер, сроки, контакты и медиа — из window.KP_CONFIG. -->\n'
            + css + '\n' + b + '\n<script>\n' + demos + '\n' + js + '\n' + a + '\n</script>\n')

for q, n in [(55, len(picked)), (50, len(picked)), (45, len(picked)), (45, 10)]:
    plat = build(q, n)
    size = len(plat.encode('utf-8'))
    if size <= LIMIT: break
assert size <= LIMIT, 'potolki-platform.html больше 1,9 МБ: ' + str(size)
check(plat, 'potolki-platform.html', True)
out = S + '/potolki-platform.html'
open(out, 'w', encoding='utf-8').write(plat)
print('potolki-platform.html', size, 'байт (%.2f МБ), фото: %d, q=%d' % (size / 1048576, n, q))
print('  подборка:', ', '.join(os.path.basename(p['src']) + '[' + ','.join(p['tags']) + ']' for p in picked[:n]))
if os.path.isdir(KP_DIR):
    shutil.copy(out, KP_DIR + '/vysokiy-uroven.html')
    print('  скопировано в', KP_DIR + '/vysokiy-uroven.html')
else:
    print('  нет каталога', KP_DIR, '— копия не сделана')
