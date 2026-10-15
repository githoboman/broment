/**
 * src/lib/normalize.ts
 * Converts raw Injective API trade objects into the unified Trade interface.
 */

import { Trade } from './mock-data';
import { MarketMeta, resolveMarketTicker } from './botchain';
import { RawSpotTrade, RawDerivativeTrade } from './injective';

// ─── Price scaling ────────────────────────────────────────────────────────────
// Injective's SDK returns raw blockchain values (1e18 scaled) for some markets.
// Human-readable crypto prices are between $0.0001 and $1,000,000.
// Raw values are like 1.6e-12 — multiply by 1e18 to get the real price.
// Quantities > 1e10 are also raw — divide by 1e18.

function toHumanPrice(val: any): number | null {
  const n = parseFloat(String(val));
  if (isNaN(n) || n === 0) return null;
  // Cap at realistic crypto price range: $0.0001 to $100,000
  // Anything outside this range from a raw SDK value is unscaled garbage
  if (n > 0 && n < 0.0001) {
    const scaled = n * 1e18;
    // Only return if scaled value is in realistic range
    return scaled < 100000 ? scaled : null;
  }
  // If already > $100,000 it's raw and unscaleable without market decimals
  if (n > 100000) return null;
  return n;
}

function toHumanQuantity(val: any): number | null {
  const n = parseFloat(String(val));
  if (isNaN(n) || n === 0) return null;
  if (n > 1e10) return n / 1e18;
  return n;
}

function safeParseFloat(val: any): number | null {
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

// ─── Spot Trade Normalization ─────────────────────────────────────────────────

export function normalizeSpotTrade(
  raw: any,
  allMarkets: MarketMeta[]
): Trade | null {
  try {
    const market = resolveMarketTicker(raw.marketId, allMarkets);
    if (!market) return null;

    const orderType: 'MARKET' | 'LIMIT' =
      raw.tradeExecutionType === 'market' ? 'MARKET' : 'LIMIT';

    const type: 'BUY' | 'SELL' =
      raw.tradeDirection === 'buy' ? 'BUY' : 'SELL';

    // Extract raw price and quantity from whichever shape the SDK returns
    let rawPriceVal: any = null;
    let rawQtyVal: any = null;

    if (raw.price && typeof raw.price === 'object') {
      rawPriceVal = raw.price.price;
      rawQtyVal = raw.price.quantity;
    } else if (raw.price && typeof raw.price === 'string') {
      rawPriceVal = raw.price;
      rawQtyVal = raw.quantity;
    } else if (raw.executionPrice) {
      rawPriceVal = raw.executionPrice;
      rawQtyVal = raw.executionQuantity;
    }

    const price = toHumanPrice(rawPriceVal);
    const quantity = toHumanQuantity(rawQtyVal);
    const size = (price !== null && quantity !== null)
      ? Math.round(price * quantity * 100) / 100
      : null;

    const rawTimestamp = raw.executedAt ?? raw.timestamp;
    const timestamp = typeof rawTimestamp === 'number'
      ? new Date(rawTimestamp).toISOString()
      : rawTimestamp ?? new Date().toISOString();

    const txHash = raw.orderHash ?? raw.tradeId ?? '0x';

    return {
      id: raw.tradeId ?? raw.id,
      market: market.ticker,
      type,
      orderType,
      status: 'CLOSED',
      size: size as any,
      price: price as any,
      exitPrice: null,
      pnl: null,
      timestamp,
      txHash,
    };
  } catch (err) {
    console.error('[normalize] Failed to normalize spot trade:', raw?.tradeId, err);
    return null;
  }
}

// ─── Derivative Trade Normalization ──────────────────────────────────────────

export function normalizeDerivativeTrade(
  raw: any,
  allMarkets: MarketMeta[]
): Trade | null {
  try {
    const market = resolveMarketTicker(raw.marketId, allMarkets);
    if (!market) return null;

    const orderType: 'MARKET' | 'LIMIT' =
      raw.tradeExecutionType === 'market' ? 'MARKET' : 'LIMIT';

    const type: 'BUY' | 'SELL' =
      raw.tradeDirection === 'buy' ? 'BUY' : 'SELL';

    const price = toHumanPrice(raw.executionPrice);
    const quantity = toHumanQuantity(raw.executionQuantity);
    const size = (price !== null && quantity !== null)
      ? Math.round(price * quantity * 100) / 100
      : null;

    const pnlRaw = safeParseFloat(raw.pnl);
    const pnl = pnlRaw !== null ? Math.round(pnlRaw * 100) / 100 : null;

    const rawTimestamp = raw.executedAt ?? raw.timestamp;
    const timestamp = typeof rawTimestamp === 'number'
      ? new Date(rawTimestamp).toISOString()
      : rawTimestamp ?? new Date().toISOString();

    const txHash = raw.orderHash ?? raw.tradeId ?? '0x';

    return {
      id: raw.tradeId ?? raw.id,
      market: market.ticker,
      type,
      orderType,
      status: 'CLOSED',
      size: size as any,
      price: price as any,
      exitPrice: null,
      pnl,
      timestamp,
      txHash,
    };
  } catch (err) {
    console.error('[normalize] Failed to normalize derivative trade:', raw?.tradeId, err);
    return null;
  }
}

// ─── Batch Normalization ──────────────────────────────────────────────────────

export function normalizeAllTrades(
  spotTrades: RawSpotTrade[],
  derivTrades: RawDerivativeTrade[],
  allMarkets: MarketMeta[]
): Trade[] {
  const normalized: Trade[] = [];

  for (const raw of spotTrades) {
    const trade = normalizeSpotTrade(raw, allMarkets);
    if (trade) normalized.push(trade);
  }

  for (const raw of derivTrades) {
    const trade = normalizeDerivativeTrade(raw, allMarkets);
    if (trade) normalized.push(trade);
  }

  normalized.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return normalized;
}

// ─── Stats Computation ────────────────────────────────────────────────────────

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  totalVolume: number;
  marketsTraded: number;
  dateRangeLabel: string;
  daysCovered: number;
}

export function computeStats(trades: Trade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalVolume: 0,
      marketsTraded: 0,
      dateRangeLabel: '—',
      daysCovered: 0,
    };
  }

  const tradesWithPnl = trades.filter((t) => t.pnl !== null);
  const winners = tradesWithPnl.filter((t) => t.pnl! > 0);
  const winRate = tradesWithPnl.length > 0
    ? Math.round((winners.length / tradesWithPnl.length) * 1000) / 10
    : 0;

  const totalVolume = Math.round(
    trades.reduce((sum, t) => sum + (t.size ?? 0), 0)
  );

  const uniqueMarkets = new Set(trades.map((t) => t.market));
  const timestamps = trades.map((t) => new Date(t.timestamp).getTime());
  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);
  const daysCovered = Math.max(
    1,
    Math.round((latest - earliest) / (1000 * 60 * 60 * 24))
  );

  return {
    totalTrades: trades.length,
    winRate,
    totalVolume,
    marketsTraded: uniqueMarkets.size,
    dateRangeLabel: `${daysCovered} days`,
    daysCovered,
  };
}

// ─── Behavioral Pre-Analysis ──────────────────────────────────────────────────

export interface BehavioralStats {
  totalTrades: number;
  winRate: number;
  avgWinSize: number;
  avgLossSize: number;
  sizeRatio: number;
  marketOrderWinRate: number;
  limitOrderWinRate: number;
  marketOrderCount: number;
  limitOrderCount: number;
  winRateByDayPosition: {
    first: number;
    second: number;
    third: number;
    fourthPlus: number;
  };
  winRateByMarket: Record<string, { wins: number; total: number; winRate: number }>;
  topLosingTrades: Trade[];
  topWinningTrades: Trade[];
  derivativeWinRate: number;
  spotWinRate: number;
}

export function computeBehavioralStats(trades: Trade[]): BehavioralStats {
  const closedTrades = trades.filter((t) => t.pnl !== null);
  const winners = closedTrades.filter((t) => t.pnl! > 0);
  const losers = closedTrades.filter((t) => t.pnl! < 0);

  const avgWinSize = winners.length > 0
    ? Math.round(winners.reduce((s, t) => s + (t.size ?? 0), 0) / winners.length * 100) / 100
    : 0;
  const avgLossSize = losers.length > 0
    ? Math.round(losers.reduce((s, t) => s + (t.size ?? 0), 0) / losers.length * 100) / 100
    : 0;
  const sizeRatio = avgWinSize > 0
    ? Math.round((avgLossSize / avgWinSize) * 100) / 100
    : 0;

  const marketTrades = closedTrades.filter((t) => t.orderType === 'MARKET');
  const limitTrades = closedTrades.filter((t) => t.orderType === 'LIMIT');
  const marketWins = marketTrades.filter((t) => t.pnl! > 0).length;
  const limitWins = limitTrades.filter((t) => t.pnl! > 0).length;

  const marketOrderWinRate = marketTrades.length > 0
    ? Math.round((marketWins / marketTrades.length) * 1000) / 10 : 0;
  const limitOrderWinRate = limitTrades.length > 0
    ? Math.round((limitWins / limitTrades.length) * 1000) / 10 : 0;

  const tradesByDay: Record<string, Trade[]> = {};
  for (const trade of trades) {
    const day = trade.timestamp.split('T')[0];
    if (!tradesByDay[day]) tradesByDay[day] = [];
    tradesByDay[day].push(trade);
  }
  for (const day of Object.keys(tradesByDay)) {
    tradesByDay[day].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  const positionStats = {
    first: { w: 0, t: 0 },
    second: { w: 0, t: 0 },
    third: { w: 0, t: 0 },
    fourthPlus: { w: 0, t: 0 },
  };
  for (const dayTrades of Object.values(tradesByDay)) {
    dayTrades.forEach((trade, idx) => {
      if (trade.pnl === null) return;
      const key = idx === 0 ? 'first'
        : idx === 1 ? 'second'
        : idx === 2 ? 'third'
        : 'fourthPlus';
      positionStats[key].t++;
      if (trade.pnl > 0) positionStats[key].w++;
    });
  }
  const toRate = (s: { w: number; t: number }) =>
    s.t > 0 ? Math.round((s.w / s.t) * 1000) / 10 : 0;

  const winRateByMarket: Record<string, { wins: number; total: number; winRate: number }> = {};
  for (const trade of closedTrades) {
    if (!winRateByMarket[trade.market]) {
      winRateByMarket[trade.market] = { wins: 0, total: 0, winRate: 0 };
    }
    winRateByMarket[trade.market].total++;
    if (trade.pnl! > 0) winRateByMarket[trade.market].wins++;
  }
  for (const key of Object.keys(winRateByMarket)) {
    const { wins, total } = winRateByMarket[key];
    winRateByMarket[key].winRate = Math.round((wins / total) * 1000) / 10;
  }

  const sortedByPnl = [...closedTrades].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));
  const topWinningTrades = sortedByPnl.slice(0, 5);
  const topLosingTrades = sortedByPnl.slice(-5).reverse();

  const isDerivative = (t: Trade) => t.market.includes('PERP');
  const derivTrades = closedTrades.filter(isDerivative);
  const spotTrades2 = closedTrades.filter((t) => !isDerivative(t));
  const derivWins = derivTrades.filter((t) => t.pnl! > 0).length;
  const spotWins = spotTrades2.filter((t) => t.pnl! > 0).length;

  return {
    totalTrades: trades.length,
    winRate: closedTrades.length > 0
      ? Math.round((winners.length / closedTrades.length) * 1000) / 10 : 0,
    avgWinSize,
    avgLossSize,
    sizeRatio,
    marketOrderWinRate,
    limitOrderWinRate,
    marketOrderCount: marketTrades.length,
    limitOrderCount: limitTrades.length,
    winRateByDayPosition: {
      first: toRate(positionStats.first),
      second: toRate(positionStats.second),
      third: toRate(positionStats.third),
      fourthPlus: toRate(positionStats.fourthPlus),
    },
    winRateByMarket,
    topLosingTrades,
    topWinningTrades,
    derivativeWinRate: derivTrades.length > 0
      ? Math.round((derivWins / derivTrades.length) * 1000) / 10 : 0,
    spotWinRate: spotTrades2.length > 0
      ? Math.round((spotWins / spotTrades2.length) * 1000) / 10 : 0,
  };
}