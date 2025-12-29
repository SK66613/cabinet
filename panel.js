(function(){
  'use strict';

  const $  = (sel, root=document)=> root.querySelector(sel);
  const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

  const sideNav      = document.getElementById('sideNav');
  const views        = document.getElementById('views');
  const pageTitleEl  = document.getElementById('pageTitle');
  const pageSubEl    = document.getElementById('pageSub');
  const settingsTabs = document.getElementById('settingsTabs');
  const ctorFrame    = document.getElementById('ctorFrame');

  const API_BASE = (window.CTOR_API_BASE || window.location.origin).replace(/\/$/, '');
  const botUsernameEl = document.getElementById('tgBotUsername');
  const botTokenEl    = document.getElementById('tgBotToken');
  const botStatusPill = document.getElementById('botStatusPill');
  const botSaveBtn    = document.getElementById('saveBotToken');
  const botSaveHint   = document.getElementById('botSaveHint');

  let botSettingsLoaded = false;

  function getCurrentAppId(){
    const qs = new URLSearchParams(window.location.search);
    return qs.get('app_id') || qs.get('app') || 'my_app';
  }

  async function loadBotSettings(){
    if (!botUsernameEl || !botStatusPill) return;
    const appId = getCurrentAppId();
    if (botSaveHint) botSaveHint.textContent = 'Загружаем интеграцию…';
    try{
      const res = await fetch(API_BASE + '/api/app/' + encodeURIComponent(appId) + '/bot', { method:'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json().catch(()=>null) || {};
      if (data.bot_username) botUsernameEl.value = data.bot_username;
      updateBotStatusPill(!!data.has_token);
      if (botSaveHint) botSaveHint.textContent = !!data.has_token
        ? 'Интеграция настроена.'
        : 'Укажи токен бота и нажми «Сохранить».';
    }catch(e){
      console.warn('[panel] loadBotSettings failed', e);
      updateBotStatusPill(false);
      if (botSaveHint) botSaveHint.textContent = 'Не удалось загрузить настройки бота.';
    }
  }

  function updateBotStatusPill(connected){
    if (!botStatusPill) return;
    botStatusPill.textContent = connected ? 'Подключён' : 'Не подключён';
    botStatusPill.classList.toggle('pill--ok', !!connected);
  }

  function sendThemeToCtor(){
    try{
      const theme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
      ctorFrame?.contentWindow?.postMessage({type:'host_theme', theme}, '*');
    }catch(_){}
  }

  function setTheme(mode){
    const root = document.body;
    if (mode === 'dark'){
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
    }else{
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
    }
    try{ localStorage.setItem('sg_theme', mode); }catch(_){}
    sendThemeToCtor();
  }

  function initTheme(){
    let mode = 'light';
    try{
      const saved = localStorage.getItem('sg_theme');
      if (saved === 'dark' || saved === 'light') mode = saved;
    }catch(_){}
    setTheme(mode);
  }

  initTheme();

  window.addEventListener('message', (e)=>{
    const data = e.data || {};
    if (data.type === 'ctor_ready'){
      sendThemeToCtor();
    }
    if (data.type === 'publish_done'){
      // Тут пока просто лог, можно будет сделать красивый toast
      console.log('[panel] publish_done', data);
    }
  });

  function switchView(id){
    $$('.view', views).forEach(v=>{
      v.classList.toggle('is-show', v.dataset.view === id);
    });
    $$('.side__item', sideNav).forEach(btn=>{
      btn.classList.toggle('is-active', btn.dataset.view === id);
    });

    if (id === 'constructor'){
      pageTitleEl.textContent = 'Конструктор мини-аппа';
      pageSubEl.textContent   = 'Собирай, редактируй и публикуй экраны.';
    }else if (id === 'apps'){
      pageTitleEl.textContent = 'Мои мини-аппы';
      pageSubEl.textContent   = 'Список проектов и статус публикации.';
    }else if (id === 'settings'){
      pageTitleEl.textContent = 'Настройки проекта';
      pageSubEl.textContent   = 'Базовые параметры, fallback-экраны и интеграции.';
    }

    settingsTabs.hidden = id !== 'settings';
    if (id === 'settings') {
      setSettingsTab('base');
      if (!botSettingsLoaded){
        botSettingsLoaded = true;
        loadBotSettings().catch(()=>{});
      }
    }
  }

  function setSettingsTab(tab){
    $$('.tabs__btn', settingsTabs).forEach(btn=>{
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
    $('#tab_base').hidden        = tab !== 'base';
    $('#tab_fallbacks').hidden   = tab !== 'fallbacks';
    $('#tab_integrations').hidden= tab !== 'integrations';
  }

  if (settingsTabs){
    settingsTabs.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tabs__btn');
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (!tab) return;
      setSettingsTab(tab);
    });
  }

  if (sideNav){
    sideNav.addEventListener('click', (e)=>{
      const btn = e.target.closest('.side__item');
      if (!btn) return;
      const view = btn.dataset.view;
      if (!view) return;
      switchView(view);
    });
  }

  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch){
    themeSwitch.addEventListener('click', ()=>{
      const isDark = document.body.classList.contains('theme-dark');
      setTheme(isDark ? 'light' : 'dark');
    });
  }

  const saveBaseBtn      = document.getElementById('saveBase');
  const baseSavedHintEl  = document.getElementById('baseSavedHint');
  if (saveBaseBtn){
    saveBaseBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      if (baseSavedHintEl){
        baseSavedHintEl.textContent = 'Сохранили (пока локально, без бэкенда).';
        setTimeout(()=> baseSavedHintEl.textContent = '', 2000);
      }
    });
  }

  const saveFallbacksBtn = document.getElementById('saveFallbacks');
  const fallbacksHintEl  = document.getElementById('fallbacksHint');
  if (saveFallbacksBtn){
    saveFallbacksBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      if (fallbacksHintEl){
        fallbacksHintEl.textContent = 'Сохранили (пока локально).';
        setTimeout(()=> fallbacksHintEl.textContent = '', 2000);
      }
    });
  }

  if (botSaveBtn){
    botSaveBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const appId = getCurrentAppId();
      if (!appId) return;

      botSaveBtn.disabled = true;
      if (botSaveHint) botSaveHint.textContent = 'Сохраняем…';

      try{
        const res = await fetch(API_BASE + '/api/app/' + encodeURIComponent(appId) + '/bot', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({
            bot_username: botUsernameEl ? botUsernameEl.value.trim() : null,
            token: botTokenEl ? botTokenEl.value.trim() : null
          })
        });
        const data = await res.json().catch(()=>null) || {};
        if (!res.ok || (data.ok === false)) throw new Error(data.error || 'SAVE_FAILED');

        if (botTokenEl) botTokenEl.value = '';
        updateBotStatusPill(true);

        if (botSaveHint){
          botSaveHint.textContent = 'Токен сохранён ✓';
          setTimeout(()=>{ botSaveHint.textContent = ''; }, 2500);
        }
      }catch(err){
        console.error('[panel] saveBotToken failed', err);
        if (botSaveHint) botSaveHint.textContent = 'Ошибка сохранения. Попробуй ещё раз.';
      }finally{
        botSaveBtn.disabled = false;
      }
    });
  }

  // кнопка "Открыть как в Телеге"
  const openPreviewBtn = document.getElementById('openPreview');
  if (openPreviewBtn){
    openPreviewBtn.addEventListener('click', ()=>{
      const appId = getCurrentAppId();
      const url   = new URL(window.location.href);
      const publicId = url.searchParams.get('public_id') || 'app-my_app-97rn';
      const webAppUrl = 'https://build-apps.cyberian13.workers.dev/app/' + encodeURIComponent(publicId);
      window.open(webAppUrl, '_blank');
    });
  }

})();
