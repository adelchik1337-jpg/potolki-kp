(function(){
"use strict";
var RM = matchMedia('(prefers-reduced-motion: reduce)').matches, MOB = innerWidth < 600;
if(RM) document.documentElement.classList.add('rm');
if(MOB) document.documentElement.classList.add('mob');
if(location.hash.indexOf('edit') >= 0) document.body.classList.add('editmode');

/* ============ 1. КЛАССИФИКАТОР: имя строки из Excel → категория и визуальная роль ============ */
function classify(name){
  var n = name.toLowerCase();
  if(/полотно/.test(n)) return { cat:'canvas', role: /бесщелев/.test(n) ? 'seamless-canvas' : 'canvas',
    brand: /bauf/.test(n) ? 'Bauf' : /classic/.test(n) ? 'MSD Classic' : /premium/.test(n) ? 'MSD Premium' : 'полотно',
    width: /до 6/.test(n) ? 6 : /до 5/.test(n) ? 5 : 3.6 };
  if(/подсветка/.test(n)) return { cat:'light', role:'led' };
  if(/световая линия|световые линии/.test(n)) return { cat:'light', role:'line' };
  if(/трек/.test(n)) return { cat:'light', role:'track' };
  if(/люстр/.test(n)) return { cat:'light', role: /установка/.test(n) ? 'chandelier-install' : 'chandelier' };
  if(/точки освещения|точек освещения/.test(n)) return { cat:'light', role:'spot' };
  if(/установка.*светильник|накладн|подвесн/.test(n)) return { cat:'light', role:'spot-install' };
  if(/светильник|лампа/.test(n)) return { cat:'light', role:'fixture' };
  if(/карниз|гардина/.test(n)) return { cat:'cornice', role:'cornice' };
  if(/бесщелев/.test(n)) return { cat:'profile', role:'seamless' };
  if(/парящ/.test(n)) return { cat:'profile', role:'float' };
  if(/раздел/.test(n)) return { cat:'profile', role:'divider' };
  if(/теневой|kraab|бизон/.test(n)) return { cat:'profile', role:'shadow' };
  if(/стеновой/.test(n)) return { cat:'profile', role:'standard' };
  if(/молдинг|вставка/.test(n)) return { cat:'profile', role:'molding' };
  if(/углов/.test(n)) return { cat:'profile', role:'corners' };
  if(/закладн/.test(n)) return { cat:'extra', role:'extra' };
  return { cat:'extra', role:'extra' };
}
var CAT_NAME = { canvas:'Полотно', profile:'Примыкание к стене', light:'Свет', cornice:'Карнизы и шторы', extra:'Работы по объекту' };
var CAT_ORDER = ['canvas','profile','light','cornice','extra'];
var SYS_NAME = { standard:'стеновой профиль со вставкой', shadow:'теневой профиль', seamless:'бесщелевое примыкание', float:'парящий профиль' };
var ROLE_DESC = {
  canvas:'Полотно кроится под комнату с запасом, по краю приваривается кант.',
  'seamless-canvas':'Полотно с особой кромкой для бесщелевого примыкания — считается за м² отдельно от самого полотна.',
  led:'Лента и блок питания в пазу ниши: вечером свет идёт сверху по шторе.',
  line:'Светящаяся полоса 30 мм заподлицо с потолком, в сборе с оборудованием. Считается за метр.',
  track:'Магнитная шина в потолке: светильники переставляются рукой без инструмента. Сами светильники — отдельно.',
  chandelier:'Платформа и вывод провода под люстру; сама люстра ваша.',
  'chandelier-install':'Повесить и подключить люстру, которую вы купили.',
  spot:'Закладная платформа, термокольцо и вывод провода под каждый светильник.',
  'spot-install':'Поставить и подключить сам светильник.',
  fixture:'Светильник с лампой — в цену входит.',
  cornice:'Ниша под шторы в потолке: карниз не виден, ткань идёт от самого потолка.',
  seamless:'Полотно подходит к стене вплотную — ни щели, ни вставки.',
  float:'Лента за полотном по периметру: свет стекает по стенам, потолок «парит».',
  divider:'Профиль на стыке двух полотен — разного цвета, уровня или там, где комната длиннее рулона.',
  shadow:'Ровная тёмная щель у стены вместо вставки. Нужны ровные стены.',
  standard:'Профиль по периметру, в него заводится полотно.',
  molding:'Гибкая вставка в цвет потолка закрывает щель у стены.',
  corners:'Каждый угол теневого или парящего профиля запиливается и стыкуется вручную.',
  extra:'Работа по особенностям объекта — уточняется на замере.'
};

/* ============ 2. ДАННЫЕ ============ */
var CFG = window.KP_CONFIG || null;
var DATA, ITEMS, ROOMS, cur = 0, vi = 0;
function plural(n, a, b, c){ var m = Math.abs(n) % 100, k = m % 10; return n + ' ' + (m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c); }
function money(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; }
function fq2(n){ return (Math.round(n * 100) / 100).toString().replace('.', ','); }
function unitLabel(u){ return u === 'м2' ? 'м²' : u === 'м.п' ? 'м' : u; }

function itemsOf(cfg, k){ return cfg.variants ? cfg.variants[k].items : cfg.items; }
function load(cfg){
  DATA = cfg;
  var roomSet = [];
  ITEMS = itemsOf(cfg, vi).map(function(it, i){
    var c = classify(it.name), q = {};
    if(typeof it.qty === 'number') q['Общая'] = it.qty;
    else for(var k in it.qty){ q[k] = it.qty[k]; }
    for(var k2 in q) if(roomSet.indexOf(k2) < 0) roomSet.push(k2);
    return { i:i, name:it.name, unit:it.unit, price:it.price, q:q, q0:JSON.stringify(q), on:true, cat:c.cat, role:c.role, brand:c.brand, width:c.width,
             isCount: it.unit === 'шт' };
  });
  ROOMS = roomSet.map(function(nm){ return { n:nm, on:true }; });
  ROOMS.forEach(function(r){
    var area = sum('canvas', r.n), spots = cnt(['spot','fixture'], r.n) || cnt(['spot-install'], r.n);
    r.area = area; r.spots = Math.round(spots);
    var side = Math.sqrt(Math.max(area, 4));
    r.W = Math.min(6.5, Math.max(2.4, side * 1.15)); r.D = Math.min(5.5, Math.max(2.2, side * 0.9)); r.H = 2.7;
  });
  cur = 0;
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
  return f;
}

/* ============ 3. РАЗРЕЗ ИЗ СМЕТЫ ============ */
var cutSvg = document.getElementById('cutSvg'), leg = document.getElementById('leg');
function firstOf(roles){ return ITEMS.filter(function(it){ return it.on && roles.indexOf(it.role) >= 0; })[0]; }
function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function shortName(it){
  var n = it.name.replace(/\(китай\)|\(германия\)|, с монтажем|с монтажем|с установкой|в потолок натяжной|\(до 100мм\)|, в сборе со световым оборудованием/gi, '').replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();
  return n.length > 44 ? n.slice(0, 42) + '…' : n;
}
function buildCut(){
  var F = flags(), s = '', L = [], n = 0;
  var INK = '#1D1D1F', BLUE = '#0071E3', LED = '#FFB454', PROF = '#AEAEB2', SHEET = '#FFFFFF';
  var Wv = 900, Hv = 300, slabH = 34, yS = 118;           /* yS — уровень полотна */
  var hasCorn = F.cornice, xR = hasCorn ? 640 : Wv - 18;  /* правая граница полотна */
  var canvas = firstOf(['canvas']), prof = firstOf(['standard','shadow','seamless','float']), mold = firstOf(['molding']);
  var spot = firstOf(['spot','fixture','spot-install']), line = firstOf(['line']), track = firstOf(['track']), chand = firstOf(['chandelier']);
  var corn = firstOf(['cornice']), led = firstOf(['led']), corners = firstOf(['corners']), seamC = firstOf(['seamless-canvas']);
  function num(x, y){ n++; return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + BLUE + '"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="inherit">' + n + '</text>'; }
  function legend(it, extra){ L.push({ k:n, it:it, extra:extra }); }
  function lead(x1, y1, x2, y2){ return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="' + BLUE + '" stroke-width="1" fill="none"/>'; }

  /* фон, плита, стена */
  s += '<defs><pattern id="hh" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#C7C7CC" stroke-width="1"/></pattern></defs>';
  s += '<rect x="0" y="0" width="' + Wv + '" height="' + slabH + '" fill="#E8E8ED"/><rect x="0" y="0" width="' + Wv + '" height="' + slabH + '" fill="url(#hh)"/>';
  s += '<text x="12" y="22" font-size="11" font-family="inherit" fill="#6E6E73">плита перекрытия</text>';
  s += '<rect x="0" y="' + slabH + '" width="18" height="' + (Hv - slabH) + '" fill="#E8E8ED" stroke="#C7C7CC"/>';
  if(!hasCorn) s += '<rect x="' + (Wv - 18) + '" y="' + slabH + '" width="18" height="' + (Hv - slabH) + '" fill="#E8E8ED" stroke="#C7C7CC"/>';

  /* примыкание слева (и справа, если нет ниши) */
  var xL = 18;
  function profileAt(x, dir){ /* dir 1 — слева, -1 — справа */
    var g = '';
    if(F.system === 'shadow'){ g += '<path d="M' + x + ' ' + (yS - 14) + ' h' + (26 * dir) + ' v40 h' + (-10 * dir) + ' v-24 h' + (-8 * dir) + ' v24 h' + (-8 * dir) + ' Z" fill="' + PROF + '" stroke="' + INK + '"/>';
      g += '<rect x="' + (dir > 0 ? x : x - 8) + '" y="' + (yS - 6) + '" width="8" height="12" fill="#1D1D1F"/>'; }
    else if(F.system === 'seamless'){ g += '<path d="M' + x + ' ' + (yS - 8) + ' h' + (20 * dir) + ' v28 h' + (-8 * dir) + ' v-18 h' + (-12 * dir) + ' Z" fill="' + PROF + '" stroke="' + INK + '"/>'; }
    else if(F.system === 'float'){ g += '<path d="M' + x + ' ' + (yS - 18) + ' h' + (30 * dir) + ' v48 h' + (-8 * dir) + ' v-32 h' + (-14 * dir) + ' v32 h' + (-8 * dir) + ' Z" fill="' + PROF + '" stroke="' + INK + '"/>';
      g += '<rect x="' + (dir > 0 ? x + 10 : x - 20) + '" y="' + (yS - 2) + '" width="10" height="5" fill="' + LED + '"/>';
      g += '<path d="M' + (dir > 0 ? x + 8 : x - 8) + ' ' + (yS + 4) + ' L' + x + ' ' + (Hv - 10) + '" stroke="' + LED + '" stroke-width="12" opacity=".3" stroke-linecap="round"/>'; }
    else { g += '<rect x="' + (dir > 0 ? x : x - 26) + '" y="' + (yS - 14) + '" width="26" height="30" fill="' + PROF + '" stroke="' + INK + '"/>';
      if(mold || F.system === 'standard') g += '<rect x="' + (dir > 0 ? x : x - 28) + '" y="' + (yS - 4) + '" width="28" height="9" rx="2" fill="#FFFFFF" stroke="' + BLUE + '"/>'; }
    return g;
  }
  s += profileAt(xL, 1);
  if(!hasCorn) s += profileAt(Wv - 18, -1);
  var xP0 = F.system === 'seamless' ? 18 : 44, xP1 = hasCorn ? xR : (F.system === 'seamless' ? Wv - 18 : Wv - 44);

  /* полотно */
  s += '<path d="M' + xP0 + ' ' + yS + ' H' + xP1 + '" stroke="' + INK + '" stroke-width="6"/><path d="M' + xP0 + ' ' + yS + ' H' + xP1 + '" stroke="' + SHEET + '" stroke-width="4"/>';
  if(hasCorn) s += '<circle cx="' + (xR - 2) + '" cy="' + yS + '" r="4" fill="' + INK + '"/>';

  /* выноски слева: профиль, полотно */
  s += num(30, yS + 60) + lead(30, yS + 50, 30, yS + 18); legend(prof || { name:'Профиль по периметру', price:0, unit:'м.п' }, F.system === 'standard' && mold ? 'со вставкой' : null);
  var xCanvasTag = 150; s += num(xCanvasTag, yS + 60) + lead(xCanvasTag, yS + 50, xCanvasTag, yS + 4); legend(canvas || { name:'Полотно', price:0, unit:'м2' }, seamC ? 'бесщелевая кромка ' + money(seamC.price) + '/м²' : null);

  /* свет: раскладываем по доступной ширине */
  var lights = []; if(spot) lights.push('spot'); if(line) lights.push('line'); if(track) lights.push('track'); if(chand) lights.push('chand');
  var span0 = 240, span1 = hasCorn ? 560 : Wv - 120, step = lights.length ? (span1 - span0) / lights.length : 0;
  lights.forEach(function(kind, i){
    var x = span0 + step * (i + .5);
    if(kind === 'spot'){ s += '<rect x="' + (x - 22) + '" y="' + (yS - 52) + '" width="44" height="46" fill="#48484A"/><rect x="' + (x - 30) + '" y="' + (yS - 6) + '" width="60" height="10" rx="2" fill="#D2D2D7" stroke="' + INK + '"/>';
      s += '<path d="M' + x + ' ' + (yS + 8) + ' L' + (x - 22) + ' ' + (yS + 62) + ' M' + x + ' ' + (yS + 8) + ' L' + (x + 22) + ' ' + (yS + 62) + '" stroke="' + LED + '" stroke-width="18" opacity=".28" stroke-linecap="round"/>';
      s += num(x, yS - 70) + lead(x, yS - 60, x, yS - 52); legend(spot, F.spots ? Math.round(F.spots) + ' шт' : null); }
    if(kind === 'line'){ s += '<rect x="' + (x - 34) + '" y="' + (yS - 30) + '" width="68" height="34" fill="#48484A"/><rect x="' + (x - 36) + '" y="' + (yS - 3) + '" width="72" height="7" fill="#FFF9EC" stroke="' + INK + '"/>';
      s += '<path d="M' + (x - 30) + ' ' + (yS + 8) + ' L' + (x - 40) + ' ' + (yS + 70) + ' M' + (x + 30) + ' ' + (yS + 8) + ' L' + (x + 40) + ' ' + (yS + 70) + '" stroke="' + LED + '" stroke-width="14" opacity=".22" stroke-linecap="round"/>';
      s += num(x, yS - 48) + lead(x, yS - 38, x, yS - 30); legend(line, fq2(qty(line)) + ' м'); }
    if(kind === 'track'){ s += '<rect x="' + (x - 40) + '" y="' + (yS - 26) + '" width="80" height="30" fill="#3A3A3C"/><rect x="' + (x - 42) + '" y="' + (yS - 2) + '" width="84" height="6" fill="#1D1D1F"/>';
      s += '<rect x="' + (x - 8) + '" y="' + (yS + 4) + '" width="16" height="22" rx="3" fill="#48484A"/><path d="M' + x + ' ' + (yS + 26) + ' L' + (x - 14) + ' ' + (yS + 70) + ' M' + x + ' ' + (yS + 26) + ' L' + (x + 14) + ' ' + (yS + 70) + '" stroke="' + LED + '" stroke-width="12" opacity=".25" stroke-linecap="round"/>';
      s += num(x, yS - 44) + lead(x, yS - 34, x, yS - 26); legend(track, fq2(qty(track)) + ' м'); }
    if(kind === 'chand'){ s += '<rect x="' + (x - 14) + '" y="' + (yS - 40) + '" width="28" height="34" fill="#A68A64"/><rect x="' + (x - 20) + '" y="' + (yS - 6) + '" width="40" height="9" rx="2" fill="#D2D2D7" stroke="' + INK + '"/>';
      s += '<path d="M' + x + ' ' + (yS + 3) + ' v30" stroke="' + INK + '" stroke-width="2"/><path d="M' + (x - 26) + ' ' + (yS + 33) + ' Q' + x + ' ' + (yS + 62) + ' ' + (x + 26) + ' ' + (yS + 33) + ' Z" fill="#FFFFFF" stroke="' + INK + '"/>';
      s += num(x, yS - 58) + lead(x, yS - 48, x, yS - 40); legend(chand, Math.round(F.chand) + ' шт'); }
  });

  /* ниша под шторы справа */
  if(hasCorn){
    s += '<rect x="' + (xR + 60) + '" y="' + slabH + '" width="80" height="44" fill="#A68A64"/><text x="' + (xR + 68) + '" y="' + (slabH + 28) + '" font-size="10" fill="#fff" font-family="inherit">брус</text>';
    s += '<path d="M' + xR + ' ' + (yS - 32) + ' H' + (xR + 140) + ' V' + (yS + 32) + ' H' + (xR + 105) + ' V' + (yS - 8) + ' H' + xR + ' Z" fill="' + PROF + '" stroke="' + INK + '" stroke-width="1.2"/>';
    s += '<rect x="' + (xR + 6) + '" y="' + (yS - 4) + '" width="92" height="14" fill="#3A3A3C"/>';
    if(led) s += '<rect x="' + (xR + 6) + '" y="' + (yS + 10) + '" width="92" height="6" fill="' + LED + '"/><path d="M' + (xR + 52) + ' ' + (yS + 18) + ' v' + (Hv - yS - 30) + '" stroke="' + LED + '" stroke-width="60" opacity=".18"/>';
    s += '<rect x="' + (xR + 105) + '" y="' + (yS + 32) + '" width="20" height="8" fill="#48484A"/>';
    s += '<path d="M' + (xR + 105) + ' ' + (yS + 40) + ' V' + Hv + ' H' + Wv + ' V' + (yS + 40) + ' Z" fill="#6E6E73" opacity=".6"/><rect x="' + (xR + 135) + '" y="' + (yS + 40) + '" width="' + (Wv - xR - 135) + '" height="' + (Hv - yS - 40) + '" fill="#2C3E5A"/>';
    s += num(xR + 52, yS + 80) + lead(xR + 52, yS + 70, xR + 52, yS + 34); legend(corn, fq2(qty(corn)) + ' м');
    if(led){ s += num(xR + 120, yS + 80) + lead(xR + 120, yS + 70, xR + 110, yS + 18); legend(led, fq2(qty(led)) + ' м'); }
  }
  /* углы */
  if(corners){ s += num(90, yS - 60) + lead(90, yS - 50, 44, yS - 14); legend(corners, Math.round(qty(corners)) + ' шт'); }
  /* высота */
  var drop = { standard:'3–5 см', shadow:'3–4 см', seamless:'3 см', float:'5–6,5 см' }[F.system];
  s += '<path d="M' + (xCanvasTag + 60) + ' ' + slabH + ' V' + (yS - 3) + '" stroke="' + BLUE + '" stroke-width="1"/><path d="M' + (xCanvasTag + 54) + ' ' + slabH + ' h12 M' + (xCanvasTag + 54) + ' ' + (yS - 3) + ' h12" stroke="' + BLUE + '"/>';
  s += '<text x="' + (xCanvasTag + 66) + '" y="' + ((slabH + yS) / 2 + 4) + '" font-size="11" font-family="inherit" fill="' + BLUE + '">' + drop + '</text>';
  cutSvg.innerHTML = s;
  leg.innerHTML = L.map(function(e){ var it = e.it;
    return '<span><i>' + e.k + '</i><b>' + esc(shortName(it)) + '</b><em>' + (it.price ? money(it.price) + '/' + unitLabel(it.unit) : '') + (e.extra ? ' · ' + esc(e.extra) : '') + '</em></span>'; }).join('');
}

/* ============ 4. ФАКТУРА, ВАРИАНТЫ ============ */
var clamp = function(v, a, b){ return Math.min(b, Math.max(a, v)); };
window.setVar = function(k){ vi = k; track('package_select', { variant:DATA.variants[k].title }); var onMap = {}; ITEMS.forEach(function(it){ onMap[it.name] = it.on; });
  load(DATA); ITEMS.forEach(function(it){ if(onMap[it.name] === false) it.on = false; }); renderAll(); };
function renderVars(){
  var pan = document.getElementById('varsPan');
  if(!DATA.variants || DATA.variants.length < 2){ pan.style.display = 'none'; return; }
  pan.style.display = '';
  var totals = DATA.variants.map(function(v, k){ var g = 0; v.items.forEach(function(it){ var q = typeof it.qty === 'number' ? it.qty : Object.keys(it.qty).reduce(function(s, r){ return s + it.qty[r]; }, 0); g += it.price * q; });
    return Math.round(g - Math.round(g * (DATA.discount || 0) / 100)); });
  var min = Math.min.apply(null, totals);
  document.getElementById('vars').innerHTML = DATA.variants.map(function(v, k){
    return '<button class="var' + (k === vi ? ' on' : '') + '" onclick="setVar(' + k + ')"><span class="vt"><b>' + esc(v.title) + '</b><small>' + esc(v.note || '') + '</small></span>'
      + '<span class="vp2 num">' + money(totals[k]) + (totals[k] > min ? '<span class="vd">+' + money(totals[k] - min) + '</span>' : '<span class="vd">базовый</span>') + '</span></button>'; }).join('');
}
/* ============ 4б. КОМПАНИЯ, МЕНЕДЖЕР, ФОТО И ВИДЕО ============ */
/* Что общее для компании (логотип, команда, видео, библиотека фото) — один раз в макете или в загрузках OpMax.
   Контакты — у каждого менеджера свои: KP_CONFIG.contacts, те же поля, что у блока «Контакты» в OpMax. */
var LAYOUT = window.DEMO_PROFILE || {};
var TAG_RX = { shadow:/тенев/, float:/парящ/, seamless:/бесщел/, line:/лини/, track:/трек/, cornice:/карниз|штор|ниш/, led:/подсвет|засвет|контур/,
  spot:/точечн|светильник|спот/, chandelier:/люстр/, gloss:/глянц/, satin:/сатин/, matte:/матов/ };
var TAG_RU = { shadow:'теневой профиль', float:'парящий потолок', seamless:'бесщелевое примыкание', line:'световые линии', track:'трек',
  cornice:'ниша под шторы', led:'подсветка', spot:'точечный свет', chandelier:'люстра' };
function tagsOf(name){ var n = String(name || '').toLowerCase(), t = []; for(var k in TAG_RX) if(TAG_RX[k].test(n)) t.push(k); return t; }
function capOf(name){ var c = String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s*\d+$/, '').trim();
  return /^(img|dsc|dcim|pxl|photo|image|screenshot|whatsapp|снимок|фото|объект|работ)/i.test(c) || (c.match(/[a-zа-яё]/gi) || []).length < 3 ? '' : c; }
/* загрузки платформы → фото с тегами, видео, команда */
function fromMedia(media){
  var o = { photos:[], video:null, team:null, poster:null };
  (media || []).forEach(function(m){
    var n = String(m.name || '').toLowerCase(), mime = m.mime || '';
    if(m.kind === 'video' || mime.indexOf('video/') === 0){ if(!o.video && (tagsOf(n).length || /объект|работ/.test(n))) o.video = { src:m.url }; return; }
    if(mime && mime.indexOf('image/') !== 0) return;
    if(/команд|team/.test(n)){ o.team = { photo:m.url, caption:'' }; return; }
    if(/poster|обложк/.test(n)){ o.poster = m.url; return; }
    /* в загрузках КП бывают и чужие файлы (план, фото комнаты клиента) — объектом считаем только помеченное */
    var tg = tagsOf(n);
    if(tg.length || /объект|работ/.test(n)) o.photos.push({ src:m.url, cap:capOf(m.name), tags:tg, score:8 });
  });
  if(o.video && o.poster) o.video.poster = o.poster;
  return o;
}
function profile(){
  var c = CFG || {}, m = c.media && c.media.length ? fromMedia(c.media) : { photos:[] };
  var ph = (c.photos || []).map(function(x){ return typeof x === 'string' ? { src:x, cap:'', tags:[], score:8 } : x; });
  /* разметку логотипа (<svg>) берём только из самого макета; из конфига — только ссылку на картинку */
  var cc = Object.assign({}, c.company); ['logo','mark'].forEach(function(k){ if(cc[k] && /^\s*</.test(cc[k])) delete cc[k]; });
  return {
    company: Object.assign({}, LAYOUT.company, cc),
    /* контакты личные: на платформе без подстановок, демо-контакты — только в демо */
    contacts: c.contacts || (CFG ? {} : LAYOUT.contacts) || {},
    team: c.team || m.team || LAYOUT.team || null,
    video: c.video || m.video || LAYOUT.video || null,
    /* свои фото этого КП — вперёд, библиотека компании — следом */
    photos: ph.concat(m.photos, LAYOUT.photos || [])
  };
}
/* какие теги искать в фото — из состава сметы */
function wantTags(F){
  var w = [];
  if(F.system !== 'standard') w.push(F.system);
  if(F.lines) w.push('line'); if(F.track) w.push('track'); if(F.cornice) w.push('cornice'); if(F.led) w.push('led');
  if(F.systems.indexOf('seamless') >= 0 && w.indexOf('seamless') < 0) w.push('seamless');
  if(F.chand) w.push('chandelier'); if(F.spots) w.push('spot');
  return w;
}
/* по кругу: лучший ещё не показанный объект на каждый тег сметы, потом лучшие остальные */
var SIGN = ['shadow','float','seamless','line','track','cornice','two-level','gloss'];
function pickPhotos(lib, want, n){
  /* фото с заметной фишкой, которой нет в смете (парящий, линии, трек…), уходит назад — не обещаем чужого */
  var miss = function(x){ return (x.tags || []).filter(function(t){ return SIGN.indexOf(t) >= 0 && want.indexOf(t) < 0; }).length; };
  var fit = function(x){ return (x.score || 0) - 10 * miss(x); };
  var all = lib.slice().sort(function(a, b){ return fit(b) - fit(a); }), used = [], hit = [];
  function has(p, t){ return (p.tags || []).indexOf(t) >= 0; }
  for(var round = 0; used.length < n && round < 6; round++){
    var added = false;
    want.forEach(function(t){ if(used.length >= n) return;
      var p = all.filter(function(x){ return used.indexOf(x) < 0 && has(x, t) && !miss(x); })[0];
      if(p){ used.push(p); added = true; if(hit.indexOf(t) < 0) hit.push(t); } });
    if(!added) break;
  }
  all.forEach(function(x){ if(used.length < n && used.indexOf(x) < 0) used.push(x); });
  /* для галереи: сначала совпавшие со сметой, затем остальные */
  var score = function(x){ return (x.tags || []).filter(function(t){ return want.indexOf(t) >= 0; }).length; };
  var rest = all.filter(function(x){ return used.indexOf(x) < 0; }).sort(function(a, b){ return score(b) - score(a) || fit(b) - fit(a); });
  return { list:used, hit:hit, gallery:used.concat(rest) };
}
var GAL = [], gi = 0;
function listRu(a){ return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1]; }
var ICO_PLAY = '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z" fill="#fff"/></svg>', ICO_PAUSE = '<svg viewBox="0 0 14 14"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="#fff"/></svg>';
function renderPhotos(){
  var P = profile(), F = flags(), want = wantTags(F), vid = P.video && P.video.src ? P.video : null;
  var r = pickPhotos(P.photos, want, vid ? 4 : 6), html = '', grid = document.getElementById('photos');
  GAL = r.gallery;
  r.list.forEach(function(p, k){
    html += '<button class="ph2" onclick="openLb(' + k + ')"><img src="' + esc(p.src) + '" alt="' + esc(p.cap || 'Объект') + '">' + (p.cap ? '<div class="cap">' + esc(p.cap) + '</div>' : '') + '</button>';
  });
  if(!r.list.length && !vid) for(var i = 0; i < 3; i++) html += '<div class="ph2"><div class="pl">Фото объекта<br>загружается в OpMax</div></div>';
  /* плитку с видео строим один раз: правка сметы не должна перезапускать ролик и сбрасывать паузу */
  var vc = grid.querySelector('.vcard');
  if(vid && vc && vc.getAttribute('data-src') === vid.src){
    grid.querySelectorAll('.ph2').forEach(function(n){ n.parentNode.removeChild(n); }); grid.insertAdjacentHTML('beforeend', html);
  } else {
    grid.innerHTML = (vid ? '<div class="vcard' + (vid.poster ? ' hasposter' : '') + '" data-src="' + esc(vid.src) + '"><video id="objVid" muted loop playsinline preload="none"' + (vid.poster ? ' poster="' + esc(vid.poster) + '"' : '') + ' data-src="' + esc(vid.src) + '"></video>'
      + '<button class="vbtn" id="vBtn" onclick="tglVid()" aria-label="Пауза">' + ICO_PAUSE + '</button><div class="cap">' + esc(vid.caption || 'Видео с наших объектов') + '</div></div>' : '') + html;
    if(vid) setupVid();
  }
  var hit = r.hit.filter(function(t){ return TAG_RU[t]; }).slice(0, 4).map(function(t){ return TAG_RU[t]; });
  document.getElementById('phLead').textContent = hit.length ? 'Наши объекты, где есть то же, что в вашей смете: ' + listRu(hit) + '.' : 'Несколько объектов, которые мы сделали.';
  var more = document.getElementById('phMore');
  more.hidden = GAL.length <= r.list.length; more.textContent = 'Все фото объектов · ' + GAL.length;
}
/* видео: грузим и крутим, только когда блок на экране; без автозапуска при «уменьшить движение» */
var vio;
function setupVid(){
  var v = document.getElementById('objVid'); if(!v) return;
  if(RM){ document.getElementById('vBtn').innerHTML = ICO_PLAY; return; }
  if(!('IntersectionObserver' in window)){ v.src = v.dataset.src; v.play().catch(function(){}); return; }
  if(vio) vio.disconnect();
  vio = new IntersectionObserver(function(es){ es.forEach(function(e){
    if(e.isIntersecting){ if(!v.src) v.src = v.dataset.src; if(!v.dataset.user) v.play().catch(function(){}); }
    else if(!v.paused) v.pause(); }); }, { threshold:.25 });
  vio.observe(v);
}
window.tglVid = function(){ var v = document.getElementById('objVid'), b = document.getElementById('vBtn'); if(!v) return;
  if(!v.src) v.src = v.dataset.src;
  if(v.paused){ v.dataset.user = ''; v.play().catch(function(){}); b.innerHTML = ICO_PAUSE; b.setAttribute('aria-label', 'Пауза'); }
  else { v.dataset.user = '1'; v.pause(); b.innerHTML = ICO_PLAY; b.setAttribute('aria-label', 'Смотреть'); } };
/* лайтбокс: стрелки, Esc, свайп */
function showLb(){ var p = GAL[gi]; if(!p) return; document.getElementById('lbImg').src = p.src; document.getElementById('lbImg').alt = p.cap || '';
  document.getElementById('lbCap').innerHTML = esc(p.cap || '') + '<small>' + (gi + 1) + ' из ' + GAL.length + '</small>'; }
window.openLb = function(k){ if(!GAL.length) return; gi = k; showLb(); document.getElementById('lb').hidden = false; document.body.style.overflow = 'hidden'; };
window.closeLb = function(){ document.getElementById('lb').hidden = true; document.body.style.overflow = ''; };
window.stepLb = function(d){ gi = (gi + d + GAL.length) % GAL.length; showLb(); };
document.addEventListener('keydown', function(e){ if(document.getElementById('lb').hidden) return;
  if(e.key === 'Escape') closeLb(); if(e.key === 'ArrowLeft') stepLb(-1); if(e.key === 'ArrowRight') stepLb(1); });
/* PDF на платформе делается печатью страницы — перед печатью догружаем всё ленивое */
window.addEventListener('beforeprint', function(){ document.querySelectorAll('img[loading="lazy"]').forEach(function(im){ im.loading = 'eager'; }); });
(function(){ var lb = document.getElementById('lb'), x0 = null;
  lb.addEventListener('click', function(e){ if(e.target === lb) closeLb(); });
  lb.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, { passive:true });
  lb.addEventListener('touchend', function(e){ if(x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 40) stepLb(dx < 0 ? 1 : -1); x0 = null; }); })();

/* контакты менеджера: только заполненные каналы */
function digits(s){ var d = String(s || '').replace(/\D/g, ''); if(d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if(d.length === 10) d = '7' + d; return d; }
var ICO = {
  phone:'<svg viewBox="0 0 24 24"><path fill="#fff" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  wa:'<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5zm5.3 13.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.3z"/></svg>',
  tg:'<svg viewBox="0 0 24 24"><path fill="#fff" d="M20.7 4.3 2.9 11.2c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.3c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.3c.3-1.3-.5-1.8-1.3-1.6zM8.9 13.9l9-5.7c.4-.3.8-.1.5.2l-7.7 7-.3 3.2-1.5-4.7z"/></svg>'
};
/* номер — в одном виде, как бы менеджер его ни ввёл: 8 938 523-44-37 */
function phoneText(p){ var d = digits(p); return d.length === 11 && d[0] === '7' ? '8 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9) : String(p); }
function channels(C){
  var ch = [], nm = C.name ? C.name : 'менеджеру';
  if(C.phone) ch.push({ k:'phone', bg:'#34C759', href:'tel:+' + digits(C.phone), t:phoneText(C.phone), s:'позвонить' + (C.name ? ' · ' + C.name : '') });
  if(C.whatsapp) ch.push({ k:'wa', bg:'#25D366', href:'https://wa.me/' + digits(C.whatsapp === true ? C.phone : C.whatsapp), t:'WhatsApp', s:'написать в WhatsApp', ext:1 });
  if(C.telegram){ var tg = String(C.telegram).trim().replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '').replace(/^@/, '');
    var tgPhone = /^\+?[\d\s()-]{10,}$/.test(tg);
    ch.push({ k:'tg', bg:'#229ED9', href:'https://t.me/' + (tgPhone ? '+' + digits(tg) : encodeURI(tg)), t:'Telegram', s:tgPhone ? 'написать в Telegram' : '@' + tg, ext:1 }); }
  if(C.max){ var mx = String(C.max).trim().replace(/^(https?:\/\/)?(www\.)?max\.ru\//i, '').replace(/^@/, '');
    ch.push({ k:'max', bg:'#1D1D1F', href:'https://max.ru/' + encodeURI(mx), t:'MAX', s:'написать в MAX', ext:1 }); }
  return ch;
}
function renderPeople(){
  var P = profile(), C = P.contacts || {}, co = P.company || {}, ch = channels(C);
  /* шапка: логотип, менеджер, кнопки */
  var logo = co.logo ? (/^\s*<svg/.test(co.logo) ? co.logo.replace('<svg', '<svg class="full"') : '<img class="full" src="' + esc(co.logo) + '" alt="' + esc(co.name || '') + '">') : (co.name ? '<b class="full" style="line-height:1.2;font-size:15px">' + esc(co.name) + '</b>' : '');
  var mark = co.mark ? co.mark.replace('<svg', '<svg class="mk"') : '';
  document.getElementById('brand').innerHTML = logo + mark;
  document.getElementById('hMgr').textContent = C.name ? 'Менеджер: ' + C.name : '';
  var nav = '', call = ch.filter(function(c){ return c.k === 'phone'; })[0], msg = ch.filter(function(c){ return c.k !== 'phone'; })[0];
  if(call) nav += '<a class="tbtn" href="' + esc(call.href) + '" onclick="track(\'cta_click\',{channel:\'phone\'})">Позвонить</a>';
  if(msg) nav += '<a class="tbtn p" href="' + esc(msg.href) + '" onclick="track(\'cta_click\',{channel:\'' + msg.k + '\'})" target="_blank" rel="noopener">' + msg.t + '</a>';
  document.getElementById('hNav').innerHTML = nav;
  /* финальный блок */
  document.querySelector('.who .wl').textContent = C.name ? 'Ваш менеджер' : 'Связаться с нами';
  document.getElementById('mName').textContent = C.name || (co.name ? '«' + co.name + '»' : '');
  document.getElementById('mRole').textContent = C.name ? (C.role || [co.name ? '«' + co.name + '»' : '', co.city].filter(Boolean).join(' · ')) : (co.city || '');
  document.getElementById('cts').innerHTML = ch.map(function(c){
    return '<a class="ct" href="' + esc(c.href) + '" onclick="track(\'cta_click\',{channel:\'' + c.k + '\'})"' + (c.ext ? ' target="_blank" rel="noopener"' : '') + '><span class="ic" style="background:' + c.bg + '">' + (ICO[c.k] || 'M') + '</span><span>' + esc(c.t) + '<small>' + esc(c.s) + '</small></span><span class="go">›</span></a>'; }).join('')
    || (document.body.classList.contains('editmode') ? '<p class="hint">Контакты менеджера не заполнены — добавьте телефон или мессенджер в OpMax.</p>' : '');
  var tm = P.team, fig = document.getElementById('team'), mg = document.getElementById('mgr');
  if(tm && tm.photo){ fig.hidden = false; document.getElementById('teamImg').src = tm.photo; document.getElementById('teamImg').alt = tm.caption || 'Команда';
    document.getElementById('teamCap').textContent = tm.caption || ''; mg.classList.remove('noteam'); }
  else { fig.hidden = true; mg.classList.add('noteam'); }
  document.getElementById('fCo').textContent = [co.name ? '«' + co.name + '»' : '', co.city, co.what].filter(Boolean).join(' · ');
  if(co.name) document.title = 'КП № ' + DATA.num + ' · ' + co.name;
}

/* ============ 5. ПАНЕЛЬ И СМЕТА ============ */
window.tglItem = function(i){ ITEMS[i].on = !ITEMS[i].on; track('quote_toggle', { item:ITEMS[i].name, on:ITEMS[i].on }); renderAll(); };
window.stepItem = function(i, d){ var it = ITEMS[i]; var k = Object.keys(it.q)[0]; it.q[k] = clamp(it.q[k] + d, 0, 200); if(it.q[k] === 0) it.on = false; else it.on = true; track('quote_toggle', { item:it.name, qty:it.q[k] }); renderAll(); };


function renderItems(){
  var html = '';
  CAT_ORDER.forEach(function(cat){
    var list = ITEMS.filter(function(it){ return it.cat === cat; }); if(!list.length) return;
    var s = 0; list.forEach(function(it){ if(it.on) s += lineSum(it); });
    html += '<div class="grp"><div class="gh"><span>' + CAT_NAME[cat] + '</span><span>' + money(s) + '</span></div>';
    list.forEach(function(it){
      var q = qty(it), single = Object.keys(it.q).length === 1;
      html += '<div class="it' + (it.on ? '' : ' off') + '"><span class="itx">' + esc(it.name) + '<small>' + (it.isCount && single ? '' : fq2(q) + ' ' + unitLabel(it.unit) + ' × ') + money(it.price) + (it.isCount && single ? ' за шт' : '') + '</small></span>'
        + (it.isCount && single ? '<span class="sb"><button onclick="stepItem(' + it.i + ',-1)">−</button><span>' + q + '</span><button onclick="stepItem(' + it.i + ',1)">+</button></span>' : '')
        + '<span class="itp">' + money(lineSum(it)) + '</span><span class="sw" onclick="tglItem(' + it.i + ')"></span></div>';
    });
    html += '</div>';
  });
  document.getElementById('items').innerHTML = html;
}
function renderSum(){
  var g = gross(), d = discount(), t = total(), F = flags();
  var el = document.getElementById('sTotal'); el.textContent = money(t); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  var note = fq2(F.area) + ' м² · ' + F.brand + ' · ' + SYS_NAME[F.system]
    + (F.spots ? ' · ' + plural(Math.round(F.spots), 'точка', 'точки', 'точек') : '') + (F.lines ? ' · линии ' + fq2(F.lines) + ' м' : '');
  document.getElementById('sNote').textContent = note;
  var rows = '';
  CAT_ORDER.forEach(function(cat){ var s = 0, any = false; ITEMS.forEach(function(it){ if(it.cat === cat){ any = true; if(it.on) s += lineSum(it); } });
    if(any) rows += '<div class="srow"><span>' + CAT_NAME[cat] + '</span><span>' + money(s) + '</span></div>'; });
  if(d) rows += '<div class="srow disc"><span>Скидка ' + DATA.discount + ' %</span><span>−' + money(d) + '</span></div>';
  document.getElementById('sRows').innerHTML = rows;
  ['hTotal','aTotal','mTotal'].forEach(function(id){ var e = document.getElementById(id); if(e) e.textContent = money(t); });
  var hp = document.getElementById('hTotal'); hp.classList.remove('pulse'); void hp.offsetWidth; hp.classList.add('pulse');
  document.getElementById('mSub').textContent = note;
  document.getElementById('aDesc').textContent = note + (DATA.variants ? ' · вариант «' + DATA.variants[vi].title + '»' : '') + '. Цена действительна до ' + DATA.until + '.';
  /* шапка */
  document.getElementById('h1').innerHTML = 'Натяжной потолок' + (F.area ? ' <span style="white-space:nowrap">' + fq2(F.area) + '&nbsp;м²</span>' : '');
  document.getElementById('hsub').innerHTML = '<b>' + F.brand + '</b> · <b>' + SYS_NAME[F.system] + '</b>'
    + (F.spots ? ' · ' + plural(Math.round(F.spots), 'точка', 'точки', 'точек') + ' света' : '') + (F.chand ? ' · ' + plural(Math.round(F.chand), 'точка', 'точки', 'точек') + ' под люстру' : '')
    + (F.lines ? ' · световые линии ' + fq2(F.lines) + ' м' : '') + (F.track ? ' · трек ' + fq2(F.track) + ' м' : '') + (F.cornice ? ' · ниша под шторы' : '')
    + (d ? ' · скидка ' + DATA.discount + ' %' : '');
  /* что важно знать: примыкание и высота */
  var CUT = {
    standard:'<svg viewBox="0 0 400 110"><rect x="0" y="0" width="400" height="22" fill="#E8E8ED"/><rect x="0" y="22" width="14" height="88" fill="#E8E8ED" stroke="#C7C7CC"/><rect x="14" y="44" width="22" height="26" fill="#AEAEB2" stroke="#1D1D1F"/><path d="M36 56 H400" stroke="#1D1D1F" stroke-width="5"/><path d="M36 56 H400" stroke="#FFFFFF" stroke-width="3"/><rect x="14" y="52" width="24" height="8" rx="2" fill="#FFFFFF" stroke="#0071E3"/><text x="60" y="90" font-size="10" font-family="inherit" fill="#0071E3">вставка закрывает щель у стены</text></svg>',
    shadow:'<svg viewBox="0 0 400 110"><rect x="0" y="0" width="400" height="22" fill="#E8E8ED"/><rect x="0" y="22" width="14" height="88" fill="#E8E8ED" stroke="#C7C7CC"/><path d="M14 36 H40 V74 H30 V50 H22 V74 H14 Z" fill="#AEAEB2" stroke="#1D1D1F"/><path d="M40 56 H400" stroke="#1D1D1F" stroke-width="5"/><path d="M40 56 H400" stroke="#FFFFFF" stroke-width="3"/><rect x="14" y="50" width="8" height="12" fill="#1D1D1F"/><text x="60" y="90" font-size="10" font-family="inherit" fill="#0071E3">тёмный зазор 6 мм вместо вставки</text></svg>',
    seamless:'<svg viewBox="0 0 400 110"><rect x="0" y="0" width="400" height="22" fill="#E8E8ED"/><rect x="0" y="22" width="14" height="88" fill="#E8E8ED" stroke="#C7C7CC"/><path d="M14 42 H34 V70 H26 V52 H14 Z" fill="#AEAEB2" stroke="#1D1D1F"/><path d="M14 56 H400" stroke="#1D1D1F" stroke-width="5"/><path d="M14 56 H400" stroke="#FFFFFF" stroke-width="3"/><text x="60" y="90" font-size="10" font-family="inherit" fill="#0071E3">полотно вплотную к стене, без щели</text></svg>',
    float:'<svg viewBox="0 0 400 110"><rect x="0" y="0" width="400" height="22" fill="#E8E8ED"/><rect x="0" y="22" width="14" height="88" fill="#E8E8ED" stroke="#C7C7CC"/><path d="M14 32 H44 V78 H36 V48 H22 V78 H14 Z" fill="#AEAEB2" stroke="#1D1D1F"/><rect x="24" y="50" width="10" height="5" fill="#FFB454"/><path d="M44 60 H400" stroke="#1D1D1F" stroke-width="5"/><path d="M44 60 H400" stroke="#FFFFFF" stroke-width="3"/><path d="M22 56 L14 110" stroke="#FFB454" stroke-width="10" opacity=".35"/><text x="60" y="94" font-size="10" font-family="inherit" fill="#0071E3">лента за полотном, свет стекает по стене</text></svg>' };
  var SYSP = { standard:'Профиль по периметру, щель у стены закрывает гибкая вставка в цвет потолка. Подходит для любых стен.',
               shadow:'Ровная тёмная щель у стены вместо вставки — потолок выглядит как гипсокартонный, но без швов и трещин. Нужны ровные стены.',
               seamless:'Полотно подходит к стене вплотную: ни щели, ни вставки. Самый чистый вид.',
               float:'Лента за полотном по периметру: свет стекает по стенам, потолок будто висит в воздухе.' };
  var DROP = { standard:['3–5 см','Стеновой профиль.'], shadow:['3–4 см','Теневой профиль.'], seamless:['3 см','Бесщелевое примыкание.'], float:['5–6,5 см','Парящий профиль с лентой за полотном.'] };
  document.getElementById('kSys').innerHTML = CUT[F.system] + '<b>Примыкание: ' + SYS_NAME[F.system] + '</b><p>' + SYSP[F.system]
    + (F.corners ? ' Углы обрабатываются вручную — ' + Math.round(F.corners) + ' шт в смете.' : '') + '</p>';
  document.getElementById('kDrop').textContent = DROP[F.system][0];
  document.getElementById('kDropP').textContent = DROP[F.system][1] + (F.cornice ? ' У ниши под шторы — до 10 см локально.' : '');
  /* что входит */
  var inc = ['монтаж', 'закладные под свет'];
  if(cnt(['fixture']) > 0) inc.push('светильники с лампами'); else inc.push('вывоз обрезков и упаковки');
  document.getElementById('incl').innerHTML = '<b>В цену входит:</b> ' + inc.join(', ') + '. ' + (cnt(['fixture']) > 0 || !cnt(['spot-install','chandelier-install']) ? '' : 'Светильники и лампы — ваши, ставим и подключаем. ') + (F.cornice ? 'Карнизы для штор в нишу — отдельно.' : '');
  document.getElementById('fLine').textContent = 'КП № ' + DATA.num + ' от ' + DATA.date + ' · действует до ' + DATA.until + (DATA.addr ? ' · объект: ' + DATA.addr : '') + (DATA.client ? ' · для: ' + DATA.client : '');
}
/* каждый блок рисуется сам: сбой в одном (необычная строка сметы) не должен оставить без контактов и фото */
function renderAll(){ [renderVars, renderItems, renderSum, buildCut, renderPhotos, renderPeople].forEach(function(f){ try{ f(); }catch(e){ if(window.console) console.error(e); } }); }

window.copySpec = function(){
  var co = profile().company || {};
  var L = ['Смета к КП № ' + DATA.num + (co.name ? ' — «' + co.name + '»' + (co.city ? ', ' + co.city : '') : ''), (DATA.addr ? 'Объект: ' + DATA.addr : ''), ''];
  L.push(['Позиция', 'Ед.', 'Цена', 'Кол-во', 'Сумма'].join('\t'));
  ITEMS.forEach(function(it){ if(it.on) L.push([it.name, unitLabel(it.unit), it.price, fq2(qty(it)), Math.round(lineSum(it))].join('\t')); });
  L.push(''); if(discount()){ L.push('Сумма\t' + Math.round(gross())); L.push('Скидка ' + DATA.discount + '%\t−' + discount()); }
  L.push('ИТОГО\t' + total()); L.push('Цена действительна до ' + DATA.until);
  var t = L.join('\n');
  if(navigator.clipboard) navigator.clipboard.writeText(t).then(function(){ toast('Смета скопирована'); }).catch(function(){ toast('Не удалось скопировать'); });
};
function track(t, p){ try{ if(window.__kpTrack) window.__kpTrack(t, p || {}); }catch(e){} }
window.track = track;
/* «Согласовать» ничего не отправляет само — готовим сообщение менеджеру с составом, клиент отправляет его сам */
function approveText(){
  var on = ITEMS.filter(function(it){ return it.on; }), off = ITEMS.filter(function(it){ return !it.on; }).map(function(it){ return shortName(it); });
  var ch = ITEMS.filter(function(it){ return it.on && JSON.stringify(it.q) !== it.q0; }).map(function(it){ return shortName(it) + ' — ' + fq2(qty(it)) + ' ' + unitLabel(it.unit); });
  return 'Здравствуйте! КП № ' + DATA.num + (DATA.addr ? ', объект ' + DATA.addr : '') + (DATA.variants ? ', вариант «' + DATA.variants[vi].title + '»' : '')
    + ': состав подходит — ' + plural(on.length, 'позиция', 'позиции', 'позиций') + ' на ' + money(total()) + '.'
    + (off.length ? ' Без позиций: ' + off.join('; ') + '.' : '') + (ch.length ? ' Другое количество: ' + ch.join('; ') + '.' : '')
    + ' Подскажите, как оформить договор?';
}
window.approve = function(){
  var b = document.getElementById('okBox'), F = flags(), C = profile().contacts || {}, ch = channels(C), txt = approveText();
  var on = ITEMS.filter(function(it){ return it.on; }).length;
  track('accept_click', { total:total(), variant:DATA.variants ? DATA.variants[vi].title : '', items:on });
  var wa = ch.filter(function(c){ return c.k === 'wa'; })[0], other = ch.filter(function(c){ return c.k !== 'wa'; });
  var btns = (wa ? '<a class="btn p" href="' + esc(wa.href + '?text=' + encodeURIComponent(txt)) + '" target="_blank" rel="noopener" onclick="track(\'cta_click\',{channel:\'wa-accept\'})">Отправить в WhatsApp</a>' : '')
    + other.map(function(c){ return '<a class="btn g" href="' + esc(c.href) + '"' + (c.ext ? ' target="_blank" rel="noopener"' : '') + '>' + (c.k === 'phone' ? 'Позвонить' : esc(c.t)) + '</a>'; }).join('')
    + '<button class="btn g" onclick="copyApprove()">Скопировать сообщение</button>';
  b.innerHTML = '<b>' + plural(on, 'позиция', 'позиции', 'позиций') + ' на ' + money(total()) + '</b> — ' + esc(F.brand) + ', ' + SYS_NAME[F.system]
    + (DATA.variants ? ', вариант «' + esc(DATA.variants[vi].title) + '»' : '') + '.<br>Отправьте этот состав ' + (C.name ? 'менеджеру (' + esc(C.name) + ')' : 'нам') + ' — по нему подготовим договор.'
    + '<div class="okact">' + btns + '</div>';
  b.classList.add('show'); b.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block:'center' });
};
window.copyApprove = function(){ var t = approveText();
  if(navigator.clipboard) navigator.clipboard.writeText(t).then(function(){ toast('Сообщение скопировано — вставьте его в мессенджер'); }).catch(function(){ toast('Не удалось скопировать'); }); };
window.fq = function(b){ b.parentNode.classList.toggle('open'); };
window.go = function(id){ document.getElementById(id).scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); };
var tt; function toast(m){ var el = document.getElementById('toastEl'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(function(){ el.classList.remove('show'); }, 3200); }
window.toast = toast;

/* ============ 6. СТАРТ: KP_CONFIG от платформы либо демо ============ */
function boot(cfg){
  cfg.num = cfg.num || '0915'; cfg.date = cfg.date || '15.09.2026'; cfg.until = cfg.until || '24.09.2026'; cfg.discount = cfg.discount || 0;
  load(cfg);
  document.getElementById('hNum').textContent = 'КП № ' + cfg.num; document.getElementById('hDate').textContent = cfg.date; document.getElementById('hUntil').textContent = cfg.until;
  document.getElementById('hAddr').textContent = 'Натяжной потолок' + (cfg.addr ? ' · ' + cfg.addr : '');
  vi = 0;
  renderAll();
}
window.loadDemo = function(key){ var d = DEMOS.filter(function(x){ return x.key === key; })[0]; if(d) boot(JSON.parse(JSON.stringify(d))); };
if(CFG && (CFG.items || CFG.variants)){ document.getElementById('demoBox').style.display = 'none'; boot(CFG); }
else if(CFG){
  /* платформа пока не передала смету: показываем условный пример без чужих адресов и без селектора демо */
  document.getElementById('demoBox').style.display = 'none';
  var smp = JSON.parse(JSON.stringify(DEMOS[0])); delete smp.addr; delete smp.client; smp.num = CFG.num || '—'; if(CFG.until) smp.until = CFG.until;
  boot(smp); document.getElementById('hAddr').textContent = 'Пример сметы · ваша появится здесь после замера';
}
else {
  var sel = document.getElementById('demoSel');
  sel.innerHTML = DEMOS.map(function(d){ return '<option value="' + d.key + '">' + d.title + '</option>'; }).join('');
  var h = location.hash.replace(/^#/, '').split('&').map(function(p){ return p.split('='); }).filter(function(p){ return p[0] === 'demo'; })[0];
  if(h && DEMOS.some(function(d){ return d.key === h[1]; })) sel.value = h[1];
  loadDemo(sel.value);
}
if('IntersectionObserver' in window){
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin:'0px 0px -8% 0px', threshold:.06 });
  document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
} else document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('in'); });

})();
