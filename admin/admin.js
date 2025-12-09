(function(){
  const $ = s => document.querySelector(s);
  const state = { products: [] };

  // --- API helpers (GAS WebApp expects ?endpoint=/path) ---
  async function apiGet(endpoint, params={}){
    const u = new URL(window.API_BASE);
    u.searchParams.set('endpoint', endpoint);
    if (window.ADM_KEY) u.searchParams.set('adm_key', window.ADM_KEY);
    Object.entries(params).forEach(([k,v]) => v!=null && u.searchParams.set(k, v));
    const r = await fetch(u.toString());
    return r.json();
  }
  async function apiPost(endpoint, body={}){
    const u = new URL(window.API_BASE);
    u.searchParams.set('endpoint', endpoint);
    if (window.ADM_KEY) u.searchParams.set('adm_key', window.ADM_KEY);
    const r = await fetch(u.toString(), {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  }

  // --- Blueprint assembly from form ---
  function assembleBlueprint(){
    const vertical = $('#vertical').value;
    const name = $('#brand_name').value.trim() || (vertical==='beer'?'Beer Club':vertical==='coffee'?'Coffee Go':'Flora Day');
    const brand = $('#brand_color').value || '#2F6FED';
    const blocks = [];
    if ($('#b_hero').checked) blocks.push('hero');
    if ($('#b_promo').checked) blocks.push('promo');
    if ($('#b_menu').checked) blocks.push('menuGrid');
    if ($('#b_loyalty').checked) blocks.push('loyaltyCard','stampShelf','bonusWheel');
    if ($('#b_profile').checked) blocks.push('profile');

    const routes = [
      { path: '/', blocks },
      { path: '/menu', blocks: ['menuGrid'] },
      { path: '/loyalty', blocks: ['loyaltyCard','stampShelf','bonusWheel'] },
      { path: '/profile', blocks: ['profile'] },
    ];
    const dicts = vertical==='beer' ? {styles:['IPA','Lager','Stout','Wheat','Sour']} :
                 vertical==='coffee'? {styles:['Эспрессо','Американо','Капучино','Латте']} :
                                      {styles:['Мини','Стандарт','Большой']};
    return { app:{ name, theme:{ brand } }, routes, dicts };
  }

  // --- Preview URL builder (points to your user SPA) ---
  const PREVIEW_PATH = '/index.html'; // поменяй на '/cabinet.html' если нужно

  function refreshPreviewUrl(){
    const app_id = $('#app_id').value.trim();
    const api = (window.API_BASE||'').trim();

    if (!app_id || !api){
      $('#preview-url').textContent = '— (укажи API_BASE и App ID)';
      $('#preview').src = 'about:blank';
      return;
    }

    const u = new URL(PREVIEW_PATH, location.origin);
    u.searchParams.set('app_id', app_id);
    u.searchParams.set('preview', 'draft'); // важно: черновик
    u.searchParams.set('api_base', api);    // проброс адреса GAS внутрь SPA

    $('#preview-url').textContent = u.toString();
    $('#preview').src = u.toString();
  }

  // --- UI bindings ---
  $('#btn-add-product').addEventListener('click', () => {
    const cat = $('#menu_category').value.trim();
    const title = $('#menu_title').value.trim();
    const sub = $('#menu_sub').value.trim();
    const price = Number($('#menu_price').value||0);
    if (!cat || !title || !price){ alert('Заполни категорию/название/цену'); return; }
    state.products.push({ id: crypto.randomUUID(), category: cat, title, subtitle: sub, price_cents: price*100 });
    $('#prod-count').textContent = `${state.products.length} позиций`;
    $('#menu_title').value=''; $('#menu_sub').value=''; $('#menu_price').value='';
  });

  $('#btn-create-draft').addEventListener('click', async () => {
    const app_id = $('#app_id').value.trim(); if (!app_id) return alert('Укажи App ID');
    if (!window.API_BASE || window.API_BASE.includes('PUT_YOUR_GAS_URL')) return alert('В admin/index.html пропиши window.API_BASE');

    const vertical = $('#vertical').value;
    const bp = assembleBlueprint();
    const slots = Number($('#loy_slots').value||6);
    const pin = String($('#loy_pin').value||'1111');

    // 1) блюпринт → draft
    const r1 = await apiPost('/admin/blueprint/save_draft', { app_id, vertical, blueprint: bp });
    if (!r1.ok){ alert('Ошибка draft: '+(r1.error||'')); return; }

    // 2) товары
    if (state.products.length){
      const r2 = await apiPost('/admin/products/bulk_upsert', { app_id, items: state.products });
      if (!r2.ok){ alert('Ошибка products: '+(r2.error||'')); return; }
    }

    // 3) лояльность
    const r3 = await apiPost('/admin/loyalty/upsert', { app_id, slots, pin });
    if (!r3.ok){ alert('Ошибка loyalty: '+(r3.error||'')); return; }

    alert('Черновик сохранён');
    refreshPreviewUrl(); // сразу показать превью
  });

  $('#btn-preview').addEventListener('click', refreshPreviewUrl);

  $('#btn-open-separate').addEventListener('click', () => {
    const u = $('#preview-url').textContent.trim();
    if (u && u!=='—') window.open(u, '_blank');
  });

  $('#btn-publish').addEventListener('click', async () => {
    const app_id = $('#app_id').value.trim(); if (!app_id) return alert('Укажи App ID');
    const r = await apiPost('/admin/publish', { app_id, to: 'live' });
    if (!r.ok){ alert('Ошибка публикации: '+(r.error||'')); return; }
    alert('Опубликовано в LIVE');
  });

  // автообновление превью при вводе App ID
  $('#app_id').addEventListener('input', refreshPreviewUrl);

  // подсказка, если API_BASE не задан
  if (!window.API_BASE || window.API_BASE.includes('PUT_YOUR_GAS_URL')){
    $('#preview-url').textContent = 'Укажи window.API_BASE в <script> в admin/index.html';
  }
})();
