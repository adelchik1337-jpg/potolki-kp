/* Фрагмент potolki-app.js (маркер CLASSIFY_JS): классификатор строк сметы и словари подписей. */
/* ============ 1. КЛАССИФИКАТОР: имя строки из Excel → категория и визуальная роль ============ */
function classify(name){
  var n = name.toLowerCase().replace(/ё/g, 'е');
  if(/полотно/.test(n)) return { cat:'canvas', role: /бесщелев/.test(n) ? 'seamless-canvas' : 'canvas',
    brand: /bauf/.test(n) ? 'Bauf' : /halead/.test(n) ? 'Halead' : /teqtum/.test(n) ? 'Teqtum KM2'
      : /msd/.test(n) && /classic/.test(n) ? 'MSD Classic' : /msd/.test(n) && /premium/.test(n) ? 'MSD Premium' : 'полотно',
    width: /до 6/.test(n) ? 6 : /до 5/.test(n) ? 5 : 3.6 };
  /* принадлежности световой линии и трека — отдельные строки, не метры линии */
  if(/экран|поворот/.test(n) && /светов/.test(n)) return { cat:'light', role:'extra' };
  /* углы теневого и парящего профиля считаются штуками — до проверки «парящ»/«тенев» */
  if(/^угол\s|обработк\S* углов|углов\S* обработк/.test(n)) return { cat:'profile', role:'corners' };
  if(/подсветка|светодиодн/.test(n)) return { cat: /карниз|ниш/.test(n) ? 'cornice' : 'light', role:'led' };   /* «Подсветка карниза» — в группе карниза, как в макете */
  if(/светов\S* лини/.test(n)) return { cat:'light', role:'line' };
  if(/трек/.test(n)) return { cat:'light', role:'track' };
  if(/люстр/.test(n)) return { cat:'light', role: /установка/.test(n) ? 'chandelier-install' : 'chandelier' };
  if(/точки освещения|точек освещения/.test(n)) return { cat:'light', role:'spot' };
  if(/установка.*светильник|накладн\S* светильник|подвесн/.test(n)) return { cat:'light', role:'spot-install' };
  if(/светильник|лампа/.test(n)) return { cat:'light', role:'fixture' };
  if(/карниз|гардин|ниш/.test(n)) return { cat:'cornice', role:'cornice' };
  if(/бесщелев/.test(n)) return { cat:'profile', role:'seamless' };
  if(/парящ/.test(n)) return { cat:'profile', role:'float' };
  if(/раздел|отсечн/.test(n)) return { cat:'profile', role:'divider' };
  if(/теневой|kraab|бизон/.test(n)) return { cat:'profile', role:'shadow' };
  if(/стеновой/.test(n)) return { cat:'profile', role:'standard' };
  if(/молдинг|вставка/.test(n)) return { cat:'profile', role:'molding' };
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
  line:'Световая линия заподлицо с полотном: профиль монтируется в потолок, свет идёт полосой. Считается за метр.',
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
