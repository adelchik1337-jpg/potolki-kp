/* ============ 4г. ОФФЕР ПРОДАВЦА ============
   Фрагмент potolki-app.js: build.py вставляет его на место маркера-комментария OFFER_JS внутри той же функции-обёртки
   (отдельным файлом, чтобы app.js не рос). KP_CONFIG.offer платформа шлёт только макету с меткой data-kp-offer:
   {outcome, included[], proof{since,objects,reviews}, guarantee{kind,term,text,clause}, bonuses[{name,value ₽}], capacity{text}}.
   В разметке заранее ничего нет — без оффера страница остаётся прежней до байта; каждая часть рисуется только при
   заполненном поле, заглушек нет. Куда что идёт: outcome → подзаголовок первого экрана; included → плашки после
   «В цену входит»; proof.objects → лид «Объекты»; capacity → полоса под «Цена действительна до» (в печати скрыта);
   guarantee → карточка в «Что важно знать» и одна строка у кнопки «Согласовать»; kind:'none' («Гарантии нет») → карточки гарантии и строки
   у кнопки нет вовсе; bonuses → под итогом сметы. Строки приходят с сервера уже с типографикой (неразрывные пробелы) — кладём как есть. */
var GAR_KINDS = ['contract','unconditional','conditional','anti'];   /* none обрабатывается отдельно (noGuarantee), незнакомый вид — молча выбрасываем */
var NBSP = '\u00a0';
function str(v){ return typeof v === 'string' ? v.trim() : typeof v === 'number' && isFinite(v) ? String(v) : ''; }
/* для сравнения строк неразрывные пробелы сервера («за\u00a03 дня») приравниваем к обычным и сводим регистр */
function plain(t){ return String(t).replace(/\u00a0/g, ' ').toLowerCase(); }
/* берём известные ключи и только строки/числа, пустое и чужое молча выбрасываем; ключа нет или всё пусто → null.
   «Как в договоре» без срока, текста и пункта — дефолт, а не заполнение (то же правило, что isOfferEmpty в lib/offer.ts) */
function normOffer(o){
  if(!o || typeof o !== 'object') return null;
  var r = { outcome:str(o.outcome), included:[], proof:{}, guarantee:null, noGuarantee:false, bonuses:[], capacity:'' }, seen = {}, g = o.guarantee, p = o.proof, c = o.capacity;
  (Array.isArray(o.included) ? o.included : []).forEach(function(s){ var t = str(s), k = plain(t); if(t && !seen[k] && r.included.length < 6){ seen[k] = 1; r.included.push(t); } });
  if(p && typeof p === 'object') ['since','objects','reviews'].forEach(function(k){ var n = numOf(p[k]); if(n > 0) r.proof[k] = Math.round(n); });
  if(g && typeof g === 'object' && g.kind === 'none') r.noGuarantee = true;   /* менеджер выбрал «Гарантии нет»: встроенная карточка «Договор» уходит */
  else if(g && typeof g === 'object' && GAR_KINDS.indexOf(g.kind) >= 0){ g = { kind:g.kind, term:str(g.term), text:str(g.text), clause:str(g.clause) };
    r.guarantee = g.kind !== 'contract' || g.term || g.text || g.clause ? g : null; }
  (Array.isArray(o.bonuses) ? o.bonuses : []).forEach(function(b){ var n = b && typeof b === 'object' ? str(b.name) : '', v = n ? numOf(b.value) : 0;
    if(n && v > 0 && r.bonuses.length < 3) r.bonuses.push({ name:n, value:v }); });
  if(c && typeof c === 'object') r.capacity = str(c.text);
  return r.outcome || r.included.length || Object.keys(r.proof).length || r.guarantee || r.noGuarantee || r.bonuses.length || r.capacity ? r : null;
}
/* одна строка гарантии — как guaranteeLine в lib/offer.ts (текст тот же, отличие только в неразрывных пробелах: тире не уезжает
   в начало строки, «п. 5.2 договора» и «24 месяца» не рвутся): карточка, кнопка и блочное КП не разойдутся между собой */
function guaranteeLine(g){
  if(!g) return null;
  if(g.kind === 'anti') return g.text ? 'Возврата нет' + NBSP + '— ' + g.text : null;   /* голое «возврата нет» отталкивает — без причины строки нет */
  var head = g.term ? 'Гарантия ' + g.term.replace(/(\d) /g, '$1' + NBSP) : 'Гарантия';
  if(g.clause){ var c = g.clause.replace(/^(п\.|пп\.|пункт) /i, '$1' + NBSP);
    return head + NBSP + '— ' + (/договор/i.test(c) ? c : c + NBSP + 'договора'); }   /* «п. 5.2 договора» целиком — слово не дублируем */
  return g.kind === 'contract' ? head + NBSP + '— как в' + NBSP + 'договоре' : head;
}
function outcomeHtml(){ var O = DATA.offer; return O && O.outcome ? '<b>' + esc(O.outcome) + '</b>' : ''; }
/* строки «Что входит» из оффера — плашками после автоматического списка; то, что смета уже назвала, второй раз не пишем */
function inclExtra(inc){ var O = DATA.offer, ext = O ? O.included.filter(function(s){ return inc.indexOf(plain(s)) < 0; }) : [];
  return ext.length ? '<span class="incx">' + ext.map(function(s){ return '<span>' + esc(s) + '</span>'; }).join('') + '</span>' : ''; }
/* «120 объектов с 2015 года. » — только объекты (и год, если есть): отзывов в этом макете нет, число не выдумываем */
function proofLead(){ var P = DATA.offer && DATA.offer.proof; return P && P.objects ? plural(P.objects, 'объект', 'объекта', 'объектов') + (P.since ? ' с ' + P.since + ' года' : '') + '. ' : ''; }
/* элемент оффера живёт, только пока есть поле: создаём при первом рендере, убираем, если поля нет — заглушек нет */
function slot(id, want, make){ var el = document.getElementById(id); if(!want){ if(el) el.parentNode.removeChild(el); return null; } if(!el){ el = make(); el.id = id; } return el; }
function renderOffer(){
  var O = DATA.offer, g = O && O.guarantee, line = guaranteeLine(g), sum = 0;
  var cap = slot('hCap', O && O.capacity, function(){ var d = document.createElement('div'), v = document.getElementById('hValid'); d.className = 'valid capline'; v.parentNode.insertBefore(d, v.nextSibling); return d; });
  if(cap) cap.textContent = O.capacity;
  /* карточку «Гарантия» ищем по заголовку, не по id — id в разметке изменил бы страницу без оффера. Крупно — срок (нет → «Договор»
     остаётся), текст — из оффера (нет → прежний); у анти-гарантии текст — та же строка, что у кнопки, иначе причина без вопроса */
  var card = (g || (O && O.noGuarantee)) && Array.prototype.filter.call(document.querySelectorAll('.know .k'), function(k){ var b = k.querySelector('b'); return b && b.textContent === 'Гарантия'; })[0];
  if(card && O.noGuarantee){ var kn = card.parentNode; kn.removeChild(card); kn.classList.add('k3'); }   /* «Гарантии нет»: карточки нет, сетка из трёх колонок без дыры */
  else if(card){ if(g.term && g.kind !== 'anti') card.querySelector('.kv').textContent = g.term; if(g.text) card.querySelector('p').textContent = g.kind === 'anti' ? line : g.text; }   /* у анти-гарантии срока в строке нет — крупное слово не подменяем */
  var bon = slot('bon', O && O.bonuses.length, function(){ var d = document.createElement('div'), r = document.getElementById('sRows'); d.className = 'bon'; r.parentNode.insertBefore(d, r.nextSibling); return d; });
  if(bon){ O.bonuses.forEach(function(b){ sum += b.value; });
    bon.innerHTML = '<b>Бонусы на ' + moneyP(sum) + ' — без доплаты</b>' + O.bonuses.map(function(b){ return '<span>' + esc(b.name) + ' <em>(' + moneyP(b.value) + ')</em></span>'; }).join(''); }
  var gl = slot('gLine', line, function(){ var d = document.createElement('small'), a = document.querySelector('#accept .acb'); d.className = 'gline'; a.insertBefore(d, a.firstChild); return d; });
  if(gl) gl.textContent = line;
}
