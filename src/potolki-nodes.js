/* ============ 4г. ПЛИТКИ УЗЛОВ В ПЕРВОМ ЭКРАНЕ ============
   Фрагмент potolki-app.js (маркер NODES_JS).
   Клиент на телефоне видит не разрез с цифрами, а фото того, что есть в его смете: примыкание, свет, ниша.
   Плитки строятся из тех же flags(), что и разрез; полотно и углы плитки не получают. Фото — по цепочке:
   своё у ЭТОГО КП (KP_CONFIG.nodePhotos, редактор OpMax) → своё у позиции каталога (KP_CONFIG.items[].image) →
   библиотека компании по тегу → пиктограмма и название узла. Ключи узлов объявлены платформе меткой на странице
   (build.py собирает её из NODE_LABEL — при правке словаря ничего дописывать не надо). */
var NODE_LABEL = { standard:'Профиль со вставкой', shadow:'Теневое примыкание', float:'Парящий профиль', seamless:'Бесщелевое примыкание',
  spot:'Точечный свет', chandelier:'Люстра', track:'Трек', line:'Световая линия', led:'LED-подсветка', cornice:'Ниша под шторы' };
/* какие роли строк сметы отвечают за плитку: у неё берём своё фото позиции, если оно есть */
var NODE_ROLES = { standard:['standard','molding'], shadow:['shadow'], float:['float'], seamless:['seamless','seamless-canvas'],
  spot:['spot','fixture','spot-install'], chandelier:['chandelier','chandelier-install'], track:['track'], line:['line'], led:['led'], cornice:['cornice'] };
/* пиктограммы плиток без фото: разрезы в языке схемы (плита, полотно, узел). Цвета — классы s-* (их красят токены темы в potolki-css.txt), hex в разметке нет */
var NODE_ICO = {
  standard:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-wall" x="0" y="22" width="14" height="88"/><rect class="s-pr" x="14" y="44" width="22" height="26"/><path class="s-ln" d="M36 56 H400" stroke-width="5"/><path class="s-wb" d="M36 56 H400" stroke-width="3"/><rect class="s-mold" x="14" y="52" width="24" height="8" rx="2"/></svg>',
  shadow:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-wall" x="0" y="22" width="14" height="88"/><path class="s-pr" d="M14 36 H40 V74 H30 V50 H22 V74 H14 Z"/><path class="s-ln" d="M40 56 H400" stroke-width="5"/><path class="s-wb" d="M40 56 H400" stroke-width="3"/><rect class="s-dk" x="14" y="50" width="8" height="12"/></svg>',
  seamless:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-wall" x="0" y="22" width="14" height="88"/><path class="s-pr" d="M14 42 H34 V70 H26 V52 H14 Z"/><path class="s-ln" d="M14 56 H400" stroke-width="5"/><path class="s-wb" d="M14 56 H400" stroke-width="3"/></svg>',
  float:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-wall" x="0" y="22" width="14" height="88"/><path class="s-pr" d="M14 32 H44 V78 H36 V48 H22 V78 H14 Z"/><rect class="s-led" x="24" y="50" width="10" height="5"/><path class="s-ln" d="M44 60 H400" stroke-width="5"/><path class="s-wb" d="M44 60 H400" stroke-width="3"/><path class="s-glow" d="M22 56 L14 110" stroke-width="10" opacity=".35"/></svg>',
  spot:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-dk" x="178" y="22" width="44" height="32"/><path class="s-ln" d="M0 56 H400" stroke-width="5"/><path class="s-wb" d="M0 56 H400" stroke-width="3"/><rect class="s-mt" x="170" y="52" width="60" height="9" rx="2"/><path class="s-glow" d="M200 64 L176 104 M200 64 L224 104" stroke-width="18" opacity=".28" stroke-linecap="round"/></svg>',
  chandelier:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-fix" x="186" y="22" width="28" height="30"/><path class="s-ln" d="M0 56 H400" stroke-width="5"/><path class="s-wb" d="M0 56 H400" stroke-width="3"/><rect class="s-mt" x="180" y="50" width="40" height="9" rx="2"/><path class="s-ln" d="M200 59 v20" stroke-width="2"/><path class="s-lp" d="M172 79 Q200 108 228 79 Z"/></svg>',
  track:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-dk" x="150" y="22" width="100" height="32"/><path class="s-ln" d="M0 56 H150 M250 56 H400" stroke-width="5"/><path class="s-wb" d="M0 56 H150 M250 56 H400" stroke-width="3"/><rect class="s-dk" x="148" y="53" width="104" height="7"/><rect class="s-dk" x="192" y="60" width="16" height="22" rx="3"/><path class="s-glow" d="M200 82 L186 106 M200 82 L214 106" stroke-width="12" opacity=".25" stroke-linecap="round"/></svg>',
  line:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-dk" x="160" y="22" width="80" height="32"/><path class="s-ln" d="M0 56 H400" stroke-width="5"/><path class="s-wb" d="M0 56 H400" stroke-width="3"/><rect class="s-mt" x="158" y="52" width="84" height="8"/><path class="s-glow" d="M170 64 L160 104 M230 64 L240 104" stroke-width="14" opacity=".22" stroke-linecap="round"/></svg>',
  led:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-pr" x="120" y="22" width="160" height="26"/><rect class="s-led" x="132" y="42" width="136" height="6"/><path class="s-ln" d="M0 56 H400" stroke-width="5"/><path class="s-wb" d="M0 56 H400" stroke-width="3"/><path class="s-glow" d="M200 62 v42" stroke-width="150" opacity=".16"/></svg>',
  cornice:'<svg viewBox="0 0 400 110" aria-hidden="true" focusable="false"><rect class="s-slab" x="0" y="0" width="400" height="22"/><rect class="s-wall" x="386" y="22" width="14" height="88"/><path class="s-ln" d="M0 56 H250" stroke-width="5"/><path class="s-wb" d="M0 56 H250" stroke-width="3"/><path class="s-pr" d="M250 38 H386 V74 H348 V52 H250 Z"/><rect class="s-dk" x="256" y="52" width="86" height="10"/><rect class="s-cur" x="348" y="74" width="38" height="36"/></svg>' };

/* пиктограмма — крупный план узла в плитке 4:3: окно 147×110 схемы (примыкания — у левой стены, ниша — у правой, остальное — по центру).
   Фигуры за пределами окна обрезаются в самой разметке, а не клипом SVG: иначе их рамки торчат за плитку (и за границу КП) */
var NODE_WIN = { standard:0, shadow:0, seamless:0, float:0, spot:127, chandelier:127, track:127, line:127, led:127, cornice:250 };
function cropIco(svg, x0){
  var x1 = x0 + 147;
  return svg.replace('viewBox="0 0 400 110"', 'viewBox="' + x0 + ' 0 147 110"')
    .replace(/<rect class="([\w-]+)" x="(\d+)" y="(\d+)" width="(\d+)"/g, function(m, c, x, y, w){
      var a = Math.max(+x, x0), b = Math.min(+x + +w, x1); return '<rect class="' + c + '" x="' + a + '" y="' + y + '" width="' + Math.max(0, b - a) + '"'; })
    .replace(/d="((?:M\d+ \d+ H\d+ ?)+)"/g, function(m, d){
      var out = ''; d.replace(/M(\d+) (\d+) H(\d+)/g, function(q, a, y, b){ a = Math.max(+a, x0); b = Math.min(+b, x1); if(b > a) out += 'M' + a + ' ' + y + ' H' + b + ' '; });
      return 'd="' + out.trim() + '"'; });
}
/* список плиток в порядке, как называл Павел: примыкание (каждая система, по убыванию метража) → точечный свет → люстра →
   трек → световая линия → подсветка → ниша под шторы. Потолка по числу нет: у «двух вариантов» бывает 7 */
function heroNodes(F){
  var keys = F.systems.slice().sort(function(a, b){ return (F.sysLen[b] || 0) - (F.sysLen[a] || 0); });
  if(F.spots) keys.push('spot'); if(F.chand) keys.push('chandelier'); if(F.track) keys.push('track');
  if(F.lines) keys.push('line'); if(F.led) keys.push('led'); if(F.cornice) keys.push('cornice');
  return keys.map(function(k){ return { key:k, tag:k === 'standard' ? 'insert' : k, label:NODE_LABEL[k] }; });
}
/* фото плитки: (0) своё у ЭТОГО КП — продавец подставил его на плитку осознанно под этого клиента, оно конкретнее любого общего
   источника; (1) своё у первой включённой строки этой роли, (2) библиотека по тегу — как pickPhotos: без чужой фишки в кадре
   и ещё не занятое другой плиткой; если «чистого» фото нет — с наименьшим числом чужих (как «Объекты» добирают остаток), (3) null */
function nodePhoto(n, want, lib, taken){
  var mine = DATA.nodePhotos[n.key]; if(mine) return { src:mine };
  var own = ITEMS.filter(function(it){ return it.on && NODE_ROLES[n.key].indexOf(it.role) >= 0 && it.image; })[0];
  if(own) return { src:own.image };
  var miss = function(x){ return (x.tags || []).filter(function(t){ return SIGN.indexOf(t) >= 0 && want.indexOf(t) < 0; }).length; };
  var c = lib.filter(function(x){ return x && x.src && taken.indexOf(x.src) < 0 && (x.tags || []).indexOf(n.tag) >= 0; })
    .sort(function(a, b){ return miss(a) - miss(b) || (b.score || 0) - (a.score || 0); })[0];
  return c ? { src:c.src } : null;
}
var NODE_WORD = ['', 'Один узел', 'Два узла', 'Три узла', 'Четыре узла', 'Пять узлов', 'Шесть узлов', 'Семь узлов', 'Восемь узлов', 'Девять узлов', 'Десять узлов'];
var NODE_GAL = [];
function renderNodes(){
  var F = flags(), want = wantTags(F), lib = profile().photos, taken = [], html = '', nodes = heroNodes(F);
  NODE_GAL = [];
  nodes.forEach(function(n){
    var p = nodePhoto(n, want, lib, taken), tile;
    if(p){ taken.push(p.src);
      tile = '<button class="pv-ph" type="button" data-act="openNode" data-arg="' + NODE_GAL.length + '" aria-label="Открыть фото: ' + esc(n.label) + '"><img src="' + esc(p.src) + '" alt="' + esc(n.label) + ': фото объекта" width="960" height="720"' + lazy(p.src) + '></button>';
      NODE_GAL.push({ src:p.src, cap:n.label }); }
    /* фото нет ни у позиции, ни в библиотеке: плитка с пиктограммой-разрезом; открывать нечего — это не кнопка */
    else tile = '<div class="pv-ph pv-ph--ico" role="img" aria-label="Схема узла: ' + esc(n.label) + '">' + cropIco(NODE_ICO[n.key], NODE_WIN[n.key] || 0) + '</div>';
    html += '<figure class="pv-node" data-node="' + n.key + '">' + tile + '<figcaption><b>' + escT(n.label) + '</b><span class="pv-d">' + escT(ROLE_DESC[n.key]) + '</span></figcaption></figure>';
  });
  var box = el('nodes'); box.className = 'pv-nodes' + (nodes.length > 4 ? ' pv-nodes--3' : '');
  if(box._h !== html){ box.innerHTML = html; box._h = html; }   /* состав плиток не изменился — фото не перерисовываем */
  el('nodesLead').textContent = typo(nodes.length === 1 ? 'Один узел вашей сметы — как он выглядит на объектах' : (NODE_WORD[nodes.length] || nodes.length + ' узлов') + ' вашей сметы — как они выглядят на объектах');
  tellNodes(nodes.map(function(n){ return n.key; }));
}

/* редактору OpMax («Фото узлов»): какие узлы сейчас в смете — помечает их «в смете». Только ключи, без данных клиента;
   вне фрейма молчим. Адресат — свой origin (превью в кабинете); у file:// и «null» origin адреса нет — тогда '*', в сообщении всё равно одни ключи */
function tellNodes(keys){
  if(window.parent === window) return;
  var o = String(window.location.origin || '');
  try{ window.parent.postMessage({ type:'kp-nodes', keys:keys }, /^https?:\/\//.test(o) ? o : '*'); }catch(e){}
}