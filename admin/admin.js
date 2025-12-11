<!-- admin.v3.js -->
<script>
(() => {
  const S = { vertical: 'beer', template: null, game: {}, lastDraftVer: null };

  /* ---------- helpers ---------- */
  const $ = (q, r = document) => r.querySelector(q);
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const j = (x) => JSON.stringify(x);

  const dom = {
    tpl:         $('#tpl_builtin'),
    applyTplBtn: $('#tpl_apply'),
    appId:       $('#app_id'),
    apiBase:     $('#api_base_input'),
    cssBox:      $('#theme_css'),
    saveBtn:     $('#save_draft'),
    publishBtn:  $('#publish_btn'),
    frame:       $('#frame'),
    prevUrl:     $('#prev_url'),
  };

  function toast(msg){ console.log('[admin]', msg); }
  function must(v, m){ if (!v) throw new Error(m); return v; }

  /* ---------- templates ---------- */
  // Ожидаем window.BUILTIN_TEMPLATES[ key ] = { sections:[ {key, inner, hidden?}, … ] }
  function applyBuiltinTemplate(key){
    const T = (window.BUILTIN_TEMPLATES && window.BUILTIN_TEMPLATES[key]);
    if (!T || !Array.isArray(T.sections) || !T.sections.length){
      throw new Error('NO_TEMPLATE_SECTIONS:'+key);
    }
    S.template = { key, sections: T.sections.map(s => ({...s})) };
    // Тема, если объявлена
    if (window.BUILTIN_THEMES && window.BUILTIN_THEMES[key]){
      dom.cssBox.value = window.BUILTIN_THEMES[key];
    }
    toast('Шаблон применён: '+key);
  }

  /* ---------- blueprint ---------- */
  function collectBlocksOrderFromTemplate(){
    if (!S.template) return [];
    return S.template.sections.filter(s => !s.hidden).map(s => s.key);
  }

  function makeBlueprint(){
    const name   = (dom.appId.value || 'Beer Demo').trim();
    const themeCss = dom.cssBox.value || '';

    const wantGame = !!S.game.code;

    const routesBase = [
      { path:'/',            title:'Главная',   icon:'home',    blocks: [] },
      { path:'/tournament',  title:'Турнир',    icon:'cup',     blocks: wantGame ? ['leaderboard'] : [] },
      { path:'/play',        title:'Играть',    icon:'gamepad', blocks: wantGame ? ['gamesPicker'] : [] },
      { path:'/bonuses',     title:'Бонусы',    icon:'gift',    blocks: ['bonusWheel','stampShelf'] },
      { path:'/profile',     title:'Профиль',   icon:'user',    blocks: ['profile'] },
    ];

    const bp = {
      app:   { name, theme:{ css: themeCss, brand:'#3d7eff', skin:'dark-glass' }, subtitle:'' },
      nav:   { type:'tabs', position:'bottom', routes: routesBase.map(r => ({ path:r.path, title:r.title, icon:r.icon })) },
      routes: routesBase.map(r => ({ path:r.path, blocks:r.blocks })),
      blocks: {
        profile:     { props:{} },
        stampShelf:  { props:{} },
        bonusWheel:  { props:{} },
        gamesPicker: { props:{ layout:'list', showCoins:true, games: S.game.code ? [S.game.code] : [] } },
        leaderboard: { props:{ modes:['daily','all'], game:'auto' } }
      },
      dicts: {},
      games: {}
    };

    // Вставляем HTML-секции шаблона ТОЛЬКО на главную
    if (S.template && S.template.key){
      const htmlKeys = collectBlocksOrderFromTemplate();
      // регистрируем htmlEmbed
      htmlKeys.forEach(k => {
        bp.blocks[k] = { type:'htmlEmbed', props:{ html: (S.template.sections.find(s=>s.key===k)?.inner || '') } };
      });
      // заменяем главную
      bp.routes = bp.routes.filter(r => r.path !== '/');
      bp.routes.unshift({ path:'/', blocks: htmlKeys });
    }

    if (S.game.code){
      bp.games[S.game.code] = {
        enabled:true, title:S.game.code, engine:'embedded', score_unit:'pts', attempts_daily: 20
      };
    }

    return bp;
  }

  /* ---------- networking ---------- */
  function buildAdminUrl(ep){
    const base = must(dom.apiBase.value.trim(), 'Укажи API Base (URL воркера)');
    const u = new URL(base);
    u.searchParams.set('endpoint', ep);
    return u.toString();
  }

  async function saveDraft(){
    const app_id = must(dom.appId.value.trim(), 'App ID?');
    const blueprint = makeBlueprint();
    const url = buildAdminUrl('/admin/blueprint/save_draft');

    const res = await fetch(url, {
      method:'POST',
      headers:{ 'content-type': 'application/json' },
      body: j({ app_id, vertical:S.vertical, blueprint })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok){
      console.error('save_draft failed', data);
      throw new Error('SAVE_DRAFT_FAILED: '+(data && data.error || res.status));
    }
    S.lastDraftVer = data.data && data.data.version;
    toast('Черновик сохранён: ver '+S.lastDraftVer);
    updatePreview();
  }

  function previewUrl(){
    const app_id = dom.appId.value.trim() || 'beer';
    const api    = must(dom.apiBase.value.trim(), 'API Base?');
    const u = new URL('/mini/index.html', location.origin);
    u.searchParams.set('app_id', app_id);
    u.searchParams.set('preview', 'draft');
    u.searchParams.set('api_base', api);
    u.searchParams.set('tg', Math.floor(1000000+Math.random()*9000000)); // демо-юзер
    u.searchParams.set('dev', '1');
    u.searchParams.set('demo', '1');
    return u.toString();
  }

  function updatePreview(){
    const u = previewUrl();
    dom.prevUrl.textContent = u;
    dom.frame.src = u;
  }

  /* ---------- events ---------- */
  dom.applyTplBtn.addEventListener('click', () => {
    const key = dom.tpl.value;
    try{
      must(key, 'Выбери шаблон');
      applyBuiltinTemplate(key);
      toast('Тема подключена, не забудь «Создать черновик».');
    }catch(e){
      alert(e.message); console.error(e);
    }
  });

  dom.saveBtn.addEventListener('click', async () => {
    try { await saveDraft(); }
    catch(e){ alert(e.message); }
  });

  dom.publishBtn.addEventListener('click', async () => {
    try {
      const app_id = must(dom.appId.value.trim(), 'App ID?');
      const url = buildAdminUrl('/admin/publish');
      const res = await fetch(url, {
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body: j({ app_id, to:'live' })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error||'PUBLISH_FAILED');
      alert('Опубликовано: v'+(data.data && data.data.version));
    } catch(e){ alert(e.message); }
  });

  dom.apiBase.addEventListener('change', updatePreview);
  dom.appId.addEventListener('change', updatePreview);

  // авто-обновление превью при вводе CSS (без сохранения)
  dom.cssBox.addEventListener('input', () => {
    // просто подсказка, что нужно сохранить
    dom.cssBox.style.outline = '2px solid #f9b24d';
  });

  // первый запуск
  updatePreview();
})();
</script>
