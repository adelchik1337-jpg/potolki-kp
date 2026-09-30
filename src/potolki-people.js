/* ============ 4в. КОНТАКТЫ МЕНЕДЖЕРА ============
   Фрагмент potolki-app.js (маркер PEOPLE_JS). */
/* контакты менеджера: только заполненные каналы — телефон, MAX, Telegram (WhatsApp не показываем) */
function digits(s){ var d = String(s || '').replace(/\D/g, ''); if(d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if(d.length === 10) d = '7' + d; return d; }
function isPhone(s){ var t = String(s || '').trim(), n = t.replace(/\D/g, '').length; return /^\+?[\d\s().-]+$/.test(t) && n >= 10 && n <= 12; }
/* номер — в одном виде, как бы менеджер его ни ввёл: 8 938 523-44-37 */
function phoneText(p){ var d = digits(p); return d.length === 11 && d[0] === '7' ? '8 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9) : String(p); }
function phoneIntl(p){ var d = digits(p); return d.length === 11 && d[0] === '7' ? '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9) : String(p).trim(); }
function telHref(p){ var d = digits(p); return 'tel:' + (d.length === 11 ? '+' : '') + d; }
/* из KP_CONFIG берём только известные поля-строки; whatsapp и прочее игнорируем */
function cleanContacts(c){
  var o = {}; if(!c || typeof c !== 'object') return o;
  ['name','role','phone','max','telegram'].forEach(function(k){ var v = c[k]; if(typeof v === 'number') v = String(v); if(typeof v === 'string' && v.trim()) o[k] = v.trim(); });
  return o;
}
function safePath(p){ try{ return encodeURI(decodeURI(p)); }catch(e){ return encodeURI(p); } }
/* MAX: ссылка max.ru/… (со схемой или без) → открываем; номер телефона → надёжной ссылки по номеру нет, карточка копирует номер */
function maxOf(v){
  var s = String(v).trim(), m;
  if(isPhone(s)) return { copy:phoneIntl(s), t:phoneText(s) };
  if((m = s.match(/^(?:https?:\/\/)?((?:[a-z0-9-]+\.)*max\.ru)(\/\S*)?$/i))) return { href:'https://' + m[1].toLowerCase() + safePath(m[2] || '/') };
  var nick = s.replace(/^@/, '');
  return /^[\w.-]{2,64}$/.test(nick) ? { href:'https://max.ru/' + encodeURIComponent(nick) } : null;
}
/* из KP_CONFIG берём только известные поля-строки; whatsapp и прочее игнорируем. Каналы: телефон, MAX, Telegram; у каждого подпись и ЗНАЧЕНИЕ (номер, @имя) */
function channels(C){
  var ch = [];
  if(C.phone && digits(C.phone).length >= 5) ch.push({ k:'phone', ic:'phone', href:telHref(C.phone), l:'Позвонить', v:phoneIntl(C.phone).replace(/ /g, NBSP) });
  if(C.max){ var mx = maxOf(C.max);
    if(mx && mx.copy) ch.push({ k:'max', ic:'chat', copy:mx.copy, l:'MAX', v:'Скопировать номер ' + mx.copy.replace(/ /g, NBSP) });
    else if(mx) ch.push({ k:'max', ic:'chat', href:mx.href, l:'MAX', v:'Написать в MAX', ext:1 }); }
  if(C.telegram){ var tg = String(C.telegram).trim().replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '').replace(/^@/, '');
    var tgPhone = isPhone(tg);
    if(tgPhone || /^[\w.+-]{2,64}$/.test(tg))
      ch.push({ k:'tg', ic:'tg', href:'https://t.me/' + (tgPhone ? '+' + digits(tg) : encodeURIComponent(tg)), l:'Telegram', v:tgPhone ? 'Написать в Telegram' : '@' + tg, ext:1 }); }
  return ch;
}
/* ссылка или кнопка «скопировать номер» — без on*-атрибутов: клики разбирает один общий обработчик (строгая CSP платформы) */
function chEl(c, cls, inner, trk, act){
  if(c.copy) return '<button type="button" class="' + cls + '" data-act="copyMax" data-arg="' + esc(c.copy) + '" data-track="' + trk + '">' + inner + '</button>';
  return '<a class="' + cls + '" href="' + esc(c.href) + '" data-track="' + trk + '"' + (act ? ' data-act="' + act + '"' : '') + (c.ext ? ' target="_blank" rel="noopener"' : '') + '>' + inner + '</a>';
}
/* обложка (знак и название), «Связаться с нами» (только при заполненных каналах), фото команды, подвал */
function renderPeople(){
  var P = profile(), C = P.contacts || {}, co = P.company || {}, ch = channels(C);
  /* знак — разметка только из самого макета (из конфига принимаем лишь ссылку на картинку); лабиринт знака — currentColor: читается на графите обложки */
  var mark = co.mark && /^\s*<svg/.test(co.mark) ? co.mark.replace(/fill="#1D2C38"/g, 'fill="currentColor"').replace('<svg', '<svg class="pv-mark" aria-hidden="true" focusable="false"') : '';
  var pic = !mark && co.logo && !/^\s*</.test(co.logo) ? '<img src="' + esc(co.logo) + '" alt="">' : '';
  el('brand').innerHTML = mark + pic + (co.name ? '<span>' + esc(co.name) + '</span>' : '');
  /* нет ни одного канала — блока нет вовсе: фото и подпись без единого способа связаться были бы тупиком */
  setSec('contacts', ch.length > 0);
  el('mgrLine').textContent = typo(C.name ? 'Ваш менеджер — ' + C.name + (C.role ? ', ' + C.role : '') : [co.name ? '«' + co.name + '»' : '', co.city].filter(Boolean).join(' · '));
  el('cts').innerHTML = ch.map(function(c){
    return chEl(c, 'kp-cbtn', '<span class="kp-cc">' + ic(c.ic) + '</span><span class="kp-ct"><span class="kp-cl">' + esc(c.l) + '</span><span class="kp-cv' + (c.k === 'phone' ? ' kp-tab' : '') + '">' + esc(c.v) + '</span></span>', c.k); }).join('');
  var tm = P.team, fig = el('team');
  if(tm && tm.photo){ var im = el('teamImg'); fig.hidden = false; if(im.getAttribute('src') !== tm.photo){ if(!/^data:/.test(tm.photo)) im.loading = 'lazy'; im.src = tm.photo; } im.alt = tm.caption || 'Команда';
    el('teamCap').textContent = typo(tm.caption || ''); }
  else fig.hidden = true;
  /* подвал: реквизиты «Название · ИНН N» — только если платформа прислала KP_CONFIG.requisites; выдуманных ИНН не печатаем */
  var rq = el('fReq'); rq.textContent = typo(DATA.requisites); rq.hidden = !DATA.requisites;
  el('fCo').textContent = typo([co.name ? '«' + co.name + '»' : '', co.city, co.what].filter(Boolean).join(' · '));
  var fp = [], fl = el('fLine');
  if(DATA.num) fp.push('КП' + NBSP + '№' + NBSP + DATA.num + (DATA.dateLong ? ' от ' + DATA.dateLong : '')); else if(DATA.dateLong) fp.push('КП от ' + DATA.dateLong);
  if(DATA.untilLong && !EMPTY) fp.push('цена действует до ' + DATA.untilLong);
  fl.textContent = typo(fp.join(' · ')); fl.hidden = !fp.length;
  /* заголовок вкладки на платформе ставит сама платформа — трогаем только в демо */
  if(co.name && !CFG) document.title = kpLabel() + ' · ' + co.name;
}
