/* ====== Конструктор Mini-App · admin.js — v2 autosave + layout + editable API ====== */
const $ = sel => document.querySelector(sel);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn, {passive:true});

/* ---------- Editable API_BASE (persisted) ---------- */
(function initApiBase(){
  const saved = localStorage.getItem('ADMIN_API_BASE') || window.API_BASE || '';
  window.API_BASE = saved;
  const el = document.getElementById('api_base_input');
  if (el){ el.value = saved; el.addEventListener('input', ()=>{
    window.API_BASE = el.value.trim().replace(/\/+$/,'');
    localStorage.setItem('ADMIN_API_BASE', window.API_BASE);
    $('#api_hint').textContent = window.API_BASE ? window.API_BASE : 'API не задан (window.API_BASE)';
    buildPreviewUrl();
  });}
})();

function apiBase(){ return (window.API_BASE || '').replace(/\/+$/,''); }
function demoTgId(){
  let id = localStorage.getItem('demo_tg_id');
  if (!id){ id = String(Math.floor(Math.random()*1e9)); localStorage.setItem('demo_tg_id', id); }
  return id;
}
async function api(path, params={}){
  const base = apiBase() || location.origin;
  const u = new URL(base);
  u.searchParams.set('endpoint', path);
  u.searchParams.set('tg_id', demoTgId());
  Object.entries(params).forEach(([k,v]) => v!=null && u.searchParams.set(k, v));
  const r = await fetch(u.toString());
  return r.json();
}
function debounce(fn, ms=700){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
const saveDraftDebounced = debounce(()=> saveDraft().catch(()=>{}), 700);

/* ---------- Presets / Games ---------- */
const PRESETS = {
  beer:   { promo:[{title:'Craft Beer', sub:'Кто мы, где мы', cta:'О нас'}], category:'beer',
            hero:{ title:'Заходи на дегустацию', sub:'Свежие сорта, бонусы и призы' } },
  coffee: { promo:[{title:'Coffee To Go', sub:'Горячо, быстро', cta:'О нас'}], category:'coffee',
            hero:{ title:'Кофе рядом с вами', sub:'Горячо, быстро, по-домашнему' } },
  flowers:{ promo:[{title:'Bloom Studio', sub:'Букеты каждый день', cta:'О нас'}], category:'bouquets',
            hero:{ title:'Цветы к любому случаю', sub:'Сборка за 15 минут' } }
};
const GAMES = { flappy: { title:'Bumblebee', engine:'embedded', score_unit:'pts' } };
const BUILTIN_THEMES = {
  'Demo Main': `
/* Demo Main — Mini-App Theme (extracted tokens) */
:root{
  --tabH: 64px;
  --navGap: 12px;
  --bg:#0b0c15; --text:#f4f6fa; --border:rgba(255,255,255,.10);
  --amber:#f9b24d; --green:#37d67a; --red:#ff6b6b; --blue:#3d7eff;
  --appW: 428px;
  --wrapPadX: 14px;
  --wrapPadTop: 16px;
}
*{ box-sizing:border-box }
img{ max-width:100%; display:block }
html,body{ height:100% }
body{
  margin:0; background:var(--bg); color:var(--text);
  font:16px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  overscroll-behavior: none;
}
@media (min-width:900px){ body{ display:grid; place-items:center; } }
.wrap{
  width:100%; max-width:1080px; margin:0 auto;
  min-height:100svh;
  padding:16px 14px calc(var(--tabH) + var(--navGap) + env(safe-area-inset-bottom,0px) + 22px);
}
@media (min-width:900px){
  .wrap{ max-width:var(--appW); padding:20px 14px calc(var(--tabH) + var(--navGap) + env(safe-area-inset-bottom,0px) + 22px); }
}
main>section, section.page{ display:none }
main>section.active, section.page.active{ display:block }

/* bottom tabs */
.btm-nav{
  position:fixed; left:0; right:0;
  bottom: calc(var(--navGap) + env(safe-area-inset-bottom, 0px));
  height: var(--tabH);
  z-index: 9999;
  display:grid; grid-template-columns:repeat(5,1fr); align-items:center;
  padding: 6px 6px 6px;
  background: rgba(10,12,14,.72);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.08);
  border-left:0; border-right:0; border-bottom:0;
  border-radius: 16px 16px 0 0;
}
.btm-nav .tab{
  height:100%; border:0; background:none; color:#dfe3e6; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
  font-size:11px; font-weight:700;
  filter: grayscale(.35) saturate(.8); opacity:.85;
  border-radius:14px; -webkit-tap-highlight-color:transparent;
}
.btm-nav .tab img{ width:24px; height:24px }
.btm-nav .tab:active{ transform: translateY(1px) }
.btm-nav .tab.active{ opacity:1; filter:none; color:#fff; position:relative }
.btm-nav .tab.active::before{
  content:""; position:absolute; inset:6px 10px 18px 10px; z-index:-1;
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
  border:1px solid rgba(255,255,255,.08); border-radius:12px;
}
@media (min-width:900px){
  .btm-nav{ left:50%; right:auto; width: var(--appW); transform: translateX(-50%); }
}

/* generic cards/typography */
.card{ background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:16px; padding:16px; }
.page-title{ margin:0 0 12px }
.h1{ font-weight:800; font-size:20px; margin:0 0 8px }
.muted-sm{ opacity:.8 }

/* hero block (full-bleed) */
.hero{ position: relative; margin: calc(-1 * var(--wrapPadTop)) calc(-1 * var(--wrapPadX)) 0 calc(-1 * var(--wrapPadX)); padding-top: env(safe-area-inset-top, 0px); background:#000; overflow:hidden; }
.hero__media{ width:100%; height: clamp(260px, 42vh, 460px); object-fit: cover; display:block; }
.hero::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:120px; background:linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg) 100%); }

/* promo row */
.promo{ display:grid; grid-template-columns:48px 1fr auto; align-items:center; gap:12px; padding:14px; background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:16px; }
.promo__icon{ width:48px; height:48px; border-radius:12px; display:grid; place-items:center; background:rgba(255,255,255,.06); overflow:hidden }
.promo__icon img{ width:28px; height:28px; display:block }
.promo__title{ font-weight:800 }
.promo__sub{ opacity:.8; font-size:13px; margin-top:2px }
.promo__btn{ height:36px; padding:0 14px; border-radius:999px; border:0; background:linear-gradient(180deg,#f9b24d,#f29117); color:#16181e; font-weight:900; cursor:pointer; }
.promo__btn:active{ transform: translateY(1px) }

/* list-card tight (игры и т.п.) */
.list-card .list-head{ font:800 16px/1.2 Inter,system-ui; margin-bottom:8px }
.list{ display:grid; gap:8px }
.list-card.tight .list{ margin-left:-16px; margin-right:-16px }
.list-card.tight .list__item{ display:grid; grid-template-columns:44px 1fr auto; gap:12px; align-items:center; padding:10px 16px; border-radius:14px; }
.list-card.tight .list__item:hover{ background: rgba(255,255,255,.04) }
.list-card.tight .list__icon{ width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:rgba(255,255,255,.06); overflow:hidden }
.list-card.tight .list__icon img{ width:22px; height:22px; display:block }
.list__text{ display:grid; gap:4px }
.list__title{ font-weight:800 }
.list__sub{ opacity:.8; font-size:13px }
.list__chev-btn{ width:36px; height:36px; display:grid; place-items:center; background:transparent; color:inherit; font-size:18px; cursor:pointer; }
.list__chev-btn:active{ transform:translateY(1px) }
`,
  'SalesGenius Main': `
/* Demo Main — Mini-App Theme (extracted tokens) */
:root{
  --tabH: 64px;
  --navGap: 12px;
  --bg:#0b0c15; --text:#f4f6fa; --border:rgba(255,255,255,.10);
  --amber:#f9b24d; --green:#37d67a; --red:#ff6b6b; --blue:#3d7eff;
  --appW: 428px;
  --wrapPadX: 14px;
  --wrapPadTop: 16px;
}
*{ box-sizing:border-box }
img{ max-width:100%; display:block }
html,body{ height:100% }
body{
  margin:0; background:var(--bg); color:var(--text);
  font:16px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  overscroll-behavior: none;
}
@media (min-width:900px){ body{ display:grid; place-items:center; } }
.wrap{
  width:100%; max-width:1080px; margin:0 auto;
  min-height:100svh;
  padding:16px 14px calc(var(--tabH) + var(--navGap) + env(safe-area-inset-bottom,0px) + 22px);
}
@media (min-width:900px){
  .wrap{ max-width:var(--appW); padding:20px 14px calc(var(--tabH) + var(--navGap) + env(safe-area-inset-bottom,0px) + 22px); }
}
main>section, section.page{ display:none }
main>section.active, section.page.active{ display:block }

/* bottom tabs */
.btm-nav{
  position:fixed; left:0; right:0;
  bottom: calc(var(--navGap) + env(safe-area-inset-bottom, 0px));
  height: var(--tabH);
  z-index: 9999;
  display:grid; grid-template-columns:repeat(5,1fr); align-items:center;
  padding: 6px 6px 6px;
  background: rgba(10,12,14,.72);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.08);
  border-left:0; border-right:0; border-bottom:0;
  border-radius: 16px 16px 0 0;
}
.btm-nav .tab{
  height:100%; border:0; background:none; color:#dfe3e6; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
  font-size:11px; font-weight:700;
  filter: grayscale(.35) saturate(.8); opacity:.85;
  border-radius:14px; -webkit-tap-highlight-color:transparent;
}
.btm-nav .tab img{ width:24px; height:24px }
.btm-nav .tab:active{ transform: translateY(1px) }
.btm-nav .tab.active{ opacity:1; filter:none; color:#fff; position:relative }
.btm-nav .tab.active::before{
  content:""; position:absolute; inset:6px 10px 18px 10px; z-index:-1;
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
  border:1px solid rgba(255,255,255,.08); border-radius:12px;
}
@media (min-width:900px){
  .btm-nav{ left:50%; right:auto; width: var(--appW); transform: translateX(-50%); }
}

/* generic cards/typography */
.card{ background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:16px; padding:16px; }
.page-title{ margin:0 0 12px }
.h1{ font-weight:800; font-size:20px; margin:0 0 8px }
.muted-sm{ opacity:.8 }

/* hero block (full-bleed) */
.hero{ position: relative; margin: calc(-1 * var(--wrapPadTop)) calc(-1 * var(--wrapPadX)) 0 calc(-1 * var(--wrapPadX)); padding-top: env(safe-area-inset-top, 0px); background:#000; overflow:hidden; }
.hero__media{ width:100%; height: clamp(260px, 42vh, 460px); object-fit: cover; display:block; }
.hero::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:120px; background:linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg) 100%); }

/* promo row */
.promo{ display:grid; grid-template-columns:48px 1fr auto; align-items:center; gap:12px; padding:14px; background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:16px; }
.promo__icon{ width:48px; height:48px; border-radius:12px; display:grid; place-items:center; background:rgba(255,255,255,.06); overflow:hidden }
.promo__icon img{ width:28px; height:28px; display:block }
.promo__title{ font-weight:800 }
.promo__sub{ opacity:.8; font-size:13px; margin-top:2px }
.promo__btn{ height:36px; padding:0 14px; border-radius:999px; border:0; background:linear-gradient(180deg,#f9b24d,#f29117); color:#16181e; font-weight:900; cursor:pointer; }
.promo__btn:active{ transform: translateY(1px) }

/* list-card tight (игры и т.п.) */
.list-card .list-head{ font:800 16px/1.2 Inter,system-ui; margin-bottom:8px }
.list{ display:grid; gap:8px }
.list-card.tight .list{ margin-left:-16px; margin-right:-16px }
.list-card.tight .list__item{ display:grid; grid-template-columns:44px 1fr auto; gap:12px; align-items:center; padding:10px 16px; border-radius:14px; }
.list-card.tight .list__item:hover{ background: rgba(255,255,255,.04) }
.list-card.tight .list__icon{ width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:rgba(255,255,255,.06); overflow:hidden }
.list-card.tight .list__icon img{ width:22px; height:22px; display:block }
.list__text{ display:grid; gap:4px }
.list__title{ font-weight:800 }
.list__sub{ opacity:.8; font-size:13px }
.list__chev-btn{ width:36px; height:36px; display:grid; place-items:center; background:transparent; color:inherit; font-size:18px; cursor:pointer; }
.list__chev-btn:active{ transform:translateY(1px) }
`
};


/* ---------- State ---------- */
const S = {
  app_id:'', vertical:'beer',
  brand:{ name:'', color:'#2F6FED', sub:'' , skin:'dark-glass'},
  positions:[],
  loyalty:{ slots:6, demo_pin:'1111' },
  blocks:{ hero:true, promo:true, menuGrid:true, loyaltyCard:true, stampShelf:true, bonusWheel:true, profile:true },
  game:{ code:'flappy', attempts_daily:20 },
  template:{ key:'', html:'', sections:[] }
};
const PV = { device:'360', tgChrome:true, demo:true, tab:'/' };

/* ---------- UI utils ---------- */
function slug(s){ return String(s||'').toLowerCase().replace(/[^\w]+/g,'_').replace(/^_+|_+$/g,''); }
function chipToggle(el){ const on = el.getAttribute('aria-pressed') === 'true'; el.setAttribute('aria-pressed', (!on).toString()); }
function collectBlocksOrder(){
  const order = ['hero','promo','menuGrid','loyaltyCard','stampShelf','bonusWheel','profile','gamesPicker','leaderboard'];
  const filtered = order.filter(k => S.blocks[k] || (k==='gamesPicker'||k==='leaderboard') && !!S.game.code);
  if (!!S.game.code){
    const base = filtered.filter(k=> !['gamesPicker','leaderboard'].includes(k));
    const posAfterMenu = Math.max(base.indexOf('menuGrid'),0)+1;
    base.splice(posAfterMenu, 0, 'gamesPicker', 'leaderboard');
    return base;
  }
  return filtered.filter(k=>!['gamesPicker','leaderboard'].includes(k));
}

/* ---------- Built-in templates ---------- */
function applyBuiltinTemplate(key){
  const T = (window.BUILTIN_TEMPLATES || {})[key];
  if (!T){ toast('Шаблон не найден', false); return; }
  S.template.key = key;
  S.template.html = T.html || '';
  S.template.sections = Array.isArray(T.sections) ? T.sections.map(x=>({...x})) : [];
  renderTplSummary();
  renderTplList();
  buildPreviewUrl();
  saveDraftDebounced();
}
function renderTplSummary(){
  const sum = S.template.sections.map((s,i)=> `${i+1}. ${s.key}`).join('\n');
  $('#tpl_summary').textContent = S.template.sections.length
    ? `Шаблон: ${S.template.key}. Секций: ${S.template.sections.length}\n${sum}`
    : (S.template.key ? `Шаблон: ${S.template.key}. Секции не найдены.` : 'Шаблон не выбран.');
}
function renderTplList(){
  const host = $('#tpl_list'); if (!host) return;
  const arr = S.template.sections || [];
  host.innerHTML = arr.map((s,i)=>`
    <div class="card tpl-card" data-key="${s.key}">
      <div class="tpl-row">
        <div class="tpl-controls">
          <button class="btn btn-ghost" data-act="up">↑</button>
          <button class="btn btn-ghost" data-act="down">↓</button>
          <label class="chip"><input type="checkbox" data-act="toggle" ${s.hidden?'':'checked'}> Показать</label>
        </div>
        <div class="tpl-name">${s.key}</div>
        <button class="btn" data-act="edit">Редактировать</button>
      </div>
    </div>
  `).join('');
}
function moveSection(idx, dir){
  const a = S.template.sections; const j = idx + dir;
  if (j<0 || j>=a.length) return;
  const [x] = a.splice(idx,1); a.splice(j,0,x);
  renderTplList(); buildPreviewUrl(); saveDraftDebounced();
}
function bindTplList(){
  const host = $('#tpl_list'); if (!host) return;
  host.addEventListener('click', (e)=>{
    const card = e.target.closest('.tpl-card'); if (!card) return;
    const key = card.dataset.key;
    const i = S.template.sections.findIndex(s=>s.key===key);
    if (i<0) return;
    const act = e.target.dataset.act;
    if (act==='up')   return moveSection(i, -1);
    if (act==='down') return moveSection(i, +1);
    if (act==='toggle'){
      const cb = card.querySelector('input[type="checkbox"][data-act="toggle"]');
      S.template.sections[i].hidden = !(cb && cb.checked);
      buildPreviewUrl(); saveDraftDebounced(); return;
    }
    if (act==='edit'){
      openTplEditor(i); saveDraftDebounced(); return;
    }
  });
}
function openTplEditor(i){
  const s = S.template.sections[i];
  const html = prompt('HTML секции (без <script>/<style>)', s.inner);
  if (html==null) return;
  s.inner = html;
  buildPreviewUrl();
}

/* ---------- Blueprint ---------- */
function makeBlueprint(){
  const pr = PRESETS[S.vertical]||{};
  const name  = $('#brand_name').value.trim() || (S.vertical==='coffee'?'Coffee To Go': S.vertical==='flowers'?'Bloom Studio':'Beer Club');
  const color = $('#brand_color').value.trim() || '#2F6FED';
  const subtitle = $('#brand_sub').value.trim() || (pr.hero?.sub || 'Свежие сорта, бонусы и призы');
  const skin  = $('#brand_skin').value || 'dark-glass';
  const heroCover  = $('#hero_cover').value.trim();
  const heroAlign  = $('#hero_align').value;
  const heroFit    = $('#hero_fit').value;
  const themeCss   = $('#theme_css')?.value || '';

  const wantGame = !!S.game.code;

  // базовые маршруты (как в мини-аппе)
  const routesBase = [
    { path:'/',            title:'Главная',   icon:'home',    blocks: collectBlocksOrder() },
    { path:'/tournament',  title:'Турнир',    icon:'cup',     blocks: wantGame ? ['leaderboard'] : [] },
    { path:'/play',        title:'Играть',    icon:'gamepad', blocks: wantGame ? ['gamesPicker'] : [] },
    { path:'/bonuses',     title:'Бонусы',    icon:'gift',    blocks: (S.blocks.bonusWheel||S.blocks.stampShelf) ? ['bonusWheel','stampShelf'] : [] },
    { path:'/profile',     title:'Профиль',   icon:'user',    blocks: ['profile'] },
  ];

  // каркас блюпринта
  const bp = {
    app:   { name, theme:{ brand: color, skin, css: themeCss }, subtitle },
    nav:   { type:'tabs', position:'bottom', routes: routesBase.map(r=>({ path:r.path, title:r.title, icon:r.icon })) },
    routes: routesBase.map(r=>({ path:r.path, blocks:r.blocks })),
    blocks: {
      hero:        { props:{ title: ($('#hero_title').value.trim() || (pr.hero?.title || 'Заходи на дегустацию')),
                             subtitle, cover: heroCover, align:heroAlign, coverFit:heroFit } },
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
      enabled:true, title: gcat.title || S.game.code,
      engine:gcat.engine || 'embedded', score_unit:gcat.score_unit || 'pts',
      attempts_daily: Number($('#game_attempts').value||20),
    };
  }

  // === ВСТРОЕННЫЙ ШАБЛОН ===
  // Если выбран ключ шаблона (S.template.key), то главная СТРОГО из html__ секций.
  if (S.template && S.template.key){
    const vis = (S.template.sections||[]).filter(s=>!s.hidden);
    const htmlBlockKeys = vis.map(s => s.key);

    // заменяем только главную страницу; остальные оставляем как есть (Турнир/Играть/Бонусы/Профиль)
    bp.routes = bp.routes.filter(r => r.path !== '/');
    bp.routes.unshift({ path:'/', blocks: htmlBlockKeys });

    // регистрируем htmlEmbed-блоки
    for (const s of vis){
      bp.blocks[s.key] = { type:'htmlEmbed', props:{ html: s.inner } };
    }
  }

  return bp;
}

/* ---------- Preview URL ---------- */
function makeMiniUrl({ app_id, preview='draft' }){
  // iframe указывает на твой mini/index.html на текущем домене
  const base = new URL(location.origin + (location.pathname.endsWith('/')? '' : '/'));
  const u = new URL(base.origin + '/mini/index.html');
  const api = apiBase();
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
  const auto = ()=>{ buildPreviewUrl(); saveDraftDebounced(); };

  on($('#app_id'),'input', auto);
  on($('#vertical'),'change', e=>{ S.vertical = e.target.value; auto(); });

  ['brand_name','brand_color','brand_sub','brand_skin','hero_title','hero_cover','hero_align','hero_fit','theme_css']
    .forEach(id => on($( '#'+id ), 'input', auto));

  on($('#add_pos'),'click', ()=>{
    const pos = {
      cat: $('#menu_cat').value.trim(),
      title: $('#menu_title').value.trim(),
      sub: $('#menu_sub').value.trim(),
      price: Number($('#menu_price').value||0)
    };
    if (pos.title){ S.positions.push(pos); $('#pos_count').textContent = `${S.positions.length} позиций`; }
    saveDraftDebounced();
  });

  on($('#loyalty_slots'),'input', e=>{ S.loyalty.slots = Number(e.target.value||6); auto(); });
  on($('#demo_pin'),'input', e=>{ S.loyalty.demo_pin = e.target.value.trim(); saveDraftDebounced(); });

  $('#block_tabs').addEventListener('click', e=>{
    const b = e.target.closest('.tab'); if(!b) return;
    const key = b.dataset.block; chipToggle(b);
    S.blocks[key] = (b.getAttribute('aria-pressed') === 'true');
    auto();
  });

  on($('#game_code'),'change', e=>{ S.game.code = e.target.value || ''; auto(); });
  on($('#game_attempts'),'input', auto);

  on($('#pv_device'),'change', e=>{ PV.device = e.target.value; applyPreviewSizing(); });
  on($('#pv_tgchrome'),'change', e=>{ PV.tgChrome = e.target.checked; auto(); });
  on($('#pv_demo'),'change', e=>{ PV.demo = e.target.checked; auto(); });
  on($('#pv_tab'),'change', e=>{ PV.tab = e.target.value; auto(); });
  on($('#open_separate'),'click', ()=>{ window.open($('#prev_url').textContent, '_blank'); });

  on($('#save_draft'),'click', saveDraft);
  on($('#preview_btn'),'click', buildPreviewUrl);
  on($('#publish_btn'),'click', publishLive);

  on($('#tpl_apply'),'click', ()=>{
    const key = $('#tpl_builtin').value;
    if (!key){
      S.template = { key:'', html:'', sections: [] };
      renderTplSummary(); renderTplList(); auto();
      return;
    }
    applyBuiltinTemplate(key);
    const cssBox = document.getElementById('theme_css');
    if (cssBox && window.BUILTIN_THEMES && window.BUILTIN_THEMES[key]){
      cssBox.value = window.BUILTIN_THEMES[key];
    }
    buildPreviewUrl(); saveDraftDebounced();
  });

  bindTplList();
}

/* ---------- Persist ---------- */
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
  setTimeout(()=> t.remove(), 1600);
}

/* ---------- Init ---------- */
function init(){
  $('#api_hint').textContent = apiBase() ? apiBase() : 'API не задан (window.API_BASE)';
  $('#brand_color').value = S.brand.color;
  $('#brand_skin').value  = S.brand.skin;
  $('#game_code').value = S.game.code;

  Array.from($('#block_tabs').querySelectorAll('.tab')).forEach(b=>{
    const key = b.dataset.block; b.setAttribute('aria-pressed', !!S.blocks[key]);
  });

  bindAccordion();
  bindControls();
  renderTplSummary();
  renderTplList();
  buildPreviewUrl();
}

document.addEventListener('DOMContentLoaded', init);
