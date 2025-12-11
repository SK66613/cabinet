/* front_renderer_react_spa_v_1.jsx — Mini-App Shell + Router + Blocks (12.12.2025)
   Экспортирует window.App (без import/export).
   Ожидаемый вызов загрузчиком превью: window.App() — инициализирует рендерер.
*/
(function(global){
  const qs = new URLSearchParams(location.search);
  const API_BASE = qs.get('api_base') || '';
  const APP_ID   = qs.get('app_id')   || 'app';
  const CHANNEL  = qs.get('preview')  || qs.get('channel') || 'live';
  const PATH     = qs.get('path')     || '';
  const DEMO     = qs.get('demo') === '1';
  const TG       = qs.get('tg');

  /* ---------- tiny helpers ---------- */
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$= (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const el = (tag, c='', html='') => { const n = document.createElement(tag); if(c) n.className=c; if(html) n.innerHTML=html; return n; };
  const ICONS = {home:'🏠',cup:'🏆',gamepad:'🎮',gift:'🎁',user:'👤'};
  const icon = name => ICONS[name] || '•';
  const atobJson = (b64)=>{ try{ return JSON.parse(atob(b64)); }catch(_){ return null; } };

  function apiGet(path, params={}){
    const base = (API_BASE || location.origin).replace(/\/+$/,''); // trim trailing /
    const u = new URL(base);
    u.searchParams.set('endpoint', path);
    if (TG) u.searchParams.set('tg', TG);
    Object.entries(params).forEach(([k,v])=> v!=null && u.searchParams.set(k,String(v)));
    return fetch(u.toString()).then(r=>r.json());
  }

  async function loadBlueprint(){
    const inline = qs.get('bp');
    if (inline){ const j = atobJson(inline); if (j) return j; }
    const res = await apiGet('/api/blueprint', { app_id: APP_ID, channel: CHANNEL, preview: CHANNEL });
    if (!res?.ok) throw new Error(res?.error || 'NO_BLUEPRINT');
    return res.data.json || {};
  }

  const BASE_CSS = `
    :root{ --tabH:64px; --navGap:12px; --wrapPadX:14px; --wrapPadTop:14px; --appW:428px;
      --card-bg: rgba(255,255,255,.05); --line: rgba(255,255,255,.10); --mut:#aab3c2; --text:#fff; --radius:16px; }
    html,body{height:100%}
    body{margin:0;background:#0b0f16;color:var(--text);font:14px/1.5 Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .wrap{ min-height:100svh; padding: var(--wrapPadTop) var(--wrapPadX) calc(var(--tabH) + var(--navGap) + env(safe-area-inset-bottom,0) + 22px); }
    @media (min-width:900px){ body{ display:grid; place-items:center; } .wrap{ width:100%; max-width:var(--appW); } }
    main>section.page{ display:none } main>section.page.active{ display:block }
    .card{ background:var(--card-bg); border:1px solid var(--line); border-radius:var(--radius); padding:14px; margin:12px 0; }
    .h{ font-weight:900; margin:4px 0 10px; }
    .mut{ color:var(--mut) }
    .btm-nav{ position:fixed; left:0; right:0; bottom:calc(var(--navGap) + env(safe-area-inset-bottom,0)); z-index:20;
      height:var(--tabH); display:grid; grid-template-columns:repeat(5,1fr); gap:8px;
      padding:8px 10px; background:linear-gradient(180deg, rgba(2,6,12,0) 0%, rgba(7,10,16,.9) 32%, rgba(7,10,16,1) 100%);
      backdrop-filter: blur(10px); border-top:1px solid var(--line); }
    .tab{ display:grid; place-items:center; gap:6px; border-radius:14px; border:1px solid transparent; color:#fff; font-weight:800; background:transparent; }
    .tab.active{ background:#fff; color:#000; }
    .tab span{ font-size:12px }
    .html-embed > * { max-width:100% }
    .html-embed section, .html-embed .card, .html-embed .panel{
      background:var(--card-bg); border:1px solid var(--line); border-radius:var(--radius); padding:14px; margin:12px 0;
    }
  `;
  function injectCss(css){ const s=document.createElement('style'); s.textContent = css; document.head.appendChild(s); }

  function renderShell(bp){
    const root = document.getElementById('app') || document.body.appendChild(el('div', '', ''));
    root.innerHTML = '';
    const wrap = el('div','wrap'); root.appendChild(wrap);

    const navRoutes = (bp.nav?.routes || []).map(r => ({
      id: (r.path||'/').replace(/^\//,'') || 'home',
      title: r.title || '',
      icon: r.icon || 'dot',
      path: r.path || '/'
    }));
    const nav = el('nav','btm-nav'); nav.id='btm-nav';
    nav.innerHTML = navRoutes.map(r=>`
      <button class="tab" data-page="${r.id}">
        <div>${icon(r.icon)}</div><span>${r.title}</span>
      </button>
    `).join('');
    root.appendChild(nav);

    const main = document.createElement('main'); wrap.appendChild(main);
    for (const r of (bp.routes||[])){
      const id = (r.path||'/').replace(/^\//,'') || 'home';
      const sec = el('section','page'); sec.id = id;
      main.appendChild(sec);
    }

    function currentId(){
      if (PATH){ const p = PATH.replace(/^\//,''); if (document.getElementById(p)) return p; }
      const q = (new URL(location.href)).searchParams.get('page') || '';
      if (q && document.getElementById(q)) return q;
      const h = (location.hash || '#home').replace(/^#/,''); if (document.getElementById(h)) return h;
      return (navRoutes[0]?.id) || 'home';
    }
    function setActive(id){
      Array.from(document.querySelectorAll('main>section.page')).forEach(s=>{
        s.classList.toggle('active', s.id===id);
        s.style.display = (s.id===id)?'block':'none';
      });
      Array.from(document.querySelectorAll('#btm-nav .tab')).forEach(t=> t.classList.toggle('active', t.dataset.page===id));
      requestAnimationFrame(()=> window.scrollTo({top:0, behavior:'auto'}));
    }
    function goto(id){ history.replaceState(null,'',`?page=${id}`); setActive(id); }
    nav.addEventListener('click', e=>{ const b = e.target.closest('.tab'); if (!b) return; goto(b.dataset.page); });
    setActive(currentId());
  }

  function renderBuiltInBlock(key, props){
    const map = {
      hero(){
        const box = el('section','card');
        const t = props.title || 'Hero title';
        const s = props.subtitle || '';
        const cover = props.cover || '';
        const align = props.align || 'left';
        box.innerHTML = `
          <div class="h" style="text-align:${align}">${t}</div>
          ${s?`<div class="mut" style="text-align:${align}">${s}</div>`:''}
          ${cover?`<div style="margin-top:10px;border-radius:14px;overflow:hidden;border:1px solid var(--line)">
            <img src="${cover}" alt="" style="width:100%;height:180px;object-fit:${props.coverFit||'cover'}">
          </div>`:''}
        `;
        return box;
      },
      promo(){
        const box = el('section','card');
        const items = Array.isArray(props.items)?props.items:[];
        box.innerHTML = `<div class="h">С чего начать</div>` + items.map(it=>`
          <div class="card" style="margin:8px 0; padding:12px">
            <div class="h" style="margin:0 0 6px">${it.title||''}</div>
            <div class="mut">${it.sub||''}</div>
          </div>
        `).join('');
        return box;
      },
      menuGrid(){
        const box = el('section','card');
        const cat = props.category || 'beer';
        box.innerHTML = `<div class="h">Меню: ${cat}</div><div class="mut">Демо-меню подтянем из /api/products?category=${cat}</div>`;
        return box;
      },
      stampShelf(){ const box=el('section','card'); box.innerHTML=`<div class="h">Паспорт стилей</div><div class="mut">Штампы пользователя</div>`; return box; },
      bonusWheel(){ const box=el('section','card'); box.innerHTML=`<div class="h">Колесо бонусов</div><button class="btn">Крутить</button>`; return box; },
      profile(){ const box=el('section','card'); box.innerHTML=`<div class="h">Профиль</div><div class="mut">@id: ${TG||'demo'}</div>`; return box; },
      gamesPicker(){
        const box=el('section','card');
        const games = props.games||[];
        box.innerHTML = `<div class="h">Игры</div>` + (games.length? games.map(g=>`
          <div class="card" style="margin:8px 0;display:flex;justify-content:space-between;align-items:center">
            <div><div class="h" style="margin:0">${g}</div><div class="mut">Играть и получить приз</div></div>
            <button class="btn">Играть</button>
          </div>`).join('') : `<div class="mut">Игр пока нет</div>`);
        return box;
      },
      leaderboard(){ const box=el('section','card'); box.innerHTML=`<div class="h">Турнир</div><div class="mut">Ежедневный и общий</div>`; return box; },
    };
    if (map[key]) return map[key]();
    const stub = el('section','card'); stub.innerHTML = `<div class="h">${key}</div>`; return stub;
  }

  function renderRouteBlocks(pageId, blocks, bp){
    const host = document.getElementById(pageId);
    host.innerHTML = '';
    for (const key of (blocks||[])){
      const spec = (bp.blocks && bp.blocks[key]) || {};
      if (spec.type === 'htmlEmbed'){
        const d = el('div','html-embed'); d.innerHTML = (spec.props && spec.props.html) || ''; host.appendChild(d);
      }else{
        host.appendChild(renderBuiltInBlock(key, spec.props||{}));
      }
    }
  }

  async function boot(){
    injectCss(BASE_CSS);
    try{
      const bp = await loadBlueprint();
      if (bp?.app?.theme?.css){ injectCss(String(bp.app.theme.css)); }
      renderShell(bp);
      for (const r of (bp.routes||[])){
        const id = (r.path||'/').replace(/^\//,'') || 'home';
        renderRouteBlocks(id, r.blocks||[], bp);
      }
    }catch(e){
      const box = document.createElement('div'); box.className='card';
      box.innerHTML = `<div class="h">Ошибка</div><div class="mut">${e.message||e}</div>`;
      (document.getElementById('app') || document.body).appendChild(box);
      console.error(e);
    }
  }

  /** Экспортируем в глобал: загрузчик ждёт window.App */
  function App(){ boot(); }
  global.App = App;

  // На всякий случай авто-старт, если загрузчик не вызвал вручную
  if (!global.__NO_AUTOSTART__) { try{ App(); }catch(_){} }
})(window);
