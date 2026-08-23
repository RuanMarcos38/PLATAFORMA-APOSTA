import { db, error, json, requireAuth } from '@appdeploy/sdk';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { notifySubscribers } from './realtime-subscribers';

type WalletRecord = { balance: number; currency: string; created_at: number; updated_at: number };
type ResponsibleRecord = { max_wager: number; deposit_daily: number; deposit_weekly: number; excluded_until: number | null; permanent: boolean; updated_at: number };
type MetricRecord = { key: string; value: number; updated_at: number };
type PredictionState = { market_id: string; yes_shares: number; no_shares: number; updated_at: number };
type DisputeRecord = { title: string; rules: string; min_stake: number; deadline: string; creator_user_id: string; creator_name: string; status: string; for_volume: number; against_volume: number; created_at: number };

const sportsEvents = [
  { id: 'fut-joinville-avai', sport: 'Futebol', league: 'Brasil • Série B', starts_at: '2026-08-29T19:30:00-03:00', home: 'Joinville', away: 'Avaí', markets: [{ id: 'resultado', label: 'Resultado', selections: [{ id: 'home', label: 'Joinville', odds: 2.18 }, { id: 'draw', label: 'Empate', odds: 3.12 }, { id: 'away', label: 'Avaí', odds: 3.38 }] }] },
  { id: 'basq-sp-minas', sport: 'Basquete', league: 'Brasil • NBB', starts_at: '2026-08-30T20:00:00-03:00', home: 'São Paulo', away: 'Minas', markets: [{ id: 'vencedor', label: 'Vencedor', selections: [{ id: 'home', label: 'São Paulo', odds: 1.82 }, { id: 'away', label: 'Minas', odds: 2.04 }] }] },
  { id: 'tenis-rio-open-demo', sport: 'Tênis', league: 'Exibição', starts_at: '2026-08-31T17:00:00-03:00', home: 'Jogador A', away: 'Jogador B', markets: [{ id: 'vencedor', label: 'Vencedor', selections: [{ id: 'home', label: 'Jogador A', odds: 1.71 }, { id: 'away', label: 'Jogador B', odds: 2.19 }] }] }
];

const predictionMarkets = [
  { id: 'ipca-2026', category: 'Economia', title: 'O IPCA fechará 2026 abaixo de 5%?', closes_at: '2026-12-20T23:59:00-03:00', base_yes: 0.61, resolution: 'Fonte oficial: IBGE' },
  { id: 'oscar-brasil', category: 'Entretenimento', title: 'Um filme brasileiro vencerá uma categoria principal no próximo Oscar?', closes_at: '2027-02-28T20:00:00-03:00', base_yes: 0.34, resolution: 'Fonte oficial: Academy Awards' },
  { id: 'selic-2026', category: 'Economia', title: 'A Selic terminará 2026 abaixo de 12% a.a.?', closes_at: '2026-12-15T23:59:00-03:00', base_yes: 0.42, resolution: 'Fonte oficial: Banco Central do Brasil' }
];

const userTable = (kind: string, userId: string) => `${kind}:${userId}`;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const num = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

async function getWallet(userId: string) {
  const table = userTable('wallet', userId);
  const { items } = await db.list<WalletRecord>(table, { limit: 1 });
  if (items[0]) return items[0];
  const now = Date.now();
  const record: WalletRecord = { balance: 1000, currency: 'DEMO', created_at: now, updated_at: now };
  const [id] = await db.add(table, [record]);
  if (!id) throw new Error('Falha ao criar carteira demonstrativa');
  await safeTransaction(userId, 'demo_credit', 1000, 'Crédito inicial de demonstração');
  return { id, ...record };
}

async function setWallet(userId: string, wallet: WalletRecord & { id: string }, balance: number) {
  const record: WalletRecord = { balance: Math.round(balance * 100) / 100, currency: wallet.currency, created_at: wallet.created_at, updated_at: Date.now() };
  const [ok] = await db.update(userTable('wallet', userId), [{ id: wallet.id, record }]);
  return ok;
}

async function getResponsible(userId: string) {
  const table = userTable('responsible', userId);
  const { items } = await db.list<ResponsibleRecord>(table, { limit: 1 });
  if (items[0]) return items[0];
  const record: ResponsibleRecord = { max_wager: 100, deposit_daily: 500, deposit_weekly: 1500, excluded_until: null, permanent: false, updated_at: Date.now() };
  const [id] = await db.add(table, [record]);
  if (!id) throw new Error('Falha ao criar limites de jogo responsável');
  return { id, ...record };
}

function validateWager(settings: ResponsibleRecord, stake: number) {
  if (settings.permanent) return 'Conta em autoexclusão permanente para apostas DEMO.';
  if (settings.excluded_until && settings.excluded_until > Date.now()) return 'Autoexclusão temporária ativa.';
  if (stake > settings.max_wager) return `Valor acima do seu limite por aposta DEMO (R$ ${settings.max_wager.toFixed(2)}).`;
  return null;
}

async function safeTransaction(userId: string, type: string, amount: number, description: string) {
  try {
    await db.add(userTable('transactions', userId), [{ type, amount: Math.round(amount * 100) / 100, description, created_at: Date.now() }]);
  } catch (err) {
    console.warn('transaction_log_failed', err);
  }
}

async function incrementMetric(key: string, amount: number) {
  try {
    const { items } = await db.list<MetricRecord>('metrics', { limit: 30 });
    const current = items.find(item => item.key === key);
    if (!current) {
      await db.add('metrics', [{ key, value: amount, updated_at: Date.now() }]);
      return;
    }
    await db.update('metrics', [{ id: current.id, record: { key, value: current.value + amount, updated_at: Date.now() } }]);
  } catch (err) {
    console.warn('metric_update_failed', err);
  }
}

async function emit(entityType: string, payload: unknown) {
  try {
    await notifySubscribers(entityType, 'global', payload);
  } catch (err) {
    console.warn('realtime_emit_failed', err);
  }
}

async function getPredictionStates() {
  const { items } = await db.list<PredictionState>('prediction_state', { limit: 30 });
  return items;
}

function predictionPrice(baseYes: number, yesShares: number, noShares: number) {
  const skew = (yesShares - noShares) / (yesShares + noShares + 200);
  return clamp(baseYes + skew * 0.18, 0.05, 0.95);
}

async function predictionCatalog() {
  const states = await getPredictionStates();
  return predictionMarkets.map(market => {
    const state = states.find(item => item.market_id === market.id);
    const yesShares = state?.yes_shares ?? 0;
    const noShares = state?.no_shares ?? 0;
    const yesPrice = predictionPrice(market.base_yes, yesShares, noShares);
    return { ...market, yes_price: yesPrice, no_price: 1 - yesPrice, yes_shares: yesShares, no_shares: noShares };
  });
}

async function getOrCreatePredictionState(marketId: string) {
  const states = await getPredictionStates();
  const current = states.find(item => item.market_id === marketId);
  if (current) return current;
  const record: PredictionState = { market_id: marketId, yes_shares: 0, no_shares: 0, updated_at: Date.now() };
  const [id] = await db.add('prediction_state', [record]);
  if (!id) throw new Error('Falha ao iniciar mercado');
  return { id, ...record };
}

async function privateSnapshot(userId: string) {
  const [wallet, responsible, sports, casino, positions, disputeBets, transactions] = await Promise.all([
    getWallet(userId),
    getResponsible(userId),
    db.list(userTable('sports_bets', userId), { limit: 50 }),
    db.list(userTable('casino_rounds', userId), { limit: 30 }),
    db.list(userTable('positions', userId), { limit: 50 }),
    db.list(userTable('dispute_bets', userId), { limit: 50 }),
    db.list(userTable('transactions', userId), { limit: 80 })
  ]);
  const newest = <T extends { created_at?: number }>(items: T[]) => [...items].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  return { wallet, responsible, sports_bets: newest(sports.items), casino_rounds: newest(casino.items), positions: newest(positions.items), dispute_bets: newest(disputeBets.items), transactions: newest(transactions.items) };
}

export const appRoutes = {
  'GET /api/catalog': [async () => json({ mode: 'sandbox', real_money_enabled: false, kyc_required_for_real_money: true, sports: sportsEvents, predictions: await predictionCatalog() })],

  'GET /api/disputes': [async () => {
    const { items } = await db.list<DisputeRecord>('disputes', { limit: 50 });
    return json([...items].sort((a, b) => b.created_at - a.created_at));
  }],

  'GET /api/me': [requireAuth(), async ctx => json(await privateSnapshot(ctx.user!.userId))],

  'GET /api/ops/summary': [requireAuth(), async () => {
    const { items } = await db.list<MetricRecord>('metrics', { limit: 30 });
    const metric = (key: string) => items.find(item => item.key === key)?.value ?? 0;
    return json({ real_money_enabled: false, payments: 'disabled', withdrawals: 'disabled', external_kyc: 'not_configured', settlement_provider: 'not_configured', sports_events: sportsEvents.length, prediction_markets: predictionMarkets.length, demo_volume: { sports: metric('sports_volume'), casino: metric('casino_volume'), prediction: metric('prediction_volume'), p2p: metric('p2p_volume') } });
  }],

  'POST /api/sports/bets': [requireAuth(), async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const event = sportsEvents.find(item => item.id === String(body.event_id || ''));
    const market = event?.markets.find(item => item.id === String(body.market_id || ''));
    const selection = market?.selections.find(item => item.id === String(body.selection_id || ''));
    const stake = Math.round(num(body.stake) * 100) / 100;
    if (!event || !market || !selection) return error('Mercado esportivo inválido', 400);
    if (stake < 1) return error('Aposta mínima DEMO: R$ 1,00', 400);
    const userId = ctx.user!.userId;
    const [wallet, responsible] = await Promise.all([getWallet(userId), getResponsible(userId)]);
    const guardrail = validateWager(responsible, stake);
    if (guardrail) return error(guardrail, 400);
    if (wallet.balance < stake) return error('Saldo DEMO insuficiente', 400);
    const bet = { event_id: event.id, event_label: `${event.home} x ${event.away}`, market_id: market.id, market_label: market.label, selection_id: selection.id, selection_label: selection.label, odds: selection.odds, stake, potential_payout: Math.round(stake * selection.odds * 100) / 100, status: 'open', created_at: Date.now() };
    const [betId] = await db.add(userTable('sports_bets', userId), [bet]);
    if (!betId) return error('Não foi possível registrar a aposta', 500);
    const debited = await setWallet(userId, wallet, wallet.balance - stake);
    if (!debited) {
      await db.delete(userTable('sports_bets', userId), [betId]);
      return error('Falha ao atualizar carteira', 500);
    }
    await safeTransaction(userId, 'sports_wager', -stake, `${event.home} x ${event.away} • ${selection.label}`);
    await incrementMetric('sports_volume', stake);
    await emit('sports', { event_id: event.id, delta_volume: stake, at: Date.now() });
    return json({ id: betId, ...bet, balance: wallet.balance - stake }, 201);
  }],

  'POST /api/casino/play': [requireAuth(), async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const stake = Math.round(num(body.stake) * 100) / 100;
    if (stake < 1) return error('Aposta mínima DEMO: R$ 1,00', 400);
    const userId = ctx.user!.userId;
    const [wallet, responsible] = await Promise.all([getWallet(userId), getResponsible(userId)]);
    const guardrail = validateWager(responsible, stake);
    if (guardrail) return error(guardrail, 400);
    if (wallet.balance < stake) return error('Saldo DEMO insuficiente', 400);
    const serverSeed = randomBytes(32).toString('hex');
    const serverHash = createHash('sha256').update(serverSeed).digest('hex');
    const nonce = Date.now();
    const digest = createHmac('sha256', serverSeed).update(`${userId}:${nonce}`).digest('hex');
    const roll = (parseInt(digest.slice(0, 8), 16) % 10000) / 100;
    const win = roll >= 60;
    const payoutMultiplier = 2.35;
    const payout = win ? Math.round(stake * payoutMultiplier * 100) / 100 : 0;
    const nextBalance = wallet.balance - stake + payout;
    const round = { game: 'Fortune Dice', stake, roll, win, payout, payout_multiplier: payoutMultiplier, server_hash: serverHash, server_seed_revealed: serverSeed, nonce, created_at: Date.now() };
    const [roundId] = await db.add(userTable('casino_rounds', userId), [round]);
    if (!roundId) return error('Falha ao registrar rodada', 500);
    const updated = await setWallet(userId, wallet, nextBalance);
    if (!updated) {
      await db.delete(userTable('casino_rounds', userId), [roundId]);
      return error('Falha ao atualizar carteira', 500);
    }
    await safeTransaction(userId, 'casino_wager', -stake, 'Fortune Dice • aposta');
    if (payout > 0) await safeTransaction(userId, 'casino_payout', payout, 'Fortune Dice • prêmio');
    await incrementMetric('casino_volume', stake);
    return json({ id: roundId, ...round, balance: nextBalance }, 201);
  }],

  'POST /api/prediction/positions': [requireAuth(), async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const market = predictionMarkets.find(item => item.id === String(body.market_id || ''));
    const side = String(body.side || '').toLowerCase();
    const stake = Math.round(num(body.stake) * 100) / 100;
    if (!market || !['yes', 'no'].includes(side)) return error('Mercado ou posição inválida', 400);
    if (stake < 1) return error('Posição mínima DEMO: R$ 1,00', 400);
    const userId = ctx.user!.userId;
    const [wallet, responsible, state] = await Promise.all([getWallet(userId), getResponsible(userId), getOrCreatePredictionState(market.id)]);
    const guardrail = validateWager(responsible, stake);
    if (guardrail) return error(guardrail, 400);
    if (wallet.balance < stake) return error('Saldo DEMO insuficiente', 400);
    const yesPrice = predictionPrice(market.base_yes, state.yes_shares, state.no_shares);
    const price = side === 'yes' ? yesPrice : 1 - yesPrice;
    const shares = Math.round((stake / price) * 10000) / 10000;
    const position = { market_id: market.id, market_title: market.title, side, entry_price: price, stake, shares, status: 'open', created_at: Date.now() };
    const [positionId] = await db.add(userTable('positions', userId), [position]);
    if (!positionId) return error('Falha ao registrar posição', 500);
    const debited = await setWallet(userId, wallet, wallet.balance - stake);
    if (!debited) {
      await db.delete(userTable('positions', userId), [positionId]);
      return error('Falha ao atualizar carteira', 500);
    }
    const nextState: PredictionState = { market_id: state.market_id, yes_shares: state.yes_shares + (side === 'yes' ? shares : 0), no_shares: state.no_shares + (side === 'no' ? shares : 0), updated_at: Date.now() };
    const [stateOk] = await db.update('prediction_state', [{ id: state.id, record: nextState }]);
    if (!stateOk) {
      await setWallet(userId, { ...wallet, balance: wallet.balance - stake }, wallet.balance);
      await db.delete(userTable('positions', userId), [positionId]);
      return error('Falha ao atualizar preço do mercado', 500);
    }
    await safeTransaction(userId, 'prediction_position', -stake, `${market.title} • ${side === 'yes' ? 'SIM' : 'NÃO'}`);
    await incrementMetric('prediction_volume', stake);
    await emit('prediction', { market_id: market.id, at: Date.now() });
    return json({ id: positionId, ...position, balance: wallet.balance - stake }, 201);
  }],

  'POST /api/disputes': [requireAuth(), async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const title = String(body.title || '').trim();
    const rules = String(body.rules || '').trim();
    const minStake = Math.round(num(body.min_stake, 10) * 100) / 100;
    const deadline = String(body.deadline || '').trim();
    if (title.length < 5 || rules.length < 10) return error('Informe título e regras claras para a disputa', 400);
    if (minStake < 1) return error('Valor mínimo deve ser ao menos R$ 1,00 DEMO', 400);
    if (!deadline) return error('Informe o prazo da disputa', 400);
    const record: DisputeRecord = { title, rules, min_stake: minStake, deadline, creator_user_id: ctx.user!.userId, creator_name: ctx.user!.name || 'Usuário verificado', status: 'open', for_volume: 0, against_volume: 0, created_at: Date.now() };
    const [id] = await db.add('disputes', [record]);
    if (!id) return error('Falha ao criar disputa', 500);
    await emit('disputes', { action: 'created', id, at: Date.now() });
    return json({ id, ...record }, 201);
  }],

  'POST /api/disputes/:id/join': [requireAuth(), async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const side = String(body.side || '').toLowerCase();
    const stake = Math.round(num(body.stake) * 100) / 100;
    const [dispute] = await db.get<DisputeRecord>('disputes', [ctx.params.id]);
    if (!dispute) return error('Disputa não encontrada', 404);
    if (dispute.status !== 'open') return error('Disputa encerrada', 400);
    if (!['for', 'against'].includes(side)) return error('Escolha a favor ou contra', 400);
    if (stake < dispute.min_stake) return error(`Valor mínimo: R$ ${dispute.min_stake.toFixed(2)} DEMO`, 400);
    const userId = ctx.user!.userId;
    if (dispute.creator_user_id === userId) return error('O criador não pode apostar na própria disputa', 400);
    const [wallet, responsible] = await Promise.all([getWallet(userId), getResponsible(userId)]);
    const guardrail = validateWager(responsible, stake);
    if (guardrail) return error(guardrail, 400);
    if (wallet.balance < stake) return error('Saldo DEMO insuficiente', 400);
    const bet = { dispute_id: ctx.params.id, dispute_title: dispute.title, side, stake, status: 'open', created_at: Date.now() };
    const [betId] = await db.add(userTable('dispute_bets', userId), [bet]);
    if (!betId) return error('Falha ao registrar participação', 500);
    const debited = await setWallet(userId, wallet, wallet.balance - stake);
    if (!debited) {
      await db.delete(userTable('dispute_bets', userId), [betId]);
      return error('Falha ao atualizar carteira', 500);
    }
    const nextRecord: DisputeRecord = { ...dispute, for_volume: dispute.for_volume + (side === 'for' ? stake : 0), against_volume: dispute.against_volume + (side === 'against' ? stake : 0) };
    const [updated] = await db.update('disputes', [{ id: ctx.params.id, record: nextRecord }]);
    if (!updated) {
      await setWallet(userId, { ...wallet, balance: wallet.balance - stake }, wallet.balance);
      await db.delete(userTable('dispute_bets', userId), [betId]);
      return error('Falha ao atualizar disputa', 500);
    }
    await safeTransaction(userId, 'p2p_wager', -stake, `${dispute.title} • ${side === 'for' ? 'A favor' : 'Contra'}`);
    await incrementMetric('p2p_volume', stake);
    await emit('disputes', { action: 'joined', id: ctx.params.id, at: Date.now() });
    return json({ id: betId, ...bet, balance: wallet.balance - stake }, 201);
  }],

  'PUT /api/responsible': [requireAuth(), async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const userId = ctx.user!.userId;
    const current = await getResponsible(userId);
    const maxWager = clamp(Math.round(num(body.max_wager, current.max_wager) * 100) / 100, 1, 1000);
    const depositDaily = clamp(Math.round(num(body.deposit_daily, current.deposit_daily) * 100) / 100, 0, 100000);
    const depositWeekly = clamp(Math.round(num(body.deposit_weekly, current.deposit_weekly) * 100) / 100, 0, 500000);
    const exclusion = String(body.self_exclusion || 'none');
    if (current.permanent && exclusion === 'none') return error('Autoexclusão permanente não pode ser removida pelo próprio usuário.', 400);
    let excludedUntil = current.excluded_until;
    let permanent = current.permanent;
    if (exclusion === '24h') excludedUntil = Date.now() + 24 * 60 * 60 * 1000;
    if (exclusion === '7d') excludedUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (exclusion === 'permanent') permanent = true;
    if (exclusion === 'none' && !current.permanent && (!current.excluded_until || current.excluded_until <= Date.now())) excludedUntil = null;
    const record: ResponsibleRecord = { max_wager: maxWager, deposit_daily: depositDaily, deposit_weekly: depositWeekly, excluded_until: excludedUntil, permanent, updated_at: Date.now() };
    const [ok] = await db.update(userTable('responsible', userId), [{ id: current.id, record }]);
    if (!ok) return error('Falha ao salvar limites', 500);
    return json(record);
  }]
};