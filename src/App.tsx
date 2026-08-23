import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, auth, ws } from '@appdeploy/client';
import { Activity, BarChart3, CircleDollarSign, Dices, LogIn, LogOut, Menu, ShieldCheck, Swords, Trophy, Wallet, X } from 'lucide-react';

type UserView = { userId: string; email?: string; name?: string };
type SportsEvent = { id: string; sport: string; league: string; starts_at: string; home: string; away: string; markets: { id: string; label: string; selections: { id: string; label: string; odds: number }[] }[] };
type Prediction = { id: string; category: string; title: string; closes_at: string; resolution: string; yes_price: number; no_price: number };
type Catalog = { mode: string; real_money_enabled: boolean; sports: SportsEvent[]; predictions: Prediction[] };
type Dispute = { id: string; title: string; rules: string; min_stake: number; deadline: string; creator_user_id: string; creator_name: string; status: string; for_volume: number; against_volume: number };
type PrivateData = { wallet: { balance: number; currency: string }; responsible: { max_wager: number; deposit_daily: number; deposit_weekly: number; excluded_until: number | null; permanent: boolean }; sports_bets: Record<string, unknown>[]; casino_rounds: Record<string, unknown>[]; positions: Record<string, unknown>[]; dispute_bets: Record<string, unknown>[]; transactions: { id: string; type: string; amount: number; description: string; created_at: number }[] };
type Ops = { real_money_enabled: boolean; payments: string; withdrawals: string; external_kyc: string; settlement_provider: string; sports_events: number; prediction_markets: number; demo_volume: { sports: number; casino: number; prediction: number; p2p: number } };
type Tab = 'home' | 'sports' | 'prediction' | 'casino' | 'disputes' | 'wallet' | 'responsible' | 'ops';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const pct = (value: number) => `${Math.round(value * 100)}%`;
const dateTime = (value: string | number) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [mobileNav, setMobileNav] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [user, setUser] = useState<UserView | null>(null);
  const [me, setMe] = useState<PrivateData | null>(null);
  const [ops, setOps] = useState<Ops | null>(null);
  const [stake, setStake] = useState(25);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [liveNotice, setLiveNotice] = useState('Realtime conectado');
  const [disputeForm, setDisputeForm] = useState({ title: '', rules: '', min_stake: 10, deadline: '2026-09-30T20:00' });
  const [limits, setLimits] = useState({ max_wager: 100, deposit_daily: 500, deposit_weekly: 1500 });
  const socketRef = useRef<ReturnType<typeof ws.connect> | null>(null);

  const show = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3800); };
  const errorMessage = (err: unknown) => err instanceof Error ? err.message : 'Não foi possível concluir a operação.';

  const loadCatalog = useCallback(async () => {
    const { data } = await api.get('/api/catalog');
    setCatalog(data as Catalog);
  }, []);

  const loadDisputes = useCallback(async () => {
    const { data } = await api.get('/api/disputes');
    setDisputes(data as Dispute[]);
  }, []);

  const loadPrivate = useCallback(async () => {
    const [{ data: privateData }, { data: opsData }] = await Promise.all([api.get('/api/me'), api.get('/api/ops/summary')]);
    const snapshot = privateData as PrivateData;
    setMe(snapshot);
    setOps(opsData as Ops);
    setLimits({ max_wager: snapshot.responsible.max_wager, deposit_daily: snapshot.responsible.deposit_daily, deposit_weekly: snapshot.responsible.deposit_weekly });
  }, []);

  useEffect(() => {
    void loadCatalog();
    void loadDisputes();
    if (auth.isSignedIn()) {
      void auth.getUser().then(current => {
        if (current) {
          setUser(current as UserView);
          void loadPrivate();
        }
      });
    }
  }, [loadCatalog, loadDisputes, loadPrivate]);

  useEffect(() => {
    const conn = ws.connect();
    socketRef.current = conn;
    conn.onMessage(message => {
      if (message?.type !== 'entity.update') return;
      const entity = message?.payload?.entity_type;
      if (entity === 'prediction') void loadCatalog();
      if (entity === 'disputes') void loadDisputes();
      if (entity === 'sports') setLiveNotice('Nova atividade registrada nos mercados esportivos');
    });
    conn.onOpen(() => setLiveNotice('Realtime conectado'));
    conn.onClose(() => setLiveNotice('Realtime desconectado'));
    conn.ready.then(async () => {
      if (!conn.connectionId) return;
      await Promise.all(['sports', 'prediction', 'disputes'].map(entity_type => api.post('/api/subscriptions', { entity_type, entity_id: 'global', connection_id: conn.connectionId })));
    }).catch(() => setLiveNotice('Realtime indisponível'));
    return () => {
      if (conn.connectionId) ['sports', 'prediction', 'disputes'].forEach(entity_type => { void api.post('/api/subscriptions/remove', { entity_type, entity_id: 'global', connection_id: conn.connectionId }); });
      conn.disconnect();
      socketRef.current = null;
    };
  }, [loadCatalog, loadDisputes]);

  const signIn = async () => {
    try {
      const result = await auth.signIn();
      setUser(result.user as UserView);
      await loadPrivate();
      show('Login realizado. Sua carteira DEMO está pronta.');
    } catch (err) {
      show(errorMessage(err));
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setMe(null);
    setOps(null);
    setTab('home');
  };

  const requireUser = async () => {
    if (user) return true;
    await signIn();
    return auth.isSignedIn();
  };

  const act = async (key: string, fn: () => Promise<void>) => {
    if (!(await requireUser())) return;
    setBusy(key);
    try {
      await fn();
      await loadPrivate();
    } catch (err) {
      show(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const placeSports = (event: SportsEvent, marketId: string, selectionId: string, label: string) => act(`sports-${event.id}-${selectionId}`, async () => {
    await api.post('/api/sports/bets', { event_id: event.id, market_id: marketId, selection_id: selectionId, stake });
    show(`Aposta DEMO registrada: ${label}`);
  });

  const buyPrediction = (market: Prediction, side: 'yes' | 'no') => act(`prediction-${market.id}-${side}`, async () => {
    await api.post('/api/prediction/positions', { market_id: market.id, side, stake });
    await loadCatalog();
    show(`Posição ${side === 'yes' ? 'SIM' : 'NÃO'} registrada.`);
  });

  const playCasino = () => act('casino', async () => {
    const { data } = await api.post('/api/casino/play', { stake });
    const result = data as { win: boolean; roll: number; payout: number };
    show(result.win ? `Vitória! Roll ${result.roll.toFixed(2)} • prêmio ${money(result.payout)}` : `Rodada concluída. Roll ${result.roll.toFixed(2)}.`);
  });

  const createDispute = () => act('create-dispute', async () => {
    await api.post('/api/disputes', disputeForm);
    setDisputeForm({ title: '', rules: '', min_stake: 10, deadline: '2026-09-30T20:00' });
    await loadDisputes();
    show('Disputa criada e publicada em realtime.');
  });

  const joinDispute = (item: Dispute, side: 'for' | 'against') => act(`join-${item.id}-${side}`, async () => {
    await api.post(`/api/disputes/${item.id}/join`, { side, stake: Math.max(stake, item.min_stake) });
    await loadDisputes();
    show('Participação P2P registrada.');
  });

  const saveLimits = (self_exclusion = 'none') => act(`limits-${self_exclusion}`, async () => {
    await api.put('/api/responsible', { ...limits, self_exclusion });
    show(self_exclusion === 'none' ? 'Limites atualizados.' : 'Autoexclusão aplicada.');
  });

  const totalOpen = useMemo(() => (me?.sports_bets.length || 0) + (me?.positions.length || 0) + (me?.dispute_bets.length || 0), [me]);
  const nav: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: 'home', label: 'Visão geral', icon: Activity }, { id: 'sports', label: 'Esportes', icon: Trophy }, { id: 'prediction', label: 'Mercados', icon: CircleDollarSign }, { id: 'casino', label: 'Fortune', icon: Dices }, { id: 'disputes', label: 'Disputas P2P', icon: Swords }, { id: 'wallet', label: 'Carteira', icon: Wallet }, { id: 'responsible', label: 'Jogo responsável', icon: ShieldCheck }, { id: 'ops', label: 'Operação', icon: BarChart3 }
  ];

  const Nav = () => <nav className="space-y-1">{nav.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${tab === item.id ? 'bg-emerald-400 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon size={18}/>{item.label}</button>; })}</nav>;

  return <div className="min-h-screen bg-[#07111f] text-white">
    {notice && <div className="fixed right-4 top-4 z-50 max-w-sm rounded-xl border border-emerald-400/30 bg-slate-900 px-4 py-3 text-sm shadow-2xl">{notice}</div>}
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#091525] p-5 lg:block">
      <div className="mb-8"><div className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-400">Sandbox</div><div className="mt-1 text-xl font-black">OddsLab</div><div className="mt-1 text-xs text-slate-500">Multiusuário • DEMO</div></div><Nav/>
      <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100"><strong>Dinheiro real desativado.</strong><br/>KYC, depósitos e saques aguardam provedores oficiais.</div>
    </aside>
    {mobileNav && <div className="fixed inset-0 z-40 bg-black/70 lg:hidden"><div className="h-full w-72 bg-[#091525] p-5"><div className="mb-5 flex items-center justify-between"><strong>OddsLab</strong><button onClick={() => setMobileNav(false)}><X/></button></div><Nav/></div></div>}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#07111f]/90 px-4 backdrop-blur md:px-7">
        <div className="flex items-center gap-3"><button className="lg:hidden" onClick={() => setMobileNav(true)}><Menu/></button><div><div className="text-sm font-semibold">Plataforma iGaming Sandbox</div><div className="text-[11px] text-slate-500">{liveNotice}</div></div></div>
        <div className="flex items-center gap-3"><label className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs sm:flex">Stake DEMO <input aria-label="Valor da aposta DEMO" type="number" min="1" value={stake} onChange={e => setStake(Math.max(1, Number(e.target.value) || 1))} className="w-16 bg-transparent text-right font-bold outline-none"/></label>{user ? <><div className="hidden text-right sm:block"><div className="text-xs text-slate-400">Saldo DEMO</div><div className="font-bold text-emerald-400">{money(me?.wallet.balance || 0)}</div></div><button onClick={signOut} className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/5" aria-label="Sair"><LogOut size={18}/></button></> : <button onClick={signIn} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950"><LogIn size={17}/> Entrar</button>}</div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-7">
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs text-slate-300"><ShieldCheck size={17} className="text-emerald-400"/><span>Ambiente demonstrativo. Operação com dinheiro real exige licença, KYC/AML e provedores homologados.</span></div>

        {tab === 'home' && <section className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Metric label="Saldo DEMO" value={user ? money(me?.wallet.balance || 0) : 'Entrar para ativar'} /><Metric label="Posições abertas" value={user ? String(totalOpen) : '—'} /><Metric label="Eventos esportivos" value={String(catalog?.sports.length || 0)} /><Metric label="Mercados Sim/Não" value={String(catalog?.predictions.length || 0)} /></div><div className="grid gap-5 xl:grid-cols-2"><Panel title="Próximos eventos"><div className="space-y-3">{catalog?.sports.slice(0, 3).map(event => <div key={event.id} className="rounded-xl bg-white/[0.035] p-4"><div className="text-xs text-slate-500">{event.sport} • {event.league}</div><div className="mt-1 font-semibold">{event.home} x {event.away}</div><div className="mt-1 text-xs text-slate-400">{dateTime(event.starts_at)}</div></div>)}</div></Panel><Panel title="Compliance de lançamento"><div className="space-y-3 text-sm text-slate-300"><Status ok label="Carteira isolada por usuário"/><Status ok label="RNG criptográfico no Fortune Dice"/><Status ok label="Limites e autoexclusão"/><Status label="KYC externo — não configurado"/><Status label="Pagamentos e saques — desativados"/></div></Panel></div></section>}

        {tab === 'sports' && <section><Title title="Apostas esportivas" subtitle="Odds fixas demonstrativas. Settlement externo ainda não conectado."/><div className="grid gap-4 xl:grid-cols-2">{catalog?.sports.map(event => <Panel key={event.id} title={`${event.home} x ${event.away}`}><div className="mb-4 flex items-center justify-between text-xs text-slate-500"><span>{event.sport} • {event.league}</span><span>{dateTime(event.starts_at)}</span></div>{event.markets.map(market => <div key={market.id}><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{market.label}</div><div className={`grid gap-2 ${market.selections.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{market.selections.map(selection => <button key={selection.id} disabled={busy !== ''} onClick={() => void placeSports(event, market.id, selection.id, selection.label)} className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left hover:border-emerald-400/40 hover:bg-emerald-400/5"><div className="truncate text-xs text-slate-300">{selection.label}</div><div className="mt-1 text-lg font-black text-emerald-400">{selection.odds.toFixed(2)}</div></button>)}</div></div>)}</Panel>)}</div></section>}

        {tab === 'prediction' && <section><Title title="Mercados de previsão" subtitle="Posições Sim/Não com preço que reage ao volume DEMO."/><div className="grid gap-4 lg:grid-cols-2">{catalog?.predictions.map(market => <Panel key={market.id} title={market.title}><div className="mb-4 text-xs text-slate-500">{market.category} • fecha {dateTime(market.closes_at)} • {market.resolution}</div><div className="grid grid-cols-2 gap-3"><button onClick={() => void buyPrediction(market, 'yes')} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-left"><div className="text-xs text-emerald-200">Comprar SIM</div><div className="mt-1 text-2xl font-black text-emerald-400">{pct(market.yes_price)}</div></button><button onClick={() => void buyPrediction(market, 'no')} className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-left"><div className="text-xs text-rose-200">Comprar NÃO</div><div className="mt-1 text-2xl font-black text-rose-300">{pct(market.no_price)}</div></button></div></Panel>)}</div></section>}

        {tab === 'casino' && <section><Title title="Fortune Dice" subtitle="Rodada DEMO com seed, hash e HMAC criptográfico auditável."/><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10 p-8"><div className="text-sm text-fuchsia-200">RNG criptográfico • Provably fair</div><div className="mt-4 text-5xl font-black">60+</div><div className="mt-2 text-slate-300">Roll igual ou superior a 60 vence e paga 2,35x em créditos DEMO.</div><button disabled={busy !== ''} onClick={() => void playCasino()} className="mt-8 rounded-xl bg-fuchsia-400 px-5 py-3 font-black text-slate-950">{busy === 'casino' ? 'Processando...' : `Jogar ${money(stake)} DEMO`}</button></div><Panel title="Últimas rodadas"><div className="space-y-2">{me?.casino_rounds.slice(0, 6).map((round, index) => <div key={String(round.id || index)} className="flex items-center justify-between rounded-xl bg-white/[0.035] px-3 py-2 text-sm"><span>Roll {Number(round.roll).toFixed(2)}</span><span className={round.win ? 'text-emerald-400' : 'text-slate-500'}>{round.win ? `+${money(Number(round.payout))}` : 'Sem prêmio'}</span></div>)}{!me && <Empty text="Entre para jogar e auditar suas rodadas."/>}</div></Panel></div></section>}

        {tab === 'disputes' && <section><Title title="Disputas peer-to-peer" subtitle="Usuários criam regras e outros entram a favor ou contra. Arbitragem real ainda não integrada."/><div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><Panel title="Criar disputa"><div className="space-y-3"><Input label="Título" value={disputeForm.title} onChange={value => setDisputeForm({ ...disputeForm, title: value })}/><Input label="Regras e critério de resolução" value={disputeForm.rules} onChange={value => setDisputeForm({ ...disputeForm, rules: value })}/><Input label="Valor mínimo DEMO" type="number" value={String(disputeForm.min_stake)} onChange={value => setDisputeForm({ ...disputeForm, min_stake: Number(value) || 1 })}/><Input label="Prazo" type="datetime-local" value={disputeForm.deadline} onChange={value => setDisputeForm({ ...disputeForm, deadline: value })}/><button onClick={() => void createDispute()} className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950">Publicar disputa</button></div></Panel><div className="space-y-3">{disputes.map(item => <Panel key={item.id} title={item.title}><div className="text-sm leading-6 text-slate-300">{item.rules}</div><div className="mt-3 text-xs text-slate-500">Criador: {item.creator_name} • mínimo {money(item.min_stake)} • prazo {dateTime(item.deadline)}</div><div className="mt-4 grid grid-cols-2 gap-3"><button onClick={() => void joinDispute(item, 'for')} className="rounded-xl bg-emerald-400/10 p-3 text-left text-emerald-300"><div className="text-xs">A favor</div><strong>{money(item.for_volume)}</strong></button><button onClick={() => void joinDispute(item, 'against')} className="rounded-xl bg-rose-400/10 p-3 text-left text-rose-300"><div className="text-xs">Contra</div><strong>{money(item.against_volume)}</strong></button></div></Panel>)}{disputes.length === 0 && <Empty text="Nenhuma disputa criada ainda."/>}</div></div></section>}

        {tab === 'wallet' && <section><Title title="Carteira DEMO" subtitle="Extrato interno isolado por usuário. Depósitos e saques reais estão bloqueados."/><div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><Panel title="Saldo"><div className="text-4xl font-black text-emerald-400">{user ? money(me?.wallet.balance || 0) : '—'}</div><div className="mt-2 text-sm text-slate-500">Créditos demonstrativos sem valor monetário.</div></Panel><Panel title="Extrato"><div className="space-y-2">{me?.transactions.slice(0, 15).map(tx => <div key={tx.id} className="flex items-center justify-between border-b border-white/5 py-2 text-sm"><div><div>{tx.description}</div><div className="text-xs text-slate-500">{dateTime(tx.created_at)}</div></div><strong className={tx.amount >= 0 ? 'text-emerald-400' : 'text-slate-300'}>{tx.amount >= 0 ? '+' : ''}{money(tx.amount)}</strong></div>)}{!user && <Empty text="Entre para acessar sua carteira."/>}</div></Panel></div></section>}

        {tab === 'responsible' && <section><Title title="Jogo responsável" subtitle="Limites de proteção aplicados também no ambiente DEMO."/><div className="grid gap-5 lg:grid-cols-2"><Panel title="Limites pessoais"><div className="space-y-3"><Input label="Máximo por aposta DEMO" type="number" value={String(limits.max_wager)} onChange={value => setLimits({ ...limits, max_wager: Number(value) || 1 })}/><Input label="Limite diário de depósito (preparado para futura integração)" type="number" value={String(limits.deposit_daily)} onChange={value => setLimits({ ...limits, deposit_daily: Number(value) || 0 })}/><Input label="Limite semanal de depósito" type="number" value={String(limits.deposit_weekly)} onChange={value => setLimits({ ...limits, deposit_weekly: Number(value) || 0 })}/><button onClick={() => void saveLimits()} className="rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950">Salvar limites</button></div></Panel><Panel title="Autoexclusão"><div className="space-y-3 text-sm text-slate-300"><p>Durante a autoexclusão, novas apostas DEMO são recusadas pelo backend.</p><button onClick={() => void saveLimits('24h')} className="w-full rounded-xl border border-white/10 p-3 text-left hover:bg-white/5">Autoexcluir por 24 horas</button><button onClick={() => void saveLimits('7d')} className="w-full rounded-xl border border-white/10 p-3 text-left hover:bg-white/5">Autoexcluir por 7 dias</button><button onClick={() => void saveLimits('permanent')} className="w-full rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-left text-rose-200">Autoexclusão permanente</button></div></Panel></div></section>}

        {tab === 'ops' && <section><Title title="Painel operacional — Sandbox" subtitle="Indicadores técnicos sem dados sensíveis de usuários."/><div className="grid gap-4 md:grid-cols-4"><Metric label="Volume esportes DEMO" value={money(ops?.demo_volume.sports || 0)}/><Metric label="Volume cassino DEMO" value={money(ops?.demo_volume.casino || 0)}/><Metric label="Volume prediction DEMO" value={money(ops?.demo_volume.prediction || 0)}/><Metric label="Volume P2P DEMO" value={money(ops?.demo_volume.p2p || 0)}/></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><Panel title="Integrações"><div className="space-y-3 text-sm"><Status label="Dinheiro real desativado"/><Status label="KYC externo não configurado"/><Status label="Gateway de pagamentos desativado"/><Status label="Settlement esportivo externo não configurado"/><Status ok label="Autenticação multiusuário ativa"/><Status ok label="Realtime ativo"/></div></Panel><Panel title="Próxima camada para produção"><ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300"><li>Projeto dedicado de banco PostgreSQL/Supabase e RLS.</li><li>Provedor KYC/AML e verificação 18+.</li><li>Gateway PIX com idempotência financeira.</li><li>Feed de odds esportivas + settlement oficial.</li><li>Perfis admin/suporte com allowlist e auditoria.</li></ol></Panel></div></section>}
      </main>
    </div>
  </div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-2xl border border-white/10 bg-[#0b192b] p-5 shadow-xl shadow-black/10"><h3 className="mb-4 font-bold">{title}</h3>{children}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-[#0b192b] p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>; }
function Title({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-5"><h1 className="text-2xl font-black md:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-400">{subtitle}</p></div>; }
function Status({ label, ok = false }: { label: string; ok?: boolean }) { return <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`}/><span>{label}</span></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">{text}</div>; }
function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1 block text-xs text-slate-400">{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm outline-none focus:border-emerald-400/50"/></label>; }

export default App;