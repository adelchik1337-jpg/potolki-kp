/* ============ 4б. КОМПАНИЯ, ФОТО И ВИДЕО ============
   Фрагмент potolki-app.js (маркер PHOTOS_JS внутри той же функции-обёртки). */
/* Что общее для компании (логотип, команда, видео, библиотека фото) — один раз в макете или в загрузках OpMax.
   Контакты — у каждого менеджера свои: KP_CONFIG.contacts, те же поля, что у блока «Контакты» в OpMax. */
var LAYOUT = window.DEMO_PROFILE || {};
var TAG_RX = { shadow:/тенев/, float:/парящ/, seamless:/бесщел/, line:/лини/, track:/трек/, cornice:/карниз|штор|ниш/, led:/подсвет|засвет|контур/,
  spot:/точечн|светильник|спот/, chandelier:/люстр/, insert:/вставк/, gloss:/глянц/, satin:/сатин/, matte:/матов/ };
var TAG_RU = { shadow:'теневой профиль', float:'парящий потолок', seamless:'бесщелевое примыкание', line:'световые линии', track:'трек',
  cornice:'ниша под шторы', led:'подсветка', spot:'точечный свет', chandelier:'люстра' };
function tagsOf(name){ var n = String(name || '').toLowerCase(), t = []; for(var k in TAG_RX) if(TAG_RX[k].test(n)) t.push(k); return t; }
function capOf(name){ var c = String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s*\d+$/, '').trim();
  return /^(img|dsc|dcim|pxl|photo|image|screenshot|whatsapp|снимок|фото|объект|работ)/i.test(c) || (c.match(/[a-zа-яё]/gi) || []).length < 3 ? '' : c; }
/* загрузки платформы → фото с тегами, видео, команда */
function fromMedia(media){
  var o = { photos:[], video:null, team:null, poster:null };
  /* фото узла этого КП уже стоит на плитке — в «Объектах» и как «команда»/«обложка» его не показываем (платформа тоже фильтрует, но не полагаемся) */
  var np = DATA && DATA.nodePhotos || {}, mine = Object.keys(np).map(function(k){ return np[k]; });
  (media || []).forEach(function(m){
    if(!m || typeof m.url !== 'string') return;
    if(mine.indexOf(m.url) >= 0) return;
    var n = String(m.name || '').toLowerCase(), mime = String(m.mime || '');
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
  var c = CFG || {}, m = Array.isArray(c.media) && c.media.length ? fromMedia(c.media) : { photos:[] };
  var ph = (Array.isArray(c.photos) ? c.photos : []).map(function(x){ return typeof x === 'string' ? { src:x, cap:'', tags:[], score:8 } : x; });
  /* разметку логотипа (<svg>) берём только из самого макета; из конфига — только ссылку на картинку */
  var cc = Object.assign({}, c.company); ['logo','mark'].forEach(function(k){ if(cc[k] && /^\s*</.test(cc[k])) delete cc[k]; });
  return {
    company: Object.assign({}, LAYOUT.company, cc),
    /* контакты личные: на платформе без подстановок, демо-контакты — только в демо */
    contacts: CFG ? (CFG.demo === true ? {} : cleanContacts(CFG.contacts)) : cleanContacts(LAYOUT.contacts),
    team: c.team || m.team || LAYOUT.team || null,
    video: c.video || m.video || LAYOUT.video || null,
    /* свои фото этого КП — вперёд, библиотека компании — следом */
    photos: ph.concat(m.photos, LAYOUT.photos || []).filter(function(p){ return p && p.src !== COVER; })
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
/* обложка лежит в разметке, а не в библиотеке: на «Наших работах» её второй раз не показываем */
var COVER = (function(){ var i = document.getElementById('coverImg'); return i ? i.getAttribute('src') : ''; })();
/* ленивая загрузка — только для ссылок: data:-картинка уже в странице, lazy ничего не экономит, а в PDF (печать без прокрутки) давал пустую плашку */
var PRINT = /[?&]print=1/.test(location.search);   /* PDF платформы — страница с ?print=1: картинки грузим сразу */
function lazy(src){ return PRINT || /^data:/.test(String(src)) ? '' : ' loading="lazy"'; }
var GAL = [], gi = 0, LB = GAL, PSIG = '';   /* LB — что листает лайтбокс сейчас: «Объекты» (GAL) или плитки узлов (NODE_GAL) */
function renderPhotos(){
  var P = profile(), F = flags(), want = wantTags(F), vid = P.video && P.video.src ? P.video : null;
  /* фото, уже стоящие на плитках узлов, во второй раз не показываем — если после этого хватает на сетку */
  var nodeSrcs = NODE_GAL.map(function(x){ return x.src; }), free = P.photos.filter(function(p){ return nodeSrcs.indexOf(p.src) < 0; });
  var r = pickPhotos(free.length >= 6 ? free : P.photos, want, vid ? 5 : 6), grid = el('photos');
  GAL = r.gallery;
  setSec('works', !!(r.list.length || vid));   /* ни фото, ни ролика — секции нет, заглушек получателю не показываем */
  /* сетку строим только если состав кадров изменился: правка сметы не должна перезапускать ролик и сбрасывать паузу */
  var sig = (vid ? vid.src + '|' + (vid.poster || '') : '') + '#' + r.list.map(function(p){ return p.src; }).join('|');
  if(sig !== PSIG){
    PSIG = sig; var html = '';
    if(vid) html += '<figure class="kp-photo pv-video' + (vid.poster ? ' hasposter' : '') + '"><div class="pv-vbox"><video id="objVid" muted loop playsinline preload="none"' + (vid.poster ? ' poster="' + esc(vid.poster) + '"' : '') + ' data-src="' + esc(vid.src) + '"></video>'
      + '<button type="button" class="pv-vctl" id="vBtn" data-act="tglVid" aria-label="Смотреть видео с наших объектов"><span class="pv-play">' + ic('play') + '</span></button></div>'
      + '<figcaption>' + escT(vid.caption || 'Видео с наших объектов') + '</figcaption></figure>';
    r.list.forEach(function(p, k){
      html += '<figure class="kp-photo"><button type="button" class="pv-vbtn" data-act="openLb" data-arg="' + k + '" aria-label="Открыть фото' + (p.cap ? ': ' + esc(p.cap) : '') + '">'
        + '<img src="' + esc(p.src) + '" alt="' + esc(p.cap || 'Объект') + '" width="900" height="1200"' + lazy(p.src) + '></button>' + (p.cap ? '<figcaption>' + escT(p.cap) + '</figcaption>' : '') + '</figure>';
    });
    grid.innerHTML = html; if(vid) setupVid();
  }
  var hit = r.hit.filter(function(t){ return TAG_RU[t]; }).slice(0, 4).map(function(t){ return TAG_RU[t]; });
  el('phLead').textContent = typo(hit.length ? 'Объекты, где есть то же, что в вашей смете: ' + listRu(hit) + '.' : 'Несколько объектов, которые мы сделали.');
  var more = el('phMore'); more.hidden = GAL.length <= r.list.length;
  more.innerHTML = 'Все фото объектов' + NBSP + '— ' + GAL.length + ic('arr-r', 'kp-i--20');
}
/* видео: грузим и крутим, только когда блок на экране; без автозапуска при «уменьшить движение». Кнопка на всей рамке: «смотреть» по центру, при показе — «пауза» в углу */
var vio;
function vidUi(playing){
  var f = document.querySelector('.pv-video'), b = el('vBtn'); if(!f || !b) return;
  f.classList.toggle('is-playing', playing);
  b.setAttribute('aria-label', playing ? 'Пауза' : 'Смотреть видео с наших объектов');
  b.querySelector('.pv-play').innerHTML = ic(playing ? 'pause' : 'play');
}
function setupVid(){
  var v = el('objVid'); if(!v) return;
  v.addEventListener('playing', function(){ vidUi(true); }); v.addEventListener('pause', function(){ vidUi(false); });
  if(RM) return;
  if(!('IntersectionObserver' in window)){ v.src = v.dataset.src; v.play().catch(function(){}); return; }
  if(vio) vio.disconnect();
  vio = new IntersectionObserver(function(es){ es.forEach(function(e){
    if(e.isIntersecting){ if(!v.src) v.src = v.dataset.src; if(!v.dataset.user) v.play().catch(function(){}); }
    else if(!v.paused) v.pause(); }); }, { threshold:.25 });
  vio.observe(v);
}
function tglVid(){
  var v = el('objVid'); if(!v) return;
  if(!v.src) v.src = v.dataset.src;
  if(v.paused){ v.dataset.user = ''; v.play().catch(function(){}); } else { v.dataset.user = '1'; v.pause(); }
}
/* лайтбокс: стрелки, Esc, свайп; фокус входит в окно и возвращается на кадр, с которого его открыли */
var LBFROM = null;
function showLb(){ var p = LB[gi]; if(!p) return; el('lbImg').src = p.src; el('lbImg').alt = p.cap || '';
  el('lbCap').innerHTML = esc(p.cap || '') + '<small>' + (gi + 1) + ' из ' + LB.length + '</small>'; }
/* открытый из «Объектов» лайтбокс листает только объекты, открытый с плитки узла — только узлы: списки не смешиваем */
function openLb(k){ LB = GAL; openAt(k); }
function openNode(k){ LB = NODE_GAL; openAt(k); }
function openAt(k){
  if(!LB.length) return; gi = clamp(k, 0, LB.length - 1); showLb(); LBFROM = document.activeElement;
  var lb = el('lb'); lb.hidden = false; document.body.style.overflow = 'hidden'; var x = lb.querySelector('.x'); if(x) x.focus();
}
function closeLb(){
  el('lb').hidden = true; document.body.style.overflow = '';
  if(LBFROM && LBFROM.focus){ try{ LBFROM.focus({ preventScroll:true }); }catch(e){} } LBFROM = null;
}
function stepLb(d){ if(!LB.length) return; gi = (gi + d + LB.length) % LB.length; showLb(); }
document.addEventListener('keydown', function(e){
  var lb = el('lb'); if(lb.hidden) return;
  if(e.key === 'Escape') closeLb(); if(e.key === 'ArrowLeft') stepLb(-1); if(e.key === 'ArrowRight') stepLb(1);
  if(e.key === 'Tab'){ var bs = lb.querySelectorAll('button'), f = bs[0], l = bs[bs.length - 1];   /* Tab не уходит под окно */
    if(e.shiftKey && document.activeElement === f){ e.preventDefault(); l.focus(); } else if(!e.shiftKey && document.activeElement === l){ e.preventDefault(); f.focus(); } }
});
/* PDF на платформе делается печатью страницы — перед печатью догружаем всё ленивое */
window.addEventListener('beforeprint', function(){ document.querySelectorAll('img[loading="lazy"]').forEach(function(im){ im.loading = 'eager'; }); });
(function(){ var lb = el('lb'), x0 = null;
  lb.addEventListener('click', function(e){ if(e.target === lb) closeLb(); });
  lb.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, { passive:true });
  lb.addEventListener('touchend', function(e){ if(x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 40) stepLb(dx < 0 ? 1 : -1); x0 = null; }); })();
