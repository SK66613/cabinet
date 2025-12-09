/* Конструктор Mini-App (мастер)
   Работает через ваш прокси-воркер (CORS + скрытый adm_key):
   window.API_BASE = "https://constructor-miniapp.cyberian13.workers.dev"
*/

(function(){
  const $ = (sel)=>document.querySelector(sel);

  // Порядок по умолчанию
  const BLOCKS_ORDER_DEFAULT = ['hero','promo','menuGrid','loyaltyCard','stampShelf','bonusWheel','profile'];
  const BLOCK_TITLES = { hero:'Hero', promo:'Promo', menuGrid:'Menu', loyaltyCard:'Loyalty', stampShelf:'Stamp', bonusWheel:'Wheel', profile:'Profile' };

  // Каталог игр
  const GAMES = {
    flappy: { code:'flappy', title:'Flappy Bee', engine:'embedded', score_unit:'pts', attempts_daily:20, coins_on_pb:10 },
    runner: { code:'runner', title:'Beer Runner', engine:'embedded', score_unit:'m',   attempts_daily:20, coins_on_pb:15 },
    match3: { code:'match3', title:'Hop-Match',   engine:'iframe',  score_unit:'pts', attempts_daily:10, coins_on_pb:12, src:'' },
    quiz:   { code:'quiz',   title:'Beer Quiz',   engine:'embedded', score_unit:'pts', attempts_daily:5,  coins_on_pb:8 }
  };

  // Состояние
  const S = {
    app_id: '',
    vertical: 'beer',
    brand: { name:'', color:'#2F6FED' },
    menu: [],
    loyalty: { slots:6, pin:'1111' },
    blocks: { hero:true, promo:true, menuGrid:true, loyaltyCard:true, stampShelf:false, bonusWheel:false, profile:true },
    game: { code:'', coins_on_pb:10, attempts_daily:20, src:'' },
    order: [...BLOCKS_ORDER_DEFAULT],
  };

  // Пресеты вертикалей
  const PRESETS = {
    beer: {
      name: 'Beer Club', color:'#2F6FED', category:'beer',
      promo: ['–20% на IPA сегодня','Каждая 6-я кружка — бесплатно'],
      menu: [
        ['beer','IPA #1','хмелевая',390],
        ['beer','Lager','светлое',320],
        ['beer','Stout','плотный',420],
      ],
      slots:6
    },
    coffee: {
      name: 'Coffee To Go', color:'#7A4CF4', category:'coffee',
      promo: ['–10% утром до 11:00','5-й кофе — в подарок'],
      menu: [
        ['coffee','Эспрессо','30 мл',120],
        ['coffee','Капучино','300 мл',190],
        ['coffee','Латте','300 мл',210],
      ],
      slots:5
    },
    flowers: {
      name: 'Bloom Studio', color:'#E74C3C', category:'flowers',
      promo: ['Розы — 39 ₽/шт','Сборка — бесплатно'],
      menu: [
        ['flowers','Розы (шт)','красные',39],
        ['flowers','Тюльпаны (шт)','микс',29],
        ['flowers','Букет «Классика»','7 роз',399],
      ],
      slots:0
    }
  };

  // Утилки
  const slug = s => (s||'').toLowerCase().trim()
    .replace(/[^\w\s-]+/g,'').replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,64);

  function toast(msg){
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',
      background:'rgba(0,0,0,.85)',color:'#fff',padding:'10px 14px',borderRadius:'12px',zIndex:9999});
    document.body.appendChild(el); setTimeout(()=>el.remove(), 1800);
  }

  // Применить пресет вертикали
  function applyVerticalPreset(v){
    const p = PRESETS[v] || PRESETS.beer;
    if (!$('#brand_name').value) $('#brand_name').value = p.name;
    $('#brand_color').value = p.color;
    if (!$('#menu_cat').value) $('#menu_cat').value = p.category;
    S.menu = p.menu.map((r,i)=>({
      id:'p'+(i+1),
      category:r[0], title:r[1], subtitle:r[2], price_cents: Math.round(Number(r[3]))*100
    }));
    S.loyalty.slots = p.slots || 6;
    renderMenuList();
    updateCounts();
    buildPreviewUrl();
  }

  // ====== Привязки UI полей ======
  $('#vertical').addEventListener('change', e=>{ S.vertical = e.target.value; applyVerticalPreset(S.vertical); });

  $('#brand_name').addEventListener('input', e=>{
    const v = e.target.value.trim();
    if (!$('#app_id').value) $('#app_id').value = slug(v||'app');
    buildPreviewUrl();
  });
  $('#brand_color').addEventListener('input', e=> S.brand.color = e.target.value );

  $('#app_id').addEventListener('input', e=>{ S.app_id = e.target.value.trim(); buildPreviewUrl(); });

  $('#add_pos').addEventListener('click', ()=>{
    const cat = $('#menu_cat').value.trim();
    const ti  = $('#menu_title').value.trim();
    const su  = $('#menu_sub').value.trim();
    const pr  = Number($('#menu_price').value||0);
    if (!cat || !ti || !pr){ toast('Заполните категорию, позицию и цену'); return; }
    S.menu.push({ id:'p'+(Date.now()%1e6), category:cat, title:ti, subtitle:su, price_cents: pr*100 });
    renderMenuList(); updateCounts();
    $('#menu_title').value=''; $('#menu_sub').value=''; $('#menu_price').value='';
  });

  $('#apply_preset_menu').addEventListener('click', ()=>{ applyVerticalPreset($('#vertical').value); toast('Подставили шаблон меню'); });

  $('#loyal_slots').addEventListener('input', e=> S.loyalty.slots = Math.max(0, Number(e.target.value||0)));
  $('#loyal_pin').addEventListener('input', e=> S.loyalty.pin = e.target.value.trim());

  // Игры
  $('#game_code').addEventListener('change', e=>{
    const code = e.target.value;
    if (!code){ S.game = { code:'', coins_on_pb:10, attempts_daily:20, src:'' }; buildPreviewUrl(); return; }
    const g = GAMES[code] || {};
    S.game.code = code;
    S.game.coins_on_pb = g.coins_on_pb ?? 10;
    S.game.attempts_daily = g.attempts_daily ?? 20;
    $('#game_coins').value = S.game.coins_on_pb;
    $('#game_limit').value = S.game.attempts_daily;
    if (g.engine === 'iframe' && !S.game.src) $('#game_src').placeholder = 'https://cdn.domain/games/'+code+'/index.html';
    buildPreviewUrl();
  });
  $('#game_coins').addEventListener('input', e=>{ S.game.coins_on_pb = Math.max(0, Number(e.target.value||0)); });
  $('#game_limit').addEventListener('input', e=>{ S.game.attempts_daily = Math.max(0, Number(e.target.value||0)); });
  $('#game_src').addEventListener('input', e=>{ S.game.src = e.target.value.trim(); });

  // ====== Рендер списка меню ======
  function renderMenuList(){
    const c = $('#menu_list'); c.innerHTML='';
    S.menu.forEach((m,idx)=>{
      const div = document.createElement('div');
      div.className='li';
      div.innerHTML = `<div class="row">
        <div><div class="mut mini">Категория</div><div>${m.category}</div></div>
        <div><div class="mut mini">Позиция</div><div>${m.title}</div></div>
      </div>
      <div class="row" style="margin-top:6px">
        <div><div class="mut mini">Описание</div><div>${m.subtitle||'—'}</div></div>
        <div><div class="mut mini">Цена</div><div>${(m.price_cents/100).toFixed(0)} ₽</div></div>
      </div>
      <div class="bar" style="margin-top:8px"><button class="btn ghost" data-del="${idx}">Удалить</button></div>`;
      c.appendChild(div);
    });
    c.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', e=>{
        const i = Number(e.currentTarget.dataset.del);
        S.menu.splice(i,1); renderMenuList(); updateCounts();
      });
    });
  }
  function updateCounts(){ $('#pos_count').textContent = `${S.menu.length} позиций`; }

  // ====== Sortable блоки ======
  function renderBlocksSortable(){
    const host = $('#blocks_sort');
    host.innerHTML = '';

    function chip(key){
      const div = document.createElement('div');
      div.className = 'chip chip-sort';
      div.draggable = true;
      div.dataset.key = key;
      div.innerHTML = `
        <input type="checkbox" ${S.blocks[key]?'checked':''} style="margin-right:6px"/>
        <span>${BLOCK_TITLES[key] || key}</span>
        <span style="opacity:.6;margin-left:8px; font-size:12px; letter-spacing:.2px">⋮⋮</span>
      `;
      div.querySelector('input').addEventListener('change', (e)=>{
        S.blocks[key] = e.target.checked;
        buildPreviewUrl();
      });
      div.addEventListener('dragstart', (e)=>{
        div.classList.add('dragging');
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.effectAllowed = 'move';
      });
      div.addEventListener('dragend', ()=>{
        div.classList.remove('dragging');
        host.querySelectorAll('.drop-hint').forEach(n=>n.classList.remove('drop-hint'));
        buildPreviewUrl();
      });
      return div;
    }

    S.order.forEach(key => host.appendChild(chip(key)));

    host.addEventListener('dragover', (e)=>{
      e.preventDefault();
      const dragging = host.querySelector('.chip-sort.dragging');
      if (!dragging) return;
      const after = getAfterElement(host, e.clientX, e.clientY);
      host.querySelectorAll('.drop-hint').forEach(n=>n.classList.remove('drop-hint'));
      if (after == null) { host.lastElementChild?.classList.add('drop-hint'); }
      else { after.classList.add('drop-hint'); }
    });

    host.addEventListener('drop', (e)=>{
      e.preventDefault();
      const key = e.dataTransfer.getData('text/plain');
      const from = S.order.indexOf(key);
      if (from < 0) return;

      const afterEl = getAfterElement(host, e.clientX, e.clientY);
      let to;
      if (afterEl == null) { to = S.order.length - 1; }
      else {
        const afterKey = afterEl.dataset.key;
        to = Math.max(0, S.order.indexOf(afterKey));
      }
      if (to === from) return;

      const [itm] = S.order.splice(from,1);
      S.order.splice(to,0,itm);

      localStorage.setItem('blocks_order', JSON.stringify(S.order)); // persist
      renderBlocksSortable();
    });

    function getAfterElement(container, x, y){
      const els = [...container.querySelectorAll('.chip-sort:not(.dragging)')];
      let closest = null, closestDist = Infinity;
      for (const el of els){
        const r = el.getBoundingClientRect();
        const cx = Math.max(r.left, Math.min(x, r.right));
        const cy = Math.max(r.top,  Math.min(y, r.bottom));
        const dx = x - cx, dy = y - cy, d2 = dx*dx + dy*dy;
        if (d2 < closestDist){ closestDist = d2; closest = el; }
      }
      return closest;
    }
  }

  // Сброс порядка
  $('#reset_order').addEventListener('click', ()=>{
    S.order = [...BLOCKS_ORDER_DEFAULT];
    localStorage.removeItem('blocks_order');
    renderBlocksSortable();
    buildPreviewUrl();
  });

  // ====== API через воркер ======
  function buildUrl(endpoint, extra={}) {
    const base = window.API_BASE || '';
    const u = new URL(base||location.origin);
    u.searchParams.set('endpoint', endpoint);
    Object.entries(extra).forEach(([k,v])=> v!=null && u.searchParams.set(k,v));
    return u.toString();
  }
  async function apiGET(endpoint, params={}){ const r = await fetch(buildUrl(endpoint, params)); return r.json(); }
  async function apiPOST(endpoint, body={}, params={}) {
    const r = await fetch(buildUrl(endpoint, params), {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body)});
    return r.json();
  }

  // Порядок -> только включённые
  function collectBlocksOrder(){ return S.order.filter(key => !!S.blocks[key]); }

  // Сборка блюпринта с игрой
  function makeBlueprint(){
    const name  = $('#brand_name').value.trim()
      || (S.vertical==='coffee'?'Coffee To Go': S.vertical==='flowers'?'Bloom Studio':'Beer Club');
    const color = $('#brand_color').value.trim() || '#2F6FED';
    const ordered = collectBlocksOrder();

    const wantGame = !!S.game.code;
    if (wantGame){
      if (!ordered.includes('gamesPicker')) {
        const pos = Math.max(ordered.indexOf('menuGrid'),0)+1;
        ordered.splice(pos, 0, 'gamesPicker');
      }
      if (!ordered.includes('leaderboard')) {
        const pos = Math.max(ordered.indexOf('gamesPicker'),0)+1;
        ordered.splice(pos, 0, 'leaderboard');
      }
    }else{
      ['gamesPicker','leaderboard'].forEach(b=>{ const i=ordered.indexOf(b); if (i>=0) ordered.splice(i,1); });
    }

    const bp = {
      app: { name, theme:{ brand: color } },
      routes: [{ path:'/', blocks: ordered }],
      blocks: {
        hero:  { props:{ title: (S.vertical==='coffee'?'Кофе рядом с вами':'Заходи на дегустацию'),
                         subtitle: (S.vertical==='coffee'?'Горячо, быстро, по-домашнему':'Свежие сорта, бонусы и призы') } },
        promo: { props:{ items: PRESETS[S.vertical]?.promo || [] } },
        menuGrid: { props:{ category: PRESETS[S.vertical]?.category || $('#menu_cat').value.trim() || 'beer' } },
        loyaltyCard: { props:{ slots: S.loyalty.slots||6 } },
        stampShelf: { props:{} },
        bonusWheel: { props:{} },
        profile: { props:{} }
      },
      dicts: {},
      games: {}
    };

    if (wantGame){
      const gcat = GAMES[S.game.code] || {};
      bp.games[S.game.code] = {
        enabled: true,
        title: gcat.title || S.game.code,
        engine: gcat.engine || 'embedded',
        score_unit: gcat.score_unit || 'pts',
        attempts_daily: S.game.attempts_daily || 20,
        coins_on_pb: S.game.coins_on_pb || 0,
        ...(gcat.engine === 'iframe' ? { src: (S.game.src || '') } : {})
      };
      bp.blocks.gamesPicker = { props:{ layout:'grid', showCoins:true, games:[S.game.code] } };
      bp.blocks.leaderboard = { props:{ modes:['daily','all'], game:'auto' } };
    }
    return bp;
  }

  // Save draft / products / loyalty
  async function saveDraft(){
    const app_id = ($('#app_id').value.trim() || slug($('#brand_name').value||'app'));
    $('#app_id').value = app_id;
    S.app_id = app_id;

    const blueprint = makeBlueprint();

    const r1 = await apiPOST('/admin/blueprint/save_draft', { app_id, vertical: S.vertical, blueprint });
    if (!r1?.ok) throw new Error(r1?.error||'save_draft_failed');

    if (S.menu.length){
      const items = S.menu.map(m=>({ id:m.id, category:m.category, title:m.title, subtitle:m.subtitle, price_cents:m.price_cents }));
      const r2 = await apiPOST('/admin/products/bulk_upsert', { app_id, items });
      if (!r2?.ok) throw new Error(r2?.error||'products_upsert_failed');
    }

    const r3 = await apiPOST('/admin/loyalty/upsert', { app_id, slots: S.loyalty.slots||6, pin: S.loyalty.pin||'1111' });
    if (!r3?.ok) throw new Error(r3?.error||'loyalty_upsert_failed');

    toast('Черновик сохранён');
    buildPreviewUrl();
  }

  async function publishLive(){
    const app_id = $('#app_id').value.trim();
    if (!app_id){ toast('Сначала задайте App ID и сохраните черновик'); return; }
    const r = await apiPOST('/admin/publish', { app_id, to:'live' });
    if (!r?.ok){ toast('Ошибка публикации: '+(r?.error||'')); return; }
    const live = makeMiniUrl({ app_id, preview:'live' });
    $('#live_url').textContent = live;
    toast('Опубликовано в LIVE');
  }

  // Превью URL / iframe
  function makeMiniUrl({ app_id, preview='draft' }){
    // если админка лежит в корне домена с мини, то так:
    const base = location.origin;
    const api  = window.API_BASE || '';
    const u = new URL(base + '/mini/index.html');
    u.searchParams.set('app_id', app_id);
    u.searchParams.set('preview', preview==='live'?'live':'draft');
    if (api) u.searchParams.set('api_base', api);
    return u.toString();
  }
  function buildPreviewUrl(){
    const app_id = ($('#app_id').value.trim() || slug($('#brand_name').value||'app'));
    $('#badge_app').textContent = `app_id=${app_id}`;
    const url = makeMiniUrl({ app_id, preview:'draft' });
    $('#prev_url').textContent = url;
    $('#frame').src = url;
  }

  // Кнопки
  $('#btn_save').addEventListener('click', async ()=>{ try{ await saveDraft(); }catch(e){ toast('Ошибка: '+String(e.message||e)); } });
  $('#btn_preview').addEventListener('click', buildPreviewUrl);
  $('#open_prev').addEventListener('click', ()=> { const u=$('#prev_url').textContent; if(u) window.open(u,'_blank'); });
  $('#copy_prev').addEventListener('click', async ()=> { await navigator.clipboard.writeText($('#prev_url').textContent||''); toast('Скопировано'); });
  $('#btn_publish').addEventListener('click', publishLive);

  // ====== Инициализация ======
  (function init(){
    // восстановим порядок из localStorage
    try{
      const saved = JSON.parse(localStorage.getItem('blocks_order')||'[]');
      if (Array.isArray(saved) && saved.length) {
        const known = BLOCKS_ORDER_DEFAULT;
        S.order = saved.filter(k => known.includes(k));
        known.forEach(k => { if (!S.order.includes(k)) S.order.push(k); });
      }
    }catch(_){}
    renderBlocksSortable();

    S.vertical = $('#vertical').value;
    applyVerticalPreset(S.vertical);
    S.brand.color = $('#brand_color').value;
    S.loyalty.pin = $('#loyal_pin').value; S.loyalty.slots = Number($('#loyal_slots').value||6);
    buildPreviewUrl();
  })();

})();
