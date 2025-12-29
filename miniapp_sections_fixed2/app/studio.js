/* STUDIO_BUILD: step21 */
console.log("[studio] build step21");

(async function(){
  const $=(q,r=document)=>r.querySelector(q);
  const toast=(msg)=>{ try{ console.log('[toast]',msg); }catch(_){} };
  const appIdEl = $('#app_id');
  const ctxMenu = $('#ctxMenu');
  const navList = $('#nav_list');

    // ====== Cloudflare Worker API base ======
  // Если конструктор лежит на том же домене, что и воркер — хватит location.origin.
  // Если нет — можно сверху в index.html задать window.CTOR_API_BASE = 'https://build-apps.cyberian13.workers.dev';
  const CTOR_API_BASE = (window.CTOR_API_BASE || window.location.origin).replace(/\/$/, '');

  // Берём app_id из query (?app_id=123) и кладём в поле App ID
  (function initAppIdFromQuery(){
    try{
      const qs = new URLSearchParams(window.location.search);
      const qAppId = qs.get('app_id') || qs.get('app');
      if (qAppId && appIdEl) appIdEl.value = qAppId;
    }catch(_){}
  })();

  function getAppId(){
    return (appIdEl && appIdEl.value.trim()) || '1';
  }

  // Подтянуть конфиг мини-аппа с воркера (если он уже есть)
  async function fetchAppConfigFromServer(){
    const appId = getAppId();
    try{
      const r = await fetch(CTOR_API_BASE + '/api/app/' + encodeURIComponent(appId), { method:'GET' });
      if (!r.ok) return null;
      const data = await r.json().catch(()=>null);
      if (!data || typeof data !== 'object') return null;
      return data.config || null;
    }catch(e){
      console.warn('[studio] fetchAppConfigFromServer failed', e);
      return null;
    }
  }


  // Load manifest-based blocks (if present)
  try{ await (window.BlockLibrary && window.BlockLibrary.ensureLoaded && window.BlockLibrary.ensureLoaded()); }catch(_){ }

  if (navList){
    navList.addEventListener('click', (e)=>{
      const header = e.target.closest('.acc-h');
      if (!header) return;
      if (e.target.closest('[data-act]')) return;
      const acc = header.closest('.acc');
      if (!acc) return;
      const path = acc.getAttribute('data-path');
      if (!path) return;
      const already = acc.classList.contains('open');
      navList.querySelectorAll('.acc').forEach(x=>x.classList.remove('open'));
      if (!already){
        acc.classList.add('open');
        CURRENT_PATH = path;
        navigatePreview(path);
        updatePreviewInline();
      }
    });
  }

  const themeAccWrap = $('#themeAcc');

  if (themeAccWrap){
    const h = themeAccWrap.querySelector('.acc-h');
    if (h){ h.addEventListener('click', ()=> themeAccWrap.classList.toggle('open')); }
  }

  const frame = $('#frame');
  const phone = $('#phone');
  const dock = $('#dock');
  const zoomEl = $('#zoom'); const zoomVal = $('#zoom_val');
  const tabTypeSel = $('#tab_type');
  const tabAddBtn = $('#tab_add');
  const routeAddBtn = $('#route_add');
  const routeNewEl = $('#route_new');

  

  // Добавление новой страницы через модалку
  if (routeAddBtn){
    const routeNameModal  = $('#routeNameModal');
    const routeNameInput  = $('#routeNameInput');
    const routeNameSave   = $('#routeNameSave');
    const routeNameCancel = $('#routeNameCancel');

    const doAddRoute = (rawFromModal)=>{
      let raw = (rawFromModal || '').trim();

      // если пусто — дадим нормальный дефолт
      if (!raw){
        raw = 'Новая страница';
      }

      const hasCyr = /[А-Яа-яЁё]/.test(raw);
      let title;
      let path;

      // если пользователь ввёл уже готовый путь вида "/calendar"
      if (raw.startsWith('/') && !hasCyr){
        path = raw;
        const base = path === '/' ? 'Главная' : path.replace(/^\//,'')
          .replace(/[-_]+/g,' ')
          .replace(/\s+/g,' ')
          .trim() || 'Страница';
        title = base.charAt(0).toUpperCase() + base.slice(1);
      } else {
        // считаем, что пользователь ввёл именно название страницы (можно по-русски)
        title = raw.trim() || 'Страница';

        // делаем латинский slug для path (как было раньше)
        const map = {
          'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
          'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
          'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch',
          'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
        };
        let slug = '';
        const src = raw.toLowerCase();
        for (let i=0;i<src.length;i++){
          const ch = src[i];
          if (/[a-z0-9]/.test(ch)){
            slug += ch;
          } else if (map[ch]){
            slug += map[ch];
          } else if (/[\s\-_.]/.test(ch)){
            slug += '-';
          }
        }
        slug = slug.replace(/-+/g,'-').replace(/^-|-$/g,'') || 'page';
        path = '/' + slug;
      }

      // нормализация пути
      path = path.replace(/\s+/g,'').replace(/\/+/g,'/');
      if (!path.startsWith('/')) path = '/' + path;

      // проверим дубликаты
      if (BP.nav && Array.isArray(BP.nav.routes) && BP.nav.routes.some(r=>r.path===path)){
        toast('Такая страница уже есть');
        return;
      }

      try{ pushHistory(); }catch(_){}

      BP.nav = BP.nav || { type:'tabs', position:'bottom', routes:[] };
      BP.nav.routes = BP.nav.routes || [];
      BP.routes = BP.routes || [];

      const slugLabel = (path === '/' ? '' : path.replace(/^\/+/, '')) || 'page';

      BP.nav.routes.push({
        path,
        title,
        icon:'custom',
        icon_g:'◌',
        icon_img:'',
        kind: slugLabel,
        hidden:false
      });

      BP.routes.push({ path, blocks: [] });

      CURRENT_PATH = path;
      try{
        renderNav();
        updatePreviewInline();
        navigatePreview(path);
      }catch(_){}
    };

    // открыть модалку
    const openRouteNameModal = ()=>{
      if (!routeNameModal || !routeNameInput) return;
      routeNameInput.value = '';
      routeNameModal.classList.add('on');
      setTimeout(()=>routeNameInput.focus(),0);
    };

    // клик по "Добавить страницу" открывает окно
    routeAddBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      openRouteNameModal();
    });

    // кнопка "Сохранить" в модалке
    if (routeNameSave && routeNameInput && routeNameModal){
      routeNameSave.addEventListener('click', (e)=>{
        e.preventDefault();
        doAddRoute(routeNameInput.value);
        routeNameModal.classList.remove('on');
      });

      routeNameInput.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter'){
          e.preventDefault();
          doAddRoute(routeNameInput.value);
          routeNameModal.classList.remove('on');
        }
      });
    }

    // кнопка "Отмена"
    if (routeNameCancel && routeNameModal){
      routeNameCancel.addEventListener('click', (e)=>{
        e.preventDefault();
        routeNameModal.classList.remove('on');
      });
    }
  }


  const appRoot = document.querySelector('.app');
  const panelLeft = document.querySelector('.panel-left');
  const panelHide = $('#panelHide');
  const navEar  = $('#navEar');

  // In embedded mode the left studio panel should start hidden under the host sidebar.
  try{
    if (appRoot && document.documentElement.classList.contains('embed-seamless')){
      appRoot.classList.add('nav-collapsed');
      if (panelHide) panelHide.textContent = '⮞';
      if (navEar) navEar.textContent = '⮞';
    }
  }catch(_){ }

  const themeBgEl   = $('#theme_bg');
  const themeAccEl  = $('#theme_acc');
  const themeTabEl  = $('#theme_tab');
  const themeFgEl   = $('#theme_fg');
  const themeFontEl = $('#theme_font');

  const DEFAULT_THEME_TOKENS = {
    bg: '#0f1219',
    fg: '#e8f0ff',
    sub: '#97aac4',
    acc: '#7C5CFF',
    tab: '#0c0d12',
    font: 'Inter'
  };

  // Modals
  const modal = $('#blocksModal');
  const mRoute = $('#modalRoute');
  const mList = $('#mList');
  const mSearch = $('#mSearch');
  const mCats = $('#mCats');
  const mSelectAll = $('#mSelectAll');
  const mApply = $('#mApply');
  const mClose = $('#mClose');

  // Rename Page Modal
  const renameModal = $('#renameModal');
  const renamePathEl = $('#renamePath');
  const renameInput = $('#renameInput');
  const renameSave = $('#renameSave');
  const renameCancel = $('#renameCancel');
  let RENAME_CTX = null;

  const be = $('#blockEditor');
  const beTitle = $('#beTitle');
  const beBody = $('#beBody');
  const beClose = $('#beClose');
  const beApply = $('#beApply');
  const beDelete = $('#beDelete');

  const iconPicker = $('#iconPicker');
  const iconGrid = $('#iconGrid');
  const iconUpload = $('#iconUpload');

  
  /* ---------- Popup manager: only one modal at a time ---------- */
  const __POPUPS = [modal, be, iconPicker, renameModal].filter(Boolean);

  function closeAllPopups(exceptEl){
    __POPUPS.forEach(el=>{
      if(!el) return;
      if(exceptEl && el===exceptEl) return;
      try{ el.classList.remove('on'); el.classList.remove('modal-top'); }catch(_){}
    });
    // unlock background if nothing open
    try{
      if(!document.querySelector('.modal.on')) document.body.classList.remove('modal-open');
    }catch(_){}
  }

  function openPopup(el, asTop){
    if(!el) return;
    closeAllPopups(el);
    try{
      document.body.classList.add('modal-open');
      el.classList.add('on');
      if(asTop) el.classList.add('modal-top'); else el.classList.remove('modal-top');
    }catch(_){}
  }

  function closePopup(el){
    if(!el) return;
    try{ el.classList.remove('on'); el.classList.remove('modal-top'); }catch(_){}
    try{
      if(!document.querySelector('.modal.on')) document.body.classList.remove('modal-open');
    }catch(_){}
  }
let MODAL_CTX = null; // {path, filter}
  let BE_CTX = null; // {path, inst}

  // v1.7 base blueprint — базовый шаблон (на случай, если на сервере пока пусто)
  let BP = JSON.parse(JSON.stringify(window.Templates['Demo Main'].blueprint));
  let CURRENT_PATH = '/';

  // Пытаемся поверх демо-шаблона подгрузить конфиг с сервера (если этот appId уже существует)
  try{
    const remoteCfg = await fetchAppConfigFromServer();
    if (remoteCfg && typeof remoteCfg === 'object') {
      BP = JSON.parse(JSON.stringify(remoteCfg));
      console.log('[studio] loaded BP from worker for appId=', getAppId());
    } else {
      console.log('[studio] no remote BP, using demo blueprint');
    }
  }catch(e){
    console.warn('[studio] apply remote BP failed', e);
  }

  // Reorder via drag in preview is disabled (modal overlaps preview, so it's inconvenient).
  const ENABLE_REORDER = false;

  BP.app = BP.app || {};
  BP.app.themeTokens = BP.app.themeTokens || { ...DEFAULT_THEME_TOKENS };

  BP.app.theme = BP.app.theme || { css: '' };

  function syncThemeCSS(){
    const t = BP.app.themeTokens || DEFAULT_THEME_TOKENS;
    const fontFamily = t.font === 'system' ? 'system-ui' : `${t.font}, system-ui`;
    const css = `
    :root{
      --bg:${t.bg};
      --fg:${t.fg};
      --sub:${t.sub};
      --line:rgba(255,255,255,.1);
      --acc:${t.acc};
    }
    body{
      background:var(--bg);
      color:var(--fg);
      font:14px/1.5 ${fontFamily};
    }
    .tabbar{
      background:${t.tab};
    }
    .tab{
      color:${t.fg};
    }
    .tab.active{
      color:${t.acc};
    }
    `;
    BP.app.theme.css = css;
  }

  function initThemePanel(){
    if (!themeBgEl) return;
    const t = BP.app.themeTokens || DEFAULT_THEME_TOKENS;

    themeBgEl.value   = t.bg;
    if (themeAccEl)  themeAccEl.value  = t.acc;
    if (themeTabEl)  themeTabEl.value  = t.tab;
    if (themeFgEl)   themeFgEl.value   = t.fg;
    if (themeFontEl) themeFontEl.value = t.font;

    function bindColor(el, key){
      if (!el) return;
      el.oninput = ()=>{
        BP.app.themeTokens = BP.app.themeTokens || { ...DEFAULT_THEME_TOKENS };
        BP.app.themeTokens[key] = el.value;
        syncThemeCSS();
        updatePreviewInline();
      };
    }

    bindColor(themeBgEl,  'bg');
    bindColor(themeAccEl, 'acc');
    bindColor(themeTabEl, 'tab');
    bindColor(themeFgEl,  'fg');

    if (themeFontEl){
      themeFontEl.onchange = ()=>{
        BP.app.themeTokens = BP.app.themeTokens || { ...DEFAULT_THEME_TOKENS };
        BP.app.themeTokens.font = themeFontEl.value;
        syncThemeCSS();
        updatePreviewInline();
      };
    }
  }

  /* ---------- History (undo/redo) ---------- */
  const HIST = {past:[], future:[]};
  function snapshot(){ return JSON.stringify(BP); }
  function pushHistory(){ HIST.past.push(snapshot()); if(HIST.past.length>50) HIST.past.shift(); HIST.future.length=0; }
  function applyState(s){ try{ BP = JSON.parse(s); renderNav(); updatePreviewInline(); navigatePreview(CURRENT_PATH); }catch(_){} }
  $('#undo').onclick=()=>undo(); $('#redo').onclick=()=>redo();
  function undo(){ if(!HIST.past.length) return; const cur=snapshot(); HIST.future.push(cur); const s=HIST.past.pop(); applyState(s); }
  function redo(){ if(!HIST.future.length) return; const cur=snapshot(); HIST.past.push(cur); const s=HIST.future.pop(); applyState(s); }
  window.addEventListener('keydown', (e)=>{
    const z=(e.key==='z'||e.key==='Z'), y=(e.key==='y'||e.key==='Y'); const mod=e.metaKey||e.ctrlKey;
    if(mod && z){ e.preventDefault(); undo(); }
    if(mod && y){ e.preventDefault(); redo(); }
  });

  /* ---------- persistence (Cloudflare Worker) ---------- */
  function saveDraft(){
    const appId = getAppId();

    // 1) Локальный бэкап для спокойствия
    try{
      const d = JSON.stringify(BP || {}, null, 0);
      localStorage.setItem(`bp:${appId}:draft`, d);
    }catch(e){
      console.warn('[studio] local saveDraft failed', e);
    }

    // 2) Отправляем черновик на воркер
    (async()=>{
      try{
        const clean = sanitizeBP(BP);
        const res = await fetch(CTOR_API_BASE + '/api/app/' + encodeURIComponent(appId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: clean,
            // если захочешь, можно хранить название внутри BP.app.title
            title: (BP && BP.app && BP.app.title) || undefined
          })
        });
        if (!res.ok){
          console.warn('[studio] remote saveDraft failed', res.status);
          toast('Сервер не принял черновик (' + res.status + '), но локально сохранено');
        } else {
          toast('Черновик сохранён');
        }
      }catch(e){
        console.warn('[studio] remote saveDraft error', e);
        toast('Не удалось отправить черновик на сервер');
      }
    })();
  }

  async function publishLive(){
    const appId = getAppId();
    const d = localStorage.getItem(`bp:${appId}:draft`);
    if (!d){
      alert('Сначала сохраните черновик');
      return;
    }

    // 1) Локально помечаем как live
    try{
      localStorage.setItem(`bp:${appId}:live`, d);
    }catch(e){
      console.warn('[studio] local publishLive failed', e);
    }

    // 2) Сообщаем воркеру, что надо "опубликовать" (создать/обновить publicId и ссылку)
    try{
      const res = await fetch(CTOR_API_BASE + '/api/app/' + encodeURIComponent(appId) + '/publish', {
        method: 'POST'
      });
      if (res.ok){
        const data = await res.json().catch(()=>null);
        let msg = 'Опубликовано.';
        if (data && data.publicUrl){
          msg = 'Опубликовано.\n\nWebApp URL:\n' + data.publicUrl;
        }
        alert(msg);
      } else {
        alert('Опубликовано локально.\nСервер вернул статус ' + res.status);
      }
    }catch(e){
      console.warn('[studio] publishLive remote error', e);
      alert('Опубликовано локально.\nНе удалось отправить данные на сервер.');
    }
  }

  $('#save').onclick = ()=>{ saveDraft(); };
  $('#publish').onclick = publishLive;


  /* ---------- live preview ---------- */
  
function sanitizeBP(bp){
  // Ничего не выкидываем (включая section / __isSection / __section), иначе превью не сможет собрать "раздел → блоки".
  // Только нормализуем inst.type и убираем битые записи.
  try{
    const clone = JSON.parse(JSON.stringify(bp || {}));
    if (clone && Array.isArray(clone.routes)){
      clone.routes.forEach(r=>{
        if (!r || !Array.isArray(r.blocks)) return;
        r.blocks = r.blocks
          .filter(inst => inst && inst.id)
          .map(inst => ({ ...inst, key: inst.key || inst.type, type: inst.type || inst.key }));
      });
    }
    return clone;
  }catch(_){
    return bp;
  }
}





function updatePreviewInline(){
  // всегда синхронизируем вложенность разделов перед отправкой в превью
  try{ recomputeSectionFlow(getRoute(CURRENT_PATH)); }catch(_){}
  // 1) Пишем текущий BP в localStorage draft — это источник для превью (и резерв, если postMessage не долетит)
  try{
    const appId = appIdEl.value.trim()||'my_app';
    localStorage.setItem(`bp:${appId}:draft`, JSON.stringify({ version: Date.now(), json: BP }));
  }catch(_){}

  // 2) Отправляем в iframe (быстрое обновление)
  try{
    frame.contentWindow.postMessage({ type:'bp:inline', bp: sanitizeBP(BP) }, '*');
    // форсим перерисовку текущего пути, даже если hash не менялся
    frame.contentWindow.postMessage({ type:'nav:go', path: CURRENT_PATH }, '*');
  }catch(_){}
}

function navigatePreview(path){ try{ frame.contentWindow.postMessage({type:'nav:go', path}, '*'); }catch(_){ } }
  window.addEventListener('message', (ev)=>{
    const d = ev.data||{};
    if(d.type==='ready'){ updatePreviewInline(); navigatePreview(CURRENT_PATH); }
    if(d.type==='block:edit' && d.id && d.path){
      const route = getRoute(d.path); if(!route) return;
      const inst = (route.blocks||[]).find(b=>b.id===d.id); if(!inst) return;
      CURRENT_PATH = d.path; try{ LAYER_SEL_ID = d.id; }catch(_){} try{ renderLayers(); }catch(_){} openBlockEditor(d.path, inst); renderNav(); navigatePreview(d.path); updatePreviewInline();
    }
    // Reorder blocks via drag&drop from preview (disabled when ENABLE_REORDER=false)
    if(ENABLE_REORDER && d.type==='blocks:reorder' && d.path && Array.isArray(d.order)){
      const route = getRoute(d.path); if(!route) return;
      const cur = route.blocks || [];
      const map = new Map(cur.map(x=>[String(x.id), x]));
      const next = [];
      d.order.forEach(id=>{ const it = map.get(String(id)); if(it) next.push(it); });
      // keep any blocks that were not included (safety)
      cur.forEach(it=>{ if(!d.order.includes(String(it.id))) next.push(it); });
      pushHistory();
      route.blocks = next;
      CURRENT_PATH = d.path;
      updatePreviewInline();
      renderNav();
    }
  });
  frame.addEventListener('load', ()=>{ try{ updatePreviewInline(); navigatePreview(CURRENT_PATH); }catch(_){} });

  /* ---------- helpers ---------- */
  function getRoute(path){ return BP.routes.find(x=>x.path===path); }
  function getTab(path){ return (BP.nav.routes||[]).find(x=>x.path===path); }
  function inferFilter(path){
    const kind = (getTab(path)?.kind)||'custom';
    const ids = Object.keys(window.BlockRegistry||{});

    // Prefer tag-based filtering (block.json -> tags: ["home","bonuses",...])
    const tagged = ids.filter(id=>{
      const meta = window.BlockRegistry[id]?.meta || {};
      const tags = meta.tags || meta.tag || [];
      return Array.isArray(tags) && tags.includes(kind);
    });
    if (kind !== 'custom' && tagged.length) return tagged;

    // Fallback: kind-based presets (kept for backward compatibility)
    const map = {
      home:['hero','features','promo','grid','cta','sheet','hero_image','media_row_cta','beer_home_hero','beer_home_promo','beer_home_start_list','beer_home_games_list'],
      play:['gamesPicker','flappyGame','cta','sheet'],
      tournament:['leaderboard','cta','sheet'],
      bonuses:['bonusWheel','stampShelf','cta','sheet'],
      profile:['profile','cta','sheet'],
      custom:ids
    };
    return map[kind] || ids;
  }

  /* ---------- render nav + editors ---------- */
  function renderNav(){
    navList.innerHTML='';
    (BP.nav.routes||[]).forEach((t,idx)=>{
      const acc = document.createElement('div'); acc.className='acc'; acc.setAttribute('data-path', t.path);
      const icoHtml = (t.icon_img && String(t.icon_img).trim())
        ? `<span class="nav-ico" title="${t.title}"><img src="${t.icon_img}" alt=""></span>`
        : `<span class="nav-ico" title="${t.title}">${(t.icon_g||'●')}</span>`;
      acc.innerHTML = `
        <div class="acc-h">
          <div class="inline">
            ${icoHtml}
            <b class="nav-title">${t.title}</b>
            <span class="badge">${t.kind||'custom'}</span>
            <button class="btn smallbtn ghost" title="Скрыть/показать в меню" data-act="vis" data-path="${t.path}">${iconEye(t.hidden)}</button>
            <button class="btn smallbtn ghost" data-act="icon" data-path="${t.path}">ico</button>
            <button class="btn smallbtn ghost" data-act="rename" data-path="${t.path}" title="Переименовать">✎</button>
          </div>
          <div class="inline">
            ${idx>0?`<button class="btn smallbtn ghost" data-act="up" data-path="${t.path}">↑</button>`:''}
            ${idx<(BP.nav.routes.length-1)?`<button class="btn smallbtn ghost" data-act="down" data-path="${t.path}">↓</button>`:''}
            ${t.path!=='/'?`<button class="btn smallbtn danger" data-act="del" data-path="${t.path}">X</button>`:''}
              <button class="btn smallbtn ghost" data-act="toggle" data-path="${t.path}" title="Содержание страницы">${CURRENT_PATH===t.path ? "▾":"▸"}</button>
            <button class="btn smallbtn" data-act="dupepage" data-path="${t.path}">⧉</button>
          </div>
        </div>
        <div class="acc-b"></div>
      `;
      const body = acc.querySelector('.acc-b');
      buildPageEditor(t.path, body);
      // click on header opens the page accordion (but don't steal clicks from buttons / editable title)
      const head = acc.querySelector('.acc-h');
      if(head){
        head.addEventListener('click', (ev)=>{
          const trg = ev.target;
          if(trg && (trg.closest('button') || trg.closest('input') || trg.closest('select') || trg.closest('[contenteditable="true"]'))) return;
          CURRENT_PATH = t.path;
          navList.querySelectorAll('.acc').forEach(x=>x.classList.remove('open'));
          acc.classList.add('open');
          try{ renderLayers(); }catch(_){}
          navigatePreview(t.path);
          updatePreviewInline();
        });
      }
      navList.appendChild(acc);
    });

    // handlers
    navList.querySelectorAll('[data-act]').forEach(b=>b.onclick=(e)=>{
      const act=b.dataset.act, path=b.dataset.path;
      const i = BP.nav.routes.findIndex(x=>x.path===path);
      if(i<0) return;
      if(act==='icon'){ openIconPicker(getTab(path)); return; }
      if(act==='vis'){
        const t = getTab(path);
        if(!t) return;
        pushHistory();
        t.hidden = !t.hidden;
        updatePreviewInline();
        renderNav();
        return;
      }
      if(act==='open'){ CURRENT_PATH = path; navList.querySelectorAll('.acc').forEach(x=>x.classList.remove('open')); b.closest('.acc').classList.add('open'); navigatePreview(path); updatePreviewInline(); return; }
      if(act==='up'){ pushHistory(); const [x]=BP.nav.routes.splice(i,1); BP.nav.routes.splice(i-1,0,x);
        const rIndex = BP.routes.findIndex(r=>r.path===path); const [r]=BP.routes.splice(rIndex,1); BP.routes.splice(i-1,0,r);
        renderNav(); updatePreviewInline(); return; }
      if(act==='down'){ pushHistory(); const [x]=BP.nav.routes.splice(i,1); BP.nav.routes.splice(i+1,0,x);
        const rIndex = BP.routes.findIndex(r=>r.path===path); const [r]=BP.routes.splice(rIndex,1); BP.routes.splice(i+1,0,r);
        renderNav(); updatePreviewInline(); return; }
      if(act==='del'){ pushHistory(); const wasCurrent = CURRENT_PATH===path; BP.nav.routes.splice(i,1); BP.routes = BP.routes.filter(r=>r.path!==path);
        if(wasCurrent){ CURRENT_PATH = BP.routes[0]?.path || '/'; } renderNav(); updatePreviewInline(); return; }
      if (act === 'toggle') {
        e.preventDefault();
        const accEl = navList.querySelector(`.acc[data-path="${path}"]`);
        if (!accEl) return;

        const isOpen = accEl.classList.contains('open');

        // Сначала закрываем все гармошки
        navList.querySelectorAll('.acc').forEach(x => x.classList.remove('open'));

        if (!isOpen) {
          // Открываем выбранную
          accEl.classList.add('open');
          CURRENT_PATH = path;
          try { renderLayers(); } catch (_) {}
          navigatePreview(path);
          updatePreviewInline();
        }
        // Если была открыта — просто закрыли (и НЕ вызываем renderNav())

        // Обновляем стрелки у всех страниц прямо в DOM
        navList.querySelectorAll('button[data-act="toggle"]').forEach(btn => {
          const btnPath = btn.dataset.path;
          const acc = navList.querySelector(`.acc[data-path="${btnPath}"]`);
          btn.textContent = acc && acc.classList.contains('open') ? '▾' : '▸';
        });

        return;
      }

      if(act==='rename'){ openRenameModal(path); return; }

      if(act==='lib'){ openBlocksModal(path, inferFilter(path)); return; }
      if(act==='dupepage'){
        pushHistory();
        const src = BP.routes.find(r=>r.path===path);
        const i2 = BP.nav.routes.findIndex(x=>x.path===path);
        const newPath = (path.replace(/\/?$/,'') || '/page') + '-copy';
        BP.nav.routes.splice(i2+1,0,{...getTab(path), path:newPath, title:(getTab(path).title+' копия')});
        const clone = JSON.parse(JSON.stringify(src)); clone.path=newPath;
        // also create new ids for blocks to avoid collisions
        clone.blocks = (clone.blocks||[]).map(o=>({id:'b_'+Math.random().toString(36).slice(2,9), key:o.key}));
        // copy props
        clone.blocks.forEach((inst,i)=>{
          const old = src.blocks[i]; if(!old) return;
          BP.blocks[inst.id] = JSON.parse(JSON.stringify(BP.blocks[old.id]||{}));
        });
        BP.routes.splice(i2+1,0,clone);
        CURRENT_PATH = newPath; renderNav(); updatePreviewInline(); navigatePreview(newPath);
        return;
      }
    });

    // Авто-открытие текущей страницы после перерисовки меню
    try{
      const curPath = CURRENT_PATH || (BP.nav.routes && BP.nav.routes[0] && BP.nav.routes[0].path) || '/';
      const accCur = navList.querySelector(`.acc[data-path="${curPath}"]`);
      if(accCur){
        accCur.classList.add('open');
        try{ renderLayers(); }catch(_){}
      }
    }catch(_){}

  }

  /* ---------- Tab Icon Picker ---------- */
  let __ICON_TARGET = null;
  function closeIconPicker(){
    try{ closePopup(iconPicker); __ICON_TARGET = null; }catch(_){ }
  }
  function openIconPicker(tab){
    openPopup(iconPicker, true);
    if(!tab) return;
    __ICON_TARGET = tab;
    // build grid
    const set = (window.IconSet||[]);
    iconGrid.innerHTML = set.map(it=>{
      const isOn = (tab.icon===it.k || tab.icon_g===it.g) && !tab.icon_img;
      return `<button class="kcard" data-ico="${it.k}" data-on="${isOn?'1':'0'}">
        <span class="kico">${it.g||'●'}</span>
        <div class="kmeta">
          <div class="ktit">${it.label||it.k}</div>
          <div class="smallmut">${it.k}</div>
        </div>
      </button>`;
    }).join('');

    iconGrid.querySelectorAll('button[data-ico]').forEach(btn=>btn.onclick=()=>{
      const k = btn.getAttribute('data-ico');
      const it = set.find(x=>x.k===k); if(!it) return;
      pushHistory();
      tab.icon = it.k;
      tab.icon_g = it.g || tab.icon_g;
      tab.icon_img = '';
      renderNav();
      updatePreviewInline();
    });

    // upload custom image
    if(iconUpload){
      iconUpload.value='';
      iconUpload.onchange = (e)=>{
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ()=>{
          pushHistory();
          tab.icon_img = reader.result;
          renderNav();
          updatePreviewInline();
        };
        reader.readAsDataURL(file);
      };
    }

    // close actions
    // opened via openPopup(iconPicker,true);
  }

  // icon picker close handlers (overlay, buttons, esc)
  if(iconPicker){
    iconPicker.addEventListener('click', (e)=>{
      if(e.target===iconPicker) closeIconPicker();
      if(e.target && e.target.closest('[data-close]')) closeIconPicker();
    });
    window.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && iconPicker.classList.contains('on')) closeIconPicker(); });
  }


  /* ---------- Layers (page blocks list) ---------- */
  const layersAcc   = $('#layers_acc');
  const layersPath  = $('#layers_path');
  const layersSearch= $('#layers_search');
  const layersList  = $('#layers_list');
  const layersAdd   = $('#layers_add');
  let   LAYER_SEL_ID = null;

  function blockTitle(inst){
    const reg = (window.BlockRegistry && window.BlockRegistry[inst.key]) || {};
    const p = (BP.blocks && BP.blocks[inst.id]) || {};
    return (p.__label || reg.title || inst.key || 'block');
  }
  function blockSub(inst){
    return inst.key || '';
  }
  function isHidden(inst){
    const p = (BP.blocks && BP.blocks[inst.id]) || {};
    return !!p.__hidden;
  }

function isSection(inst){
  try{
    if(!inst) return false;
    const p = (BP.blocks && BP.blocks[inst.id]) || {};
    return !!p.__isSection || inst.key === 'section';
  }catch(_){ return false; }
}

function secCollapsed(secId){
  const p = (BP.blocks && BP.blocks[secId]) || {};
  return !!p.__collapsed;
}
function toggleSection(secId){
  pushHistory();
  const p = (BP.blocks && BP.blocks[secId]) || (BP.blocks[secId]={});
  p.__collapsed = !p.__collapsed;
  renderLayers();
}
function getSectionOf(inst){
  const p = (BP.blocks && BP.blocks[inst.id]) || {};
  return p.__section || '';
}
function setSectionOf(blockId, secId){
  if(!BP.blocks) BP.blocks = {};
  if(!BP.blocks[blockId]) BP.blocks[blockId] = {};
  BP.blocks[blockId].__section = secId || '';
}
function newSection(route, name, insertAfterId){
  const secId = 'sec_' + Math.random().toString(36).slice(2,9);
  if(!BP.blocks) BP.blocks = {};
  // мета-инфа раздела
  BP.blocks[secId] = { 
    __isSection:true, 
    __label: (name||'Раздел'), 
    __collapsed:false 
  };
  // главное: это теперь Обычный блок с key:'section'
  const inst = { id: secId, key:'section', type:'section' };

  const list = route.blocks || (route.blocks=[]);
  if(insertAfterId){
    const ix = list.findIndex(b=>b.id===insertAfterId);
    if(ix>=0) list.splice(ix+1,0,inst);
    else list.push(inst);
  } else {
    list.push(inst);
  }
  return secId;
}


/* ===================== Premium helpers: nested sections & sheetify ===================== */
function slugify(s){
  return String(s||'').toLowerCase()
    .replace(/ё/g,'e')
    .replace(/[^a-z0-9а-я\s_-]+/g,'')
    .trim()
    .replace(/\s+/g,'-')
    .replace(/-+/g,'-')
    .slice(0,40) || 'section';
}

function listSections(route){
  const out = [];
  (route.blocks||[]).forEach(inst=>{
    if(!inst) return;
    if(isSection(inst)){
      const p = (BP.blocks && BP.blocks[inst.id]) || {};
      out.push({ id: inst.id, label: p.__label || inst.id, parent: p.__parent || '' });
    }
  });
  return out;
}


// Choose section id via prompt. If allowEmpty=true, user can clear parent.
// If excludeId provided, cannot choose itself.

function recomputeSectionFlow(route){
  // Блок принадлежит ближайшему предыдущему разделу (если есть).
  if(!route || !Array.isArray(route.blocks)) return;
  let current = null;
  for(const inst of route.blocks){
    if(!inst) continue;
    const meta = (BP.blocks && BP.blocks[inst.id]) || null;
    const isSec = isSection(inst) || (meta && meta.__isSection===true);
    if(isSec){
      current = inst.id;
      continue;
    }
    BP.blocks = BP.blocks || {};
    const p = BP.blocks[inst.id] || (BP.blocks[inst.id] = {});
    if(current) p.__section = current; else delete p.__section;
  }
}

function chooseSection(title, excludeId, allowEmpty){
  const route = getRoute(CURRENT_PATH); if(!route) return '';
  const secs = listSections(route).filter(s=>s.id!==excludeId);
  const lines = secs.map((s,i)=>`${i+1}) ${s.label}  [${s.id}]`).join('\n');
  const hint = (allowEmpty ? '0) (без раздела)\n' : '') + (lines||'(разделов нет)');
  const raw = prompt(`${title}\n\n${hint}`, allowEmpty ? '0' : '1');
  if(raw===null) return null;
  const n = Number(raw);
  if(allowEmpty && (raw.trim()==='' || n===0)) return '';
  if(!Number.isFinite(n) || n<1 || n>secs.length) return '';
  return secs[n-1].id;
}

// Collect subtree of sections starting at rootSecId
function collectSectionSubtree(route, rootSecId){
  const secs = listSections(route);
  const children = new Map();
  secs.forEach(s=>{
    const p = s.parent || '';
    if(!children.has(p)) children.set(p, []);
    children.get(p).push(s.id);
  });
  const set = new Set([rootSecId]);
  const stack = [rootSecId];
  while(stack.length){
    const cur = stack.pop();
    (children.get(cur)||[]).forEach(ch=>{
      if(!set.has(ch)){ set.add(ch); stack.push(ch); }
    });
  }
  return set;
}

// Make a section into a sheet page: move all blocks (and nested sections) into targetPath.
// Inserts a CTA link block in place of the section marker (opens target sheet page).
function makeSectionSheet(secId, fromPath, targetPath){
  if(!secId) return;
  if(!targetPath) return;
  if(targetPath[0] !== '/') targetPath = '/' + targetPath;

  const from = getRoute(fromPath); if(!from) return;
  ensureSheet(targetPath);
  const to = getRoute(targetPath); if(!to) return;

  const subtree = collectSectionSubtree(from, secId);

  // build moved list preserving order from from.blocks
  const moved = [];
  const kept  = [];
  let secIndex = -1;

  (from.blocks||[]).forEach((inst, ix)=>{
    if(!inst) return;
    const isSectionMarker = inst.type==='__section' && subtree.has(inst.id);
    const inSection = subtree.has(getSectionOf(inst));
    if(isSectionMarker || inSection){
      if(inst.id===secId && inst.type==='__section' && secIndex<0) secIndex = moved.length;
      moved.push(inst);
    }else{
      kept.push(inst);
    }
  });

  // remove moved from from route
  from.blocks = kept;

  // append moved to sheet route
  to.blocks = (to.blocks||[]).concat(moved);

  // insert CTA link in original route at position where section marker was (approx: end of kept before marker)
  const label = ((BP.blocks && BP.blocks[secId])||{}).__label || 'Открыть';
  const ctaId = makeId('b');
  from.blocks.splice(Math.min(from.blocks.length, 0), 0); // noop for safety

  // Try to place CTA near where the marker used to be: we'll insert at first index where kept order crosses moved start
  // Simpler: insert at end if we can't compute reliably.
  let insertAt = from.blocks.length;
  // Attempt: find first kept index whose original index was after the section marker original index
  // We don't have original indices now, so we'll just insert at end.
  const ctaInst = { id: ctaId, key:'cta' };
  BP.blocks = BP.blocks || {};
  BP.blocks[ctaId] = Object.assign({}, (window.BlockRegistry.cta && window.BlockRegistry.cta.defaults) || {}, {
    label: label,
    action: 'sheet_page',
    sheet_path: targetPath
  });

  from.blocks.splice(insertAt, 0, ctaInst);

  // Clean section markers from original route (since moved)
  // Also clear __section references of moved blocks that stayed (none).
}


function dupeBlock(route, id){
  const inst = (route.blocks||[]).find(b=>b.id===id); if(!inst) return null;
  const newId = makeId('b');
  const copy = Object.assign({}, inst, { id:newId });
  const idx = (route.blocks||[]).findIndex(b=>b.id===id);
  route.blocks.splice(idx+1, 0, copy);
  if(!BP.blocks) BP.blocks = {};
  BP.blocks[newId] = cloneProps(id);
  if(BP.blocks[newId].__label) BP.blocks[newId].__label = BP.blocks[newId].__label + ' (копия)';
  return newId;
}


  function setHidden(inst, v){
    if(!BP.blocks) BP.blocks = {};
    if(!BP.blocks[inst.id]) BP.blocks[inst.id] = {};
    BP.blocks[inst.id].__hidden = !!v;
  }
  function setLabel(inst, t){
    if(!BP.blocks) BP.blocks = {};
    if(!BP.blocks[inst.id]) BP.blocks[inst.id] = {};
    BP.blocks[inst.id].__label = String(t||'').trim();
  }
  function cloneProps(id){
    const src = (BP.blocks && BP.blocks[id]) || {};
    return JSON.parse(JSON.stringify(src));
  }
  function newBlockId(){
    return 'b_' + Math.random().toString(36).slice(2,9);
  }

  function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }

  



  // Eye / eye-off icon helper (SVG, inherits currentColor)
  function iconEye(isHidden){
    const eyeOn = `
      <svg class="ico-eye" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2.5 12C4 8 7.5 5 12 5s8 3 9.5 7-3.5 7-9.5 7S4 16 2.5 12z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </g>
      </svg>`;
    const eyeOff = `
      <svg class="ico-eye" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2.5 12C4 8 7.5 5 12 5s8 3 9.5 7-3.5 7-9.5 7S4 16 2.5 12z"></path>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M4 4l16 16"></path>
        </g>
      </svg>`;
    return isHidden ? eyeOff : eyeOn;
  }

function renderLayers(){
  if(!layersList) return;
  const route = getRoute(CURRENT_PATH);
  if(!route){ layersList.innerHTML = `<div class="mut">Нет страницы</div>`; return; }
  if(layersPath) layersPath.textContent = route.path || CURRENT_PATH;

  const q = (layersSearch && layersSearch.value || '').trim().toLowerCase();
  const blocks = (route.blocks || []).slice();

  // Sections (nested)
  const secs = listSections(route);
  const children = new Map(); // parent -> [childSecId] in appearance order
  secs.forEach(s=>{
    const p = s.parent || '';
    if(!children.has(p)) children.set(p, []);
    children.get(p).push(s.id);
  });

  function titleOf(inst){
    const reg = window.BlockRegistry[inst.key] || {};
    const props = (BP.blocks && BP.blocks[inst.id]) || (reg.defaults||{});
    return { reg, props, title: props.__label || reg.title || inst.key || 'block' };
  }

  function matchQ(text){
    if(!q) return true;
    return String(text||'').toLowerCase().includes(q);
  }

  function blockRow(inst, depth){
    const { reg, props, title } = titleOf(inst);
    if(!matchQ(title) && !matchQ(inst.key)) return '';
    const hidden = !!(props && props.__hidden);
    const sel = (LAYER_SEL_ID===inst.id);
    return `
      <div class="layer-item ${sel?'sel':''}" data-id="${inst.id}" style="padding-left:${12 + depth*12}px">
        <span class="drag" title="Слой">⋮⋮</span>
        <span class="t">${escapeHtml(title)}</span>
        <span class="badge-mini">${escapeHtml(inst.key||'')}</span>
        <span style="flex:1"></span>
        <button class="iconbtn" title="Редактировать" data-act="edit">✎</button>
        <button class="iconbtn" title="Вверх" data-act="up">↑</button>
        <button class="iconbtn" title="Вниз" data-act="down">↓</button>
        <button class="iconbtn" title="Скрыть/показать" data-act="hide">${iconEye(hidden)}</button>
        <button class="iconbtn" title="Дублировать" data-act="dupe">⧉</button>
        <button class="iconbtn" title="Меню" data-act="ctx">⋯</button>
        <button class="iconbtn danger" title="Удалить" data-act="del">✕</button>
      </div>
    `;
  }

  function secRow(secId, depth){
    const p = (BP.blocks && BP.blocks[secId]) || {};
    const title = p.__label || secId;
    if(!matchQ(title)) return '';
    const collapsed = !!p.__collapsed;
    const hasParent = !!p.__parent;
    return `
      <div class="layer-sec" data-sec="${secId}" data-collapsed="${collapsed?1:0}" style="padding-left:${8 + depth*12}px">
        <span class="toggle">${collapsed?'▸':'▾'}</span>
        <span class="tw">${escapeHtml(title)}</span>
        <span class="badge-mini">section</span>
        ${hasParent?`<span class="badge-mini">↳</span>`:''}
        <span style="flex:1"></span>
        <button class="iconbtn" title="Меню" data-act="ctx">⋯</button>
      </div>
    `;
  }

  function blocksForSection(secId){
    return blocks.filter(inst=>inst && inst.type!=='__section' && getSectionOf(inst)===secId);
  }

  let html = '';
  html += `<div class="layer-actions">
    <button class="btn" id="layersAddBlock" data-action="add-block">+ Блок</button>
    <button class="btn" id="layersAddSection" data-action="add-section">+ Раздел</button>
  </div>`;

  // Top-level blocks not assigned to any section
  const topBlocks = blocks.filter(inst=>inst && inst.type!=='__section' && !getSectionOf(inst));
  if(topBlocks.length){
    html += `<div class="layer-group-title">На странице</div>`;
    topBlocks.forEach(inst=>{ html += blockRow(inst, 0); });
  }

  function renderSection(secId, depth){
    html += secRow(secId, depth);
    const p = (BP.blocks && BP.blocks[secId]) || {};
    const collapsed = !!p.__collapsed;
    if(collapsed) return;

    // blocks inside section
    blocksForSection(secId).forEach(inst=>{ html += blockRow(inst, depth+1); });

    // nested sections
    (children.get(secId)||[]).forEach(ch=>renderSection(ch, depth+1));
  }

  const rootSecs = children.get('') || [];
  if(rootSecs.length){
    html += `<div class="layer-group-title">Разделы</div>`;
    rootSecs.forEach(secId=>renderSection(secId, 0));
  }

  layersList.innerHTML = html;

  // Wire buttons
  const addB = document.getElementById('layersAddBlock');
  if(addB) addB.onclick = ()=> openLibrary();
  const addS = document.getElementById('layersAddSection');
  if(addS) addS.onclick = ()=>{
    const name = prompt('Название раздела', 'Раздел');
    if(name===null) return;
    const route = getRoute(CURRENT_PATH); if(!route) return;
    pushHistory();
    newSection(route, name, null);
    renderLayers(); updatePreviewInline();
  };
}
function hideCtx(){
  if(!ctxMenu) return;
  ctxMenu.style.display='none';
  ctxMenu.innerHTML='';
  CTX_ID=null;
}
function showCtx(x,y,items){
  if(!ctxMenu) return;
  ctxMenu.innerHTML = items.map(it=>{
    if(it==='sep') return `<div class="sep"></div>`;
    return `<div class="mi" data-a="${it.a}"><span class="k">${it.k||''}</span><span>${escapeHtml(it.t)}</span></div>`;
  }).join('');
  ctxMenu.style.left = Math.min(x, window.innerWidth-240) + 'px';
  ctxMenu.style.top  = Math.min(y, window.innerHeight-220) + 'px';
  ctxMenu.style.display='block';
}

// Open existing context menu programmatically (used by in-page Layers)
function openCtxMenuFor(id, x, y){
  const route = getRoute(CURRENT_PATH); if(!route) return;
  const inst = (route.blocks||[]).find(b=>b.id===id);
  if(!inst) return;

  if(isSection(inst)){
    CTX_KIND='section';
    CTX_ID = id;
    const p = (BP.blocks && BP.blocks[id]) || {};
    showCtx(x||0, y||0, [
      {a:'sec_rename', k:'✎', t:'Переименовать раздел'},
      {a:'sec_toggle', k:'▾', t:(p.__collapsed?'Развернуть':'Свернуть')},
      {a:'sec_parent', k:'▦', t:'Поместить в раздел…'},
      'sep',
      {a:'sec_make_sheet', k:'⇢', t:'Сделать шторкой (перенести содержимое)…'},
      'sep',
      {a:'sec_del', k:'✕', t:'Удалить раздел'}
    ]);
    return;
  }

  CTX_KIND='block';
  CTX_ID = id;
  showCtx(x||0, y||0, [
    {a:'rename', k:'✎', t:'Переименовать'},
    {a:'dupe', k:'⧉', t:'Дублировать'},
    {a:'hide', k:'👁', t:'Скрыть/показать'},
    'sep',
    {a:'to_section', k:'▦', t:'Поместить в раздел…'},
    {a:'move_sheet', k:'⇢', t:'Перенести в шторку…'},
    'sep',
    {a:'copy', k:'⎘', t:'Копировать props'},
    {a:'paste', k:'⎗', t:'Вставить props'},
    'sep',
    {a:'del', k:'✕', t:'Удалить'}
  ]);
}
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideCtx(); });

document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideCtx(); });

function ensureSheet(path){
  // Ensure route exists (sheets are routes without bottom-tab entry)
  if(!path) return;
  if(path[0] !== '/') path = '/' + path;

  // 1) ensure route
  let r = getRoute(path);
  if(!r){
    BP.routes = BP.routes || [];
    BP.routes.push({ path, blocks: [] });
    r = getRoute(path);
  }

  // 2) if there is a tab entry, mark it as sheet (so it can be hidden from bottom menu)
  const t = getTab(path);
  if(t) t.kind = 'sheet';

  return r;
}

function moveBlockToPath(blockId, fromPath, toPath){
  const from = getRoute(fromPath); if(!from) return;
  const inst = (from.blocks||[]).find(b=>b.id===blockId); if(!inst) return;
  from.blocks = (from.blocks||[]).filter(b=>b.id!==blockId);
  ensureSheet(toPath);
  const to = getRoute(toPath);
  (to.blocks||(to.blocks=[])).push(inst);
}

function copyProps(id){
  try{
    const p = (BP.blocks && BP.blocks[id]) || {};
    localStorage.setItem('blk_clip', JSON.stringify(p));
    toast('Скопировано');
  }catch(_){}
}
function pasteProps(id){
  try{
    const raw = localStorage.getItem('blk_clip');
    if(!raw) return toast('Буфер пуст');
    const p = JSON.parse(raw);
    pushHistory();
    BP.blocks[id] = Object.assign({}, p);
    renderLayers(); updatePreviewInline();
    toast('Вставлено');
  }catch(_){}
}

if(layersList){
  layersList.addEventListener('contextmenu', (e)=>{
    const sec = e.target.closest('.layer-sec');
    const row = e.target.closest('.layer-item');
    if(!sec && !row) return;
    e.preventDefault();

    const route = getRoute(CURRENT_PATH); if(!route) return;
    if(sec){
      CTX_KIND='section';
      CTX_ID = sec.getAttribute('data-sec');
      const p = (BP.blocks && BP.blocks[CTX_ID]) || {};
      showCtx(e.clientX, e.clientY, [
        {a:'sec_rename', k:'✎', t:'Переименовать раздел'},
        {a:'sec_toggle', k:'▾', t:(p.__collapsed?'Развернуть':'Свернуть')},
        {a:'sec_parent', k:'▦', t:'Поместить в раздел…'},
        'sep',
        {a:'sec_make_sheet', k:'⇢', t:'Сделать шторкой (перенести содержимое)…'},
        'sep',
        {a:'sec_del', k:'✕', t:'Удалить раздел'}
      ]);
      return;
    }
    if(row){
      CTX_KIND='block';
      CTX_ID = row.getAttribute('data-id');
      showCtx(e.clientX, e.clientY, [
        {a:'rename', k:'✎', t:'Переименовать'},
        {a:'dupe', k:'⧉', t:'Дублировать'},
        {a:'hide', k:'👁', t:'Скрыть/показать'},
        'sep',
        {a:'to_section', k:'▦', t:'Поместить в раздел…'},
        {a:'move_sheet', k:'⇢', t:'Перенести в шторку…'},
        'sep',
        {a:'copy', k:'⎘', t:'Копировать props'},
        {a:'paste', k:'⎗', t:'Вставить props'},
        'sep',
        {a:'del', k:'✕', t:'Удалить'}
      ]);
    }
  });
}

if(ctxMenu){
  ctxMenu.addEventListener('click', (e)=>{
    const mi = e.target.closest('.mi'); if(!mi) return;
    const a = mi.getAttribute('data-a');
    const route = getRoute(CURRENT_PATH); if(!route) return;
    if(!CTX_ID) return;
    hideCtx();

    if(CTX_KIND==='section'){
      if(a==='sec_rename'){
        const cur = ((BP.blocks&&BP.blocks[CTX_ID])||{}).__label || 'Раздел';
        const next = prompt('Название раздела', cur);
        if(next!==null){ pushHistory(); setLabel({id:CTX_ID}, next); renderLayers(); }
        return;
      }
      if(a==='sec_toggle'){ toggleSection(CTX_ID); return; }
      
      if(a==='sec_parent'){
        const parent = chooseSection('Выбери родительский раздел (пусто = без родителя)', CTX_ID, true);
        pushHistory();
        if(!BP.blocks) BP.blocks = {};
        BP.blocks[CTX_ID] = BP.blocks[CTX_ID] || {__isSection:true};
        BP.blocks[CTX_ID].__parent = parent || '';
        renderLayers();
        return;
      }
      if(a==='sec_make_sheet'){
        const def = '/sheet-' + slugify(((BP.blocks&&BP.blocks[CTX_ID])||{}).__label || 'section');
        const to = prompt('Путь шторки (например /sheet-bonuses)', def);
        if(to===null) return;
        pushHistory();
        makeSectionSheet(CTX_ID, CURRENT_PATH, to);
        CURRENT_PATH = (to[0]==='/'?to:'/'+to);
        renderAll();
        updatePreviewInline();
        navigatePreview(CURRENT_PATH);
        return;
      }
if(a==='sec_del'){
        if(!confirm('Удалить раздел? (блоки останутся без раздела)')) return;
        pushHistory();
        // remove section marker from route.blocks
        route.blocks = (route.blocks||[]).filter(b=>b.id!==CTX_ID);
        // unassign blocks in this section
        (route.blocks||[]).forEach(b=>{ if(getSectionOf(b)===CTX_ID) setSectionOf(b.id,''); });
        try{ delete BP.blocks[CTX_ID]; }catch(_){}
        renderLayers(); updatePreviewInline();
        return;
      }
    }

    // block actions
    const inst = (route.blocks||[]).find(b=>b.id===CTX_ID); 
    if(!inst) return;

    if(a==='rename'){ 
      const cur = blockTitle(inst);
      const next = prompt('Название слоя', cur);
      if(next!==null){ pushHistory(); setLabel(inst,next); renderLayers(); updatePreviewInline(); }
      return;
    }
    if(a==='dupe'){ 
      // reuse click handler behavior
      const fakeBtn = { getAttribute:()=> 'dupe' };
      return;
    }
    if(a==='hide'){ 
      pushHistory(); setHidden(inst, !isHidden(inst)); renderLayers(); updatePreviewInline(); return;
    }
    if(a==='del'){ 
      if(!confirm('Удалить блок?')) return;
      pushHistory();
      route.blocks = (route.blocks||[]).filter(b=>b.id!==CTX_ID);
      try{ delete BP.blocks[CTX_ID]; }catch(_){}
      if(LAYER_SEL_ID===CTX_ID) LAYER_SEL_ID=null;
      renderLayers(); updatePreviewInline();
      return;
    }
    if(a==='copy'){ copyProps(CTX_ID); return; }
    if(a==='paste'){ pasteProps(CTX_ID); return; }

    if(a==='to_section'){
      // list sections in this page
      const secs = (route.blocks||[]).filter(b=>isSection(b)).map(b=>b.id);
      if(!secs.length){
        if(confirm('На странице нет разделов. Создать новый?')){
          const name = prompt('Название раздела','Новый раздел');
          if(name===null) return;
          pushHistory();
          const secId = newSection(route,name,CTX_ID);
          setSectionOf(CTX_ID, secId);
          renderLayers(); updatePreviewInline();
        }
        return;
      }
      const names = secs.map(id=> ((BP.blocks&&BP.blocks[id])||{}).__label || id);
      const pick = prompt('В какой раздел?\n' + names.map((n,i)=>`${i+1}) ${n}`).join('\n') + '\n0) Без раздела', '1');
      if(pick===null) return;
      const n = Number(pick);
      pushHistory();
      if(n===0) setSectionOf(CTX_ID,'');
      else if(n>=1 && n<=secs.length) setSectionOf(CTX_ID, secs[n-1]);
      renderLayers(); updatePreviewInline();
      return;
    }

    if(a==='move_sheet'){
      const def = '/sheet';
      const to = prompt('Путь шторки (например /sheet-bonuses)', def);
      if(to===null) return;
      pushHistory();
      moveBlockToPath(CTX_ID, CURRENT_PATH, to);
      // keep selection on moved block
      CURRENT_PATH = to;
      LAYER_SEL_ID = CTX_ID;
      renderAll();
      updatePreviewInline();
      navigatePreview(to);
      return;
    }
  });
}

  function focusBlockInPreview(id){
    try{ frame.contentWindow.postMessage({type:'block:focus', id, path: CURRENT_PATH}, '*'); }catch(_){}
  }




  // Page accordion body: compact Layers (instead of old inline editors).
  function buildPageEditor(path, mount){
  const route = getRoute(path);
  const tab   = getTab(path);

  mount.innerHTML = '';

  const pageBox = document.createElement('div');
  pageBox.className = 'edit';
  const isSheet = !!(tab && tab.kind === 'sheet');

  pageBox.innerHTML = `



    <div class="row2" style="margin-top:8px">
    
      <button class="btn btn" type="button" data-act="layers_add_block">Добавить блок</button>
    </div>
  `;

  mount.appendChild(pageBox);

  const sheetChk = pageBox.querySelector('input[data-f="page_is_sheet"]');
  if (sheetChk){
    sheetChk.addEventListener('change', ()=>{
      const t = getTab(path);
      if (!t) return;
      pushHistory();
      if (sheetChk.checked){
        t.kind = 'sheet';
      } else if (t.kind === 'sheet'){
        t.kind = 'custom';
      }
      updatePreviewInline();
      renderNav();
    });
  }

  const list = document.createElement('div');
  list.className = 'layers-inpage';
  list.setAttribute('data-path', path);
  mount.appendChild(list);

  const searchEl = pageBox.querySelector('[data-act="layers_search"]');

  function paint(){
    const q = (searchEl && searchEl.value || '').trim().toLowerCase();
    const blocks = (route && route.blocks) ? route.blocks : [];

    list.innerHTML = (blocks || []).map((inst, ix)=>{
      if (!inst) return '';

      // ====== Раздел ======
      if (isSection(inst)){
        const p = (BP.blocks && BP.blocks[inst.id]) || {};
        const collapsed = !!p.__collapsed;
        const label = (p.__label || 'Раздел');

        if (q && !label.toLowerCase().includes(q) && !'section'.includes(q)) return '';

        const isFirst = (ix === 0);
        const isLast  = (ix === blocks.length - 1);

        return `
          <div class="layer-row is-section" data-id="${inst.id}">
            <button class="layer-fold" type="button" data-act="sec_toggle" title="Свернуть/развернуть">${collapsed ? '▸' : '▾'}</button>
            <div class="layer-main">
              <div class="layer-title">${escapeHtml(label)}</div>
              <div class="layer-sub">section</div>
            </div>
            <div class="layer-actions">
              ${isFirst ? '' : `<button class="btn xs ghost" data-act="sec_up" title="Выше">↑</button>`}
              ${isLast  ? '' : `<button class="btn xs ghost" data-act="sec_down" title="Ниже">↓</button>`}
              <button class="btn xs ghost" data-act="sec_rename" title="Переименовать">✎</button>
              <button class="btn xs ghost" data-act="more" title="Меню">⋯</button>
            </div>
          </div>
        `;
      }

      // ====== Обычный блок ======
      const title   = escapeHtml(blockTitle(inst));
      const baseSub = escapeHtml(blockSub(inst));
      const hidden  = isHidden(inst);

      const secId = getSectionOf(inst) || '';
      const secLabel = secId && BP.blocks && BP.blocks[secId]
        ? (BP.blocks[secId].__label || 'Раздел')
        : '';
      const sub = secLabel ? `↳ ${escapeHtml(secLabel)}${baseSub ? ' · ' + baseSub : ''}` : baseSub;

      if (q){
        const s = (title + ' ' + sub).toLowerCase();
        if (!s.includes(q)) return '';
      }

      const isFirst = (ix === 0);
      const isLast  = (ix === blocks.length - 1);
      const sel     = (LAYER_SEL_ID === inst.id) ? ' is-sel' : '';

      return `
        <div class="layer-row${sel}" data-id="${inst.id}" data-key="${inst.key || ''}">
          <div class="layer-main">
            <div class="layer-title">${title}</div>
            <div class="layer-sub">${sub}</div>
          </div>
          <div class="layer-actions">
            ${isFirst ? '' : `<button class="btn xs ghost" data-act="up" title="Выше">↑</button>`}
            ${isLast  ? '' : `<button class="btn xs ghost" data-act="down" title="Ниже">↓</button>`}
            <button class="btn xs ghost" data-act="edit" title="Редактировать">✎</button>
            <button class="btn xs ghost" data-act="hide" title="Скрыть/показать">${iconEye(hidden)}</button>
            <button class="btn xs ghost" data-act="dupe" title="Дублировать">⧉</button>
            <button class="btn xs ghost" data-act="more" title="Меню">⋯</button>
          </div>
        </div>
      `;
    }).join('');

    // прячем блоки под свернутым разделом
    try{
      const rowsEl = Array.from(list.querySelectorAll('.layer-row'));
      let collapsed = false;
      rowsEl.forEach(r=>{
        const id = r.getAttribute('data-id');
        const inst = (route.blocks || []).find(x=>x.id === id);
        if (inst && isSection(inst)){
          const p = (BP.blocks && BP.blocks[id]) || {};
          collapsed = !!p.__collapsed;
          r.style.display = '';
          return;
        }
        if (collapsed){
          r.style.display = 'none';
        } else if (r.style.display === 'none'){
          r.style.display = '';
        }
      });
    }catch(_){}
  }

  // === Кнопки "+ Блок" и "+ Раздел" на верхней панели ===
  pageBox.addEventListener('click', (e)=>{
    const btn = e.target.closest && e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');

    if (act === 'layers_add_block'){
      e.preventDefault();
      openBlocksModal(path, inferFilter(path));
      return;
    }

    if (act === 'layers_add_section'){
      e.preventDefault();
      const name = prompt('Название раздела', 'Раздел');
      if (name === null) return;
      pushHistory();
      newSection(route, name, null);
      recomputeSectionFlow(route);
      paint();
      updatePreviewInline();
      return;
    }
  });

  if (searchEl){
    searchEl.oninput = ()=> paint();
  }

  // === Клики по строкам слоёв ===
  list.addEventListener('click', (e)=>{
    const row = e.target.closest('.layer-row');
    if (!row) return;
    const id = row.getAttribute('data-id');
    if (!id) return;
    const inst = (route.blocks || []).find(x=>x.id === id);
    if (!inst) return;

    const btn = e.target.closest('button[data-act]');
    const act = btn ? btn.getAttribute('data-act') : '';

    // --- раздел ---
    if (isSection(inst)){
      if (act === 'sec_toggle'){
        pushHistory();
        const p = (BP.blocks && BP.blocks[id]) || (BP.blocks[id] = {});
        p.__collapsed = !p.__collapsed;
        paint();
        return;
      }
      if (act === 'sec_rename'){
        const next = prompt('Название раздела', (BP.blocks && BP.blocks[id] && BP.blocks[id].__label) || 'Раздел');
        if (next === null) return;
        pushHistory();
        if (!BP.blocks[id]) BP.blocks[id] = {};
        BP.blocks[id].__label = next;
        paint();
        updatePreviewInline();
        return;
      }
      if (act === 'sec_up' || act === 'sec_down'){
        const dir  = (act === 'sec_up') ? -1 : 1;
        const listArr = route.blocks || [];
        const ix = listArr.findIndex(x=>x.id === id);
        const nx = ix + dir;
        if (ix < 0 || nx < 0 || nx >= listArr.length) return;
        pushHistory();
        const tmp = listArr[ix]; listArr[ix] = listArr[nx]; listArr[nx] = tmp;
        recomputeSectionFlow(route);
        paint();
        updatePreviewInline();
        return;
      }
      if (act === 'more'){
        openCtxMenuFor(id, e.clientX, e.clientY);
        return;
      }
      // клик по пустому месту раздела — просто выделяем
      if (!act){
        LAYER_SEL_ID = id;
        paint();
      }
      return;
    }

    // --- обычный блок ---
    if (!act){
      LAYER_SEL_ID = id;
      CURRENT_PATH = path;
      navigatePreview(path);
      updatePreviewInline();
      try{ frame.contentWindow.postMessage({ type:'block:scroll', id }, '*'); }catch(_){}
      paint();
      return;
    }

    if (act === 'edit'){
      CURRENT_PATH = path;
      LAYER_SEL_ID = id;
      openBlockEditor(path, inst);
      paint();
      return;
    }

    if (act === 'up' || act === 'down'){
      const dir  = (act === 'up') ? -1 : 1;
      const listArr = route.blocks || [];
      const ix = listArr.findIndex(x=>x.id === id);
      const nx = ix + dir;
      if (ix < 0 || nx < 0 || nx >= listArr.length) return;
      pushHistory();
      const tmp = listArr[ix]; listArr[ix] = listArr[nx]; listArr[nx] = tmp;
      recomputeSectionFlow(route);
      paint();
      updatePreviewInline();
      return;
    }

    if (act === 'hide'){
      pushHistory();
      setHidden(inst, !isHidden(inst));
      paint();
      updatePreviewInline();
      return;
    }

    if (act === 'dupe'){
      pushHistory();
      const cloneId = 'b_' + Math.random().toString(36).slice(2,9);
      const ix = (route.blocks || []).findIndex(x=>x.id === id);
      const newInst = { id: cloneId, key: inst.key, type: inst.key };
      route.blocks.splice(ix + 1, 0, newInst);
      BP.blocks[cloneId] = JSON.parse(JSON.stringify(BP.blocks[id] || {}));
      recomputeSectionFlow(route);
      paint();
      updatePreviewInline();
      return;
    }

    if (act === 'more'){
      openCtxMenuFor(id, e.clientX, e.clientY);
      return;
    }
  });

  paint();
}




  /* ---------- Blocks modal ---------- */

  const LIB_FAV_KEY = 'lib_fav_v1';
  const LIB_REC_KEY = 'lib_recent_v1';

  function _loadSet(key){
    try{ return new Set(JSON.parse(localStorage.getItem(key)||'[]')); }catch(_){ return new Set(); }
  }
  function _saveSet(key, set){
    try{ localStorage.setItem(key, JSON.stringify(Array.from(set))); }catch(_){}
  }
  function _loadArr(key){
    try{ return JSON.parse(localStorage.getItem(key)||'[]')||[]; }catch(_){ return []; }
  }
  function _saveArr(key, arr){
    try{ localStorage.setItem(key, JSON.stringify(arr)); }catch(_){}
  }
  function _pushRecent(blockKey){
    const arr = _loadArr(LIB_REC_KEY).filter(x=>x!==blockKey);
    arr.unshift(blockKey);
    _saveArr(LIB_REC_KEY, arr.slice(0, 24));
  }

  // overlay over iframe to accept drops (iframe blocks pointer events)
  function ensureDropOverlay_(){
    const phone = document.getElementById('phone');
    if(!phone) return null;
    let ov = document.getElementById('libDropOverlay');
    if(ov) return ov;

    ov = document.createElement('div');
    ov.id = 'libDropOverlay';
    ov.className = 'lib-drop-overlay';
    ov.innerHTML = `<div class="lib-drop-hint">Отпусти, чтобы добавить блок</div>`;
    // attach to .screen so it covers iframe only
    const screen = phone.querySelector('.screen');
    (screen || phone).appendChild(ov);

    ov.addEventListener('dragover', (e)=>{ e.preventDefault(); ov.classList.add('on'); });
    ov.addEventListener('dragleave', ()=>{ ov.classList.remove('on'); });
    ov.addEventListener('drop', (e)=>{
      e.preventDefault();
      ov.classList.remove('on');
      const key = e.dataTransfer && e.dataTransfer.getData('text/x-block-key');
      if(!key) return;
      addBlockToCurrentRoute_(key);
    });

    return ov;
  }

  function addBlockToCurrentRoute_(key, path){
    const route = getRoute(path || CURRENT_PATH);
    if(!route) return;
    pushHistory();
    const id = 'b_'+Math.random().toString(36).slice(2,9);
    route.blocks = route.blocks||[];
    route.blocks.push({ id, key, type: key });

    BP.blocks[id] = JSON.parse(JSON.stringify(window.BlockRegistry[key].defaults||{}));
    _pushRecent(key);
    updatePreviewInline();
    renderNav();
  }

  function openRenameModal(path){
    const t = getTab(path);
    if(!renameModal || !t) return;
    RENAME_CTX = {path};
    if(renamePathEl) renamePathEl.textContent = path;
    if(renameInput) renameInput.value = (t.title||'').trim();
    openPopup(renameModal);
    renameModal.classList.add('on');
    setTimeout(()=>{ try{
      if(renameInput){ renameInput.focus(); renameInput.select(); }
    }catch(_){ } }, 50);
  }

  function closeRenameModal(){
    try{ closePopup(renameModal); }catch(_){}
    try{ renameModal && renameModal.classList.remove('on'); }catch(_){}
    RENAME_CTX = null;
  }

  function applyRename(){
    if(!RENAME_CTX) return;
    const path = RENAME_CTX.path;
    const t = getTab(path); if(!t) return closeRenameModal();
    const val = (renameInput ? renameInput.value : '').trim();
    if(!val) return;
    pushHistory();
    t.title = val;
    updatePreviewInline();
    renderNav();
    closeRenameModal();
  }

  if(renameCancel) renameCancel.onclick = closeRenameModal;
  if(renameSave) renameSave.onclick = applyRename;
  if(renameInput) renameInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      applyRename();
    } else if(e.key === 'Escape'){
      e.preventDefault();
      closeRenameModal();
    }
  });


  function openBlocksModal(path, filter){
    openPopup(modal);
    MODAL_CTX = {path, filter, cat: (MODAL_CTX && MODAL_CTX.cat) || '__all__', mode: (MODAL_CTX && MODAL_CTX.mode) || 'page'};
    mRoute.textContent = path;
    modal.classList.add('on');
    renderModalList();
  }
  function closeModal(){ try{ closePopup(modal); }catch(_){} MODAL_CTX=null; try{ if(mSearch) mSearch.value=''; }catch(_){} }

  // Modal close controls
  if (mClose) mClose.onclick = closeModal;
  if (modal){
    modal.addEventListener('click', (e)=>{
      // click on backdrop closes
      if (e.target === modal) closeModal();
    });
  }
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && modal && modal.classList.contains('on')) closeModal();
  });

  function renderModalList(){
    if(!MODAL_CTX) return;

    const q = (mSearch.value||'').toLowerCase().trim();
    const mode = MODAL_CTX.mode || 'page'; // page | all
    const activeCat = MODAL_CTX.cat || '__all__';

    // Top chips removed (kept minimal UI: only search + left categories)
    try{ if(mCats){ mCats.innerHTML=''; mCats.style.display='none'; } }catch(_){}
    try{ if(mSelectAll){ mSelectAll.style.display='none'; } }catch(_){}

    // Prepare list of available blocks
    const reg = window.BlockRegistry||{};
    const keys = Object.keys(reg);

    // Filter for page mode
    const route = getRoute(MODAL_CTX.path);
    const kind = (route && route.kind) ? String(route.kind) : '';
    const pageTag = kind || (MODAL_CTX.path||'').replace(/^\//,'') || 'home';

    const filtered = keys.filter(k=>{
      const v = reg[k]||{};
      const tags = (v.tags||v.meta?.tags||[]).map(String);
      if(mode==='page'){
        // show blocks that match pageTag or kind or explicitly 'all'
        if(tags.length){
          if(tags.includes('all') || tags.includes(pageTag) || (kind && tags.includes(kind))) return true;
          return false;
        }
        // legacy fallback: allow blocks without tags
        return true;
      }
      return true;
    });

    // Search filter
    const searched = q ? filtered.filter(k=>{
      const v=reg[k]||{};
      const t=((v.title||'')+' '+(v.category||'')+' '+k).toLowerCase();
      return t.includes(q);
    }) : filtered;

    // Categorize
    const fav = _loadSet(LIB_FAV_KEY);
    const recent = _loadArr(LIB_REC_KEY);
    
    // --------- Library categories (custom buckets) ---------
    const BUCKET_ORDER = ['Заголовки','Контент','Карточки','Кнопки / действия','Игры','Шторки','Другое'];

    function bucketFor(k,v){
      const key = String(k||'').toLowerCase();
      const cat0 = (v.category || (v.meta && v.meta.category) || '').toLowerCase();
      const title0 = (v.title || '').toLowerCase();
      const tags0 = (v.tags || (v.meta && v.meta.tags) || []);
      const tags = Array.isArray(tags0) ? tags0.map(x=>String(x).toLowerCase()) : [];

      const has = (s)=> (cat0.includes(s) || title0.includes(s));
      const tag = (s)=> tags.includes(s);

      if(key==='sheet' || has('штор') || has('sheet') || tag('sheet') || tag('drawer')) return 'Шторки';

      if(has('игр') || tag('game') || tag('games') || key.includes('game') || key.includes('flappy') || key.includes('wheel') || key.includes('tournament') || key.includes('leader')) return 'Игры';

      if(has('кноп') || has('cta') || tag('cta') || key==='cta' || key.includes('button') || key.includes('btn')) return 'Кнопки / действия';

      if(has('hero') || has('заг') || has('header') || key.includes('hero') || key.includes('title') || key.includes('header')) return 'Заголовки';

      if(has('card') || has('карточ') || has('grid') || tag('cards') || key.includes('card') || key.includes('tile') || key.includes('grid')) return 'Карточки';

      if(has('контент') || has('content') || has('promo') || tag('content') || key.includes('promo') || key.includes('profile') || key.includes('bonus') || key.includes('stamp') || key.includes('features') || key.includes('media')) return 'Контент';

      return 'Другое';
    }

    const cats = {};
    const addToCat = (c,k)=>{ (cats[c]=cats[c]||[]).push(k); };

    searched.forEach(k=>{
      const v = reg[k]||{};
      addToCat(bucketFor(k,v), k);
    });

    // sort inside each bucket
    Object.keys(cats).forEach(c=>{
      cats[c].sort((a,b)=>{
        const A=reg[a]||{}, B=reg[b]||{};
        return (A.title||a).localeCompare((B.title||b),'ru');
      });
    });

    // Ensure we have a valid active category
    if(activeCat!=='__all__' && activeCat!=='__fav__' && activeCat!=='__recent__' && !cats[activeCat]){
      MODAL_CTX.cat='__all__';
    }

    // --------- Layout: left categories + right grid ---------
    const titleByCat = (c)=> (c==='__all__'?'Все блоки':(c==='__fav__'?'Избранное':(c==='__recent__'?'Недавние':c)));

    mList.innerHTML = `
      <div class="lib-wrap">
        <div class="lib-side">
          <div class="lib-side-title">Типы</div>
          <button class="lib-side-item ${MODAL_CTX.cat==='__all__'?'on':''}" data-side="__all__">Все блоки <span class="cnt">${searched.length||''}</span></button>
          <button class="lib-side-item ${MODAL_CTX.cat==='__fav__'?'on':''}" data-side="__fav__">Избранное <span class="cnt">${fav.size||''}</span></button>
          <button class="lib-side-item ${MODAL_CTX.cat==='__recent__'?'on':''}" data-side="__recent__">Недавние <span class="cnt">${recent.length||''}</span></button>
          <div class="lib-side-sep"></div>
          <div class="lib-side-scroll">
            ${BUCKET_ORDER.filter(c=>cats[c] && cats[c].length).map(c=>{
              const on = MODAL_CTX.cat===c;
              return `<button class="lib-side-item ${on?'on':''}" data-side="${c.replace(/"/g,'&quot;')}">${c}<span class="cnt">${(cats[c]||[]).length||''}</span></button>`;
            }).join('')}
          </div>
        </div>
        <div class="lib-main">
          <div class="lib-main-head">
            <div class="lib-main-title">${titleByCat(MODAL_CTX.cat)}</div>
            <div class="lib-hint">Двойной клик — добавить</div>
          </div>
          <div class="lib-grid" id="libGrid"></div>
        </div>
      </div>
    `;

    // side click
    mList.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{
      MODAL_CTX.cat = b.dataset.side;
      renderModalList();
    });

    const grid = mList.querySelector('#libGrid');


    // helper to render a card
    function card(k){
      try{
      const v = reg[k]||{};
      const isFav = fav.has(k);
      const prev = (v.preview && typeof v.preview==='function')
        ? v.preview(v.defaults||{})
        : (v.view || '<div style="padding:10px;opacity:.7">Preview</div>');

// --- Static thumb image for block card ---
// put files in project root: thumbs/<blockKey>.png (or .jpg/.webp)
const thumb = (v.thumb || (v.meta && v.meta.thumb) || '').trim();
const thumbUrl = thumb || `thumbs/${k}.png`;

// превью: сначала пытаемся показать картинку, если нет — fallback на иконку/🧩
let prevHtml = (()=>{
  const ico = ((v.icon||v.emoji||(v.meta&&v.meta.icon)||'🧩')+'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const img = `<img class="lib-thumb-img" src="${thumbUrl}" alt="" loading="lazy"
    onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">`;
  const fb  = `<div class="lib-thumb-fallback" style="display:none">${ico}</div>`;
  return img+fb;
})();

const el = document.createElement('div');
      el.className = 'lib-card';
      el.setAttribute('draggable', ENABLE_REORDER ? 'true' : 'false');
      el.dataset.key = k;
      el.innerHTML = `
        <div class="lib-thumb">${prevHtml}</div>
        <div class="lib-meta">
          <div class="lib-title" title="${(v.title||k).replace(/"/g,'&quot;')}">${v.title||k}</div>
          <button class="lib-fav ${isFav?'on':''}" title="Избранное">★</button>
        </div>
        <button class="btn lib-add" data-add="${k}">Добавить</button>
      `;

      // Fav toggle
      el.querySelector('.lib-fav').onclick=(e)=>{
        e.preventDefault(); e.stopPropagation();
        if(fav.has(k)) fav.delete(k); else fav.add(k);
        _saveSet(LIB_FAV_KEY, fav);
        renderModalList();
      };

      // Add click
      el.querySelector('[data-add]').onclick=()=>{
        addBlockToCurrentRoute_(k, (MODAL_CTX && MODAL_CTX.path));
        // keep modal open, but update recent/fav counters
        renderModalList();
      };

      // Double click anywhere on card = quick add
      el.addEventListener('dblclick', (e)=>{
        // ignore dblclick on favorite button
        if(e.target && e.target.closest && e.target.closest('.lib-fav')) return;
        addBlockToCurrentRoute_(k, (MODAL_CTX && MODAL_CTX.path));
        renderModalList();
      });

      // Drag add from library is optional
      if (ENABLE_REORDER){
        el.addEventListener('dragstart',(e)=>{
          try{ e.dataTransfer.setData('text/x-block-key', k); }catch(_){}
          e.dataTransfer.effectAllowed='copy';
          const ov = ensureDropOverlay_();
          if(ov) ov.classList.add('ready');
        });
        el.addEventListener('dragend',()=>{
          const ov = document.getElementById('libDropOverlay');
          if(ov) ov.classList.remove('ready','on');
        });
      }

      return el;
      }catch(e){
        console.warn('lib card render failed', k, e);
        const v = (reg && reg[k]) ? reg[k] : {};
        const title = (v && v.title) ? v.title : k;
        const el = document.createElement('div');
        el.className = 'lib-card';
        el.dataset.key = k;
        el.innerHTML = `
          <div class="lib-thumb"><div class="lib-thumb-fallback">🧩</div></div>
          <div class="lib-meta">
            <div class="lib-title">${String(title).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
          </div>
          <button class="btn lib-add" data-add="${k}">Добавить</button>
        `;
        const btn = el.querySelector('[data-add]');
        if(btn) btn.onclick = ()=>{ addBlockToCurrentRoute_(k, (MODAL_CTX && MODAL_CTX.path)); renderModalList(); };
        // double click quick add
        el.addEventListener('dblclick', ()=>{ addBlockToCurrentRoute_(k, (MODAL_CTX && MODAL_CTX.path)); renderModalList(); });
        return el;
      }
    }

    // Fill grid based on activeCat
    let listKeys=[];
    if(activeCat==='__fav__'){
      listKeys = searched.filter(k=>fav.has(k));
    }else if(activeCat==='__recent__'){
      const set = new Set(searched);
      listKeys = recent.filter(k=>set.has(k));
    }else if(activeCat==='__all__'){
      // merge buckets in stable order
      const merged=[];
      (BUCKET_ORDER||[]).forEach(c=>{ (cats[c]||[]).forEach(k=>merged.push(k)); });
      // add anything that somehow wasn't bucketed
      const inMerged = new Set(merged);
      searched.forEach(k=>{ if(!inMerged.has(k)) merged.push(k); });
      listKeys = merged;
    }else{
      listKeys = (cats[activeCat]||[]);
    }

    // render
    (listKeys||[]).forEach(k=>grid.appendChild(card(k)));

    // "select all" becomes "expand all categories" doesn't make sense anymore; use to switch to all mode
    mSelectAll.textContent = (mode==='page') ? 'Показать все блоки' : 'Показать блоки страницы';
    mSelectAll.onclick=()=>{
      MODAL_CTX.mode = (mode==='page') ? 'all' : 'page';
      renderModalList();
    };
  }
  /* ---------- Block editor modal ---------- */
  function openBlockEditor(path, inst){
    openPopup(be);
    BE_CTX = {path, inst};
const reg = window.BlockRegistry[inst.key]||{};
beTitle.textContent = reg.title || inst.key;

// аккуратно подтягиваем defaults, чтобы старые блоки получили новые поля
let props = BP.blocks[inst.id];
const defProps = reg.defaults || {};
if (!props || typeof props !== 'object'){
  props = JSON.parse(JSON.stringify(defProps));
} else {
  // merge: если в сохранённом блоке какого-то поля нет, берём из defaults
  for (const k in defProps){
    if (props[k] === undefined) props[k] = defProps[k];
  }
}
BP.blocks[inst.id] = props;

beBody.innerHTML = '';

        const addField = (label, html) => {
      const wrap = document.createElement('div'); wrap.className='edit';
      wrap.innerHTML = `<label>${label}</label>${html}`;
      beBody.appendChild(wrap); 
      return wrap;
    };

    // Для инфо-карточек свой кастомный редактор ниже,
    // поэтому базовые поля не рисуем, чтобы не было дублей.
    const skipGeneric =
    inst.key === 'infoCard' ||
      inst.key === 'infoCardPlain' ||
      inst.key === 'infoCardChevron';

    if (!skipGeneric && props.title!==undefined){
      addField('Заголовок', `<input type="text" data-f="title" value="${props.title||''}">`);
    }
    if (!skipGeneric && props.text!==undefined){
      addField('Текст', `<input type="text" data-f="text" value="${props.text||''}">`);
    }
    if (!skipGeneric && props.label!==undefined){
      addField('Кнопка', `<input type="text" data-f="label" value="${props.label||''}">`);
    }
    if (!skipGeneric && props.link!==undefined){
      addField('Ссылка', `<input type="text" data-f="link" value="${props.link||''}">`);
    }
    if (!skipGeneric && props.secondary!==undefined){
      addField('Вторая кнопка', `<input type="text" data-f="secondary" value="${props.secondary||''}">`);
    }
    if (!skipGeneric && Array.isArray(props.items||null)){
      addField(
        'Пункты (через запятую)',
        `<input type="text" data-f="items" value="${(props.items||[]).join(', ')}">`
      );
    }
    if (!skipGeneric && Array.isArray(props.tiles||null)){
      addField(
        'Тайлы (через запятую)',
        `<input type="text" data-f="tiles" value="${(props.tiles||[]).join(', ')}">`
      );
    }
    if (!skipGeneric && props.img!==undefined){
      const w = addField(
        'Картинка',
        `<input type="text" data-f="img" value="${props.img||''}">
         <div class="row2">
           <label>Или загрузить файл</label>
           <input type="file" data-f="imgUpload" accept="image/*">
         </div>`
      );
      const up   = w.querySelector('input[type=file]');
      const text = w.querySelector('input[type=text]');
      up.addEventListener('change', (e)=>{
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ()=>{
          pushHistory();
          props.img = reader.result;
          text.value = props.img;
          updatePreviewInline();
        };
        reader.readAsDataURL(file);
      });
    }





        // === Специальные настройки для блока "Отступ" (spacer) ===
    if (inst.key === 'spacer') {
      if (props.size === undefined) props.size = 16;

      const w = addField('Высота отступа (px)', `
        <input type="number" min="0" max="200" step="4" data-f="sp_size" value="${props.size}">
      `);

      const inp = w.querySelector('[data-f="sp_size"]');
      inp.addEventListener('input', ()=>{
        pushHistory();
        const v = parseInt(inp.value, 10);
        props.size = (Number.isFinite(v) && v >= 0) ? v : 16;
        updatePreviewInline();
      });
    }


        // === Специальные настройки для инфо-карточки без кнопки (infoCardPlain) ===
    if (inst.key === 'infoCardPlain') {
      if (!props) BP.blocks[inst.id] = props = {};

      const reg = window.BlockRegistry.infoCardPlain || {};
      const d   = reg.defaults || {};

      // дефолты
      if (props.icon       === undefined) props.icon       = d.icon       || '';
      if (props.title      === undefined) props.title      = d.title      || 'Craft Beer';
      if (props.sub        === undefined) props.sub        = d.sub        || 'Кто мы, где мы';
      if (props.imgSide    === undefined) props.imgSide    = d.imgSide    || 'left';
      if (props.action     === undefined) props.action     = d.action     || 'none';
      if (props.link       === undefined) props.link       = d.link       || '';
      if (props.sheet_id   === undefined) props.sheet_id   = d.sheet_id   || '';
      if (props.sheet_path === undefined) props.sheet_path = d.sheet_path || '';



      // ЗАГОЛОВОК
      {
        const w = addField('Заголовок', `
          <input type="text" data-icp-k="title"
                 value="${(props.title || '').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icp-k="title"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.title = inp.value;
          updatePreviewInline();
        });
      }

      // ОПИСАНИЕ
      {
        const w = addField('Описание', `
          <input type="text" data-icp-k="sub"
                 value="${(props.sub || '').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icp-k="sub"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sub = inp.value;
          updatePreviewInline();
        });
      }

            // ИКОНКА (URL + загрузка)
      {
        const w = addField('Иконка', `
          <input type="text" data-icp-k="icon"
                 value="${(props.icon || '').replace(/"/g,'&quot;')}"
                 placeholder="URL или заполнится при загрузке файла">
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <input type="file" data-icp-upload accept="image/*">
            ${props.icon ? `<img src="${props.icon}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.16);">` : ''}
          </div>
        `);

        const urlInp = w.querySelector('[data-icp-k="icon"]');
        urlInp.addEventListener('input', ()=>{
          pushHistory();
          props.icon = urlInp.value;
          updatePreviewInline();
        });

        const upload = w.querySelector('[data-icp-upload]');
        upload.addEventListener('change', (e)=>{
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ()=>{
            pushHistory();
            props.icon = reader.result;
            updatePreviewInline();
          };
          reader.readAsDataURL(file);
        });
      }

      // СТОРОНА КАРТИНКИ
      {
        const w = addField('Расположение изображения', `
          <select data-icp-k="imgSide">
            <option value="left"${props.imgSide==='left'?' selected':''}>Слева</option>
            <option value="right"${props.imgSide==='right'?' selected':''}>Справа</option>
          </select>
        `);
        const sel = w.querySelector('[data-icp-k="imgSide"]');
        sel.addEventListener('change', ()=>{
          pushHistory();
          props.imgSide = sel.value === 'right' ? 'right' : 'left';
          updatePreviewInline();
        });
      }

      // ДЕЙСТВИЕ ПО КЛИКУ НА ИЗОБРАЖЕНИЕ
      {
        const w = addField('Действие при клике по изображению', `
          <select data-icp-k="action">
            <option value="none"${props.action==='none'?' selected':''}>Без действия</option>
            <option value="link"${props.action==='link'?' selected':''}>Перейти по ссылке / якорю</option>
            <option value="sheet"${props.action==='sheet'?' selected':''}>Открыть шторку</option>
            <option value="sheet_page"${props.action==='sheet_page'?' selected':''}>Открыть шторку-страницу</option>
          </select>
        `);
        const sel = w.querySelector('[data-icp-k="action"]');
        sel.addEventListener('change', ()=>{
          pushHistory();
          props.action = sel.value;
          updatePreviewInline();
        });
      }

      // ССЫЛКА / ЯКОРЬ
      {
        const w = addField('Ссылка или якорь (#play, /about, https://...)', `
          <input type="text" data-icp-k="link"
                 value="${(props.link || '').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icp-k="link"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.link = inp.value;
          updatePreviewInline();
        });
      }

      // ID ШТОРКИ
      {
        const w = addField('ID шторки (для «Открыть шторку»)', `
          <input type="text" data-icp-k="sheet_id"
                 value="${(props.sheet_id || '').replace(/"/g,'&quot;')}"
                 placeholder="например, sheet1">
        `);
        const inp = w.querySelector('[data-icp-k="sheet_id"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_id = inp.value;
          updatePreviewInline();
        });
      }

      // ПУТЬ ШТОРКИ-СТРАНИЦЫ
      {
        const w = addField('Путь шторки-страницы (для «Открыть шторку-страницу»)', `
          <input type="text" data-icp-k="sheet_path"
                 value="${(props.sheet_path || '').replace(/"/g,'&quot;')}"
                 placeholder="/sheet/about">
        `);
        const inp = w.querySelector('[data-icp-k="sheet_path"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_path = inp.value;
          updatePreviewInline();
        });
      }
    }




        // === Специальные настройки для блока "Игры: список с кнопками" (gamesList) ===
    if (inst.key === 'gamesList') {
      if (!props) BP.blocks[inst.id] = props = {};
      const reg = window.BlockRegistry.gamesList || {};
      if (!Array.isArray(props.cards)) {
        props.cards = (reg.defaults && reg.defaults.cards)
          ? JSON.parse(JSON.stringify(reg.defaults.cards))
          : [];
      }
      if (props.title === undefined) props.title = reg.defaults && reg.defaults.title || 'Игры';

      // Заголовок блока
      {
        const w = addField('Заголовок блока', `
          <input type="text" data-glist-title value="${props.title||''}">
        `);
        const inp = w.querySelector('[data-glist-title]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.title = inp.value;
          updatePreviewInline();
        });
      }

      // Список карточек
      const wList = addField('Карточки игр', `
        <div class="card" style="display:grid;gap:10px">
          <div data-glist-list style="display:grid;gap:10px"></div>
          <button class="btn" type="button" data-glist-add>+ Добавить карточку</button>
        </div>
      `);
      const listEl = wList.querySelector('[data-glist-list]');
      const addBtn = wList.querySelector('[data-glist-add]');

      function renderGamesList(){
        const cards = Array.isArray(props.cards) ? props.cards : [];
        listEl.innerHTML = cards.map((c, idx)=>{
          const icon       = c && c.icon       ? String(c.icon).replace(/"/g,'&quot;')       : '';
          const title      = c && c.title      ? String(c.title).replace(/"/g,'&quot;')      : '';
          const sub        = c && c.sub        ? String(c.sub).replace(/"/g,'&quot;')        : '';
          const btn        = c && c.btn        ? String(c.btn).replace(/"/g,'&quot;')        : '';
          const action     = c && c.action     ? String(c.action)                            : 'link';
          const link       = c && c.link       ? String(c.link).replace(/"/g,'&quot;')       : '';
          const sheet_id   = c && c.sheet_id   ? String(c.sheet_id).replace(/"/g,'&quot;')   : '';
          const sheet_path = c && c.sheet_path ? String(c.sheet_path).replace(/"/g,'&quot;') : '';

          return `
            <div class="card" style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <b>Карточка #${idx+1}</b>
                <button class="btn smallbtn" type="button" data-glist-del="${idx}">Удалить</button>
              </div>

              <div class="edit">
                <label>Иконка</label>
                <input type="text" data-glist-idx="${idx}" data-k="icon" value="${icon}" placeholder="URL или заполняется при загрузке файла">
                <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
                  <input type="file" data-glist-upload="${idx}" accept="image/*">
                  ${icon ? `<img src="${icon}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.16);">` : ''}
                </div>
              </div>

              <div class="edit">
                <label>Заголовок</label>
                <input type="text" data-glist-idx="${idx}" data-k="title" value="${title}">
              </div>

              <div class="edit">
                <label>Описание</label>
                <input type="text" data-glist-idx="${idx}" data-k="sub" value="${sub}">
              </div>

              <div class="edit">
                <label>Текст кнопки</label>
                <input type="text" data-glist-idx="${idx}" data-k="btn" value="${btn}" placeholder="Играть / Скоро">
              </div>

              <div class="edit">
                <label>Действие кнопки</label>
                <select data-glist-idx="${idx}" data-k="action">
                  <option value="none"${action==='none'?' selected':''}>Без действия</option>
                  <option value="link"${action==='link'?' selected':''}>Перейти по ссылке / якорю</option>
                  <option value="sheet"${action==='sheet'?' selected':''}>Открыть шторку</option>
                  <option value="sheet_page"${action==='sheet_page'?' selected':''}>Открыть шторку-страницу</option>
                </select>
              </div>

              <div class="edit">
                <label>Ссылка или якорь (#play, /tournament, https://...)</label>
                <input type="text" data-glist-idx="${idx}" data-k="link" value="${link}">
              </div>

              <div class="edit">
                <label>ID шторки (для действия «Открыть шторку»)</label>
                <input type="text" data-glist-idx="${idx}" data-k="sheet_id" value="${sheet_id}" placeholder="например, sheet1">
              </div>

              <div class="edit">
                <label>Путь шторки-страницы (для «Открыть шторку-страницу»)</label>
                <input type="text" data-glist-idx="${idx}" data-k="sheet_path" value="${sheet_path}" placeholder="/sheet/last_prizes">
              </div>
            </div>
          `;
        }).join('');

        // текстовые поля (icon/title/sub/btn/link/sheet_id/sheet_path)
        listEl.querySelectorAll('input[data-glist-idx]').forEach(inp=>{
          inp.addEventListener('input', ()=>{
            const i = Number(inp.dataset.glistIdx);
            const k = inp.dataset.k;
            if (!Number.isFinite(i) || !k) return;
            pushHistory();
            props.cards[i] = props.cards[i] || {};
            props.cards[i][k] = inp.value;
            updatePreviewInline();
          });
        });

        // select (action)
        listEl.querySelectorAll('select[data-glist-idx][data-k="action"]').forEach(sel=>{
          sel.addEventListener('change', ()=>{
            const i = Number(sel.dataset.glistIdx);
            if (!Number.isFinite(i)) return;
            pushHistory();
            props.cards[i] = props.cards[i] || {};
            props.cards[i].action = sel.value;
            updatePreviewInline();
          });
        });

        // загрузка иконки
        listEl.querySelectorAll('input[type=file][data-glist-upload]').forEach(up=>{
          up.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const i = Number(up.dataset.glistUpload);
            if (!Number.isFinite(i)) return;
            const reader = new FileReader();
            reader.onload = ()=>{
              pushHistory();
              props.cards[i] = props.cards[i] || {};
              props.cards[i].icon = reader.result;
              renderGamesList();
              updatePreviewInline();
            };
            reader.readAsDataURL(file);
          });
        });

        // удаление карточки
        listEl.querySelectorAll('[data-glist-del]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.glistDel);
            if (!Number.isFinite(i)) return;
            if (!confirm('Удалить эту карточку?')) return;
            pushHistory();
            props.cards.splice(i,1);
            renderGamesList();
            updatePreviewInline();
          });
        });
      }

      addBtn.addEventListener('click', ()=>{
        pushHistory();
        if (!Array.isArray(props.cards)) props.cards = [];
        props.cards.push({
          icon:'',
          title:'Новая игра',
          sub:'Описание',
          btn:'Играть',
          action:'link',
          link:'#play',
          sheet_id:'',
          sheet_path:''
        });
        renderGamesList();
        updatePreviewInline();
      });

      renderGamesList();
    }



        // === Специальные настройки для инфо-карточки с кнопкой (infoCard) ===
    if (inst.key === 'infoCard') {
      const reg = window.BlockRegistry.infoCard || {};
      if (!props) BP.blocks[inst.id] = props = {};
      // начальные значения из defaults
      if (props.icon       === undefined) props.icon       = (reg.defaults && reg.defaults.icon)  || '';
      if (props.title      === undefined) props.title      = (reg.defaults && reg.defaults.title) || '';
      if (props.sub        === undefined) props.sub        = (reg.defaults && reg.defaults.sub)   || '';
      if (props.btn        === undefined) props.btn        = (reg.defaults && reg.defaults.btn)   || 'Подробнее';
      if (props.action     === undefined) props.action     = (reg.defaults && reg.defaults.action)|| 'link';
      if (props.link       === undefined) props.link       = reg.defaults && reg.defaults.link     || '';
      if (props.sheet_id   === undefined) props.sheet_id   = reg.defaults && reg.defaults.sheet_id || '';
      if (props.sheet_path === undefined) props.sheet_path = reg.defaults && reg.defaults.sheet_path || '';



      // Заголовок
      {
        const w = addField('Заголовок', `
          <input type="text" data-icard-k="title" value="${(props.title||'').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icard-k="title"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.title = inp.value;
          updatePreviewInline();
        });
      }

      // Описание
      {
        const w = addField('Описание', `
          <input type="text" data-icard-k="sub" value="${(props.sub||'').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icard-k="sub"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sub = inp.value;
          updatePreviewInline();
        });
      }

            // Иконка (URL + загрузка)
      {
        const w = addField('Иконка', `
          <input type="text" data-icard-k="icon" value="${(props.icon||'').replace(/"/g,'&quot;')}" placeholder="URL или заполнится при загрузке файла">
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <input type="file" data-icard-upload accept="image/*">
            ${props.icon ? `<img src="${props.icon}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.16);">` : ''}
          </div>
        `);

        const urlInp = w.querySelector('[data-icard-k="icon"]');
        urlInp.addEventListener('input', ()=>{
          pushHistory();
          props.icon = urlInp.value;
          updatePreviewInline();
        });

        const upload = w.querySelector('[data-icard-upload]');
        upload.addEventListener('change', (e)=>{
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ()=>{
            pushHistory();
            props.icon = reader.result;
            updatePreviewInline();
          };
          reader.readAsDataURL(file);
        });
      }

      // Текст кнопки
      {
        const w = addField('Текст кнопки', `
          <input type="text" data-icard-k="btn" value="${(props.btn||'').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icard-k="btn"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.btn = inp.value;
          updatePreviewInline();
        });
      }

      // Действие кнопки (как в CTA/beerStartList)
      {
        const w = addField('Действие кнопки', `
          <select data-icard-k="action">
            <option value="none"${props.action==='none'?' selected':''}>Без действия</option>
            <option value="link"${props.action==='link'?' selected':''}>Перейти по ссылке / якорю</option>
            <option value="sheet"${props.action==='sheet'?' selected':''}>Открыть шторку</option>
            <option value="sheet_page"${props.action==='sheet_page'?' selected':''}>Открыть шторку-страницу</option>
          </select>
        `);
        const sel = w.querySelector('[data-icard-k="action"]');
        sel.addEventListener('change', ()=>{
          pushHistory();
          props.action = sel.value;
          updatePreviewInline();
        });
      }

      // Ссылка / якорь
      {
        const w = addField('Ссылка или якорь (#play, /about, https://...)', `
          <input type="text" data-icard-k="link" value="${(props.link||'').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icard-k="link"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.link = inp.value;
          updatePreviewInline();
        });
      }

      // ID шторки
      {
        const w = addField('ID шторки (для «Открыть шторку»)', `
          <input type="text" data-icard-k="sheet_id" value="${(props.sheet_id||'').replace(/"/g,'&quot;')}" placeholder="например, sheet1">
        `);
        const inp = w.querySelector('[data-icard-k="sheet_id"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_id = inp.value;
          updatePreviewInline();
        });
      }

      // Путь шторки-страницы
      {
        const w = addField('Путь шторки-страницы (для «Открыть шторку-страницу»)', `
          <input type="text" data-icard-k="sheet_path" value="${(props.sheet_path||'').replace(/"/g,'&quot;')}" placeholder="/sheet/about">
        `);
        const inp = w.querySelector('[data-icard-k="sheet_path"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_path = inp.value;
          updatePreviewInline();
        });
      }
    }



        // === Специальные настройки для инфо-карточки со стрелкой (infoCardChevron) ===
    if (inst.key === 'infoCardChevron') {
      if (!props) BP.blocks[inst.id] = props = {};

      const reg = window.BlockRegistry.infoCardChevron || {};
      const d   = reg.defaults || {};

      // дефолты
      if (props.icon       === undefined) props.icon       = d.icon       || '';
      if (props.title      === undefined) props.title      = d.title      || 'Craft Beer';
      if (props.sub        === undefined) props.sub        = d.sub        || 'Кто мы, где мы';
      if (props.action     === undefined) props.action     = d.action     || 'link';
      if (props.link       === undefined) props.link       = d.link       || '#about';
      if (props.sheet_id   === undefined) props.sheet_id   = d.sheet_id   || '';
      if (props.sheet_path === undefined) props.sheet_path = d.sheet_path || '';



      // ЗАГОЛОВОК
      {
        const w = addField('Заголовок', `
          <input type="text" data-icardc-k="title"
                 value="${(props.title || '').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icardc-k="title"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.title = inp.value;
          updatePreviewInline();
        });
      }

      // ОПИСАНИЕ
      {
        const w = addField('Описание', `
          <input type="text" data-icardc-k="sub"
                 value="${(props.sub || '').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icardc-k="sub"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sub = inp.value;
          updatePreviewInline();
        });
      }

            // ИКОНКА (URL + загрузка)
      {
        const w = addField('Иконка', `
          <input type="text" data-icardc-k="icon"
                 value="${(props.icon || '').replace(/"/g,'&quot;')}"
                 placeholder="URL или заполнится при загрузке файла">
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <input type="file" data-icardc-upload accept="image/*">
            ${props.icon ? `<img src="${props.icon}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.16);">` : ''}
          </div>
        `);

        const urlInp = w.querySelector('[data-icardc-k="icon"]');
        urlInp.addEventListener('input', ()=>{
          pushHistory();
          props.icon = urlInp.value;
          updatePreviewInline();
        });

        const upload = w.querySelector('[data-icardc-upload]');
        upload.addEventListener('change', (e)=>{
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ()=>{
            pushHistory();
            props.icon = reader.result;
            updatePreviewInline();
          };
          reader.readAsDataURL(file);
        });
      }

      // ДЕЙСТВИЕ КНОПКИ (как CTA / стартовые)
      {
        const w = addField('Действие стрелки', `
          <select data-icardc-k="action">
            <option value="none"${props.action==='none'?' selected':''}>Без действия</option>
            <option value="link"${props.action==='link'?' selected':''}>Перейти по ссылке / якорю</option>
            <option value="sheet"${props.action==='sheet'?' selected':''}>Открыть шторку</option>
            <option value="sheet_page"${props.action==='sheet_page'?' selected':''}>Открыть шторку-страницу</option>
          </select>
        `);
        const sel = w.querySelector('[data-icardc-k="action"]');
        sel.addEventListener('change', ()=>{
          pushHistory();
          props.action = sel.value;
          updatePreviewInline();
        });
      }

      // ССЫЛКА / ЯКОРЬ
      {
        const w = addField('Ссылка или якорь (#play, /about, https://...)', `
          <input type="text" data-icardc-k="link"
                 value="${(props.link || '').replace(/"/g,'&quot;')}">
        `);
        const inp = w.querySelector('[data-icardc-k="link"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.link = inp.value;
          updatePreviewInline();
        });
      }

      // ID ШТОРКИ
      {
        const w = addField('ID шторки (для «Открыть шторку»)', `
          <input type="text" data-icardc-k="sheet_id"
                 value="${(props.sheet_id || '').replace(/"/g,'&quot;')}"
                 placeholder="например, sheet1">
        `);
        const inp = w.querySelector('[data-icardc-k="sheet_id"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_id = inp.value;
          updatePreviewInline();
        });
      }

      // ПУТЬ ШТОРКИ-СТРАНИЦЫ
      {
        const w = addField('Путь шторки-страницы (для «Открыть шторку-страницу»)', `
          <input type="text" data-icardc-k="sheet_path"
                 value="${(props.sheet_path || '').replace(/"/g,'&quot;')}"
                 placeholder="/sheet/about">
        `);
        const inp = w.querySelector('[data-icardc-k="sheet_path"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_path = inp.value;
          updatePreviewInline();
        });
      }
    }




    // === Специальные настройки для промо-слайдера (promo) ===
    if (inst.key === 'promo') {
      if (!Array.isArray(props.slides)) {
        props.slides = [
          { img:'', action:'link', link:'#play', sheet_id:'', sheet_path:'' }
        ];
      }
      if (props.interval == null) props.interval = 4000;

      // Интервал смены слайдов
      {
        const w = addField('Интервал смены слайдов (мс)', `
          <input type="number" min="1000" step="500" data-promo-interval value="${props.interval}">
        `);
        const inp = w.querySelector('[data-promo-interval]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          const val = parseInt(inp.value, 10);
          props.interval = (isFinite(val) && val > 0) ? val : 4000;
          updatePreviewInline();
        });
      }

      // Слайды
      const wList = addField('Слайды', `
        <div class="card" style="display:grid;gap:10px">
          <div data-promo-list style="display:grid;gap:10px"></div>
          <button class="btn" type="button" data-promo-add>+ Добавить слайд</button>
        </div>
      `);
      const listEl = wList.querySelector('[data-promo-list]');
      const addBtn = wList.querySelector('[data-promo-add]');

      function renderSlides(){
        const slides = Array.isArray(props.slides) ? props.slides : [];
        listEl.innerHTML = slides.map((s, idx)=>{
          const img        = s && s.img        ? String(s.img).replace(/"/g,'&quot;')        : '';
          const action     = s && s.action     ? String(s.action)                            : 'link';
          const link       = s && s.link       ? String(s.link).replace(/"/g,'&quot;')       : '';
          const sheet_id   = s && s.sheet_id   ? String(s.sheet_id).replace(/"/g,'&quot;')   : '';
          const sheet_path = s && s.sheet_path ? String(s.sheet_path).replace(/"/g,'&quot;') : '';

          return `
          <div class="card" style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)">
            <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
              <b>Слайд #${idx+1}</b>
              <button class="btn smallbtn" type="button" data-promo-del="${idx}">Удалить</button>
            </div>

            <div class="edit" style="margin-top:8px">
              <label>Картинка</label>
              <input type="text" data-promo-idx="${idx}" data-k="img" value="${img}" placeholder="URL или заполнится при загрузке файла">
              <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
                <input type="file" data-promo-upload="${idx}" accept="image/*">
                ${img ? `<img src="${img}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.16);">` : ''}
              </div>
            </div>

            <div class="edit" style="margin-top:8px">
              <label>Действие при клике</label>
              <select data-promo-idx="${idx}" data-k="action">
                <option value="none"${action==='none'?' selected':''}>Без действия</option>
                <option value="link"${action==='link'?' selected':''}>Перейти по ссылке / якорю</option>
                <option value="sheet"${action==='sheet'?' selected':''}>Открыть шторку</option>
                <option value="sheet_page"${action==='sheet_page'?' selected':''}>Открыть шторку-страницу</option>
              </select>
            </div>

            <div class="edit" style="margin-top:8px">
              <label>Ссылка или якорь (#play, /tournament, https://...)</label>
              <input type="text" data-promo-idx="${idx}" data-k="link" value="${link}">
            </div>

            <div class="edit" style="margin-top:8px">
              <label>ID шторки (для действия «Открыть шторку»)</label>
              <input type="text" data-promo-idx="${idx}" data-k="sheet_id" value="${sheet_id}" placeholder="например, sheet1">
            </div>

            <div class="edit" style="margin-top:8px">
              <label>Путь шторки-страницы (для «Открыть шторку-страницу»)</label>
              <input type="text" data-promo-idx="${idx}" data-k="sheet_path" value="${sheet_path}" placeholder="/sheet/last_prizes">
            </div>
          </div>`;
        }).join('');

        // текстовые поля (img/link/sheet_id/sheet_path)
        listEl.querySelectorAll('input[type=text][data-promo-idx]').forEach(inp=>{
          inp.addEventListener('input', ()=>{
            const i = Number(inp.dataset.promoIdx);
            const k = inp.dataset.k;
            if (!isFinite(i) || !k) return;
            pushHistory();
            props.slides[i] = props.slides[i] || {};
            props.slides[i][k] = inp.value;
            updatePreviewInline();
          });
        });

        // select (action)
        listEl.querySelectorAll('select[data-promo-idx][data-k="action"]').forEach(sel=>{
          sel.addEventListener('change', ()=>{
            const i = Number(sel.dataset.promoIdx);
            if (!isFinite(i)) return;
            pushHistory();
            props.slides[i] = props.slides[i] || {};
            props.slides[i].action = sel.value;
            updatePreviewInline();
          });
        });

        // загрузка картинки
        listEl.querySelectorAll('input[type=file][data-promo-upload]').forEach(up=>{
          up.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const i = Number(up.dataset.promoUpload);
            if (!isFinite(i)) return;
            const reader = new FileReader();
            reader.onload = ()=>{
              pushHistory();
              props.slides[i] = props.slides[i] || {};
              props.slides[i].img = reader.result;
              renderSlides();
              updatePreviewInline();
            };
            reader.readAsDataURL(file);
          });
        });

        // удаление слайда
        listEl.querySelectorAll('[data-promo-del]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.promoDel);
            if (!isFinite(i)) return;
            if (!confirm('Удалить этот слайд?')) return;
            pushHistory();
            props.slides.splice(i,1);
            renderSlides();
            updatePreviewInline();
          });
        });
      }

      addBtn.addEventListener('click', ()=>{
        pushHistory();
        if (!Array.isArray(props.slides)) props.slides = [];
        props.slides.push({ img:'', action:'link', link:'#play', sheet_id:'', sheet_path:'' });
        renderSlides();
        updatePreviewInline();
      });

      renderSlides();
    }





        // === Специальные настройки для блока «Профиль — достижения» ===
    if (inst.key === 'profile_achievements') {
      if (!props) props = {};
      if (props.best_label === undefined) props.best_label = 'Шмель — лучший счёт';
      if (props.pass_label === undefined) props.pass_label = 'Паспорт — штампы';
      if (props.last_label === undefined) props.last_label = 'Последний штамп';
      if (props.refs_label === undefined) props.refs_label = 'Мои рефералы';
      

      

      const makeLabelField = (field, labelText) => {
        const w = addField(
          labelText,
          `<input type="text" data-f="${field}" value="${String(props[field]||'').replace(/"/g,'&quot;')}">`
        );
        const inp = w.querySelector('input');
        inp.addEventListener('input', (e)=>{
          pushHistory();
          props[field] = e.target.value;
          updatePreviewInline();
        });
      };

      makeLabelField('best_label', 'Лейбл «Лучший счёт»');
      makeLabelField('pass_label', 'Лейбл «Паспорт — штампы»');
      makeLabelField('last_label', 'Лейбл «Последний штамп»');
      makeLabelField('refs_label', 'Лейбл «Мои рефералы»');
    }

    // === Специальные настройки для Колеса бонусов ===
    if (inst.key === 'bonusWheel' || (reg && reg.type==='bonusWheel')) {
      if (!Array.isArray(props.prizes)) props.prizes = [];
      if (props.spin_cost === undefined) props.spin_cost = 10;


          



    // === Специальные настройки для Колеса бонусов ===


      // Стоимость прокрутки
      {
        const w = addField('Стоимость прокрутки (монеты)', `<input type="number" min="0" step="1" data-f="spin_cost" value="${Number(props.spin_cost||0)}">`);
        const inp = w.querySelector('input[data-f="spin_cost"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          const v = Number(inp.value||0);
          props.spin_cost = isFinite(v) ? Math.max(0, Math.round(v)) : 0;
          updatePreviewInline();
        });
      }

      // Призы (сектора)
      const w = addField('Сектора / призы', `
        <div class="prizeEditor" style="display:grid;gap:10px">
          <div data-prize-list style="display:grid;gap:10px"></div>
          <button class="btn" type="button" data-prize-add>+ Добавить приз</button>
          <div class="mut">Подсказка: картинки можно вставить ссылкой или загрузить файлом (конвертируется в dataURL).</div>
        </div>
      `);
      const listEl = w.querySelector('[data-prize-list]');
      const addBtn = w.querySelector('[data-prize-add]');

      function renderPrizes(){
        const prizes = Array.isArray(props.prizes) ? props.prizes : [];
        listEl.innerHTML = prizes.map((pr, idx)=>`
          <div class="card" style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)">
            <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
              <b>Приз #${idx+1}</b>
              <button class="btn smallbtn" type="button" data-prize-del="${idx}">Удалить</button>
            </div>
            <div class="grid2" style="margin-top:8px">
              <div class="edit" style="margin:0">
                <label>Код</label>
                <input type="text" data-prize-idx="${idx}" data-k="code" value="${(pr && pr.code) ? String(pr.code).replace(/"/g,'&quot;') : ''}" placeholder="coins_5">
              </div>
              <div class="edit" style="margin:0">
                <label>Название</label>
                <input type="text" data-prize-idx="${idx}" data-k="name" value="${(pr && pr.name) ? String(pr.name).replace(/"/g,'&quot;') : ''}" placeholder="5 🪙">
              </div>
            </div>
            <div class="edit" style="margin:0;margin-top:8px">
              <label>Картинка (URL или dataURL)</label>
              <input type="text" data-prize-idx="${idx}" data-k="img" value="${(pr && pr.img) ? String(pr.img).replace(/"/g,'&quot;') : ''}" placeholder="https://... или data:image/...">
              <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
                <input type="file" data-prize-upload="${idx}" accept="image/*">
                <img src="${(pr && pr.img) ? pr.img : ''}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)">
              </div>
            </div>
          </div>
        `).join('');

        // bind text inputs
        listEl.querySelectorAll('input[type=text][data-prize-idx]').forEach(inp=>{
          inp.addEventListener('input', ()=>{
            const i = Number(inp.dataset.prizeIdx);
            const k = inp.dataset.k;
            if (!isFinite(i) || !k) return;
            pushHistory();
            props.prizes[i] = props.prizes[i] || {};
            props.prizes[i][k] = inp.value;
            updatePreviewInline();
          });
        });

        // bind uploads
        listEl.querySelectorAll('input[type=file][data-prize-upload]').forEach(up=>{
          up.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if(!file) return;
            const i = Number(up.dataset.prizeUpload);
            const reader = new FileReader();
            reader.onload = ()=>{
              pushHistory();
              props.prizes[i] = props.prizes[i] || {};
              props.prizes[i].img = reader.result;
              renderPrizes();
              updatePreviewInline();
            };
            reader.readAsDataURL(file);
          });
        });

        // bind delete buttons
        listEl.querySelectorAll('[data-prize-del]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.prizeDel);
            if(!confirm('Удалить этот приз?')) return;
            pushHistory();
            props.prizes.splice(i,1);
            renderPrizes();
            updatePreviewInline();
          });
        });
      }

      addBtn.addEventListener('click', ()=>{
        pushHistory();
        props.prizes.push({code:'', name:'', img:''});
        renderPrizes();
        updatePreviewInline();
      });

      renderPrizes();
    }


    // 
    
    
    // 

    /// === Специальные настройки для слайдера Beer (beerIntroSlider) ===
    if (inst.key === 'beerIntroSlider') {
      const defSlides = [
        {
          title:'Как это работает',
          text:'Копите монеты, играя и делая покупки. Обменивайте их на призы в разделе «Бонусы».',
          primary:'Продолжить',
          ghost:''
        },
        {
          title:'Отлично! Погнали',
          text:'Первый спин — в подарок. В профиле видны баланс, призы и рефералы. Играй честно, бонусы забирай в магазине.',
          primary:'Играть',
          ghost:''
        }
      ];
      if (!Array.isArray(props.slides) || !props.slides.length) {
        props.slides = defSlides.map(s=>Object.assign({}, s));
      }

      const wrap = addField('Слайды', `
        <div class="card" style="display:grid;gap:10px">
          <div data-slides-list style="display:grid;gap:10px"></div>
          <button class="btn" type="button" data-slide-add>+ Добавить слайд</button>
        </div>
      `);
      const listEl = wrap.querySelector('[data-slides-list]');
      const addBtn = wrap.querySelector('[data-slide-add]');

      function renderSlides(){
        const slides = Array.isArray(props.slides) ? props.slides : [];
        listEl.innerHTML = slides.map((s, idx)=>`
          <div class="card" style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)">
            <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
              <b>Слайд #${idx+1}</b>
              <button class="btn smallbtn" type="button" data-slide-del="${idx}">Удалить</button>
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Заголовок</label>
              <input type="text" data-slide-idx="${idx}" data-k="title" value="${(s && s.title) ? String(s.title).replace(/"/g,'&quot;') : ''}">
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Текст</label>
              <textarea data-slide-idx="${idx}" data-k="text" rows="3">${(s && s.text) ? String(s.text).replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</textarea>
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Основная кнопка (primary)</label>
              <input type="text" data-slide-idx="${idx}" data-k="primary" value="${(s && s.primary) ? String(s.primary).replace(/"/g,'&quot;') : ''}" placeholder="Например: Играть">
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Вторая кнопка (ghost, опционально)</label>
              <input type="text" data-slide-idx="${idx}" data-k="ghost" value="${(s && s.ghost) ? String(s.ghost).replace(/"/g,'&quot;') : ''}" placeholder="Например: Подробнее">
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Фон (URL или загрузка файла)</label>
              <input type="text" data-slide-idx="${idx}" data-k="bg" value="${(s && s.bg) ? String(s.bg).replace(/"/g,'&quot;') : ''}" placeholder="https://... или data:image/...">
              <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
                <input type="file" data-slide-upload="${idx}" accept="image/*">
                ${s && s.bg ? `<div style="width:64px;height:40px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.16);background-size:cover;background-position:center;background-image:url('${s.bg}')"></div>` : ''}
              </div>
            </div>
          </div>
        `).join('');

        // text inputs
        listEl.querySelectorAll('input[type=text][data-slide-idx], textarea[data-slide-idx]').forEach(inp=>{
          inp.addEventListener('input', ()=>{
            const i = Number(inp.dataset.slideIdx);
            const k = inp.dataset.k;
            if (!isFinite(i) || !k) return;
            pushHistory();
            props.slides[i] = props.slides[i] || {};
            props.slides[i][k] = inp.value;
            updatePreviewInline();
          });
        });

        // file uploads for bg
        listEl.querySelectorAll('input[type=file][data-slide-upload]').forEach(up=>{
          up.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const i = Number(up.dataset.slideUpload);
            const reader = new FileReader();
            reader.onload = ()=>{
              pushHistory();
              props.slides[i] = props.slides[i] || {};
              props.slides[i].bg = reader.result;
              renderSlides();
              updatePreviewInline();
            };
            reader.readAsDataURL(file);
          });
        });

        // delete slide
        listEl.querySelectorAll('[data-slide-del]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.slideDel);
            if (!confirm('Удалить этот слайд?')) return;
            pushHistory();
            props.slides.splice(i,1);
            renderSlides();
            updatePreviewInline();
          });
        });
      }

      addBtn.addEventListener('click', ()=>{
        pushHistory();
        if (!Array.isArray(props.slides)) props.slides = [];
        props.slides.push({title:'Новый слайд', text:'Текст', primary:'Продолжить', ghost:'', bg:''});
        renderSlides();
        updatePreviewInline();
      });

      renderSlides();
    }

// === Специальные настройки для стартовых карточек Beer ===
    if (inst.key === 'beerStartList') {
      if (!Array.isArray(props.cards)) {
        const fallbackTitles = ['Паспорт стилей','Викторина','Пригласи друзей'];
        const fallbackSubs   = ['Собери 6 штампов — подарок','Проверь свои пивные знания','Дарим +100 монет за друга'];
        const fallbackIcons  = ['beer/img/pasport.png','beer/img/casino-chips.png','beer/img/fren.png'];
        props.cards = fallbackTitles.map((t,i)=>({
          title: t,
          sub: fallbackSubs[i] || '',
          icon: fallbackIcons[i] || fallbackIcons[0],
          link: '',
          action:'link',
          sheet_id:'',
          sheet_path:''
        }));
      }

      const w = addField('Карточки', `
        <div class="card" style="display:grid;gap:10px">
          <div data-card-list style="display:grid;gap:10px"></div>
          <button class="btn" type="button" data-card-add>+ Добавить карточку</button>
        </div>
      `);
      const listEl = w.querySelector('[data-card-list]');
      const addBtn = w.querySelector('[data-card-add]');

      function renderCards(){
        const cards = Array.isArray(props.cards) ? props.cards : [];
        listEl.innerHTML = cards.map((c, idx)=>{
          const title      = c && c.title      ? String(c.title).replace(/"/g,'&quot;')      : '';
          const sub        = c && c.sub        ? String(c.sub).replace(/"/g,'&quot;')        : '';
          const icon       = c && c.icon       ? String(c.icon).replace(/"/g,'&quot;')       : '';
          const link       = c && c.link       ? String(c.link).replace(/"/g,'&quot;')       : '';
          const action     = c && c.action     ? String(c.action)                            : 'link';
          const sheet_id   = c && c.sheet_id   ? String(c.sheet_id).replace(/"/g,'&quot;')   : '';
          const sheet_path = c && c.sheet_path ? String(c.sheet_path).replace(/"/g,'&quot;') : '';

          return `
          <div class="card" style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)">
            <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
              <b>Карточка #${idx+1}</b>
              <button class="btn smallbtn" type="button" data-card-del="${idx}">Удалить</button>
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Заголовок</label>
              <input type="text" data-card-idx="${idx}" data-k="title" value="${title}">
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Подзаголовок</label>
              <input type="text" data-card-idx="${idx}" data-k="sub" value="${sub}">
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Иконка (URL или загрузка файла)</label>
              <input type="text" data-card-idx="${idx}" data-k="icon" value="${icon}" placeholder="https://... или data:image/...">
              <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
                <input type="file" data-card-upload="${idx}" accept="image/*">
                ${icon ? `<img src="${icon}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.16);">` : ''}
              </div>
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Действие кнопки</label>
              <select data-card-idx="${idx}" data-k="action">
                <option value="link"${action==='link'?' selected':''}>Перейти по ссылке / якорю</option>
                <option value="sheet"${action==='sheet'?' selected':''}>Открыть шторку</option>
                <option value="sheet_page"${action==='sheet_page'?' selected':''}>Открыть шторку-страницу</option>
                <option value="none"${action==='none'?' selected':''}>Без действия</option>
              </select>
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Ссылка или якорь (#play, /page, https://...)</label>
              <input type="text" data-card-idx="${idx}" data-k="link" value="${link}" placeholder="#play или https://...">
            </div>
            <div class="edit" style="margin-top:8px">
              <label>ID шторки (для действия «Открыть шторку»)</label>
              <input type="text" data-card-idx="${idx}" data-k="sheet_id" value="${sheet_id}" placeholder="например, sheet1">
            </div>
            <div class="edit" style="margin-top:8px">
              <label>Путь шторки-страницы (для действия «Открыть шторку-страницу»)</label>
              <input type="text" data-card-idx="${idx}" data-k="sheet_path" value="${sheet_path}" placeholder="/sheet/last_prizes">
            </div>
          </div>`;
        }).join('');

        // текстовые поля (title/sub/icon/link/sheet_id/sheet_path)
        listEl.querySelectorAll('input[type=text][data-card-idx]').forEach(inp=>{
          inp.addEventListener('input', ()=>{
            const i = Number(inp.dataset.cardIdx);
            const k = inp.dataset.k;
            if (!isFinite(i) || !k) return;
            pushHistory();
            props.cards[i] = props.cards[i] || {};
            props.cards[i][k] = inp.value;
            updatePreviewInline();
          });
        });

        // select (action)
        listEl.querySelectorAll('select[data-card-idx][data-k="action"]').forEach(sel=>{
          sel.addEventListener('change', ()=>{
            const i = Number(sel.dataset.cardIdx);
            if (!isFinite(i)) return;
            pushHistory();
            props.cards[i] = props.cards[i] || {};
            props.cards[i].action = sel.value;
            updatePreviewInline();
          });
        });

        // загрузка иконки
        listEl.querySelectorAll('input[type=file][data-card-upload]').forEach(up=>{
          up.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const i = Number(up.dataset.cardUpload);
            if (!isFinite(i)) return;
            const reader = new FileReader();
            reader.onload = ()=>{
              pushHistory();
              props.cards[i] = props.cards[i] || {};
              props.cards[i].icon = reader.result;
              renderCards();
              updatePreviewInline();
            };
            reader.readAsDataURL(file);
          });
        });

        // удаление карточки
        listEl.querySelectorAll('[data-card-del]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.cardDel);
            if(!confirm('Удалить эту карточку?')) return;
            pushHistory();
            props.cards.splice(i,1);
            renderCards();
            updatePreviewInline();
          });
        });
      }

      addBtn.addEventListener('click', ()=>{
        pushHistory();
        if (!Array.isArray(props.cards)) props.cards = [];
        props.cards.push({title:'Новая карточка', sub:'Описание', icon:'beer/img/pasport.png', link:'', action:'link', sheet_id:'', sheet_path:''});
        renderCards();
        updatePreviewInline();
      });

      renderCards();
    }


// === Специальные настройки для Паспорта стилей ===
    if (inst.key === 'stylesPassport' || (reg && reg.type==='stylesPassport')) {
      if (!Array.isArray(props.styles)) props.styles = [];
      if (props.grid_cols === undefined) props.grid_cols = 3;
      if (props.require_pin === undefined) props.require_pin = true;
      if (props.subtitle === undefined) props.subtitle = '';

      // Подзаголовок
      {
        const w = addField('Подзаголовок', `<input type="text" data-f="subtitle" value="${String(props.subtitle||'').replace(/"/g,'&quot;')}">`);
        w.querySelector('input').addEventListener('input', (e)=>{
          pushHistory();
          props.subtitle = e.target.value;
          updatePreviewInline();
        });
      }

      // Колонки сетки
      {
        const w = addField('Колонки сетки', `<input type="number" min="1" max="6" step="1" value="${Number(props.grid_cols||3)}">`);
        w.querySelector('input').addEventListener('input', (e)=>{
          pushHistory();
          props.grid_cols = Math.max(1, Math.min(6, Number(e.target.value||3)));
          updatePreviewInline();
        });
      }

      // PIN required
      {
        const w = addField('Требовать PIN', `<label style="display:flex;gap:10px;align-items:center;margin-top:6px">
          <input type="checkbox" ${props.require_pin ? 'checked' : ''}>
          <span class="mut">спрашивать PIN при получении штампа</span>
        </label>`);
        const cb = w.querySelector('input[type=checkbox]');
        cb.addEventListener('change', ()=>{
          pushHistory();
          props.require_pin = !!cb.checked;
          updatePreviewInline();
        });
      }

      // Обложка (URL + upload)
      {
        const w = addField('Картинка (обложка)', `
          <div class="row" style="gap:10px;align-items:center">
            <input type="text" placeholder="https://..." value="${String(props.cover_url||'').replace(/"/g,'&quot;')}" style="flex:1">
            <label class="btn smallbtn" style="cursor:pointer">
              Загрузить<input type="file" accept="image/*" style="display:none">
            </label>
          </div>
          <div class="mut" style="margin-top:6px">Можно вставить ссылку или загрузить файлом (конвертируется в dataURL).</div>
        `);
        const urlInp = w.querySelector('input[type=text]');
        const fileInp = w.querySelector('input[type=file]');
        urlInp.addEventListener('input', ()=>{
          pushHistory();
          props.cover_url = urlInp.value;
          updatePreviewInline();
        });
        fileInp.addEventListener('change', ()=>{
          const file = fileInp.files && fileInp.files[0];
          if(!file) return;
          const reader = new FileReader();
          reader.onload = ()=>{
            pushHistory();
            props.cover_url = reader.result;
            urlInp.value = props.cover_url;
            updatePreviewInline();
          };
          reader.readAsDataURL(file);
        });
      }

      // Стили (repeater)
      const w = addField('Стили / штампы', `
        <div style="display:grid;gap:10px">
          <div data-style-list style="display:grid;gap:10px"></div>
          <button class="btn" type="button" data-style-add>+ Добавить стиль</button>
          <div class="mut">code — идентификатор (для API), name — отображаемое имя.</div>
        </div>
      `);
      const listEl = w.querySelector('[data-style-list]');
      const addBtn = w.querySelector('[data-style-add]');

      function renderStyles(){
        const arr = Array.isArray(props.styles) ? props.styles : [];
        listEl.innerHTML = arr.map((st, idx)=>`
          <div class="card" style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)">
            <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
              <b>Стиль #${idx+1}</b>
              <div style="display:flex;gap:8px;align-items:center">
                <button class="btn smallbtn" type="button" data-style-up="${idx}" title="Вверх">↑</button>
                <button class="btn smallbtn" type="button" data-style-down="${idx}" title="Вниз">↓</button>
                <button class="btn smallbtn" type="button" data-style-del="${idx}">Удалить</button>
              </div>
            </div>
            <div class="grid2" style="margin-top:8px">
              <div class="edit" style="margin:0">
                <label>code</label>
                <input type="text" data-style-idx="${idx}" data-k="code" value="${(st && st.code) ? String(st.code).replace(/"/g,'&quot;') : ''}" placeholder="lager">
              </div>
              <div class="edit" style="margin:0">
                <label>name</label>
                <input type="text" data-style-idx="${idx}" data-k="name" value="${(st && st.name) ? String(st.name).replace(/"/g,'&quot;') : ''}" placeholder="Lager">
              </div>
            </div>
          </div>
        `).join('');

        listEl.querySelectorAll('input[type=text][data-style-idx]').forEach(inp=>{
          inp.addEventListener('input', ()=>{
            const i = Number(inp.dataset.styleIdx);
            const k = inp.dataset.k;
            if (!isFinite(i) || !k) return;
            pushHistory();
            props.styles[i] = props.styles[i] || {};
            props.styles[i][k] = inp.value;
            updatePreviewInline();
          });
        });

        listEl.querySelectorAll('[data-style-del]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.styleDel);
            if(!confirm('Удалить этот стиль?')) return;
            pushHistory();
            props.styles.splice(i,1);
            renderStyles();
            updatePreviewInline();
          });
        });

        listEl.querySelectorAll('[data-style-up]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.styleUp);
            if(i<=0) return;
            pushHistory();
            const tmp = props.styles[i-1];
            props.styles[i-1]=props.styles[i];
            props.styles[i]=tmp;
            renderStyles();
            updatePreviewInline();
          });
        });
        listEl.querySelectorAll('[data-style-down]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const i = Number(btn.dataset.styleDown);
            if(i>=props.styles.length-1) return;
            pushHistory();
            const tmp = props.styles[i+1];
            props.styles[i+1]=props.styles[i];
            props.styles[i]=tmp;
            renderStyles();
            updatePreviewInline();
          });
        });
      }

      addBtn.addEventListener('click', ()=>{
        pushHistory();
        props.styles.push({code:'', name:''});
        renderStyles();
        updatePreviewInline();
      });

      renderStyles();
    }

// === Специальные настройки для CTA / шторок ===
if (inst.key === 'cta') {

      if (props.label === undefined) props.label = 'Начать';
      if (props.action === undefined) props.action = 'none';
      if (props.sheet_id === undefined) props.sheet_id = '';
      if (props.sheet_path === undefined) props.sheet_path = '';
            if (props.link === undefined) props.link = '';


      // текст кнопки
      {
        const w = addField('Текст кнопки', `<input type="text" data-f="cta_label" value="${(props.label||'').replace(/"/g,'&quot;')}" placeholder="Например: Получить бонус">`);
        const inp = w.querySelector('input[data-f="cta_label"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.label = inp.value;
          updatePreviewInline();
        });
      }


     
      // действие кнопки
      {
        const w = addField('Действие кнопки', `<select data-f="cta_action">
          <option value="none">Без действия</option>
          <option value="link">Перейти по ссылке / якорю</option>
          <option value="sheet">Открыть шторку</option>
          <option value="sheet_page">Открыть шторку-страницу</option>
        </select>`);
        const sel = w.querySelector('select[data-f="cta_action"]');
        sel.value = props.action || 'none';
        sel.addEventListener('change', ()=>{
          pushHistory();
          props.action = sel.value;
          updatePreviewInline();
        });
      }

      // Ссылка или якорь (для действия "Перейти по ссылке / якорю")
      {
        const w = addField('Ссылка или якорь', `<input type="text" data-f="cta_link" value="${props.link || ''}" placeholder="#play, /tournament или https://...">`);
        const inp = w.querySelector('input[data-f="cta_link"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.link = inp.value.trim();
          updatePreviewInline();
        });
      }

      // ID шторки (блочный режим)
      {
        const w = addField('ID шторки (для действия)', `<input type="text" data-f="sheet_id" value="${props.sheet_id||''}" placeholder="например, sheet1">`);
        const inp = w.querySelector('input[data-f="sheet_id"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_id = inp.value.trim();
          updatePreviewInline();
        });
      }

      // Путь шторки-страницы
      {
        const w = addField('Путь шторки-страницы', `<input type="text" data-f="sheet_path" value="${props.sheet_path||''}" placeholder="/sheet/last_prizes">`);
        const inp = w.querySelector('input[data-f="sheet_path"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.sheet_path = inp.value.trim();
          updatePreviewInline();
        });
      }
    }


    if (inst.key === 'sheet'){
      if (!props.id)    props.id    = 'sheet1';
      if (!props.title) props.title = 'Заголовок шторки';
      if (!props.body)  props.body  = 'Текст внутри шторки';

      // ID шторки
      {
        const w = addField('ID шторки', `<input type="text" data-f="sheet_id_main" value="${props.id||''}">`);
        const inp = w.querySelector('input[data-f="sheet_id_main"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.id = inp.value.trim();
          updatePreviewInline();
        });
      }

      // Заголовок
      {
        const w = addField('Заголовок', `<input type="text" data-f="sheet_title" value="${props.title||''}">`);
        const inp = w.querySelector('input[data-f="sheet_title"]');
        inp.addEventListener('input', ()=>{
          pushHistory();
          props.title = inp.value;
          updatePreviewInline();
        });
      }

      // Текст
      {
        const w = addField('Текст шторки', `<textarea data-f="sheet_body" rows="3">${props.body||''}</textarea>`);
        const ta = w.querySelector('textarea[data-f="sheet_body"]');
        ta.addEventListener('input', ()=>{
          pushHistory();
          props.body = ta.value;
          updatePreviewInline();
        });
      }
    }

// === Специальные настройки для Flappy ===
    if (inst.key === 'flappyGame'){
      // дефолты, если нет
      if (props.difficulty === undefined) props.difficulty = 'normal';
      if (props.bird_mode === undefined)  props.bird_mode  = 'default';
      if (props.bird_img === undefined)   props.bird_img   = '';
      if (props.shield_img === undefined) props.shield_img = '';

      // Уровень сложности
      {
        const w = addField('Уровень сложности', `<select data-f="difficultySel">
          <option value="easy">Легко</option>
          <option value="normal">Норма</option>
          <option value="hard">Жёстко</option>
        </select>`);
        const sel = w.querySelector('select[data-f="difficultySel"]');
        sel.value = props.difficulty || 'normal';
        sel.addEventListener('change', ()=>{
          pushHistory();
          props.difficulty = sel.value;
          updatePreviewInline();
        });
      }

      // Спрайт птицы (шмель / своя картинка)
      {
        const w = addField('Спрайт птицы', `
          <div style="display:flex;flex-direction:column;gap:6px">
            <select data-f="bird_mode">
              <option value="default">Стандартный шмель</option>
              <option value="custom">Своя картинка</option>
            </select>
            <div data-bird-custom style="display:flex;gap:6px">
              <input type="text" data-f="bird_img" placeholder="URL или data:image" value="${props.bird_img||''}">
              <input type="file" data-f="birdUpload" accept="image/*">
            </div>
          </div>`);
        const modeSel   = w.querySelector('select[data-f="bird_mode"]');
        const customRow = w.querySelector('[data-bird-custom]');
        const imgInput  = w.querySelector('input[data-f="bird_img"]');
        const fileInput = w.querySelector('input[data-f="birdUpload"]');

        const syncCustom = ()=>{
          customRow.style.display = (modeSel.value === 'custom') ? 'flex' : 'none';
        };
        modeSel.value = props.bird_mode || 'default';
        syncCustom();

        modeSel.addEventListener('change', ()=>{
          pushHistory();
          props.bird_mode = modeSel.value;
          syncCustom();
          updatePreviewInline();
        });

        if (fileInput){
          fileInput.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ()=>{
              pushHistory();
              props.bird_img = reader.result;
              imgInput.value = props.bird_img;
              updatePreviewInline();
            };
            reader.readAsDataURL(file);
          });
        }

      // Спрайт щита
      {
        const w = addField('Спрайт щита', `
          <div style="display:flex;gap:6px">
            <input type="text" data-f="shield_img" placeholder="URL или data:image" value="${props.shield_img||''}">
            <input type="file" data-f="shieldUpload" accept="image/*">
          </div>`);
        const imgInput  = w.querySelector('input[data-f="shield_img"]');
        const fileInput = w.querySelector('input[data-f="shieldUpload"]');
        if (imgInput){
          imgInput.addEventListener('change', ()=>{
            pushHistory();
            props.shield_img = imgInput.value.trim();
            updatePreviewInline();
          });
        }
        if (fileInput){
          fileInput.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ()=>{
              pushHistory();
              props.shield_img = reader.result;
              if (imgInput) imgInput.value = props.shield_img;
              updatePreviewInline();
            };
            reader.readAsDataURL(file);
          });
        }
      }

      }
    }

    beBody.querySelectorAll('input[type=text]').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const f = inp.dataset.f; pushHistory();
        if(f==='items' || f==='tiles'){ props[f] = inp.value.split(',').map(s=>s.trim()).filter(Boolean); }
        else { props[f] = inp.value; }
        updatePreviewInline();
      });
    });
    be.classList.add('on');
  }
  function closeBlockEditor(){ try{ closePopup(be); }catch(_){} BE_CTX=null; }
  beClose.onclick = closeBlockEditor;
  beApply.onclick = closeBlockEditor;
  if (beDelete){
    beDelete.onclick = ()=>{
      if (!BE_CTX) return;
      if (!confirm('Удалить этот блок?')) return;
      const { path, inst } = BE_CTX;
      const route = getRoute(path);
      if (!route) { closeBlockEditor(); return; }
      pushHistory();
      route.blocks = (route.blocks || []).filter(b => b.id !== inst.id);
      if (BP.blocks && BP.blocks[inst.id]){
        delete BP.blocks[inst.id];
      }
      renderNav();
      updatePreviewInline();
      closeBlockEditor();
    };
  }
  be.addEventListener('click',(e)=>{ if(e.target===be) closeBlockEditor(); });

  /* ---------- device presets & zoom ---------- */
  function applyZoom(v){ dock.style.transform = `scale(${v/100})`; dock.style.transformOrigin='top center'; zoomVal.textContent = v+'%'; }
  zoomEl.oninput=()=>applyZoom(+zoomEl.value);
  applyZoom(+zoomEl.value||100);
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
    const p=b.dataset.preset;
    const map={ 'iphone-13':[390,780], 'iphone-se':[375,667], 'pixel-7':[412,915] };
    const wh=map[p]||map['iphone-13']; phone.style.width=wh[0]+'px'; phone.style.height=wh[1]+'px';
  });

  /* ---------- AppId → reload preview query ---------- */
  appIdEl.addEventListener('input', ()=>{
    const appId = appIdEl.value.trim()||'my_app';
    const u = new URL(frame.src, location.href); u.searchParams.set('app_id', appId); frame.src = u.toString();
  });

    function toggleNav(){
    if (!appRoot) return;
    const collapsed = appRoot.classList.toggle('nav-collapsed');
    if (panelHide){
      panelHide.textContent = collapsed ? '⮞' : '⮜';
    }
    if (navEar){
      navEar.textContent = collapsed ? '⮞' : '⮜';
    }
  }

  if (panelHide){
    panelHide.addEventListener('click', toggleNav);
  }
  if (navEar){
    navEar.addEventListener('click', toggleNav);
  }

  function firstRender(){
    renderNav();
    initThemePanel();
    syncThemeCSS();
    updatePreviewInline();
  }
  firstRender();
})();

/* =================== REMOTE SYNC (Телефон/Telegram) ===================
  По умолчанию студия пишет в localStorage (видно только на этом ПК).
  Чтобы изменения появлялись в Telegram на телефоне — надо отправлять blueprint на сервер (Worker/GAS),
  откуда мини‑апп его читает.

  Настройка без правок кода:
    localStorage.setItem('studio:remote_put_url', 'https://.../PUT_ENDPOINT');
    localStorage.setItem('studio:remote_get_url', 'https://.../GET_ENDPOINT'); // опционально

  Формат:
    PUT:  POST JSON { appId, mode:'draft'|'live', bp }
    GET:  GET  ?appId=...&mode=...


function getRemotePutUrl_(){ return (localStorage.getItem('studio:remote_put_url')||'').trim(); }
function getRemoteGetUrl_(){ return (localStorage.getItem('studio:remote_get_url')||'').trim(); }

async function remotePutBP_(mode, appId, bp){
  const url = getRemotePutUrl_();
  if(!url) return { ok:false, skipped:true };
  const r = await fetch(url, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ appId, mode, bp })
  });
  if(!r.ok){
    const t = await r.text().catch(()=> '');
    throw new Error('remotePutBP failed: ' + r.status + ' ' + t);
  }
  return await r.json().catch(()=>({ok:true}));
}

async function remoteGetBP_(mode, appId){
  const url = getRemoteGetUrl_();
  if(!url) return null;
  const u = new URL(url);
  u.searchParams.set('appId', appId);
  u.searchParams.set('mode', mode);
  const r = await fetch(String(u), { method:'GET' });
  if(!r.ok) return null;
  return await r.json().catch(()=>null);
}

// Переопределяем saveDraft/publishLive так, чтобы они ещё и пушили на сервер (если настроено).
function saveDraft(){
  const appId = appIdEl.value.trim()||'my_app';
  const d = JSON.stringify(BP||{}, null, 0);
  localStorage.setItem(`bp:${appId}:draft`, d);

  (async()=>{
    try{ await remotePutBP_('draft', appId, sanitizeBP(BP)); }catch(e){ console.warn(e); }
  })();
}

async function publishLive(){
  const appId = appIdEl.value.trim()||'my_app';
  const d = localStorage.getItem(`bp:${appId}:draft`);
  if(!d){ alert('Сначала сохраните черновик'); return; }

  // локально
  localStorage.setItem(`bp:${appId}:live`, d);

  // удалённо (если настроено)
  try{
    const bp = JSON.parse(d);
    const res = await remotePutBP_('live', appId, sanitizeBP(bp));
    if(res && res.skipped) alert('Опубликовано локально. Укажи studio:remote_put_url чтобы обновлялось на телефоне.');
    else alert('Опубликовано (и на сервер отправлено).');
  }catch(e){
    console.warn(e);
    alert('Опубликовано локально. На сервер не ушло — проверь studio:remote_put_url и эндпоинт.');
  }
}
  ====================================================================== */
