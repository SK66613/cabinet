/* front_renderer_react_spa_v_1.jsx — обновление 11.12.2025
   UMD + React (babel). Экспортит window.App.
*/
const { useEffect, useMemo, useState } = React;

/* ========= Global params ========= */
const API_BASE = (window.API_BASE || location.origin);
const APP_ID   = (window.__APP_ID__  || 'beer');
const CHANNEL  = (window.__CHANNEL__ || (new URLSearchParams(location.search).get('preview')==='live'?'live':'draft'));

/* ========= Helpers ========= */
function demoTgId(){
  let id = localStorage.getItem('demo_tg_id');
  if (!id){ id = String(Math.floor(Math.random()*1e9)); localStorage.setItem('demo_tg_id', id); }
  return id;
}
async function apiGet(path, params={}){
  const u = new URL(API_BASE);
  u.searchParams.set('endpoint', path);
  u.searchParams.set('tg_id', demoTgId());
  Object.entries(params).forEach(([k,v]) => v!=null && u.searchParams.set(k, v));
  const r = await fetch(u.toString());
  return r.json();
}
async function apiPost(path, body={}){
  const u = new URL(API_BASE);
  u.searchParams.set('endpoint', path);
  const r = await fetch(u.toString(), { method:'POST', headers:{ 'content-type':'application/json', 'X-TG-ID': demoTgId() }, body: JSON.stringify(body) });
  return r.json();
}
const cls = (...a)=>a.filter(Boolean).join(' ');

function useHashRoute(){
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(()=>{ const on=()=>setHash(location.hash||'#/'); addEventListener('hashchange', on); return ()=>removeEventListener('hashchange', on); },[]);
  return hash.replace(/^#/, '') || '/';
}

/* ========= DevPanel ========= */
function DevPanel(){
  const [log, setLog] = useState([]);
  useEffect(()=>{
    const _fetch = window.fetch;
    window.fetch = async (...args)=>{
      const t0 = performance.now();
      try{
        const res = await _fetch(...args);
        const t1 = performance.now();
        const url = (args[0]||'').toString();
        const isApi = url.includes('endpoint=');
        if (isApi){
          setLog(l => [{t:new Date().toLocaleTimeString(), ms:(t1-t0).toFixed(0), status:res.status, url}, ...l].slice(0,25));
        }
        return res;
      }catch(e){
        setLog(l => [{t:new Date().toLocaleTimeString(), ms:'ERR', status:'ERR', url:String(args[0])}, ...l].slice(0,25));
        throw e;
      }
    };
    return ()=>{ window.fetch = _fetch; };
  },[]);
  return (
    <div style={{position:'fixed', right:10, bottom:10, width:380, maxHeight:260, overflow:'auto',
                 background:'rgba(0,0,0,.75)', color:'#fff', fontSize:12, padding:8, border:'1px solid rgba(255,255,255,.2)', borderRadius:10, zIndex:9999}}>
      <div style={{opacity:.8, marginBottom:6}}>DEV • API calls</div>
      {log.map((x,i)=>(
        <div key={i} style={{marginBottom:6}}>
          <b>[{x.status}]</b> {x.ms}ms<br/>
          <span style={{opacity:.8, wordBreak:'break-all'}}>{x.url}</span>
        </div>
      ))}
    </div>
  );
}

/* ========= Theming ========= */
const skinCss = {
  'dark-glass': `
    body{background:#0b0f19;color:#eef2f8}
    .card{border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); border-radius:16px}
    .mut{opacity:.8}
  `,
  'paper': `
    body{background:#f6f7fb;color:#10131a}
    .card{border:1px solid rgba(0,0,0,.06); background:#fff; border-radius:16px}
    .mut{opacity:.6}
  `,
  'dark-solid': `
    body{background:#0c0f15;color:#e9eef6}
    .card{border:1px solid rgba(255,255,255,.08); background:#121723; border-radius:16px}
    .mut{opacity:.75}
  `
};

/* ========= UI Blocks ========= */
function Hero({
  title="Заходи на дегустацию",
  subtitle="Свежие сорта, бонусы и призы",
  brand="#2F6FED",
  cover="",           // URL
  coverFit="cover",   // 'cover'|'contain'
  align="left"        // 'left'|'center'|'right'
}){
  const ai = align==='center'?'center':align==='right'?'flex-end':'flex-start';
  return (
    <div style={{padding:'24px'}}>
      <div className="card" style={{padding:'0', overflow:'hidden', position:'relative'}}>
        {!!cover && (
          <div style={{
            height:160, backgroundImage:`url(${cover})`,
            backgroundSize:coverFit, backgroundPosition:'center', backgroundRepeat:'no-repeat',
            borderBottom:'1px solid rgba(255,255,255,.08)'
          }}/>
        )}
        <div style={{
          padding:'20px 24px',
          background: 'linear-gradient(135deg, rgba(47,111,237,.12), rgba(255,255,255,.03))'
        }}>
          <div style={{display:'flex', flexDirection:'column', alignItems:ai}}>
            <div style={{fontSize:24, fontWeight:800, marginBottom:6, color:brand}}>{title}</div>
            <div className="mut">{subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromoTicker({ items=[] }){
  const norm = items.map(x=> typeof x==='string' ? {title:x} : x);
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div style={{display:'flex', gap:8, overflowX:'auto'}}>
        {norm.map((t,i)=>(
          <div key={i} style={{whiteSpace:'nowrap', padding:'10px 12px', borderRadius:999, border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.06)'}}>
            <b>{t.title}</b>{t.sub? <span style={{opacity:.75}}> · {t.sub}</span>:null}{t.cta? <span style={{opacity:.75}}> • {t.cta}</span>:null}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuGrid({ category, appId=APP_ID }){
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [err,setErr]=useState('');
  useEffect(()=>{ (async ()=>{
    try{
      setLoading(true); setErr('');
      const res = await apiGet('/api/products', { app_id: appId, category });
      if (!res?.ok) throw new Error(res?.error || 'products_error');
      setItems(res?.data?.items || []);
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setLoading(false); }
  })(); }, [category, appId]);
  return (
    <div style={{padding:'0 24px 24px'}}>
      {err && <div style={{color:'#ff8080', marginBottom:8}}>Ошибка меню: {err}</div>}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:12}}>
        {loading ? Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{height:120, borderRadius:14}} className="card"/>
        )) : items.map(p=>(
          <div key={p.id} className="card" style={{padding:14}}>
            <div style={{fontWeight:700}}>{p.title}</div>
            {p.subtitle && <div className="mut" style={{fontSize:13, marginTop:2}}>{p.subtitle}</div>}
            <div style={{marginTop:10, fontWeight:800}}>{(p.price_cents/100).toFixed(0)} ₽</div>
            <button style={{marginTop:10}} className="btn">В корзину</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoyaltyCard({ slots=6 }){
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div className="card" style={{padding:16}}>
        <div style={{fontWeight:800, marginBottom:10}}>Карта лояльности</div>
        <div style={{display:'grid', gridTemplateColumns:`repeat(${slots}, 1fr)`, gap:8}}>
          {Array.from({length:slots}).map((_,i)=>(
            <div key={i} style={{height:34, borderRadius:10, border:'1px dashed rgba(255,255,255,.25)'}}/>
          ))}
        </div>
        <div className="mut" style={{marginTop:10, fontSize:13}}>Соберите {slots} штампов — получите подарок</div>
      </div>
    </div>
  );
}

function StampShelf({ appId=APP_ID }){
  const [pin,setPin]=useState('1111'); const [code,setCode]=useState('IPA'); const [msg,setMsg]=useState(''); const [pending,setPending]=useState(false);
  async function claim(){
    setPending(true); setMsg('');
    try{
      const res = await apiPost('/api/stamp/claim', { app_id: appId, code, pin });
      if (!res?.ok) throw new Error(res?.error||'stamp_error');
      setMsg('Штамп зачтён ✅');
    }catch(e){ setMsg('Ошибка: '+String(e.message||e)); }
    finally{ setPending(false); }
  }
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div className="card" style={{padding:16}}>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="код (например, IPA)" className="inp"/>
          <input value={pin}  onChange={e=>setPin(e.target.value)}  placeholder="PIN кассира" className="inp"/>
          <button onClick={claim} disabled={pending} className="btn">{pending?'...':'Получить штамп'}</button>
        </div>
        {!!msg && <div style={{marginTop:8}}>{msg}</div>}
      </div>
    </div>
  );
}

function BonusWheel({ appId=APP_ID }){
  const [res,setRes]=useState(null); const [pending,setPending]=useState(false);
  async function spin(){
    setPending(true); setRes(null);
    try{
      const r = await apiPost('/api/wheel/spin', { app_id: appId });
      if (!r?.ok) throw new Error(r?.error||'wheel_error');
      setRes(r);
    }catch(e){ setRes({ ok:false, error:String(e.message||e) }); }
    finally{ setPending(false); }
  }
  return (
    <div style={{padding:'0 24px 24px'}}>
      <div className="card" style={{padding:16}}>
        <div style={{fontWeight:800, marginBottom:8}}>Бонусное колесо</div>
        <button onClick={spin} disabled={pending} className="btn">{pending?'Крутим...':'Крутить'}</button>
        {res && <div style={{marginTop:10}}>{res.ok ? <>Выпало: <b>{res.data.label}</b></> : <>Ошибка: {res.error}</>}</div>}
      </div>
    </div>
  );
}

function ProfileCard({ appId=APP_ID }){
  const [p,setP]=useState(null); const [err,setErr]=useState('');
  useEffect(()=>{ (async ()=>{
    try{
      setErr(''); setP(null);
      const r = await apiGet('/api/profile', { app_id: appId });
      if (!r?.ok) throw new Error(r?.error||'profile_error');
      setP(r.data||null);
    }catch(e){ setErr(String(e.message||e)); }
  })(); }, [appId]);
  return (
    <div style={{padding:'0 24px 24px'}}>
      <div className="card" style={{padding:16}}>
        <div style={{fontWeight:800, marginBottom:8}}>Профиль</div>
        {err && <div style={{color:'#ff8080', marginBottom:6}}>Ошибка профиля: {err}</div>}
        {!p && !err && 'Загрузка...'}
        {p && (
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

/* === Games & Leaderboard (новые блоки) === */
function GamesPicker({ layout='list', games=[] }){
  const list = games.length ? games : ['flappy'];
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div className="card" style={{padding:16}}>
        <div style={{fontWeight:800, marginBottom:8}}>Игры</div>
        <div style={{display: layout==='grid'?'grid':'flex', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, flexDirection:'column'}}>
          {list.map((g,i)=>(
            <div key={i} className="card" style={{padding:12}}>
              <div style={{fontWeight:700, marginBottom:6}}>{g==='flappy'?'Bumblebee':'Игра '+g}</div>
              <a href="#/play" className="btn">Играть</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ modes=['daily','all'], game='auto' }){
  const [mode, setMode] = useState(modes[0]||'daily');
  const [rows, setRows] = useState([]); const [err,setErr]=useState('');
  useEffect(()=>{ (async ()=>{
    try{
      setErr(''); setRows([]);
      const r = await apiGet('/api/leaderboard', { app_id: APP_ID, mode, game });
      if (!r?.ok) throw new Error(r?.error||'lb_error');
      setRows(r.data?.rows||[]);
    }catch(e){ setErr(String(e.message||e)); }
  })(); }, [mode, game]);
  return (
    <div style={{padding:'0 24px 16px'}}>
      <div className="card" style={{padding:16}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
          <div style={{fontWeight:800}}>Турнир</div>
          <select value={mode} onChange={e=>setMode(e.target.value)} className="inp" style={{width:'auto', height:30}}>
            {modes.map(m=><option key={m} value={m}>{m==='daily'?'Сегодня':'За всё время'}</option>)}
          </select>
        </div>
        {err && <div style={{color:'#ff8080', marginBottom:6}}>Ошибка: {err}</div>}
        {!rows.length && !err && <div className="mut">Пока пусто</div>}
        {!!rows.length && (
          <div style={{display:'grid', gap:8}}>
            {rows.map((r,i)=>(
              <div key={i} style={{display:'grid', gridTemplateColumns:'36px 1fr auto', gap:10, alignItems:'center'}}>
                <div style={{opacity:.8}}>{i+1}</div>
                <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.name || ('user_'+r.tg_id)}</div>
                <div style={{fontWeight:800}}>{r.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========= Nav + styles ========= */
function Nav({ brand="#2F6FED", tabs=[] }){
  const route = useHashRoute();
  return (
    <div style={{position:'sticky', top:0, zIndex:10, backdropFilter:'blur(8px)', background:'rgba(11,15,25,.7)', borderBottom:'1px solid rgba(255,255,255,.08)'}}>
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 16px'}}>
        <div style={{width:10, height:10, background:brand, borderRadius:99}}/>
        {(tabs.length?tabs:[{path:'/',title:'Главная'},{path:'/menu',title:'Меню'},{path:'/loyalty',title:'Лояльность'},{path:'/profile',title:'Профиль'}]).map(t=>(
          <a key={t.path} href={'#'+t.path} className={navLink(route===t.path)}>{t.title}</a>
        ))}
        <div style={{marginLeft:'auto', opacity:.6, fontSize:12}}>
          app_id=<code>{APP_ID}</code> · {CHANNEL}
        </div>
      </div>
    </div>
  );
}
const navLink = (active)=>['nav', active && 'nav--a'].filter(Boolean).join(' ');
const baseCss = `
  .nav{color:inherit;text-decoration:none;padding:6px 10px;border-radius:10px;border:1px solid transparent}
  .nav--a{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
  .btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;cursor:pointer}
  .inp{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit}
`;

/* ========= Root App ========= */
function App(){
  const [bp, setBp] = useState(null);
  const [err, setErr] = useState('');
  const route = useHashRoute();

  useEffect(()=>{ (async ()=>{
    setErr(''); setBp(null);
    try{
      const res = await apiGet('/api/blueprint', { app_id: APP_ID, channel: CHANNEL });
      if (!res?.ok) throw new Error(res?.error || 'blueprint_error');
      setBp(res.data.json || {});
    }catch(e){ setErr(String(e.message || e)); console.error('blueprint error:', e); }
  })(); }, [APP_ID, CHANNEL]);

  const brand = bp?.app?.theme?.brand || '#2F6FED';
  const skin  = bp?.app?.theme?.skin || 'dark-glass';
  const tabs  = (bp?.nav?.routes||[]).map(r=>({path:r.path, title:r.title}));
  const page = useMemo(()=>{
    const found = (bp?.routes||[]).find(r=> r.path===route) || (bp?.routes||[]).find(r=> r.path==='/');
    return found || { path:'/', blocks:['hero','promo','menuGrid','loyaltyCard','stampShelf','bonusWheel','profile'] };
  }, [bp, route]);

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: baseCss + (skinCss[skin]||skinCss['dark-glass'])}}/>
      <Nav brand={brand} tabs={tabs}/>
      {err && <div style={{padding:16, color:'#ff8080'}}>Ошибка блюпринта: {err}</div>}
      {!bp && !err && <div style={{padding:16, opacity:.8}}>Загрузка…</div>}
      {bp && <div>{page.blocks?.map((b, i) => <Block key={i} name={b} bp={bp} brand={brand}/>)}</div>}
      {(bp || err) && <DevPanel/>}
    </div>
  );
}

function Block({ name, bp, brand }){
  const props = (bp?.blocks && bp.blocks[name]?.props) || {};
  switch(name){
    case 'hero':        return <Hero {...props} brand={brand}/>;
    case 'promo':       return <PromoTicker {...props} brand={brand}/>;
    case 'menuGrid':    return <MenuGrid {...props} appId={APP_ID}/>;
    case 'loyaltyCard': return <LoyaltyCard {...props}/>;
    case 'stampShelf':  return <StampShelf {...props} appId={APP_ID}/>;
    case 'bonusWheel':  return <BonusWheel {...props} appId={APP_ID}/>;
    case 'profile':     return <ProfileCard {...props} appId={APP_ID}/>;
    case 'gamesPicker': return <GamesPicker {...props}/>;
    case 'leaderboard': return <Leaderboard {...props}/>;
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

/* ========= Export ========= */
window.App = App;
