(function(){
  const html = document.documentElement;
  const themeSwitch = document.getElementById('themeSwitch');
  const side = document.getElementById('side');
  // const sideCollapse = document.getElementById('sideCollapse'); // removed: sidebar always expanded
  const sideNav = document.getElementById('sideNav');
  const views = Array.from(document.querySelectorAll('.view[data-view]'));
  const pageTitle = document.getElementById('pageTitle');
  const pageSub = document.getElementById('pageSub');
  const settingsTabs = document.getElementById('settingsTabs');
  const ctorFrame = document.getElementById('ctorFrame');

  

  function sendThemeToCtor(){
    try{
      if (!ctorFrame || !ctorFrame.contentWindow) return;
      const t = html.getAttribute('data-theme') || 'dark';
      ctorFrame.contentWindow.postMessage({type:'theme', theme:t}, '*');
    }catch(_){}
  }

  function setMode(viewId){
    document.body.classList.toggle('mode-constructor', viewId === 'constructor');
    // when entering constructor, push theme into iframe
    if (viewId === 'constructor') setTimeout(sendThemeToCtor, 50);
  }
const META = {
    constructor:{t:'Конструктор',s:'Редактирование страниц, блоков и настроек mini‑app.'},
    entities:{t:'Сущности',s:'Настройка сущностей mini‑app: товары, услуги, игры, страницы.'},
    faq:{t:'Вопрос‑ответ (FAQ)',s:'Частые вопросы и ответы, которые бот отправляет автоматически.'},
    broadcasts:{t:'Рассылки',s:'Кампании, сегменты и расписания отправок.'},
    channels:{t:'Подключения каналов',s:'Интеграции: Telegram, Webhook, CRM, касса, Google Sheets.'},
    stats:{t:'Статистика',s:'KPI, активность пользователей, продажи и вовлечённость.'},
    dialogs:{t:'Диалоги',s:'Обращения пользователей и ответы оператора.'},
    settings:{t:'Настройки бота',s:'Основные параметры, интеграции и безопасность.'},
    support:{t:'Поддержка',s:'Связь с поддержкой и статусы заявок.'},
    help:{t:'Справочный центр',s:'Инструкции и гайды по настройке.'},
    profile:{t:'Профиль',s:'Аккаунт, доступы, уведомления.'},
  };

  function applyTheme(next){
    html.setAttribute('data-theme', next);
    localStorage.setItem('panel_theme', next);
    // если сейчас открыт конструктор — синхронизируем тему в iframe
    if (document.body.classList.contains('mode-constructor')){
      setTimeout(sendThemeToCtor, 30);
    }
  }
  applyTheme(localStorage.getItem('panel_theme') || 'light');
  themeSwitch?.addEventListener('click', ()=>{
    const cur = html.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // sidebar: always expanded (no mini mode)
  const KEY_SIDE_MINI = 'panel_side_mini';
  try{ localStorage.removeItem(KEY_SIDE_MINI); }catch(_){}
  side.classList.remove('is-mini');
  document.documentElement.style.setProperty('--side-w', '96px');

  // (collapse handler removed)

  function showView(id){
    views.forEach(v=>v.classList.toggle('is-show', v.dataset.view===id));
    const m = META[id] || {t:'',s:''};
    pageTitle.textContent = m.t;
    pageSub.textContent = m.s;

    // constructor mode: maximum space
    document.body.classList.toggle('is-ctor', id === 'constructor');

    settingsTabs.hidden = id !== 'settings';
    if (id === 'settings') setSettingsTab('base');

    // update constructor iframe with current app_id
    if (id === 'constructor' && ctorFrame){
      const url = new URL(window.location.href);
      const appId = url.searchParams.get('app_id') || url.searchParams.get('app') || 'my_app';
      const srcBase = 'miniapp_sections_fixed2/app/index.html';
      // embed=1 => seamless mode inside iframe (no outer padding/left panel)
      const hostSideW = getComputedStyle(document.documentElement).getPropertyValue('--side-w').trim() || '96px';
      const src = srcBase + '?preview=draft&embed=1&host_side_w=' + encodeURIComponent(hostSideW) + '&app_id=' + encodeURIComponent(appId);
      if (!ctorFrame.dataset.bound || ctorFrame.src.indexOf(srcBase) === -1){
        // first time
        ctorFrame.src = src;
        ctorFrame.dataset.bound = '1';
      } else {
        // only change app_id if differs
        const cur = new URL(ctorFrame.src, window.location.href);
        if (cur.searchParams.get('app_id') !== appId){
          ctorFrame.src = src;
        }
      }
    }

    // apply page layout mode (hide topbar/paddings for constructor)
    setMode(id);
  }

  sideNav.addEventListener('click', (e)=>{
    const btn = e.target.closest('.side__item[data-view]');
    if (!btn) return;
    const id = btn.dataset.view;
    sideNav.querySelectorAll('.side__item').forEach(x=>x.classList.toggle('is-active', x===btn));
    showView(id);
  });

  const tabBtns = Array.from(document.querySelectorAll('#settingsTabs .tab'));
  function setSettingsTab(tab){
    tabBtns.forEach(b=>b.classList.toggle('is-active', b.dataset.tab===tab));
    const fall = document.getElementById('tab_fallbacks');
    const integ = document.getElementById('tab_integrations');
    if (fall) fall.hidden = tab !== 'fallbacks';
    if (integ) integ.hidden = tab !== 'integrations';
  }
  settingsTabs.addEventListener('click', (e)=>{
    const t = e.target.closest('.tab[data-tab]');
    if (!t) return;
    setSettingsTab(t.dataset.tab);
  });

  const clearTitle = document.getElementById('clearTitle');
  const botTitle = document.getElementById('botTitle');
  const saveBase = document.getElementById('saveBase');
  const saveHint = document.getElementById('saveHint');

  clearTitle?.addEventListener('click', ()=>{ botTitle.value=''; botTitle.focus(); });
  saveBase?.addEventListener('click', ()=>{
    saveBase.disabled = true;
    saveHint.textContent = 'Сохраняем…';
    setTimeout(()=>{
      saveBase.disabled = false;
      saveHint.textContent = 'Сохранено ✓';
      setTimeout(()=>saveHint.textContent='', 1600);
    }, 650);
  });

  // open like screenshot
  showView('settings');
  sideNav.querySelectorAll('.side__item').forEach(x=>x.classList.toggle('is-active', x.dataset.view==='settings'));

  // sync theme into constructor iframe
  try{
    const obs = new MutationObserver(()=>sendThemeToCtor());
    obs.observe(html, {attributes:true, attributeFilter:['data-theme']});
    // also send when iframe loads
    if (ctorFrame){
      ctorFrame.addEventListener('load', ()=>sendThemeToCtor());
    }
  }catch(_){}
})();


