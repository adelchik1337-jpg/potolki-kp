(function(){
"use strict";
var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
if(RM) document.documentElement.classList.add('rm');
if(location.hash.indexOf('edit') >= 0) document.body.classList.add('editmode');

/* ============ 0. ОБЩЕЕ: типографика, эскейп, секции страницы ============ */
var NBSP = ' ', WJ = '\u2060';
var MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
var SHORTW = /(^|[^A-Za-zА-Яа-яЁё0-9_])(в|во|на|с|со|к|ко|у|о|об|от|до|по|за|из|и|а|но|не|ни|для|при|без|над|под|про|или|же|бы|ли|то|да)\s+(?=\S)/gi;
/* русская типографика динамических текстов (названия позиций, подписи): те же правила, что lib/typograf.ts — предлог и тире не повисают
   в конце строки, число не отрывается от единицы. Статичный текст разметки обрабатывает build.py, строки оффера приходят уже набранными */
function typo(s){
  s = String(s == null ? '' : s).replace(/ — /g, NBSP + '— ');
  for(var i = 0; i < 2; i++) s = s.replace(SHORTW, function(m, a, b){ return a + b + NBSP; });
  return s.replace(/(\d) (?=\d{3}(?!\d))/g, '$1' + NBSP).replace(/(\d) (?=(?:₽|%|мм|м²|шт|г\.))/g, '$1' + NBSP)
    .replace(/(\d) (?=[а-яё])/gi, '$1' + NBSP).replace(/№ (?=\d)/g, '№' + NBSP).replace(/(п\.) (?=\d)/g, '$1' + NBSP)
    /* в каталоге бывает «до 3,6м», «(до 100мм)»: число и единица — через неразрывный пробел */
    .replace(/(\d)(мм|см|м²|м)(?![A-Za-zА-Яа-яЁё0-9²])/g, '$1' + NBSP + '$2')
    /* диапазон «1–2», «3–5» не рвётся на тире: соединитель слов по обе стороны */
    .replace(/(\d)–(?=\d)/g, '$1' + WJ + '–' + WJ);
}
function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function escT(t){ return esc(typo(t)); }
function ic(n, x){ return '<i class="kp-i kp-i-' + n + (x ? ' ' + x : '') + '" aria-hidden="true"></i>'; }
function plain1(t){ return String(t).replace(/\u2060/g, '').replace(/[  ]/g, ' '); }   /* текст для буфера обмена: обычные пробелы */
/* секции страницы: разметка лежит в порядке макета, скрипт убирает пустые из DOM целиком (ни заголовка, ни зазора) и возвращает на своё место */
var ORDER = ['offer-included','nodes','offer-proof','works','offer-guarantee','offer-bonus','terms','offer-capacity','smeta','accept','contacts'];
var SEC = {}, KPW = document.querySelector('.kp-w'), FOOT = document.getElementById('foot');
ORDER.forEach(function(n){ SEC[n] = KPW.querySelector('[data-kp-block=' + n + ']'); });
/* элемент по id — и в документе, и внутри убранной секции */
function el(id){ var e = document.getElementById(id); if(e) return e; for(var k in SEC) if(SEC[k]){ e = SEC[k].querySelector('#' + id); if(e) return e; } return null; }
function setSec(name, on){
  var s = SEC[name]; if(!s) return;
  if(!on){ if(s.parentNode) s.parentNode.removeChild(s); return; }
  if(s.parentNode) return;
  var next = null;
  for(var i = ORDER.indexOf(name) + 1; i < ORDER.length && !next; i++){ var n = SEC[ORDER[i]]; if(n && n.parentNode) next = n; }
  KPW.insertBefore(s, next || FOOT);
}

/* __CLASSIFY_JS__ — сюда build.py вставляет potolki-classify.js (классификатор строк сметы: classify, CAT_NAME, SYS_NAME, ROLE_DESC) */

/* ============ 2. ДАННЫЕ ============ */
var CFG = window.KP_CONFIG && typeof window.KP_CONFIG === 'object' ? window.KP_CONFIG : null;
var DATA, ITEMS = [], ROOMS = [], cur = 0, vi = 0, EMPTY = false;
function pluralW(n, a, b, c){ var m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; }
function plural(n, a, b, c){ return n + NBSP + pluralW(n, a, b, c); }
/* деньги: разряды через toLocaleString('ru-RU') и неразрывный пробел перед ₽ (число не отрывается от знака валюты) */
function group(n){ return Math.round(n).toLocaleString('ru-RU').replace(/[\s\u202f]/g, NBSP); }
function money(n){ var r = Math.round(n); return (r < 0 ? '−' : '') + group(Math.abs(r)) + NBSP + '₽'; }
/* цена за единицу может прийти с копейками — показываем их, итоги — в рублях */
function moneyP(n){ var k = Math.round(n * 100); if(k % 100 === 0) return money(k / 100);
  var a = Math.abs(k), c = a % 100; return (k < 0 ? '−' : '') + group(Math.floor(a / 100)) + ',' + (c < 10 ? '0' : '') + c + NBSP + '₽'; }
function fq2(n){ return (Math.round(n * 100) / 100).toString().replace('.', ','); }
/* единицы из Excel и из каталога OpMax: м2/м²/кв.м → м², м.п/пог.м/мп/м → м, шт → счётная позиция */
function normUnit(u){
  var s = String(u == null ? '' : u).trim(), l = s.toLowerCase().replace(/\s+/g, '');
  if(/^(м2|м²|кв\.?м\.?)$/.test(l)) return 'м²';
  if(/^(м\.?п\.?|пог\.?м\.?|м)$/.test(l)) return 'м';
  if(/^шт\.?$/.test(l)) return 'шт';
  return s;
}
function unitLabel(u){ return normUnit(u); }
function numOf(v){ var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
/* смета на входе (KP_CONFIG или демо): чистим один раз, дальше код работает только с нормальными позициями */
function normItems(list){
  return (Array.isArray(list) ? list : []).filter(function(it){ return it && typeof it === 'object'; }).map(function(it){
    var q = {};
    if(it.qty && typeof it.qty === 'object'){ for(var k in it.qty) if(Object.prototype.hasOwnProperty.call(it.qty, k)) q[String(k)] = Math.max(0, numOf(it.qty[k])); }
    else q['Общая'] = Math.max(0, numOf(it.qty));
    if(!Object.keys(q).length) q['Общая'] = 0;
    /* фото узла у позиции каталога OpMax: по контракту {url}, строку тоже примем; нет — плитка возьмёт библиотеку или пиктограмму */
    var im = it.image && typeof it.image === 'object' ? it.image.url : it.image;
    return { name:String(it.name == null ? '' : it.name).trim() || 'Позиция', unit:normUnit(it.unit), price:numOf(it.price), q:q, optional:it.optional === true,
             image:typeof im === 'string' && im.trim() ? im.trim() : null };
  });
}
/* фото узлов ЭТОГО КП (KP_CONFIG.nodePhotos из секции «Фото узлов» редактора OpMax): {ключ узла: {url}} — берём только строки url,
   строку вместо {url} тоже примем, как у items[].image; всё остальное молча пропускаем */
function normNodePhotos(np){
  var o = {}; if(!np || typeof np !== 'object') return o;
  for(var k in np) if(Object.prototype.hasOwnProperty.call(np, k)){
    var v = np[k], u = v && typeof v === 'object' ? v.url : v;
    if(typeof u === 'string' && u.trim()) o[String(k)] = u.trim();
  }
  return o;
}
function normEstimate(cfg){
  var vars = (Array.isArray(cfg.variants) ? cfg.variants : []).filter(function(v){ return v && Array.isArray(v.items) && v.items.length; })
    .map(function(v, k){ return { title:String(v.title || 'Вариант ' + (k + 1)), note:String(v.note || ''), items:normItems(v.items) }; });
  return vars.length ? { variants:vars, items:null } : { variants:null, items:normItems(cfg.items) };
}
/* даты — только те, что пришли: ISO из OpMax (срок — момент времени, показываем по часам клиента) или dd.mm.yyyy */
function fmtDate(v){
  if(v == null || v === '') return '';
  var s = String(v).trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return s;
  if(m) return m[3] + '.' + m[2] + '.' + m[1];
  var d = new Date(s); if(isNaN(d.getTime())) return '';
  return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
}
/* срок цены в прошлом не показываем («цена действует до 24 сентября» при сегодняшнем 30-м читается как «цена устарела») */
function isPast(v){ var p = dateParts(v); return !!p && new Date(p.y, p.m - 1, p.d + 1).getTime() <= Date.now(); }
function kpLabel(){ return DATA && DATA.num ? 'КП' + NBSP + '№' + NBSP + DATA.num : 'КП'; }

function itemsOf(k){ return DATA.variants ? DATA.variants[Math.min(k, DATA.variants.length - 1)].items : (DATA.items || []); }
function load(){
  var roomSet = [];
  ITEMS = itemsOf(vi).map(function(it, i){
    var c = classify(it.name), q = {};
    for(var k in it.q){ q[k] = it.q[k]; if(roomSet.indexOf(k) < 0) roomSet.push(k); }
    return { i:i, name:it.name, unit:it.unit, price:it.price, q:q, q0:JSON.stringify(q), on:!it.optional, on0:!it.optional, opt:it.optional, image:it.image,
             cat:c.cat, role:c.role, brand:c.brand, width:c.width, isCount: it.unit === 'шт' };
  });
  ROOMS = roomSet.map(function(nm){ return { n:nm, on:true }; });
  ROOMS.forEach(function(r){
    var area = sum('canvas', r.n), spots = cnt(['spot','fixture'], r.n) || cnt(['spot-install'], r.n);
    r.area = area; r.spots = Math.round(spots);
    var side = Math.sqrt(Math.max(area, 4));
    r.W = Math.min(6.5, Math.max(2.4, side * 1.15)); r.D = Math.min(5.5, Math.max(2.2, side * 0.9)); r.H = 2.7;
  });
  cur = 0; BUILT = false;   /* другой состав (вариант, новый конфиг) — строки сметы строим заново */
}
function qty(it, room){ var t = 0; for(var k in it.q) if(!room || k === room) t += it.q[k]; return t; }
function sum(cat, room){ var t = 0; ITEMS.forEach(function(it){ if(it.on && it.cat === cat) t += qty(it, room); }); return t; }
function cnt(roles, room){ var t = 0; ITEMS.forEach(function(it){ if(it.on && roles.indexOf(it.role) >= 0) t += qty(it, room); }); return t; }
function lineSum(it, room){ return Math.round(it.price * qty(it, room) * 100) / 100; }
function gross(){ var t = 0; ITEMS.forEach(function(it){ if(it.on) t += lineSum(it); }); return t; }
function discount(){ return Math.round(gross() * (DATA.discount || 0) / 100); }
function total(){ return Math.round(gross() - discount()); }

/* флаги сцены из состава сметы */
function flags(){
  var f = { system:'standard', spots:0, chand:0, lines:0, track:0, cornice:false, led:false, brand:'полотно', width:3.6, corners:0, area:0, perim:0 };
  var sysLen = { standard:0, shadow:0, seamless:0, float:0 };
  ITEMS.forEach(function(it){ if(!it.on) return; var q = qty(it);
    if(it.cat === 'canvas' && it.role === 'canvas'){ f.area += q; if(it.brand !== 'полотно'){ f.brand = it.brand; f.width = Math.max(f.width, it.width); } }
    if(it.role === 'seamless-canvas') sysLen.seamless += q * 3;
    if(['standard','shadow','seamless','float'].indexOf(it.role) >= 0){ sysLen[it.role] += q; f.perim += q; }
    if(it.role === 'spot' || it.role === 'fixture') f.spots = Math.max(f.spots, q);
    if(it.role === 'spot-install' && !f.spots) f.spots = q;
    if(it.role === 'chandelier') f.chand += q;
    if(it.role === 'line') f.lines += q;
    if(it.role === 'track') f.track += q;
    if(it.role === 'cornice') f.cornice = true;
    if(it.role === 'led') f.led = true;
    if(it.role === 'corners') f.corners += q;
  });
  var best = 'standard', bl = -1; for(var k in sysLen) if(sysLen[k] > bl){ bl = sysLen[k]; best = k; }
  f.system = bl > 0 ? best : 'standard';
  f.systems = Object.keys(sysLen).filter(function(k){ return sysLen[k] > 0; });
  if(!f.systems.length) f.systems = ['standard'];
  f.sysLen = sysLen;   /* метраж каждой системы: плитки примыкания в первом экране идут по его убыванию */
  return f;
}

/* ============ 4. ВАРИАНТЫ ============ */
var clamp = function(v, a, b){ return Math.min(b, Math.max(a, v)); };
function listRu(a, w){ w = w || 'и'; return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + w + ' ' + a[a.length - 1]; }
function setVar(k){
  if(!DATA.variants || !DATA.variants[k]) return;
  /* правки клиента (убрал/добавил позицию) переносим на тот же пункт другого варианта */
  var chg = {}; ITEMS.forEach(function(it){ if(it.on !== it.on0) chg[it.name] = it.on; });
  var had = el('vars').contains(document.activeElement);
  vi = k; track('package_select', { variant:DATA.variants[k].title });
  load(); ITEMS.forEach(function(it){ if(Object.prototype.hasOwnProperty.call(chg, it.name)) it.on = chg[it.name]; }); renderAll();
  if(had){ var b = el('vars').querySelector('[aria-checked="true"]'); if(b) b.focus(); }
}
function variantTotal(v){ var g = 0; v.items.forEach(function(it){ if(it.optional) return; var q = 0; for(var r in it.q) q += it.q[r]; g += Math.round(it.price * q * 100) / 100; });
  return Math.round(g - Math.round(g * (DATA.discount || 0) / 100)); }
/* варианты «Стандарт / Теневой»: переключатель из двух-трёх карточек над строками сметы; у каждого — итог и разница с базовым */
function renderVars(){
  var pan = el('vars');
  if(!DATA.variants || DATA.variants.length < 2){ pan.hidden = true; pan.innerHTML = ''; return; }
  pan.hidden = false;
  var totals = DATA.variants.map(variantTotal), min = Math.min.apply(null, totals);
  pan.innerHTML = DATA.variants.map(function(v, k){
    return '<button type="button" class="kp-chip pv-var" role="radio" aria-checked="' + (k === vi) + '" tabindex="' + (k === vi ? 0 : -1) + '" data-act="setVar" data-arg="' + k + '">'
      + '<span class="pv-var-t"><b>' + escT(v.title) + '</b>' + (v.note ? '<small>' + escT(v.note) + '</small>' : '') + '</span>'
      + '<span class="pv-var-p"><b>' + money(totals[k]) + '</b><small>' + (totals[k] > min ? '+' + money(totals[k] - min) : 'базовый') + '</small></span></button>'; }).join('');
}

/* __PHOTOS_JS__ — сюда build.py вставляет potolki-photos.js (компания, фото, видео, лайтбокс) */
/* __PEOPLE_JS__ — сюда build.py вставляет potolki-people.js (контакты, каналы, подвал) */
/* __NODES_JS__ — сюда build.py вставляет potolki-nodes.js (плитки узлов в первом экране) */
/* __CUT_JS__ — сюда build.py вставляет potolki-cut.js (разрез потолка для печати) */
/* __OFFER_JS__ — сюда build.py вставляет potolki-offer.js (оффер продавца: normOffer, guaranteeLine, секции оффера) */

/* ============ 5. ОБЛОЖКА, СМЕТА, ИТОГ ============ */
function dateParts(v){
  if(v == null || v === '') return null;
  var s = String(v).trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return { y:+m[1], m:+m[2], d:+m[3] };
  if((m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/))) return { y:+m[3], m:+m[2], d:+m[1] };
  var d = new Date(s); return isNaN(d.getTime()) ? null : { y:d.getFullYear(), m:d.getMonth() + 1, d:d.getDate() };
}
/* «30 сентября 2026 г.»; год не пишем, если он равен hideYear (срок цены в том же году, что и дата КП) */
function fmtLong(v, hideYear){ var p = dateParts(v); if(!p) return '';
  return p.d + NBSP + MONTHS[p.m - 1] + (hideYear === p.y ? '' : NBSP + p.y + NBSP + 'г.'); }
function renderCover(){
  var F = EMPTY ? null : flags(), O = DATA.offer;
  el('h1').innerHTML = 'Натяжной потолок' + (F && F.area ? ' <span class="kp-tab">' + fq2(F.area) + NBSP + 'м²</span>' : '');
  /* подзаголовок — только результат из оффера продавца: автотекст из сметы не подставляем (сводка состава — в «Итого»), пустого подзаголовка нет */
  var sub = O && O.outcome ? typo(O.outcome) : '', hs = el('hsub');
  hs.textContent = sub; hs.hidden = !sub;
  /* номер, дата, срок — только то, что пришло из конфига; без номера КП не выдумывается («КП» без цифр) */
  var lead = typo(DATA.num ? '№' + NBSP + DATA.num + (DATA.dateLong ? ' от ' + DATA.dateLong : '') : DATA.dateLong ? 'от ' + DATA.dateLong : '');
  var m = lead ? '<div><dt>Коммерческое предложение</dt><dd>' + esc(lead) + '</dd></div>' : '<div><dd>Коммерческое предложение</dd></div>';
  if(DATA.example) m += '<div><dt>Состав</dt><dd>Пример сметы</dd></div>';
  if(DATA.addr) m += '<div><dt>Объект</dt><dd>' + escT(DATA.addr) + '</dd></div>';
  if(DATA.client) m += '<div><dt>Для</dt><dd>' + escT(DATA.client) + '</dd></div>';
  el('meta').innerHTML = m;
}

/* выключить или обнулить можно только позицию «по желанию»: остальное входит в систему потолка (нижняя граница счёта — 1) */
function tglItem(i, on){
  var it = ITEMS[i]; if(!it || !it.opt) return;
  it.on = typeof on === 'boolean' ? on : !it.on;
  var k = Object.keys(it.q)[0];
  if(it.on && qty(it) <= 0) it.q[k] = numOf(JSON.parse(it.q0)[k]) > 0 ? numOf(JSON.parse(it.q0)[k]) : 1;   /* включили обнулённую позицию — возвращаем её количество */
  track('quote_toggle', { item:it.name, on:it.on }); renderAll();
}
function stepItem(i, d){
  var it = ITEMS[i]; if(!it || !d) return;
  var k = Object.keys(it.q)[0]; it.q[k] = clamp(Math.round((it.q[k] + d) * 100) / 100, it.opt ? 0 : 1, 200);
  if(d > 0) it.on = true; else if(it.q[k] <= 0) it.on = false;   /* «−» на выключенной позиции её не включает */
  track('quote_toggle', { item:it.name, qty:it.q[k] }); renderAll();
}
var BUILT = false;
/* строки строим один раз на состав, дальше только обновляем числа: тумблер и степпер не теряют фокус при каждом нажатии */
function renderItems(){
  if(BUILT){ syncItems(); return; }
  var html = '', anyOpt = false, anyStep = false;
  CAT_ORDER.forEach(function(cat){
    var list = ITEMS.filter(function(it){ return it.cat === cat; }); if(!list.length) return;
    html += '<li class="kp-qgroup-h pv-grp"><h3 class="kp-h3">' + escT(CAT_NAME[cat]) + '</h3><span class="kp-h3 kp-tab" data-sub="' + cat + '"></span></li>';
    list.forEach(function(it){
      var single = Object.keys(it.q).length === 1, step = it.isCount && single && !it.opt, u = unitLabel(it.unit), nm = esc(it.name);
      if(it.opt) anyOpt = true; if(step) anyStep = true;
      var sw = it.opt ? '<label class="pv-opt"><input class="kp-sw" type="checkbox" role="switch" data-act="tglItem" data-arg="' + it.i + '" aria-label="Включить: ' + nm + '"><span>Добавить в' + NBSP + 'смету</span></label>' : '';
      var st = step ? '<div class="pv-step" role="group" aria-label="Количество: ' + nm + '"><button type="button" data-act="stepItem" data-arg="' + it.i + '" data-d="-1" aria-label="Меньше">' + ic('minus') + '</button>'
        + '<output data-out></output><button type="button" data-act="stepItem" data-arg="' + it.i + '" data-d="1" aria-label="Больше">' + ic('plus') + '</button></div>' : '';
      html += '<li class="kp-qrow" data-row="' + it.i + '"><div class="kp-qmain"><span class="kp-qname">' + escT(it.name) + (it.opt ? '<span class="kp-tag">по' + NBSP + 'желанию</span>' : '') + '</span>'
        + '<span class="kp-qunit"><span data-q></span>' + (u ? NBSP + esc(u) : '') + ' × ' + moneyP(it.price) + '</span></div>'
        + '<div class="kp-qside">' + (sw || st ? '<div class="kp-qctl">' + sw + st + '</div>' : '') + '<span class="kp-qprice" data-line></span></div></li>';
    });
  });
  el('items').innerHTML = html; BUILT = true;
  el('smLead').textContent = typo(anyOpt ? 'Включайте позиции по желанию — итог пересчитается сразу' : anyStep ? 'Меняйте количество — итог пересчитается сразу' : 'Состав и цена потолка');
  syncItems();
}
function syncItems(){
  var root = el('items'); if(!root) return;
  ITEMS.forEach(function(it){
    var li = root.querySelector('[data-row="' + it.i + '"]'); if(!li) return;
    var q = qty(it), qe = li.querySelector('[data-q]'), o = li.querySelector('[data-out]'), sw = li.querySelector('input.kp-sw'), dec = li.querySelector('[data-d="-1"]');
    li.classList.toggle('is-off', !it.on);
    if(qe) qe.textContent = fq2(q);
    if(o) o.textContent = fq2(q);
    li.querySelector('[data-line]').textContent = money(lineSum(it));
    if(sw) sw.checked = it.on;
    if(dec) dec.disabled = q <= (it.opt ? 0 : 1);
  });
  CAT_ORDER.forEach(function(cat){ var e = root.querySelector('[data-sub="' + cat + '"]'); if(!e) return;
    var s = 0; ITEMS.forEach(function(it){ if(it.cat === cat && it.on) s += lineSum(it); }); e.textContent = money(s); });
}
function renderSum(){
  var g = gross(), d = discount(), t = total(), F = flags();
  Array.prototype.forEach.call(document.querySelectorAll('[data-total]'), function(e){ e.textContent = money(t); });
  var np = []; if(F.area) np.push(fq2(F.area) + NBSP + 'м²'); np.push(escT(F.brand), escT(SYS_NAME[F.system]));
  if(F.spots) np.push('<span data-spots>' + plural(Math.round(F.spots), 'точка', 'точки', 'точек') + '</span>' + NBSP + 'света');
  if(F.lines) np.push('линии ' + fq2(F.lines) + NBSP + 'м');
  if(F.track) np.push('трек ' + fq2(F.track) + NBSP + 'м');
  if(F.cornice) np.push('ниша под' + NBSP + 'шторы');
  el('sNote').innerHTML = np.join(NBSP + '· ');
  /* опции «по желанию»: сколько включено и на сколько это уже вошло в итог */
  var nOpt = 0, optOn = 0, add = 0; ITEMS.forEach(function(it){ if(it.opt){ nOpt++; if(it.on){ optOn++; add += lineSum(it); } } });
  var so = el('sOpt'); so.hidden = !nOpt;
  if(nOpt) so.innerHTML = 'Опции по' + NBSP + 'желанию: включено <span data-optn>' + optOn + '</span>' + NBSP + 'из' + NBSP + nOpt + (add > 0 ? NBSP + '— ' + money(add) + NBSP + 'уже в' + NBSP + 'итоге' : '');
  var sd = el('sDisc'); sd.hidden = !d;
  if(d) sd.innerHTML = '<div><dt>Сумма по' + NBSP + 'позициям</dt><dd>' + money(g) + '</dd></div><div><dt>Скидка ' + fq2(DATA.discount) + NBSP + '%</dt><dd>−' + money(d) + '</dd></div>';
}
/* «Что важно знать»: три факта — примыкание, высота, протечка; гарантии здесь нет, у неё своя плита */
var SYS_CARD = {
  standard:['Вставка', 'Стеновой профиль со вставкой', 'Профиль по периметру, щель у стены закрывает гибкая вставка в цвет потолка. Подходит для любых стен.'],
  shadow:['6 мм', 'Тёмный зазор вместо вставки', 'Потолок выглядит как гипсокартонный, но без швов и трещин. Нужны ровные стены.'],
  seamless:['Без щели', 'Полотно вплотную к стене', 'Ни щели, ни вставки. Самый чистый вид.'],
  float:['Парит', 'Парящий профиль', 'Лента за полотном по периметру: свет стекает по стенам, потолок будто висит в воздухе.'] };
var DROP = { standard:['3–5 см', 'Стеновой профиль.'], shadow:['3–4 см', 'Теневой профиль.'], seamless:['3 см', 'Бесщелевое примыкание.'], float:['5–6,5 см', 'Парящий профиль с лентой за полотном.'] };
function renderTerms(){
  var F = flags(), sc = SYS_CARD[F.system], dr = DROP[F.system];
  var cards = [[sc[0], sc[1], sc[2] + (F.corners ? ' Углы обрабатываются вручную — ' + Math.round(F.corners) + ' шт в смете.' : '')],
    [dr[0], 'Заберёт высоты', dr[1] + (F.cornice ? ' У ниши под шторы — до 10 см локально.' : '')],
    ['100 л/м²', 'Удержит при протечке', 'Вода собирается в «пузырь», сливаем через отверстие светильника, полотно возвращается на место.']];
  el('facts').innerHTML = cards.map(function(c){ return '<li class="kp-card kp-fact"><p class="kp-num">' + escT(c[0]) + '</p><p class="kp-h3">' + escT(c[1]) + '</p><p class="kp-body">' + escT(c[2]) + '</p></li>'; }).join('');
}
/* принятие: подсказка, чем отправить сообщение, зависит от того, какие каналы связи у менеджера заполнены */
function renderAccept(){
  var ch = channels(profile().contacts || {}), has = function(k){ return ch.some(function(c){ return c.k === k; }); }, names = [];
  if(has('max')) names.push('MAX'); if(has('tg')) names.push('Telegram');
  /* список целиком: «в MAX, Telegram или звонком» (предлог — только перед мессенджерами, «или» — один раз) */
  var via = names.length ? 'в' + NBSP + listRu(names.concat(has('phone') ? ['звонком'] : []), 'или') : has('phone') ? 'звонком' : '';
  el('acLead').textContent = typo(names.length ? 'Подготовим сообщение менеджеру с этим составом — отправите его сами: ' + via + '.'
    : has('phone') ? 'Подготовим сообщение менеджеру с этим составом — зачитайте его по телефону.'
    : 'Подготовим сообщение менеджеру с этим составом — скопируйте его и отправьте тому, кто прислал вам ссылку.');
  el('acHint').hidden = !CFG;   /* кнопка «Принять предложение» — платформы: в демо её нет, и ссылаться на неё нечего */
}
/* каждый блок рисуется сам: сбой в одном (необычная строка сметы) не должен оставить без контактов и фото */
function renderAll(){
  var list = EMPTY ? [renderCover, renderIncluded, renderPhotos, renderPeople, renderOffer]
    : [renderCover, renderVars, renderItems, renderSum, renderIncluded, renderTerms, renderNodes, buildCut, renderPhotos, renderPeople, renderOffer, renderAccept];
  list.forEach(function(f){ try{ f(); }catch(e){ if(window.console) console.error(e); } });
}

/* ============ 6. КОПИРОВАНИЕ, СООБЩЕНИЕ МЕНЕДЖЕРУ ============ */
/* Clipboard API, а где он недоступен (фрейм, http) — через скрытое поле; результат сообщаем не всплывашкой, а там же, где нажали */
function copyText(t, ok, fail){
  function fallback(){
    var done = false;
    try{ var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select(); done = document.execCommand('copy'); document.body.removeChild(ta); }catch(e){}
    (done ? ok : fail)();
  }
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
}
/* текст на месте кнопки или строки меняется на 3 секунды */
function flash(e, text){
  if(!e) return;
  if(e._was === undefined) e._was = e.textContent;
  e.textContent = text; clearTimeout(e._t); e._t = setTimeout(function(){ e.textContent = e._was; e._was = undefined; }, 3200);
}
function say(text){ var s = el('msgState'); if(s) s.textContent = text; }
function specText(){
  var co = profile().company || {};
  var L = ['Смета к ' + kpLabel() + (co.name ? ' — «' + co.name + '»' + (co.city ? ', ' + co.city : '') : '')];
  if(DATA.addr) L.push('Объект: ' + DATA.addr); L.push('');
  L.push(['Позиция', 'Ед.', 'Цена', 'Кол-во', 'Сумма'].join('\t'));
  ITEMS.forEach(function(it){ if(it.on) L.push([it.name, unitLabel(it.unit), fq2(it.price), fq2(qty(it)), Math.round(lineSum(it))].join('\t')); });
  L.push(''); if(discount()){ L.push('Сумма\t' + Math.round(gross())); L.push('Скидка ' + fq2(DATA.discount) + '%\t−' + discount()); }
  L.push('ИТОГО\t' + total()); if(DATA.until) L.push('Цена действительна до ' + DATA.until);
  return L.join('\n');
}
function track(t, p){ try{ if(window.__kpTrack) window.__kpTrack(t, p || {}); }catch(e){} }
/* «Подготовить сообщение менеджеру» ничего не отправляет и не принимает предложение: собираем текст с составом, клиент отправляет его сам.
   На экране текст набран (неразрывные пробелы), в буфер обмена уходит plain1(approveText()) */
function approveText(){
  var on = ITEMS.filter(function(it){ return it.on; });
  var off = ITEMS.filter(function(it){ return it.on0 && !it.on; }).map(function(it){ return it.name; });
  var add = ITEMS.filter(function(it){ return !it.on0 && it.on; }).map(function(it){ return it.name; });
  var ch = ITEMS.filter(function(it){ return it.on && JSON.stringify(it.q) !== it.q0; }).map(function(it){ return it.name + ' — ' + fq2(qty(it)) + ' ' + unitLabel(it.unit); });
  return typo('Здравствуйте. ' + (DATA.num ? 'КП № ' + DATA.num : 'Коммерческое предложение по натяжному потолку') + (DATA.addr ? ', объект ' + DATA.addr : '') + (DATA.variants ? ', вариант «' + DATA.variants[vi].title + '»' : '')
    + ': состав подходит — ' + plural(on.length, 'позиция', 'позиции', 'позиций') + ' на ' + money(total()) + '.'
    + (off.length ? ' Без позиций: ' + off.join('; ') + '.' : '') + (add.length ? ' Добавить: ' + add.join('; ') + '.' : '') + (ch.length ? ' Другое количество: ' + ch.join('; ') + '.' : '')
    + ' Подскажите, как оформить договор?');
}
function approve(){
  var ch = channels(profile().contacts || {}), on = ITEMS.filter(function(it){ return it.on; }).length, box = el('msg');
  track('accept_click', { total:total(), variant:DATA.variants ? DATA.variants[vi].title : '', items:on });
  var ph = ch.filter(function(c){ return c.k === 'phone'; })[0], mx = ch.filter(function(c){ return c.k === 'max'; })[0], tg = ch.filter(function(c){ return c.k === 'tg'; })[0];
  var cls = 'kp-btn kp-btn--ghost kp-btn--sm';
  /* сначала — скопировать сообщение; мессенджер открывается следом, текст уже в буфере */
  el('msgHead').textContent = typo(plural(on, 'позиция', 'позиции', 'позиций') + ' на ' + money(total()));
  el('msgText').textContent = approveText();
  el('msgActs').innerHTML = '<button type="button" class="' + cls + '" data-act="copyMsg">' + ic('copy') + 'Скопировать сообщение</button>'
    + (mx ? chEl(mx, cls, ic('chat') + (mx.copy ? 'MAX: скопировать номер' : 'Открыть MAX'), 'max-accept', 'copyThen') : '')
    + (tg ? chEl(tg, cls, ic('tg') + 'Telegram', 'tg-accept', 'copyThen') : '')
    + (ph ? chEl(ph, cls, ic('phone') + 'Позвонить', 'phone-accept') : '');
  box.hidden = false; say('');
  copyText(plain1(approveText()), function(){ say('Сообщение скопировано — вставьте его в мессенджер'); }, function(){ say('Скопируйте текст вручную'); });
  box.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block:'center' }); box.focus({ preventScroll:true });
}
function go(id){ var e = document.getElementById(id); if(e) e.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); }

/* ============ 7. ОДИН ОБРАБОТЧИК НА ВСЕ КЛИКИ ============
   На платформе строгая CSP (script-src 'nonce-…' 'strict-dynamic'): встроенные обработчики-атрибуты и ссылки-скрипты
   браузер блокирует. Поэтому в разметке только data-act="имя" (+ data-arg), data-track="канал" — для cta_click. */
var ACT = {
  approve: function(){ approve(); },
  copySpec: function(){ copyText(specText(), function(){ flash(el('copyLbl'), 'Смета скопирована'); }, function(){ flash(el('copyLbl'), 'Не удалось скопировать'); }); },
  copyMsg: function(){ copyText(plain1(el('msgText').textContent), function(){ say('Сообщение скопировано — вставьте его в мессенджер'); }, function(){ say('Скопируйте текст вручную'); }); },
  /* ссылка на мессенджер в сообщении менеджеру: переход не отменяем, но сначала кладём сообщение в буфер */
  copyThen: function(){ copyText(plain1(approveText()), function(){ say('Сообщение скопировано — вставьте его в чат'); }, function(){}); },
  copyMax: function(a, node){ var v = node.querySelector('.kp-cv') || el('msgState');
    copyText(a || '', function(){ flash(v, 'Номер скопирован — найдите его в MAX'); }, function(){ flash(v, 'Номер для MAX: ' + a); }); },
  openLb: function(a){ openLb(parseInt(a, 10) || 0); },
  openNode: function(a){ openNode(parseInt(a, 10) || 0); },
  closeLb: function(){ closeLb(); },
  stepLb: function(a){ stepLb(parseInt(a, 10) || 1); },
  go: function(a, node, e){ if(e) e.preventDefault(); go(a); },
  setVar: function(a){ setVar(parseInt(a, 10) || 0); },
  tglVid: function(){ tglVid(); },
  tglItem: function(a, node){ tglItem(parseInt(a, 10), node && node.type === 'checkbox' ? node.checked : undefined); },
  stepItem: function(a, node){ stepItem(parseInt(a, 10), parseInt(node.getAttribute('data-d'), 10) || 0); },
  /* «Скачать PDF»: на платформе — выгрузка /p/{slug}/pdf, вне её (демо, предпросмотр) — печать страницы в PDF */
  pdf: function(a, node, e){ track('pdf_download'); if(node.getAttribute('data-real') !== '1'){ e.preventDefault(); window.print(); } }
};
document.addEventListener('click', function(e){
  var t = e.target, n = t && t.closest ? t.closest('[data-act],[data-track]') : null;
  if(!n) return;
  var tr = n.getAttribute('data-track'); if(tr) track('cta_click', { channel:tr });
  var f = ACT[n.getAttribute('data-act')]; if(!f) return;
  if(n.tagName === 'INPUT') return;   /* тумблер: состояние берём из change, клик не отменяем */
  if(n.tagName !== 'A') e.preventDefault();
  f(n.getAttribute('data-arg'), n, e);
});
document.addEventListener('change', function(e){
  var t = e.target; if(!t) return;
  if(t.id === 'demoSel') loadDemo(t.value);
  else if(t.id === 'demoOffer') loadDemo(el('demoSel').value);
  else if(t.getAttribute && t.getAttribute('data-act') === 'tglItem') ACT.tglItem(t.getAttribute('data-arg'), t);
});
/* варианты сметы — группа переключателей: стрелки перебирают, Tab входит одним пунктом */
document.addEventListener('keydown', function(e){
  var t = e.target; if(!t || !t.getAttribute || t.getAttribute('role') !== 'radio') return;
  var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
  if(!d || !DATA.variants) return; e.preventDefault(); setVar((vi + d + DATA.variants.length) % DATA.variants.length);
});

/* что клиент выбрал на странице: кнопка «Принять предложение» платформы (components/kp/accept.tsx) зовёт window.kpChoice() и прикладывает ответ к акцепту;
   сервер сверяет индексы со сметой КП и сам пересчитывает итог (lib/accepted-choice.ts). Контракт знает только вариант и включённые «по желанию»
   (индексы строк сметы) — количества в нём нет, поэтому при изменённых степпером количествах выбор не отдаём: сервер записал бы итог без них */
window.kpChoice = function(){
  try{
    if(!DATA || EMPTY) return undefined;
    if(ITEMS.some(function(it){ return JSON.stringify(it.q) !== it.q0; })) return undefined;
    var on = []; ITEMS.forEach(function(it){ if(it.opt && it.on && it.i < 500 && on.length < 200) on.push(it.i); });
    var c = { optional:on }; if(DATA.variants) c.variant = clamp(vi, 0, 20);
    return c;
  }catch(e){ return undefined; }
};

/* ============ 8. СТАРТ: KP_CONFIG от платформы либо демо ============ */
function boot(cfg, example){
  var est = normEstimate(cfg), dp = dateParts(cfg.date);
  DATA = { variants:est.variants, items:est.items, discount:clamp(numOf(cfg.discount), 0, 100),
           num:cfg.num == null ? '' : String(cfg.num).trim(), date:fmtDate(cfg.date), until:isPast(cfg.until) ? '' : fmtDate(cfg.until),
           dateLong:fmtLong(cfg.date), untilLong:isPast(cfg.until) ? '' : fmtLong(cfg.until, dp ? dp.y : new Date().getFullYear()),
           addr:String(cfg.addr || '').trim(), client:String(cfg.client || '').trim(), nodePhotos:normNodePhotos(cfg.nodePhotos), offer:normOffer(cfg.offer),
           requisites:String(cfg.requisites || '').trim().slice(0, 200), example:!!example };
  EMPTY = !DATA.variants && !DATA.items.length;
  document.body.classList.toggle('noest', EMPTY);
  vi = 0; load();
  el('msg').hidden = true; say('');
  ['nodes','terms','smeta','accept'].forEach(function(n){ setSec(n, !EMPTY); });
  renderAll();
}
function clone(o){ return JSON.parse(JSON.stringify(o)); }
/* образец оффера в демо — тоже «приходит с сервера»: строки набираем так же, как lib/typograf.ts */
function typoDeep(o){ if(typeof o === 'string') return typo(o); if(Array.isArray(o)) return o.map(typoDeep);
  if(o && typeof o === 'object'){ var r = {}; for(var k in o) r[k] = typoDeep(o[k]); return r; } return o; }
function demoCfg(d){ var c = clone(d), on = el('demoOffer') && el('demoOffer').checked; if(on && typeof DEMO_OFFER !== 'undefined') c.offer = typoDeep(DEMO_OFFER); return c; }
function loadDemo(key){ var d = DEMOS.filter(function(x){ return x.key === key; })[0]; if(d) boot(demoCfg(d)); }
/* «Скачать PDF» на платформе ведёт на выгрузку документа: слаг — из адреса страницы /p/{slug} */
(function(){ var m = location.pathname.match(/^\/p\/([^\/]+)\/?$/), b = document.getElementById('pdfBtn');
  if(m && b){ b.href = '/p/' + m[1] + '/pdf'; b.setAttribute('data-real', '1'); } })();
/* секции показываются, когда заполнены; при сбое старта класс всё равно ставится — обложка одна не должна остаться вместо страницы */
try{
if(CFG && CFG.demo === true){
  /* предпросмотр макета в OpMax («Новое КП»): встроенная смета с пометкой «Пример», без чьих-либо контактов,
     номер и сроки — только если их прислала платформа */
  var smp = DEMOS.filter(function(x){ return x.key === 'gaiduk'; })[0] || DEMOS[0];
  boot({ variants:clone(smp.variants || null), items:clone(smp.items || null), discount:smp.discount, num:CFG.num, date:CFG.date, until:CFG.until, offer:CFG.offer, requisites:CFG.requisites }, true);
}
else if(CFG) boot(CFG);   /* смета из OpMax; без позиций — пустое состояние, без чужих цифр */
else {
  /* демо-полоса есть только в сборке для GitHub Pages; в активе платформы её нет (KP_CONFIG есть всегда) — тогда грузим встроенную смету без переключателя */
  var sel = el('demoSel'), dbox = el('demoBox');
  if(sel && dbox){
    dbox.hidden = false;
    sel.innerHTML = DEMOS.map(function(d){ return '<option value="' + esc(d.key) + '">' + escT(d.title) + '</option>'; }).join('');
    var hp = location.hash.replace(/^#/, '').split('&').map(function(p){ return p.split('='); });
    var h = hp.filter(function(p){ return p[0] === 'demo'; })[0];
    if(h && DEMOS.some(function(d){ return d.key === h[1]; })) sel.value = h[1];
    if(hp.some(function(p){ return p[0] === 'offer' && p[1] === '1'; })) el('demoOffer').checked = true;
  }
  loadDemo(sel ? sel.value : DEMOS[0].key);
}
} finally { document.querySelector('.kp').classList.add('pv-on'); }
/* полоса «Итого … К решению» (только от 1024): видна, пока смета на экране, а её собственный «Итого» — нет */
(function(){
  var bar = document.getElementById('bar'), q = SEC.smeta, s = document.getElementById('sum');
  if(!bar || !q || !q.parentNode || !s || !('IntersectionObserver' in window)) return;
  var inQ = false, sumV = false;
  function flag(){ bar.classList.toggle('is-on', inQ && !sumV); }
  new IntersectionObserver(function(es){ inQ = es[es.length - 1].isIntersecting; flag(); }).observe(q);
  new IntersectionObserver(function(es){ sumV = es[es.length - 1].isIntersecting; flag(); }).observe(s);
})();

})();
