/* ====== Конструктор Mini-App · admin.js ====== */

const API_BASE = (window.API_BASE || '').replace(/\/+$/,''); // без хвостового /
const $ = sel => document.querySelector(sel);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn, {passive:true});

const PRESETS = {
  beer:   { promo:[{title:'Craft Beer', sub:'Кто мы, где мы', cta:'О нас'}], category:'beer' },
  coffee: { promo:[{title:'Coffee To Go', sub:'Горячо, быстро', cta:'О нас'}], category:'coffee' },
  flowers:{ promo:[{title:'Bloom Studio', sub:'Букеты каждый день', cta:'О нас'}], category:'bouquets' }
};

const GAMES = {
  flappy: { title:'Bumblebee', engine:'embedded', score_unit:'pts' }
};

const S = {
  app_id:'', vertical:'beer',
  brand:{ name:'', color:'#2F6FED', sub:'' },
  positions:[],
  loyalty:{ slots:6, demo_pin:'1111' },
  blocks:{ hero:true, promo:true, menuGrid:true, loyaltyCard:true, stampShelf:true, bonusWheel:true, profile:true },
  game:{ code:'flappy', attempts_daily:20 },
};

const PV = { device:'360', tgChrome:true, demo:true, tab:'/' };

function demoTgId(){
  let id = localStorage.getItem('demo_tg_id');
  if (!id){ id = String(Math.floor(Math.random()*1e9)); localStorage.setItem('demo_tg_id', id); }
  return id;
}

/* ---------- API helper (через воркер) ---------- */
async function api(path, params={}){
  const u = new URL(API_BASE);
  u.searchParams.set('endpoint', path);
  // «пингуем» как демо-пользователь
  u.searchParams.set('tg_id', demoTgId());
  Object.entries(params).forEach(([k,v]) => v!=null && u.searchParams.set(k, v));
  const r = await fetch(u.toString());
  return r.json();
}

/* ---------- Утилиты ---------- */
function slug(s){ return String(s||'').toLowerCase().replace(/[^\w]+/g,'_').replace(/^_+|_+$/g,''); }
function chipToggle(el){
  const on = el.getAttribute('aria-pressed') === 'true';
  el.setAttribute('aria-pressed', (!on).toString());
}
function collectBlocksOrder(){
  // базовый фиксированный порядок, включаем только отмеченные
  const order = ['hero','promo','menuGrid','loyaltyCard','stampShelf','bonusWheel','profile'];
  return order.filter(k => S.blocks[k]);
}

/* ---------- Blueprint ---------- */
function makeBlueprint(){
  const name  = $('#brand_name').value.trim() || (S.vertical==='coffee'?'Coffee To Go': S.vertical==='flowers'?'Bloom Studio':'Beer Club');
  const color = $('#brand_color').value.trim() || '#2F6FED';
  const subtitle = $('#brand_sub').value.trim() || (S.vertical==='coffee'?'Горячо, быстро, по-домашнему':'Свежие сорта, бонусы и призы');

  const home = collectBlocksOrder().slice();
  const wantGame = !!S.game.code;

  if (wantGame){
    if (!home.includes('gamesPicker')){
      const pos = Math.max(home.indexOf('menuGrid'),0)+1;
      home.splice(pos, 0, 'gamesPicker');
    }
    if (!home.includes('leaderboard')){
      const pos = Math.max(home.indexOf('gamesPicker'),0)+1;
      home.splice(pos, 0, 'leaderboard');
    }
  }else{
    ['gamesPicker','leaderboard'].forEach(b=>{ const i=home.indexOf(b); if (i>=0) home.splice(i,1); });
  }

  const routes = [
    { path:'/',            title:'Главная',   icon:'home',    blocks: home },
    { path:'/tournament',  title:'Турнир',    icon:'cup',     blocks: ['leaderboard'] },
    { path:'/play',        title:'Играть',    icon:'gamepad', blocks: wantGame ? ['gamesPicker'] : [] },
    { path:'/bonuses',     title:'Бонусы',    icon:'gift',    blocks: (S.blocks.bonusWheel||S.blocks.stampShelf) ? ['bonusWheel','stampShelf'] : [] },
    { path:'/profile',     title:'Профиль',   icon:'user',    blocks: ['profile'] },
  ];

  const bp = {
    app:   { name, theme:{ brand: color }, subtitle },
    nav:   { type:'tabs', routes: routes.map(r=>({ path:r.path, title:r.title, icon:r.icon })) },
    routes: routes.map(r=>({ path:r.path, blocks:r.blocks })),
    blocks: {
      hero:        { props:{ title: (S.vertical==='coffee'?'Кофе рядом с вами':'Заходи на дегустацию'), subtitle } },
      promo:       { props:{ items: PRESETS[S.vertical]?.promo || [] } },
      menuGrid:    { props:{ category: PRESETS[S.vertical]?.category || $('#menu_cat').value.trim() || 'beer' } },
      loyaltyCard: { props:{ slots: Number($('#loyalty_slots').value||6) } },
      stampShelf:  { props:{} },
      bonusWheel:  { props:{} },
      profile:     { props:{} },
      gamesPicker: { props:{ layout:'list', showCoins:true, games: S.game.code ? [S.game.code] : [] } },
      leaderboard: { props:{ modes:['daily','all'], game:'auto' } }
    },
    dicts: {},
    games: {}
  };

  if (S.game.code){
    const gcat = GAMES[S.game.code] || {};
    bp.games[S.game.code] = {
      enabled:true,
      title: gcat.title || S.game.code,
      engine:gcat.engine || 'embedded',
      score_unit:gcat.score_unit || 'pts',
      attempts_daily: Number($('#game_attempts').value||20),
    };
  }

  return bp;
}

/* ---------- Preview URL ---------- */
function makeMiniUrl({ app_id, preview='draft' }){
  const base = location.origin;                   // твой GitHub Pages
  const api  = API_BASE;
  const u = new URL(base + '/mini/index.html');
  u.searchParams.set('app_id', app_id);
  u.searchParams.set('preview', preview==='live'?'live':'draft');
  if (api) u.searchParams.set('api_base', api);
  u.searchParams.set('preview_full', '1');
  u.searchParams.set('dev', '1');
  if (PV.demo) u.searchParams.set('demo', '1');
  if (PV.tgChrome) u.searchParams.set('tg_chrome', '1');
  if (PV.tab && PV.tab !== '/') u.searchParams.set('path', PV.tab);
  u.searchParams.set('tg', demoTgId());
  return u.toString();
}

function applyPreviewSizing(){
  const fr = $('#frame');
  fr.parentElement.classList.toggle('w100', PV.device==='100%');
  fr.style.width = (PV.device==='100%') ? '100%' : (PV.device+'px');
}

function buildPreviewUrl(){
  const app_id = ($('#app_id').value.trim() || slug($('#brand_name').value||'app'));
  const url = makeMiniUrl({ app_id, preview:'draft' });
  $('#prev_url').textContent = url;
  $('#frame').src = url;
  applyPreviewSizing();
}

/* ---------- Handlers ---------- */
function bindAccordion(){
  $('#acc').addEventListener('click', (e)=>{
    const head = e.target.closest('.acc__head');
    if (!head) return;
    head.parentElement.classList.toggle('open');
  });
}

function bindControls(){
  // верх
  on($('#app_id'),'input', buildPreviewUrl);
  on($('#vertical'),'change', e=>{ S.vertical = e.target.value; buildPreviewUrl(); });
  // бренд
  ['brand_name','brand_color','brand_sub'].forEach(id => on($( '#'+id ), 'input', buildPreviewUrl));
  // меню
  on($('#add_pos'),'click', ()=>{
    const pos = {
      cat: $('#menu_cat').value.trim(),
      title: $('#menu_title').value.trim(),
      sub: $('#menu_sub').value.trim(),
      price: Number($('#menu_price').value||0)
    };
    if (pos.title){ S.positions.push(pos); $('#pos_count').textContent = `${S.positions.length} позиций`; }
  });
  // лояльность
  on($('#loyalty_slots'),'input', e=>{ S.loyalty.slots = Number(e.target.value||6); buildPreviewUrl(); });
  on($('#demo_pin'),'input', e=>{ S.loyalty.demo_pin = e.target.value.trim(); });

  // блоки
  $('#block_tabs').addEventListener('click', e=>{
    const b = e.target.closest('.tab'); if(!b) return;
    const key = b.dataset.block; chipToggle(b);
    S.blocks[key] = (b.getAttribute('aria-pressed') === 'true');
    buildPreviewUrl();
  });

  // игры
  on($('#game_code'),'change', e=>{ S.game.code = e.target.value || ''; buildPreviewUrl(); });
  on($('#game_attempts'),'input', ()=> buildPreviewUrl());

  // превью-панель
  on($('#pv_device'),'change', e=>{ PV.device = e.target.value; applyPreviewSizing(); });
  on($('#pv_tgchrome'),'change', e=>{ PV.tgChrome = e.target.checked; buildPreviewUrl(); });
  on($('#pv_demo'),'change', e=>{ PV.demo = e.target.checked; buildPreviewUrl(); });
  on($('#pv_tab'),'change', e=>{ PV.tab = e.target.value; buildPreviewUrl(); });
  on($('#open_separate'),'click', ()=>{ window.open($('#prev_url').textContent, '_blank'); });

  // действия
  on($('#save_draft'),'click', saveDraft);
  on($('#preview_btn'),'click', buildPreviewUrl);
  on($('#publish_btn'),'click', publishLive);
}

async function saveDraft(){
  const app_id = ($('#app_id').value.trim() || slug($('#brand_name').value||'app'));
  const bp = makeBlueprint();
  const r = await api('/admin/blueprint_save', { app_id, doc: JSON.stringify(bp) });
  toast(r.ok? 'Черновик сохранён':'Ошибка сохранения', r.ok);
  buildPreviewUrl();
}
async function publishLive(){
  const app_id = ($('#app_id').value.trim() || slug($('#brand_name').value||'app'));
  const r = await api('/admin/publish', { app_id });
  toast(r.ok? 'Опубликовано в LIVE':'Ошибка публикации', r.ok);
}

function toast(msg, ok=false){
  const t = document.createElement('div');
  t.className = 'notice'; t.style.borderColor = ok?'rgba(55,214,122,.45)':'rgba(255,107,107,.45)';
  t.textContent = msg;
  const host = document.body; host.appendChild(t);
  setTimeout(()=> t.remove(), 2200);
}

/* ---------- Init ---------- */
function init(){
  $('#api_hint').textContent = API_BASE ? API_BASE : 'API не задан (window.API_BASE)';
  // дефолты
  $('#brand_color').value = S.brand.color;
  $('#game_code').value = S.game.code;
  // выставим aria-pressed для чипов блоков
  Array.from($('#block_tabs').querySelectorAll('.tab')).forEach(b=>{
    const key = b.dataset.block; b.setAttribute('aria-pressed', !!S.blocks[key]);
  });

  bindAccordion();
  bindControls();
  buildPreviewUrl();
}

document.addEventListener('DOMContentLoaded', init);
