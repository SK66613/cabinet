/* front_renderer_react_spa_v_1.jsx
   UMD-режим: нет import/export. В конце: window.App = App.
   Требует React 18 UMD + ReactDOM + Babel Standalone. */

const { useEffect, useMemo, useState, useRef } = React;

/* ===== Helpers ===== */
const API_BASE = (window.API_BASE || location.origin);
const APP_ID   = (window.__APP_ID__  || 'beer');
const CHANNEL  = (window.__CHANNEL__ || 'live'); // 'draft' | 'live'

function demoTgId(){
  let id = localStorage.getItem('demo_tg_id');
  if (!id){ id = String(Math.floor(Math.random()*1e9)); localStorage.setItem('demo_tg_id', id); }
  return id;
}
async function apiGet(path, params={}){
  const u = new URL(API_BASE);
  u.searchParams.set('endpoint', path);
  Object.entries(params).forEach(([k,v]) => v!=null && u.searchParams.set(k, v));
  const r = await fetch(u.toString(), { headers: { 'X-TG-ID': demoTgId() } });
  return r.json();
}
async function apiPost(path, body={}){
  const u = new URL(API_BASE);
  u.searchParams.set('endpoint', path);
  const r = await fetch(u.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-TG-ID': demoTgId() },
    body: JSON.stringify(body)
  });
  return r.json();
}
const cls = (...a) => a.filter(Boolean).join(' ');

function useHashRoute(){
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#/, '') || '/';
}

/* ====== Blocks ====== */

function Hero({ title="Заходи на дегустацию", subtitle="Свежие сорта, бонусы и призы", brand="#2F6FED" }){
  return (
    <div style={{padding:'24px'}}>
      <div style={{
        borderRadius:20, padding:'24px', background:'linear-gradient(135deg, rgba(47,111,237,.15), rgba(255,255,255,.04))',
        border:'1px solid rgba(255,255,255,.08)'
      }}>
        <div style={{fontSize:24, fontWeight:700, marginBottom:6}}>{title}</div>
        <div style={{opacity:.8}}>{subtitle}</div>
      </div>
    </div>
  );
}

function PromoTicker({ items=["–20% на IPA сегодня","Каждая 6-я кружка — бесплатно"], brand="#2F6FED"}){
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div style={{display:'flex', gap:8, overflowX:'auto'}}>
        {items.map((t,i)=>(
          <div key={i} style={{
            whiteSpace:'nowrap', padding:'8px 12px', borderRadius:999,
            border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.06)'
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function MenuGrid({ category, appId=APP_ID }){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ (async ()=>{
    setLoading(true);
    const res = await apiGet('/api/products', { app_id: appId, category });
    setItems(res?.data?.items || []); setLoading(false);
  })(); }, [category, appId]);
  return (
    <div style={{padding:'0 24px 24px'}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:12}}>
        {loading ? Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{height:120, borderRadius:14, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)'}}/>
        )) : items.map(p=>(
          <div key={p.id} style={{borderRadius:14, padding:14, border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.04)'}}>
            <div style={{fontWeight:600}}>{p.title}</div>
            {p.subtitle && <div style={{opacity:.75, fontSize:13, marginTop:2}}>{p.subtitle}</div>}
            <div style={{marginTop:10, fontWeight:700}}>{(p.price_cents/100).toFixed(0)} ₽</div>
            <button style={{marginTop:10, padding:'8px 10px', borderRadius:10, border:'1px solid rgba(255,255,255,.2)', background:'transparent', color:'#fff', cursor:'pointer'}}>В корзину</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoyaltyCard({ slots=6 }){
  const filled = 0;
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div style={{borderRadius:16, padding:16, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)'}}>
        <div style={{fontWeight:700, marginBottom:10}}>Карта лояльности</div>
        <div style={{display:'grid', gridTemplateColumns:`repeat(${slots}, 1fr)`, gap:8}}>
          {Array.from({length:slots}).map((_,i)=>(
            <div key={i} style={{
              height:34, borderRadius:10, border:'1px dashed rgba(255,255,255,.25)',
              background: i<filled ? 'rgba(47,111,237,.5)' : 'transparent'
            }}/>
          ))}
        </div>
        <div style={{marginTop:10, opacity:.8, fontSize:13}}>Соберите {slots} штампов — получите подарок</div>
      </div>
    </div>
  );
}

function StampShelf({ appId=APP_ID }){
  const [pin, setPin] = useState('1111');
  const [code, setCode] = useState('IPA');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);
  async function claim(){
    setPending(true); setMsg('');
    const res = await apiPost('/api/stamp/claim', { app_id: appId, code, pin });
    if (res?.ok) setMsg('Штамп зачтён ✅');
    else setMsg('Ошибка: '+(res?.error||'unknown'));
    setPending(false);
  }
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <input value={code} onChange={e=>setCode(e.target.value)} placeholder="код (например, IPA)" style={inpStyle}/>
        <input value={pin}  onChange={e=>setPin(e.target.value)}  placeholder="PIN кассира" style={inpStyle}/>
        <button onClick={claim} disabled={pending} style={btnStyle}>{pending?'...':'Получить штамп'}</button>
      </div>
      {!!msg && <div style={{marginTop:8, opacity:.9}}>{msg}</div>}
    </div>
  );
}

function BonusWheel({ appId=APP_ID }){
  const [res,setRes] = useState(null);
  const [pending,setPending]=useState(false);
  async function spin(){
    setPending(true); setRes(null);
    const r = await apiPost('/api/wheel/spin', { app_id: appId });
    setRes(r); setPending(false);
  }
  return (
    <div style={{padding:'0 24px 24px'}}>
      <div style={{border:'1px solid rgba(255,255,255,.12)', borderRadius:16, padding:16}}>
        <div style={{fontWeight:700, marginBottom:8}}>Бонусное колесо</div>
        <button onClick={spin} disabled={pending} style={btnStyle}>{pending?'Крутим...':'Крутить'}</button>
        {res && (
          <div style={{marginTop:10}}>
            {res.ok ? <>Выпало: <b>{res.data.label}</b></> : <>Ошибка: {res.error}</>}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({ appId=APP_ID }){
  const [p,setP]=useState(null);
  useEffect(()=>{ (async ()=>{
    const r = await apiGet('/api/profile', { app_id: appId });
    setP(r?.data || null);
  })(); }, [appId]);
  return (
    <div style={{padding:'0 24px 24px'}}>
      <div style={{border:'1px solid rgba(255,255,255,.12)', borderRadius:16, padding:16}}>
        <div style={{fontWeight:700, marginBottom:8}}>Профиль</div>
        {!p ? 'Загрузка...' : (
          <div style={{display:'grid', gap:6}}>
            <div>tg_id: <code>{p.tg_id}</code></div>
            <div>Штампы: <b>{p.stamps_count}</b></div>
            <div>Последний штамп: {p.last_stamp || '—'}</div>
            <div>Последний приз: {p.last_prize || '—'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Simple chrome: Nav + Router ===== */
function Nav({ routes, brand="#2F6FED" }){
  const route = useHashRoute();
  return (
    <div style={{position:'sticky', top:0, zIndex:10, backdropFilter:'blur(8px)', background:'rgba(11,15,25,.7)', borderBottom:'1px solid rgba(255,255,255,.08)'}}>
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 16px'}}>
        <div style={{width:10, height:10, background:brand, borderRadius:99}}/>
        <a href="#/" className={navLink(route==='/')}>Главная</a>
        <a href="#/menu" className={navLink(route==='/menu')}>Меню</a>
        <a href="#/loyalty" className={navLink(route==='/loyalty')}>Лояльность</a>
        <a href="#/profile" className={navLink(route==='/profile')}>Профиль</a>
        <div style={{marginLeft:'auto', opacity:.6, fontSize:12}}>
          app_id=<code>{APP_ID}</code> · {CHANNEL}
        </div>
      </div>
    </div>
  );
}
const navLink = (active)=>cls('nav', active && 'nav--a');
const navCss = `
  .nav{color:#fff;text-decoration:none;padding:6px 10px;border-radius:10px;border:1px solid transparent}
  .nav--a{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
`;

/* ===== App root ===== */
function App(){
  const [bp, setBp] = useState(null);
  const [err, setErr] = useState('');
  const route = useHashRoute();

  useEffect(()=>{ (async ()=>{
    setErr(''); setBp(null);
    const res = await apiGet('/api/blueprint', { app_id: APP_ID, channel: CHANNEL });
    if (!res?.ok){ setErr(res?.error||'blueprint_error'); return; }
    setBp(res.data.json || {});
  })(); }, [APP_ID, CHANNEL]);

  const brand = bp?.app?.theme?.brand || '#2F6FED';
  const page = useMemo(()=>{
    const found = (bp?.routes||[]).find(r=> r.path===route) || (bp?.routes||[]).find(r=> r.path==='/');
    return found || { path:'/', blocks:['hero','promo','menuGrid','loyaltyCard','stampShelf','bonusWheel','profile'] };
  }, [bp, route]);

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: navCss}}/>
      <Nav routes={bp?.routes||[]} brand={brand}/>
      {err && <div style={{padding:16, color:'#f77'}}>Ошибка блюпринта: {String(err)}</div>}
      {!bp && !err && <div style={{padding:16, opacity:.8}}>Загрузка…</div>}

      {bp && (
        <div>
          {page.blocks?.map((b, i) => <Block key={i} name={b} bp={bp} brand={brand}/>)}
        </div>
      )}
    </div>
  );
}

function Block({ name, bp, brand }){
  const props = (bp?.blocks && bp.blocks[name]?.props) || {};
  switch(name){
    case 'hero':       return <Hero {...props} brand={brand}/>;
    case 'promo':      return <PromoTicker {...props} brand={brand}/>;
    case 'menuGrid':   return <MenuGrid {...props} appId={APP_ID}/>;
    case 'loyaltyCard':return <LoyaltyCard {...props}/>;
    case 'stampShelf': return <StampShelf {...props} appId={APP_ID}/>;
    case 'bonusWheel': return <BonusWheel {...props} appId={APP_ID}/>;
    case 'profile':    return <ProfileCard {...props} appId={APP_ID}/>;
    default:
      return (
        <div style={{padding:'0 24px 24px'}}>
          <div style={{border:'1px dashed rgba(255,255,255,.25)', borderRadius:12, padding:12, opacity:.8}}>
            Неизвестный блок: <code>{name}</code>
          </div>
        </div>
      );
  }
}

/* ===== Small styles ===== */
const btnStyle = { padding:'10px 12px', borderRadius:12, border:'1px solid rgba(255,255,255,.2)', background:'transparent', color:'#fff', cursor:'pointer' };
const inpStyle = { padding:'10px 12px', borderRadius:12, border:'1px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.06)', color:'#fff' };



/* ===== Export to window ===== */
window.App = App;
