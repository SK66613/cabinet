(function(){
vertical==='coffee'? {styles:['Эспрессо','Американо','Капучино','Латте']} :
{styles:['Мини','Стандарт','Большой']};
return { app:{ name, theme:{ brand } }, routes, dicts };
}


function refreshPreviewUrl(){
const app_id = q('#app_id').value.trim();
if (!app_id || !window.API_BASE){ q('#preview-url').textContent = '—'; q('#preview').src='about:blank'; return; }
const u = new URL('/public/', location.origin); // твой фронт рендерер (из предыдущего шага), если лежит в /public/
// Передадим preview=draft и app_id, а также API_BASE
u.searchParams.set('app_id', app_id);
u.searchParams.set('preview', 'draft');
q('#preview-url').textContent = u.toString();
q('#preview').src = u.toString();
}


q('#btn-add-product').addEventListener('click', () => {
const cat = q('#menu_category').value.trim();
const title = q('#menu_title').value.trim();
const sub = q('#menu_sub').value.trim();
const price = Number(q('#menu_price').value||0);
if (!cat || !title || !price){ alert('Заполни категорию/название/цену'); return; }
state.products.push({ id: crypto.randomUUID(), category: cat, title, subtitle: sub, price_cents: price*100 });
q('#prod-count').textContent = `${state.products.length} позиций`;
q('#menu_title').value=''; q('#menu_sub').value=''; q('#menu_price').value='';
});


q('#btn-create-draft').addEventListener('click', async () => {
const app_id = q('#app_id').value.trim(); if (!app_id) return alert('Укажи App ID');
const vertical = q('#vertical').value;
const bp = assembleBlueprint();
const slots = Number(q('#loy_slots').value||6);
const pin = String(q('#loy_pin').value||'1111');


// 1) сохранить блюпринт как черновик
const r1 = await apiPost('/admin/blueprint/save_draft', { app_id, vertical, blueprint: bp });
if (!r1.ok) return alert('Ошибка draft: '+(r1.error||''));


// 2) загрузить товары
if (state.products.length){
const r2 = await apiPost('/admin/products/bulk_upsert', { app_id, items: state.products });
if (!r2.ok) return alert('Ошибка products: '+(r2.error||''));
}


// 3) лояльность
const r3 = await apiPost('/admin/loyalty/upsert', { app_id, slots, pin });
if (!r3.ok) return alert('Ошибка loyalty: '+(r3.error||''));


alert('Черновик сохранён');
refreshPreviewUrl();
});


q('#btn-preview').addEventListener('click', () => refreshPreviewUrl());


q('#btn-open-separate').addEventListener('click', () => {
const u = q('#preview-url').textContent.trim(); if (u && u!=='—') window.open(u, '_blank');
});


q('#btn-publish').addEventListener('click', async () => {
const app_id = q('#app_id').value.trim(); if (!app_id) return alert('Укажи App ID');
const r = await apiPost('/admin/publish', { app_id, to: 'live' });
if (!r.ok) return alert('Ошибка публикации: '+(r.error||''));
alert('Опубликовано в LIVE');
});
})();
