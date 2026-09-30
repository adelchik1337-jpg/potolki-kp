# сборка из одних исходников — две страницы:
#  A) gh-potolki/index.html — демо для GitHub Pages: переключатель 7 смет, фото/видео внешними файлами из media/
#  B) potolki-platform.html — макет для OpMax (assets/custom-kp/vysokiy-uroven.html): всё инлайном до 1,9 МБ,
#     12–13 фото библиотеки, фото команды и обложка в base64, без видео (ролик приходит из KP_CONFIG.media),
#     одна смета-пример (gaiduk) без номера и сроков — для предпросмотра {demo:true}.
# Стили: kp-base.css (база КП в манере Фокуса) + kp-pavel.css (переменные бренда Павла) + potolki-css.txt (дополнения макета), комментарии вырезаются.
# Скрипт: potolki-app.js + фрагменты по маркерам (classify, photos, people, nodes, cut, offer) — один <script>, всё внутри одной функции-обёртки.
import os, shutil, re, json, io, base64
S = os.path.dirname(os.path.abspath(__file__))
O = S + '/gh-potolki' if os.path.isdir(S + '/gh-potolki') else os.path.dirname(S)  # из scratchpad или из src/ репозитория
IN_SRC = os.path.abspath(S) == os.path.abspath(O + '/src')
MEDIA = O + '/media'
KP_DIR = os.environ.get('OPMAX_CUSTOM_KP', '/Users/aleks/Desktop/project KP-feat-contacts/assets/custom-kp')
LIMIT = 1_900_000  # байт: контракт спец-заказа — до 2 МБ, держим запас
COVER_PATH = 'media/p/c03_046.jpg'  # фото обложки: лежит в разметке (раньше скрипта — быстрее LCP), из библиотеки «Наших работ» его исключаем

def rd(f): return open(S + '/' + f, encoding='utf-8').read()

# ---------- русская типографика статичного текста разметки (то же, что lib/typograf.ts: предлоги, тире, числа, единицы) ----------
NB = '\u00a0'
SHORT = r'(?:в|во|на|с|со|к|ко|у|о|об|от|до|по|за|из|и|а|но|не|ни|для|при|без|над|под|про|или|же|бы|ли|то|да)'
def T(s):
    s = s.replace(' — ', NB + '— ')
    for _ in range(2):
        s = re.sub(r'(?<![\w])(' + SHORT + r')[ \t]+(?=\S)', lambda m: m.group(1) + NB, s, flags=re.I)
    s = re.sub(r'(\d) (?=\d{3}(?!\d))', r'\1' + NB, s)
    s = re.sub(r'(\d) (?=(?:₽|%|мм|м²|шт|г\.))', r'\1' + NB, s)
    s = re.sub(r'(\d) (?=[а-яё])', r'\1' + NB, s, flags=re.I)
    s = re.sub(r'№ (?=\d)', '№' + NB, s)
    s = re.sub(r'(п\.) (?=\d)', r'\1' + NB, s)
    return s
def typo_html(h):
    """только текстовые узлы между тегами: атрибуты, комментарии и код не трогаем"""
    return re.sub(r'>([^<>]+)<', lambda m: '>' + T(m.group(1)) + '<', h)

def strip_css(c): return re.sub(r'\n{2,}', '\n', re.sub(r'/\*.*?\*/', '', c, flags=re.S))   # в комментариях базы есть data-kp-block="…" — check() посчитал бы их блоками

# ---------- стили ----------
css_parts = [rd(f) for f in ('kp-base.css', 'kp-pavel.css', 'potolki-css.txt')]
for name, c in zip(('kp-base.css', 'potolki-css.txt'), (css_parts[0], css_parts[2])):
    # «нельзя сделать некрасиво»: в базе и дополнениях макета цвета — только токены; hex живёт в kp-pavel.css (тема) и в печатном чертеже
    assert not re.search(r'#[0-9a-fA-F]{3,8}\b', strip_css(c)), name + ': произвольный hex-цвет вместо токена'
css = '<style>\n' + '\n'.join(strip_css(c) for c in css_parts) + '\nhtml,body{margin:0}\n</style>'
assert '@import' not in css and 'fonts.googleapis' not in css, 'шрифты — только системные, без внешних @import'

# ---------- скрипт: app.js + фрагменты по маркерам ----------
d = rd('potolki-data.js'); pr = rd('potolki-profile.js'); a = rd('potolki-app.js')
FRAGMENTS = [('__CLASSIFY_JS__', 'potolki-classify.js'), ('__PHOTOS_JS__', 'potolki-photos.js'), ('__PEOPLE_JS__', 'potolki-people.js'),
             ('__NODES_JS__', 'potolki-nodes.js'), ('__CUT_JS__', 'potolki-cut.js'), ('__OFFER_JS__', 'potolki-offer.js')]
for mk, f in FRAGMENTS:
    assert a.count('/* ' + mk) == 1, 'potolki-app.js: нужен ровно один маркер /* %s */' % mk
    a = re.sub(r'/\* ' + mk + r'[^\n]*\*/', lambda m: rd(f).rstrip(), a)
mark = rd('mark.svg')
# в скрипте hex только один: цвет лабиринта знака компании (#1D2C38), который заменяется на currentColor; схема для печати красится токенами var(--kp-*)
assert set(re.findall(r'#[0-9A-Fa-f]{6}\b', a)) <= {'#1D2C38'}, 'в скрипте произвольный hex-цвет: ' + str(set(re.findall(r'#[0-9A-Fa-f]{6}\b', a)))

# узлы плиток для метки data-kp-nodes (редактор OpMax «Фото узлов»): единственный источник — NODE_LABEL в potolki-nodes.js,
# в potolki-body.html только заглушка; заодно ловим расхождение NODE_LABEL ↔ NODE_ROLES (у плитки без роли не найти фото позиции)
def node_pairs(js):
    lab = re.search(r"var NODE_LABEL = \{(.*?)\};", js, re.S); rol = re.search(r"var NODE_ROLES = \{(.*?)\};", js, re.S)
    assert lab and rol, 'potolki-nodes.js: не нашёл NODE_LABEL / NODE_ROLES'
    pairs = re.findall(r"(\w+):'([^']*)'", lab.group(1)); roles = re.findall(r"(\w+):\[", rol.group(1))
    assert pairs and sorted(k for k, _ in pairs) == sorted(roles), 'NODE_LABEL и NODE_ROLES разошлись: %r vs %r' % ([k for k, _ in pairs], roles)
    # у каждого узла есть пиктограмма и описание (плитка без фото рисует их)
    for k, _ in pairs:
        assert re.search(r"\b%s:'<svg" % k, js), 'нет пиктограммы NODE_ICO для узла ' + k
        assert re.search(r"\b%s:\s*'" % k, js.split('var ROLE_DESC')[1].split('};')[0]), 'нет ROLE_DESC для узла ' + k
    return pairs
NODE_PAIRS = node_pairs(a)
NODES_JSON = json.dumps([{'key': k, 'label': v} for k, v in NODE_PAIRS], ensure_ascii=False, separators=(',', ':'))
assert not re.search(r"['<>&]", NODES_JSON), 'подписи узлов: кавычка, скобка или & сломают атрибут data-kp-nodes'

# ---------- разметка ----------
b = rd('potolki-body.html')
assert b.count("data-kp-nodes='__KP_NODES__'") == 1, 'potolki-body.html: нужна ровно одна заглушка data-kp-nodes=\'__KP_NODES__\''
assert b.count('__COVER_SRC__') == 1, 'potolki-body.html: нужна ровно одна заглушка __COVER_SRC__ (фото обложки)'
b = re.sub(r'<!--.*?-->\s*', '', b, flags=re.S)   # внутренние пометки разметки получателю не нужны
b = typo_html(b).replace("data-kp-nodes='__KP_NODES__'", "data-kp-nodes='" + NODES_JSON + "'")
# знак и название в обложке — в разметке, а не только из скрипта: первый кадр (до 1 МБ скрипта на медленной сети) уже с лого; скрипт потом перерисует то же
assert b.count('__BRAND__') == 1, 'potolki-body.html: нужна ровно одна заглушка __BRAND__ (знак и название в обложке)'
_co = json.loads(pr[pr.index('{'):pr.rindex('}') + 1])['company']
_mark = re.sub(r'<svg[^>]*>', '<svg class="pv-mark" viewBox="358 249 364 311" aria-hidden="true" focusable="false">', mark.strip(), count=1).replace('fill="#1D2C38"', 'fill="currentColor"')
b = b.replace('__BRAND__', _mark + '<span>' + _co['name'] + '</span>')

def cut_block(h, cls, bid):
    """вырезать <div class=cls id=bid>…</div> (внутри нет вложенных div) — демо-полоса и служебная панель #edit нужны только демо для GitHub Pages"""
    h2, n = re.subn(r'<div class="' + cls + r'" id="' + bid + r'"[^>]*>.*?</div>\s*', '', h, count=1, flags=re.S)
    assert n == 1, 'potolki-body.html: не нашёл блок #' + bid
    return h2

ORDER = ['cover', 'offer-included', 'nodes', 'offer-proof', 'works', 'offer-guarantee', 'offer-bonus', 'terms', 'offer-capacity', 'smeta', 'accept', 'contacts']

def check(html, name, platform):
    """Строгая CSP платформы: ни одного on*-атрибута и javascript:-ссылки; разметка блоков для тепловой карты; порядок блоков фиксирован."""
    bad = re.findall(r'\son[a-z]+\s*=', html, re.I)
    assert not bad, name + ': on*-атрибуты ' + str(bad[:5])
    assert 'javascript:' not in html.lower(), name + ': javascript:-ссылка'
    blocks = re.findall(r'data-kp-block="([^"]*)"', html)
    assert len(blocks) >= 5 and len(set(blocks)) == len(blocks) and all(x.strip() for x in blocks), name + ': data-kp-block ' + str(blocks)
    assert blocks == ORDER, name + ': порядок data-kp-block ' + str(blocks)
    assert html.count('<script') == 1, name + ': «<script» внутри кода сломает подпись nonce на платформе'
    assert '@import' not in html and 'fonts.googleapis' not in html, name + ': внешние шрифты — на платформе CSP font-src self'
    assert not re.search(r'\sdata-kp-(calc|products)', html), name + ': метки data-kp-calc/products включили бы чужие разделы редактора'
    assert not re.search(r'setDate\s*\(\s*\w+\.getDate\s*\(\s*\)\s*\+', html), name + ': срок от «сегодня»'
    assert re.search(r"<[a-z][^<>]*\sdata-kp-offer[\s>]", html) and '__OFFER_JS__' not in html, name + ': метка data-kp-offer или невставленный фрагмент оффера'
    assert not re.search(r'__[A-Z]+_JS__|__COVER_SRC__|__KP_NODES__|__BRAND__', html), name + ': остался маркер сборки'
    assert re.search(r"<[a-z][^<>]*\sdata-kp-estimate[\s>]", html) and re.search(r"<[a-z][^<>]*\sdata-kp-contacts[\s>]", html), name + ': метки data-kp-estimate / data-kp-contacts'
    # метка узлов: одна, внутри тега, валидный JSON, ключи и порядок — как в NODE_LABEL (lib/estimate.ts читает её так же)
    nodes = re.findall(r"<[a-z][^<>]*\sdata-kp-nodes='(\[[^']*\])'[^<>]*>", html)
    assert len(nodes) == 1, name + ': метка data-kp-nodes ' + str(len(nodes))
    assert [(x['key'], x['label']) for x in json.loads(nodes[0])] == NODE_PAIRS, name + ': data-kp-nodes не совпадает с NODE_LABEL'
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
 '<meta property="og:description" content="«Высокий уровень», Новороссийск: смета, узлы потолка, наши объекты и видео.">\n'
 '<meta property="og:image" content="' + URL + 'media/og.jpg">\n<meta property="og:type" content="website">\n')
bA = b.replace('__COVER_SRC__', COVER_PATH)
# документ целиком (doctype, html, head, body): без doctype страница открывалась в режиме совместимости и верстка отличалась от платформенной
html = ('<!doctype html>\n<html lang="ru">\n<head>\n' + head + css + '\n</head>\n<body>\n' + bA + '\n<script>\n' + d + '\n' + pr + '\n' + a + '\n</script>\n</body>\n</html>\n')
# в демо-странице — head (title, og): платформенные запреты <head>/<title> к ней не относятся
check(html, 'index.html', False)
open(O + '/index.html', 'w', encoding='utf-8').write(html)
SRC_FILES = ['potolki-css.txt', 'potolki-body.html', 'potolki-data.js', 'potolki-profile.js', 'potolki-app.js', 'potolki-classify.js', 'potolki-photos.js',
             'potolki-people.js', 'potolki-nodes.js', 'potolki-cut.js', 'potolki-offer.js', 'kp-base.css', 'kp-pavel.css', 'build.py', 'mark.svg']
if not IN_SRC:
    os.makedirs(O + '/src', exist_ok=True)
    for f in SRC_FILES:
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
# Фото обложки в подборку не попадает: оно уже стоит в разметке.
SIGN = {'shadow', 'float', 'seamless', 'line', 'track', 'cornice', 'two-level', 'gloss'}
SLOTS = [('shadow', 2), ('float', 2), ('line', 2), ('track', 2), ('cornice', 2), ('led', 1), ('chandelier', 1), ('spot', 1)]
def extra(p, tag): return len((set(p['tags']) & SIGN) - {tag})
picked = []
for tag, n in SLOTS:
    c = [p for p in prof['photos'] if tag in p['tags'] and p not in picked and p['src'] != COVER_PATH]
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
    bB = cut_block(cut_block(b, 'pv-demo', 'demoBox'), 'pv-edit', 'editBox').replace('__COVER_SRC__', jpeg_uri(O + '/' + COVER_PATH, 1200, 70))
    return ('<!-- «Высокий уровень» (Новороссийск) — КП на натяжной потолок. Макет спец-заказа OpMax, собран build.py из исходников potolki-*; руками не править. -->\n'
            + css + '\n' + bB + '\n<script>\n' + demos + '\n' + js + '\n' + a + '\n</script>\n')

for q, n in [(55, len(picked)), (50, len(picked)), (45, len(picked)), (45, 10)]:
    plat = build(q, n)
    size = len(plat.encode('utf-8'))
    if size <= LIMIT: break
assert size <= LIMIT, 'potolki-platform.html больше 1,9 МБ: ' + str(size)
assert plat.count('<!--') == 1 and 'Хормози' not in plat and 'id="editBox"' not in plat and 'id="demoBox"' not in plat, 'актив платформы: внутренние пометки, служебная панель или демо-полоса'
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
