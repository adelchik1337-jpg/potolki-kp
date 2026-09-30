/* ============ 4г. ОФФЕР ПРОДАВЦА ============
   Фрагмент potolki-app.js: build.py вставляет его на место маркера-комментария OFFER_JS внутри той же функции-обёртки
   (отдельным файлом, чтобы app.js не рос). KP_CONFIG.offer платформа шлёт только макету с меткой data-kp-offer:
   {outcome, included[], proof{since,objects,reviews}, guarantee{kind,term,text,clause}, bonuses[{name,value ₽}], capacity{text}}.
   Каждая часть рисуется своей секцией и только при заполненном поле: пустое поле — секции нет вовсе (setSec убирает её из DOM).
   Куда что идёт: outcome → подзаголовок обложки (renderCover); included (+ автосписок из сметы) → «В цену входит»; proof → доказательства;
   guarantee → плита и одна строка над кнопкой; kind:'none' («Гарантии нет») → плиты и строки нет; bonuses → бонусы; capacity → таблетка загрузки
   (в печати скрыта). «Как в договоре» без срока, текста и пункта — всё равно гарантия: плита с текстом по умолчанию (решение основателя 30.09).
   Строки приходят с сервера с типографикой lib/typograf.ts, но она не склеивает «без», «под», «при», «для» и не знает диапазонов «1–2» —
   поэтому страница прогоняет их через typo() ещё раз (операция повторно безопасна). */
var GAR_KINDS = ['contract','unconditional','conditional','anti'];   /* none обрабатывается отдельно (noGuarantee), незнакомый вид — молча выбрасываем */
var GLINE = document.getElementById('gLine');   /* строка гарантии над кнопкой: вставляется и убирается целиком */
var GAR_DEFAULT = 'Сроки гарантии на полотно и на монтаж прописываются в договоре. Светильники меняются без снятия полотна.';
function str(v){ return typeof v === 'string' ? v.trim() : typeof v === 'number' && isFinite(v) ? String(v) : ''; }
/* для сравнения строк неразрывные пробелы сервера («за 3 дня») приравниваем к обычным и сводим регистр; без знаков препинания */
function plain(t){ return String(t).replace(/ /g, ' ').toLowerCase(); }
function words(t){ return ' ' + plain(t).replace(/[^a-zа-яё0-9]+/g, ' ').trim() + ' '; }
/* берём известные ключи и только строки/числа, пустое и чужое молча выбрасываем; ключа нет или всё пусто → null */
function normOffer(o){
  if(!o || typeof o !== 'object') return null;
  var r = { outcome:str(o.outcome), included:[], proof:{}, guarantee:null, noGuarantee:false, bonuses:[], capacity:'' }, seen = {}, g = o.guarantee, p = o.proof, c = o.capacity;
  (Array.isArray(o.included) ? o.included : []).forEach(function(s){ var t = str(s), k = plain(t); if(t && !seen[k] && r.included.length < 6){ seen[k] = 1; r.included.push(t); } });
  if(p && typeof p === 'object') ['since','objects','reviews'].forEach(function(k){ var n = numOf(p[k]); if(n > 0) r.proof[k] = Math.round(n); });
  if(g && typeof g === 'object' && g.kind === 'none') r.noGuarantee = true;   /* менеджер выбрал «Гарантии нет»: плиты и строки у кнопки нет */
  else if(g && typeof g === 'object' && GAR_KINDS.indexOf(g.kind) >= 0) r.guarantee = { kind:g.kind, term:str(g.term), text:str(g.text), clause:str(g.clause) };
  (Array.isArray(o.bonuses) ? o.bonuses : []).forEach(function(b){ var n = b && typeof b === 'object' ? str(b.name) : '', v = n ? numOf(b.value) : 0;
    if(n && v > 0 && r.bonuses.length < 3) r.bonuses.push({ name:n, value:v }); });
  if(c && typeof c === 'object') r.capacity = str(c.text);
  return r.outcome || r.included.length || Object.keys(r.proof).length || r.guarantee || r.noGuarantee || r.bonuses.length || r.capacity ? r : null;
}
/* одна строка гарантии — как guaranteeLine в lib/offer.ts (текст тот же, отличие только в неразрывных пробелах: тире не уезжает
   в начало строки, «п. 5.2 договора» и «24 месяца» не рвутся): плита, строка над кнопкой и блочное КП не разойдутся между собой */
function guaranteeLine(g){
  if(!g) return null;
  if(g.kind === 'anti') return g.text ? 'Возврата нет' + NBSP + '— ' + g.text : null;   /* голое «возврата нет» отталкивает — без причины строки нет */
  var head = g.term ? 'Гарантия ' + g.term.replace(/(\d) /g, '$1' + NBSP) : 'Гарантия';
  if(g.clause){ var c = g.clause.replace(/^(п\.|пп\.|пункт) /i, '$1' + NBSP);
    return head + NBSP + '— ' + (/договор/i.test(c) ? c : c + NBSP + 'договора'); }   /* «п. 5.2 договора» целиком — слово не дублируем */
  return g.kind === 'contract' ? head + NBSP + '— как в' + NBSP + 'договоре' : head;
}
/* «В цену входит»: сначала строки продавца, затем то, что следует из сметы (монтаж, закладные, вывоз, свет); одно и то же дважды не пишем, всего до шести */
function autoIncluded(){
  if(EMPTY) return [];
  var fx = cnt(['fixture']) > 0, out = ['Монтаж', 'Закладные под свет', fx ? 'Светильники с лампами' : 'Вывоз обрезков и упаковки'];
  if(!fx && cnt(['spot-install', 'chandelier-install']) > 0) out.push('Светильники и лампы — ваши, ставим и подключаем');
  return out;
}
/* «Не входит» — только когда в смете есть ниша под шторы, а карниза для штор нет: иначе фраза спорит со строкой сметы
   («Не входит: карнизы» рядом с «Встроенный карниз … 56 400 ₽» — покупатель не поймёт, входит ли карниз в цену) */
function nicheWithoutRail(){
  var rows = ITEMS.filter(function(it){ return it.on && it.role === 'cornice'; });
  return rows.length > 0 && !rows.some(function(it){ return /карниз|гардин/i.test(it.name); });
}
function renderIncluded(){
  var O = DATA.offer, lines = O ? O.included.map(typo) : [], have = lines.map(words);
  autoIncluded().forEach(function(t){
    var w = words(t); if(lines.length >= 6 || have.some(function(h){ return h.indexOf(w) >= 0; })) return;   /* «Профиль, полотно, монтаж» уже говорит про монтаж */
    have.push(w); lines.push(typo(t));
  });
  setSec('offer-included', lines.length > 0); if(!lines.length) return;
  el('incl').innerHTML = lines.map(function(t){ return '<li><span class="kp-check">' + ic('check') + '</span><span class="kp-item">' + esc(t) + '</span></li>'; }).join('');
  /* исключение — не сноска, а строка того же кегля со знаком «минус»: деньги, которые читаются мимоходом, превращаются в жалобу */
  var cor = !EMPTY && nicheWithoutRail(), x = el('inclx'); x.hidden = !cor; if(cor) el('inclxT').textContent = typo('Карнизы для штор в нишу — отдельно');
}
function cityIn(c){ return { 'Новороссийск':'Новороссийске' }[c] || ''; }
function renderProof(){
  var P = DATA.offer && DATA.offer.proof, keys = P ? Object.keys(P) : [];
  setSec('offer-proof', keys.length > 0); if(!keys.length) return;
  var co = profile().company || {}, ci = cityIn(co.city), h = '';
  if(keys.length === 1 && P.objects){
    h = '<div class="kp-card pv-proof"><p class="kp-num kp-tab">' + group(P.objects) + '</p><div class="pv-proof-t"><p class="kp-h3">' + escT(pluralW(P.objects, 'объект', 'объекта', 'объектов') + (ci ? ' в ' + ci : '')) + '</p>'
      + (SEC.works && SEC.works.parentNode ? '<p class="kp-body kp-muted">' + escT('Фото и видео с объектов — ниже, в разделе «Наши работы»') + '</p>' : '') + '</div></div>';
  } else {
    var it = [];
    if(P.since) it.push([String(P.since), 'работаем с этого года']);
    if(P.objects) it.push([group(P.objects), pluralW(P.objects, 'объект', 'объекта', 'объектов')]);
    if(P.reviews) it.push([group(P.reviews), pluralW(P.reviews, 'отзыв', 'отзыва', 'отзывов')]);
    h = '<div class="kp-stats kp-stats--' + it.length + '">' + it.map(function(x){ return '<div class="kp-stat"><p class="kp-num kp-tab">' + x[0] + '</p><p class="kp-lead">' + escT(x[1]) + '</p></div>'; }).join('') + '</div>';
  }
  SEC['offer-proof'].innerHTML = h;
}
function renderGuarantee(){
  var O = DATA.offer, g = O && O.guarantee, line = g ? guaranteeLine(g) : null;
  setSec('offer-guarantee', !!line);
  /* текст под строкой: своё объяснение продавца; у «как в договоре» без него — текст по умолчанию; у анти-гарантии причина уже в самой строке */
  var t = g ? (g.kind === 'anti' ? '' : g.text || (g.kind === 'contract' ? GAR_DEFAULT : '')) : '', gt = el('gText');
  el('gCard').textContent = typo(line || ''); gt.textContent = typo(t); gt.hidden = !t;
  /* та же строка — над кнопкой в «Состав подходит?»; нет гарантии — элемента в DOM нет */
  var gl = GLINE, plate = SEC.accept.querySelector('.kp-accept');
  if(line){ gl.lastElementChild.textContent = typo(line); if(!gl.parentNode) plate.parentNode.insertBefore(gl, plate); }
  else if(gl.parentNode) gl.parentNode.removeChild(gl);
}
function renderBonus(){
  var B = DATA.offer ? DATA.offer.bonuses : [], sum = 0;
  setSec('offer-bonus', B.length > 0); if(!B.length) return;
  B.forEach(function(b){ sum += b.value; });
  el('h-bonus').textContent = typo('Бонусы на ' + moneyP(sum) + ' — без доплаты');
  /* цена по каталогу приглушённо: бонус — не позиция к оплате, жирная цена читалась бы как ещё одна строка сметы */
  el('bon').innerHTML = B.map(function(b){ return '<li class="kp-bn-li"><span class="kp-item">' + escT(b.name) + '</span><span class="kp-bn"><span class="kp-tag">без' + NBSP + 'доплаты</span><span class="kp-sm kp-muted kp-tab">' + moneyP(b.value) + ' по' + NBSP + 'каталогу</span></span></li>'; }).join('');
}
/* загрузка и срок цены: две честные строки; capacity в печати не показываем никогда, срок цены печатается */
function renderCapacity(){
  var O = DATA.offer, pills = '';
  if(O && O.capacity) pills += '<p class="kp-pill kp-noprint" id="hCap"><span class="kp-dot" aria-hidden="true"></span>' + escT(O.capacity) + '</p>';
  if(DATA.untilLong && !EMPTY) pills += '<p class="kp-pill" id="hValid"><span class="kp-dot" aria-hidden="true"></span>' + escT('Цена действует до ' + DATA.untilLong + ' — потом пересчитаем по новому прайсу') + '</p>';
  setSec('offer-capacity', !!pills); el('strip').innerHTML = pills;
}
function renderOffer(){
  [renderProof, renderGuarantee, renderBonus, renderCapacity].forEach(function(f){ try{ f(); }catch(e){ if(window.console) console.error(e); } });
}
