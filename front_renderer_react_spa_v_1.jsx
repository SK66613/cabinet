import React, { useEffect, useMemo, useState } from "react";

// === Minimal API helper (expects the Worker running on same origin in dev) ===
const API_BASE = (window.API_BASE || location.origin);
function demoTgId(){
  let id = localStorage.getItem('demo_tg_id');
  if (!id){ id = String(Math.floor(Math.random()*1e9)); localStorage.setItem('demo_tg_id', id); }
  return id;
}
async function apiGet(path, params={}){
  const u = new URL(API_BASE + path);
  Object.entries(params).forEach(([k,v]) => v!=null && u.searchParams.set(k,v));
  const r = await fetch(u.toString(), { headers: { 'X-TG-ID': demoTgId() }});
  return r.json();
}
async function apiPost(path, body={}){
  const r = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-TG-ID': demoTgId(),
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(body)
  });
  return r.json();
}

// === Primitive Router (tabs-like) ===
const NAV = [
  { path: '/', label: 'Главная' },
  { path: '/menu', label: 'Меню' },
  { path: '/loyalty', label: 'Лояльность' },
  { path: '/profile', label: 'Профиль' },
];

function useRoute(){
  const [route, setRoute] = useState(sessionStorage.getItem('route') || '/');
  const navigate = (p) => { setRoute(p); sessionStorage.setItem('route', p); };
  return { route, navigate };
}

// === Basic Blocks ===
function Shell({ title, onNav, current }){
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="p-4 sticky top-0 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <nav className="flex gap-2">
            {NAV.map(n => (
              <button key={n.path}
                onClick={() => onNav(n.path)}
                className={`px-3 py-1.5 rounded-xl text-sm hover:bg-white/10 transition ${current===n.path? 'bg-white/10 ring-1 ring-white/15':''}`}>
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-screen-sm mx-auto p-4">
        <div className="grid gap-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Card({ children, className='' }){
  return <div className={`bg-white/5 border border-white/10 rounded-2xl p-4 ${className}`}>{children}</div>;
}

const BlockMap = {
  Hero: ({ title, subtitle }) => (
    <Card>
      <div className="text-2xl font-semibold mb-1">{title}</div>
      {subtitle && <div className="text-slate-300">{subtitle}</div>}
    </Card>
  ),
  PromoTicker: ({ items=[] }) => (
    <Card>
      <div className="flex gap-2 flex-wrap">
        {items.map((t,i) => <span key={i} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{t}</span>)}
      </div>
    </Card>
  ),
  MenuGrid: ({ items=[] }) => (
    <Card>
      <div className="grid grid-cols-2 gap-3">
        {items.map(p => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm font-medium leading-tight line-clamp-2">{p.title}</div>
            {p.subtitle && <div className="text-xs text-slate-400">{p.subtitle}</div>}
            <div className="mt-2 text-sm font-semibold">{(p.price_cents/100).toFixed(2)} ₽</div>
            <button className="mt-3 w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition text-sm">Заказать</button>
          </div>
        ))}
      </div>
    </Card>
  ),
  LoyaltyCard: ({ slots=6, filled=0, reward }) => {
    const arr = Array.from({length: slots});
    return (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Карта лояльности</div>
          {reward && <div className="text-xs text-slate-400">награда: {String(reward)}</div>}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {arr.map((_,i) => (
            <div key={i} className={`aspect-square rounded-xl border ${i<filled? 'bg-amber-400/20 border-amber-400/30':'bg-white/5 border-white/10'}`}></div>
          ))}
        </div>
      </Card>
    );
  },
  StampShelf: ({ dict=[], onClaim }) => (
    <Card>
      <div className="text-sm font-medium mb-2">Штампы</div>
      <div className="flex flex-wrap gap-2">
        {dict.map(code => (
          <button key={code} onClick={() => onClaim?.(code)}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-400/30 hover:bg-indigo-500/25 transition text-sm">
            Получить: {code}
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-400 mt-2">Требуется PIN продавца (демо: 1111)</div>
    </Card>
  ),
  QuickOrder: ({ picks=[] }) => (
    <Card>
      <div className="text-sm font-medium mb-3">Быстрый заказ</div>
      <div className="grid grid-cols-2 gap-3">
        {picks.map(p => (
          <button key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 transition">
            <div className="text-sm font-medium">{p.title}</div>
            <div className="text-xs text-slate-400">{(p.price_cents/100).toFixed(2)} ₽</div>
          </button>
        ))}
      </div>
    </Card>
  ),
  ProfileCard: ({ profile }) => (
    <Card>
      <div className="text-sm font-medium mb-2">Профиль</div>
      <div className="text-sm">ID: <span className="text-slate-300">{profile?.tg_id}</span></div>
      <div className="text-sm">Штампы: <span className="text-slate-300">{profile?.stamps_count||0}</span></div>
      <div className="text-sm">Последний штамп: <span className="text-slate-300">{profile?.last_stamp||'—'}</span></div>
      <div className="text-sm">Последний приз: <span className="text-slate-300">{profile?.last_prize||'—'}</span></div>
    </Card>
  ),
  BonusWheel: ({ onSpin, lastResult }) => (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Колесо бонусов</div>
        {lastResult && <div className="text-xs text-slate-400">последний: {lastResult.label || lastResult.prize_id}</div>}
      </div>
      <button onClick={onSpin} className="w-full py-2 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/30 hover:bg-fuchsia-500/30 transition">
        Крутить
      </button>
    </Card>
  ),
};

// === Outlet placeholder for Shell ===
function Outlet(){
  return null; // replaced during render with pages
}

// === Page Renderer per route using blueprint ===
export default function App(){
  const { route, navigate } = useRoute();
  const [appId, setAppId] = useState('beer');
  const [bp, setBp] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lastSpin, setLastSpin] = useState(null);

  // Load blueprint
  useEffect(() => { (async () => {
    const res = await apiGet('/api/blueprint', { app_id: appId });
    setBp(res?.data?.json || null);
  })(); }, [appId]);

  // Load profile (cache refresh by Worker)
  async function refreshProfile(){
    const res = await apiGet('/api/profile', { app_id: appId });
    setProfile(res?.data || null);
  }
  useEffect(() => { refreshProfile(); }, [appId]);

  // Fetch products for MenuGrid & QuickOrder
  const [products, setProducts] = useState([]);
  useEffect(() => { (async () => {
    const r = await apiGet('/api/products', { app_id: appId, category: appId==='beer'?'beer':(appId==='coffee'?'coffee':'bouquets') });
    setProducts(r?.data?.items || []);
  })(); }, [appId]);

  const title = bp?.app?.name || 'MiniApp';
  const dictStyles = useMemo(() => (bp?.dicts?.styles||[]), [bp]);

  // Actions
  async function claimStamp(code){
    const pin = prompt('PIN продавца (демо 1111):','1111');
    if (!pin) return;
    const res = await apiPost('/api/stamp/claim', { app_id: appId, code, pin });
    if (!res.ok){ alert(res.error||'Ошибка'); return; }
    await refreshProfile();
  }
  async function spinWheel(){
    const res = await apiPost('/api/wheel/spin', { app_id: appId });
    if (!res.ok){ alert(res.error||'Ошибка'); return; }
    setLastSpin(res.data);
    await refreshProfile();
  }

  // Pages per route
  const pageBlocks = useMemo(() => {
    const routeDef = bp?.routes?.find(r => r.path === route) || bp?.routes?.[0];
    return routeDef?.blocks || [];
  }, [bp, route]);

  const rendered = pageBlocks.map((key, idx) => {
    // Map simple aliases (as in your blueprint examples)
    const block = key; // string alias
    switch (block){
      case 'hero': return <BlockMap.Hero key={idx} title={bp?.app?.name||'Привет!'} subtitle={appId==='beer'? 'Собирай стили — лови бонусы' : appId==='coffee'? 'Закажи по пути — готово через 5 минут' : 'Подбор букета за 30 секунд'} />
      case 'promo': return <BlockMap.PromoTicker key={idx} items={[ '−10% новым', 'Рефералка +50', 'Колесо раз в день' ]} />
      case 'menu':
      case 'menuGrid': return <BlockMap.MenuGrid key={idx} items={products} />
      case 'ctaLoyalty': return (
        <Card key={idx}>
          <div className="flex items-center justify-between">
            <div>6 штампов = приз</div>
            <button onClick={()=>navigate('/loyalty')} className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15">Открыть</button>
          </div>
        </Card>
      );
      case 'loyaltyCard':
      case 'loyalty10': return <BlockMap.LoyaltyCard key={idx} slots={block==='loyalty10'?10:6} filled={profile?.stamps_count||0} reward={block==='loyalty10'?'free_coffee':undefined} />
      case 'stampShelf': return <BlockMap.StampShelf key={idx} dict={dictStyles.length?dictStyles:['IPA','Lager','Stout']} onClaim={claimStamp} />
      case 'bonusWheel': return <BlockMap.BonusWheel key={idx} onSpin={spinWheel} lastResult={lastSpin} />
      case 'profile': return <BlockMap.ProfileCard key={idx} profile={profile} />
      case 'referral': return <Card key={idx}>Рефералка: пригласи друга — получи +50</Card>
      case 'lbDaily': return <Card key={idx}>Топ дня — скоро</Card>
      case 'lbAllTime': return <Card key={idx}>Топ за всё время — скоро</Card>
      case 'quickOrder': return <BlockMap.QuickOrder key={idx} picks={products.slice(0,4)} />
      case 'bouquetPicker': return <Card key={idx}>Конструктор букета — скоро</Card>
      case 'softLoyalty': return <BlockMap.LoyaltyCard key={idx} slots={5} filled={profile?.stamps_count||0} reward={'gift_wrap'} />
      case 'occasions': return <Card key={idx}>Поводы и напоминания — скоро</Card>
      default: return <Card key={idx}>Блок: {String(block)}</Card>
    }
  });

  return (
    <Shell title={title} onNav={navigate} current={route}>
      <Outlet />
      {/* Rendered blocks */}
      <div className="grid gap-4">{rendered}</div>

      {/* Footer switcher of presets for quick testing */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-1 flex gap-1">
          {['beer','coffee','flowers'].map(id => (
            <button key={id} onClick={()=>{ setAppId(id); navigate('/'); }}
              className={`px-3 py-1.5 rounded-xl text-sm ${appId===id?'bg-white/10':''}`}>{id}</button>
          ))}
        </div>
      </div>
    </Shell>
  );
}
