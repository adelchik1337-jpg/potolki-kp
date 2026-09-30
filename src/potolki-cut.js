/* ============ 3. РАЗРЕЗ ИЗ СМЕТЫ ============
   Фрагмент potolki-app.js (маркер CUT_JS). Схема нужна бригаде монтажа: на экране её нет (тело #cut-body скрыто),
   в печати/PDF платформы #cut-body раскрывается правилом @media print. Цвета — токены темы через var(--kp-*) прямо в атрибутах SVG (hex в макете нет). */
function firstOf(roles){ return ITEMS.filter(function(it){ return it.on && roles.indexOf(it.role) >= 0; })[0]; }
function buildCut(){
  var cutSvg = el('cutSvg'), leg = el('leg');
  var F = flags(), s = '', L = [], n = 0;
  var INK = 'var(--kp-text)', BLUE = 'var(--kp-accent)', LED = 'var(--kp-accent)', PROF = 'var(--kp-field)', SHEET = 'var(--kp-surface)';
  var Wv = 900, Hv = 300, slabH = 34, yS = 118;           /* yS — уровень полотна */
  var hasCorn = F.cornice, xR = hasCorn ? 640 : Wv - 18;  /* правая граница полотна */
  var canvas = firstOf(['canvas']), prof = firstOf(['standard','shadow','seamless','float']), mold = firstOf(['molding']);
  var spot = firstOf(['spot','fixture','spot-install']), line = firstOf(['line']), track = firstOf(['track']), chand = firstOf(['chandelier']);
  var corn = firstOf(['cornice']), led = firstOf(['led']), corners = firstOf(['corners']), seamC = firstOf(['seamless-canvas']);
  function num(x, y){ n++; return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + BLUE + '"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--kp-accent-contrast)" font-family="inherit">' + n + '</text>'; }
  function legend(it, extra){ L.push({ k:n, it:it, extra:extra }); }
  function lead(x1, y1, x2, y2){ return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="' + BLUE + '" stroke-width="1" fill="none"/>'; }

  /* фон, плита, стена */
  s += '<defs><pattern id="hh" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="var(--kp-border)" stroke-width="1"/></pattern></defs>';
  s += '<rect x="0" y="0" width="' + Wv + '" height="' + slabH + '" fill="var(--kp-rule)"/><rect x="0" y="0" width="' + Wv + '" height="' + slabH + '" fill="url(#hh)"/>';
  s += '<text x="12" y="22" font-size="11" font-family="inherit" fill="var(--kp-muted)">плита перекрытия</text>';
  s += '<rect x="0" y="' + slabH + '" width="18" height="' + (Hv - slabH) + '" fill="var(--kp-rule)" stroke="var(--kp-border)"/>';
  if(!hasCorn) s += '<rect x="' + (Wv - 18) + '" y="' + slabH + '" width="18" height="' + (Hv - slabH) + '" fill="var(--kp-rule)" stroke="var(--kp-border)"/>';

  /* примыкание слева (и справа, если нет ниши) */
  var xL = 18;
  function profileAt(x, dir){ /* dir 1 — слева, -1 — справа */
    var g = '';
    if(F.system === 'shadow'){ g += '<path d="M' + x + ' ' + (yS - 14) + ' h' + (26 * dir) + ' v40 h' + (-10 * dir) + ' v-24 h' + (-8 * dir) + ' v24 h' + (-8 * dir) + ' Z" fill="' + PROF + '" stroke="' + INK + '"/>';
      g += '<rect x="' + (dir > 0 ? x : x - 8) + '" y="' + (yS - 6) + '" width="8" height="12" fill="var(--kp-text)"/>'; }
    else if(F.system === 'seamless'){ g += '<path d="M' + x + ' ' + (yS - 8) + ' h' + (20 * dir) + ' v28 h' + (-8 * dir) + ' v-18 h' + (-12 * dir) + ' Z" fill="' + PROF + '" stroke="' + INK + '"/>'; }
    else if(F.system === 'float'){ g += '<path d="M' + x + ' ' + (yS - 18) + ' h' + (30 * dir) + ' v48 h' + (-8 * dir) + ' v-32 h' + (-14 * dir) + ' v32 h' + (-8 * dir) + ' Z" fill="' + PROF + '" stroke="' + INK + '"/>';
      g += '<rect x="' + (dir > 0 ? x + 10 : x - 20) + '" y="' + (yS - 2) + '" width="10" height="5" fill="' + LED + '"/>';
      g += '<path d="M' + (dir > 0 ? x + 8 : x - 8) + ' ' + (yS + 4) + ' L' + x + ' ' + (Hv - 10) + '" stroke="' + LED + '" stroke-width="12" opacity=".3" stroke-linecap="round"/>'; }
    else { g += '<rect x="' + (dir > 0 ? x : x - 26) + '" y="' + (yS - 14) + '" width="26" height="30" fill="' + PROF + '" stroke="' + INK + '"/>';
      if(mold || F.system === 'standard') g += '<rect x="' + (dir > 0 ? x : x - 28) + '" y="' + (yS - 4) + '" width="28" height="9" rx="2" fill="var(--kp-surface)" stroke="' + BLUE + '"/>'; }
    return g;
  }
  s += profileAt(xL, 1);
  if(!hasCorn) s += profileAt(Wv - 18, -1);
  var xP0 = F.system === 'seamless' ? 18 : 44, xP1 = hasCorn ? xR : (F.system === 'seamless' ? Wv - 18 : Wv - 44);

  /* полотно */
  s += '<path d="M' + xP0 + ' ' + yS + ' H' + xP1 + '" stroke="' + INK + '" stroke-width="6"/><path d="M' + xP0 + ' ' + yS + ' H' + xP1 + '" stroke="' + SHEET + '" stroke-width="4"/>';
  if(hasCorn) s += '<circle cx="' + (xR - 2) + '" cy="' + yS + '" r="4" fill="' + INK + '"/>';

  /* выноски слева: профиль, полотно */
  s += num(30, yS + 60) + lead(30, yS + 50, 30, yS + 18); legend(prof || { name:'Профиль по периметру', price:0, unit:'м' }, F.system === 'standard' && mold ? 'со вставкой' : null);
  var xCanvasTag = 150; s += num(xCanvasTag, yS + 60) + lead(xCanvasTag, yS + 50, xCanvasTag, yS + 4); legend(canvas || { name:'Полотно', price:0, unit:'м²' }, seamC ? 'бесщелевая кромка ' + moneyP(seamC.price) + '/м²' : null);

  /* свет: раскладываем по доступной ширине */
  var lights = []; if(spot) lights.push('spot'); if(line) lights.push('line'); if(track) lights.push('track'); if(chand) lights.push('chand');
  var span0 = 240, span1 = hasCorn ? 560 : Wv - 120, step = lights.length ? (span1 - span0) / lights.length : 0;
  lights.forEach(function(kind, i){
    var x = span0 + step * (i + .5);
    if(kind === 'spot'){ s += '<rect x="' + (x - 22) + '" y="' + (yS - 52) + '" width="44" height="46" fill="var(--kp-text)"/><rect x="' + (x - 30) + '" y="' + (yS - 6) + '" width="60" height="10" rx="2" fill="var(--kp-border)" stroke="' + INK + '"/>';
      s += '<path d="M' + x + ' ' + (yS + 8) + ' L' + (x - 22) + ' ' + (yS + 62) + ' M' + x + ' ' + (yS + 8) + ' L' + (x + 22) + ' ' + (yS + 62) + '" stroke="' + LED + '" stroke-width="18" opacity=".28" stroke-linecap="round"/>';
      s += num(x, yS - 70) + lead(x, yS - 60, x, yS - 52); legend(spot, F.spots ? Math.round(F.spots) + ' шт' : null); }
    if(kind === 'line'){ s += '<rect x="' + (x - 34) + '" y="' + (yS - 30) + '" width="68" height="34" fill="var(--kp-text)"/><rect x="' + (x - 36) + '" y="' + (yS - 3) + '" width="72" height="7" fill="var(--kp-surface)" stroke="' + INK + '"/>';
      s += '<path d="M' + (x - 30) + ' ' + (yS + 8) + ' L' + (x - 40) + ' ' + (yS + 70) + ' M' + (x + 30) + ' ' + (yS + 8) + ' L' + (x + 40) + ' ' + (yS + 70) + '" stroke="' + LED + '" stroke-width="14" opacity=".22" stroke-linecap="round"/>';
      s += num(x, yS - 48) + lead(x, yS - 38, x, yS - 30); legend(line, fq2(qty(line)) + ' м'); }
    if(kind === 'track'){ s += '<rect x="' + (x - 40) + '" y="' + (yS - 26) + '" width="80" height="30" fill="var(--kp-text)"/><rect x="' + (x - 42) + '" y="' + (yS - 2) + '" width="84" height="6" fill="var(--kp-text)"/>';
      s += '<rect x="' + (x - 8) + '" y="' + (yS + 4) + '" width="16" height="22" rx="3" fill="var(--kp-text)"/><path d="M' + x + ' ' + (yS + 26) + ' L' + (x - 14) + ' ' + (yS + 70) + ' M' + x + ' ' + (yS + 26) + ' L' + (x + 14) + ' ' + (yS + 70) + '" stroke="' + LED + '" stroke-width="12" opacity=".25" stroke-linecap="round"/>';
      s += num(x, yS - 44) + lead(x, yS - 34, x, yS - 26); legend(track, fq2(qty(track)) + ' м'); }
    if(kind === 'chand'){ s += '<rect x="' + (x - 14) + '" y="' + (yS - 40) + '" width="28" height="34" fill="var(--kp-field)"/><rect x="' + (x - 20) + '" y="' + (yS - 6) + '" width="40" height="9" rx="2" fill="var(--kp-border)" stroke="' + INK + '"/>';
      s += '<path d="M' + x + ' ' + (yS + 3) + ' v30" stroke="' + INK + '" stroke-width="2"/><path d="M' + (x - 26) + ' ' + (yS + 33) + ' Q' + x + ' ' + (yS + 62) + ' ' + (x + 26) + ' ' + (yS + 33) + ' Z" fill="var(--kp-surface)" stroke="' + INK + '"/>';
      s += num(x, yS - 58) + lead(x, yS - 48, x, yS - 40); legend(chand, Math.round(F.chand) + ' шт'); }
  });

  /* ниша под шторы справа */
  if(hasCorn){
    s += '<rect x="' + (xR + 60) + '" y="' + slabH + '" width="80" height="44" fill="var(--kp-field)"/><text x="' + (xR + 68) + '" y="' + (slabH + 28) + '" font-size="10" fill="var(--kp-accent-contrast)" font-family="inherit">брус</text>';
    s += '<path d="M' + xR + ' ' + (yS - 32) + ' H' + (xR + 140) + ' V' + (yS + 32) + ' H' + (xR + 105) + ' V' + (yS - 8) + ' H' + xR + ' Z" fill="' + PROF + '" stroke="' + INK + '" stroke-width="1.2"/>';
    s += '<rect x="' + (xR + 6) + '" y="' + (yS - 4) + '" width="92" height="14" fill="var(--kp-text)"/>';
    if(led) s += '<rect x="' + (xR + 6) + '" y="' + (yS + 10) + '" width="92" height="6" fill="' + LED + '"/><path d="M' + (xR + 52) + ' ' + (yS + 18) + ' v' + (Hv - yS - 30) + '" stroke="' + LED + '" stroke-width="60" opacity=".18"/>';
    s += '<rect x="' + (xR + 105) + '" y="' + (yS + 32) + '" width="20" height="8" fill="var(--kp-text)"/>';
    s += '<path d="M' + (xR + 105) + ' ' + (yS + 40) + ' V' + Hv + ' H' + Wv + ' V' + (yS + 40) + ' Z" fill="var(--kp-muted)" opacity=".6"/><rect x="' + (xR + 135) + '" y="' + (yS + 40) + '" width="' + (Wv - xR - 135) + '" height="' + (Hv - yS - 40) + '" fill="var(--kp-text)"/>';
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
    return '<span><i>' + e.k + '</i><b>' + escT(it.name) + '</b><em>' + (it.price ? moneyP(it.price) + '/' + esc(unitLabel(it.unit)) : '') + (e.extra ? NBSP + '· ' + escT(e.extra) : '') + '</em></span>'; }).join('');
}
