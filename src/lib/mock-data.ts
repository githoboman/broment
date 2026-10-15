export interface Trade {
  id: string;
  market: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  status: 'OPEN' | 'CLOSED';
  size: number;        // USDT-denominated trade size (what the table shows)
  price: number;       // Entry price for the asset
  exitPrice: number | null;
  pnl: number | null;  // null for unclosed spot, number for derivatives and closed spot
  timestamp: string;
  txHash: string;
}

/**
 * Generates 200 mock trades with 4 baked-in behavioral patterns:
 * 1. Revenge Scaling: Size increases 80–200% after a losing trade (MARKET order bias)
 * 2. Limit Edge: LIMIT orders win ~61% of the time vs ~38% for MARKET orders
 * 3. Daily Fatigue: Win rate drops sharply after 3rd trade of the same calendar day
 * 4. Derivative/DePIN Alpha: BOT & DePIN ecosystem trades have genuine positive expectancy
 */
const generateMockTrades = (count: number): Trade[] => {
  const trades: Trade[] = [];
  const baseDate = new Date('2026-03-15T12:00:00Z');

  // Markets: BOT Chain native spot pairs and one derivative
  const spotMarkets = ['BOT/USDT', 'BOT/ETH', 'AI/BOT', 'DEPIN/BOT', 'BOT/USDC'];
  const derivativeMarket = 'BTC/USDT-PERP';

  // Realistic price ranges per market on BOT Chain
  const priceRanges: Record<string, [number, number]> = {
    'BOT/USDT':       [1.40, 2.60],
    'BOT/ETH':        [0.0006, 0.0011],
    'AI/BOT':         [0.35, 0.95],
    'DEPIN/BOT':      [3.10, 6.20],
    'BOT/USDC':       [1.40, 2.60],
    'BTC/USDT-PERP':  [85000, 105000],
  };

  // Track trades per calendar day for fatigue pattern
  const tradesPerDay: Record<string, number> = {};

  for (let i = 0; i < count; i++) {
    // Spread trades across 90 days, more on weekdays
    const daysBack = Math.floor(i * (90 / count)) + Math.floor(Math.random() * 3);
    const tradeDate = new Date(baseDate.getTime() - daysBack * 86400000);
    // Add random hour between 08:00 and 22:00 UTC
    tradeDate.setUTCHours(8 + Math.floor(Math.random() * 14));
    tradeDate.setUTCMinutes(Math.floor(Math.random() * 60));

    const dateKey = tradeDate.toISOString().split('T')[0];
    tradesPerDay[dateKey] = (tradesPerDay[dateKey] || 0) + 1;
    const tradeNumberToday = tradesPerDay[dateKey];

    // Market selection: 75% spot, 25% derivative
    const isDerivative = Math.random() < 0.25;
    const market = isDerivative
      ? derivativeMarket
      : spotMarkets[Math.floor(Math.random() * spotMarkets.length)];

    const [minPrice, maxPrice] = priceRanges[market];
    const price = minPrice + Math.random() * (maxPrice - minPrice);

    // Order type: 65% MARKET, 35% LIMIT
    const orderType: 'MARKET' | 'LIMIT' = Math.random() < 0.35 ? 'LIMIT' : 'MARKET';

    // Type: BUY or SELL
    const type: 'BUY' | 'SELL' = Math.random() < 0.52 ? 'BUY' : 'SELL';

    // Base trade size: $100 to $600 USDT
    let size = Math.floor(100 + Math.random() * 500);

    // Pattern 1: Revenge sizing — if previous trade was a loss, bump size by 80–200%
    const prevTrade = trades[trades.length - 1];
    if (prevTrade && prevTrade.pnl !== null && prevTrade.pnl < 0) {
      const revengeMultiplier = 1.8 + Math.random() * 1.2;
      size = Math.floor(size * revengeMultiplier);
    }

    // Determine win probability based on baked-in patterns
    let winProb = 0.50;

    // Pattern 2: Limit Edge — LIMIT orders win ~61%, MARKET ~38%
    if (orderType === 'LIMIT') {
      winProb += 0.11; // 61%
    } else {
      winProb -= 0.12; // 38%
    }

    // Pattern 3: Daily Fatigue — drops sharply after trade 3 of the day
    if (tradeNumberToday === 1) winProb += 0.12;       // ~62–73%
    else if (tradeNumberToday === 2) winProb += 0.02;  // ~52%
    else if (tradeNumberToday === 3) winProb -= 0.06;  // ~44%
    else winProb -= 0.20;                              // ~30% (fatigued)

    // Pattern 4: Derivative/DEPIN Alpha — positive edge
    if (market === 'BTC/USDT-PERP' || market === 'DEPIN/BOT') {
      winProb += 0.08;
    }

    // Clamp win probability
    winProb = Math.max(0.15, Math.min(0.85, winProb));

    const isWin = Math.random() < winProb;

    // Calculate P&L
    let pnl: number | null = null;
    let exitPrice: number | null = null;

    if (isDerivative) {
      // Derivatives always have P&L
      const pctMove = 0.008 + Math.random() * 0.035; // 0.8% to 3.5% move
      const pnlAmount = Math.round(size * pctMove * (isWin ? 1 : -1) * 100) / 100;
      pnl = pnlAmount;
      exitPrice = type === 'BUY'
        ? price * (1 + pctMove * (isWin ? 1 : -1))
        : price * (1 - pctMove * (isWin ? 1 : -1));
    } else {
      // Spot: closed trades have P&L, ~20% remain open
      const isClosed = Math.random() < 0.80;
      if (isClosed) {
        const pctMove = 0.015 + Math.random() * 0.06;
        pnl = Math.round(size * pctMove * (isWin ? 1 : -1) * 100) / 100;
        exitPrice = type === 'BUY'
          ? price * (1 + pctMove * (isWin ? 1 : -1))
          : price * (1 - pctMove * (isWin ? 1 : -1));
      }
    }

    // EVM 66-character transaction hash on BOT Chain
    const pseudoHash = `0x${((i + 1) * 1000000007).toString(16).padStart(64, 'b')}`;

    trades.push({
      id: `TRD-${(1000 + i).toString()}`,
      market,
      type,
      orderType,
      status: (isDerivative || pnl !== null) ? 'CLOSED' : 'OPEN',
      size,
      price: Math.round(price * 100) / 100,
      exitPrice: exitPrice ? Math.round(exitPrice * 100) / 100 : null,
      pnl,
      timestamp: tradeDate.toISOString(),
      txHash: pseudoHash,
    });
  }

  return trades;
};

export const MOCK_TRADES = generateMockTrades(200);

// Pre-written analysis matching exactly the section headers AnalysisPanel.tsx expects
export const MOCK_ANALYSIS = `## YOUR TRADING DNA
You are a **momentum-driven reactive trader** operating across BOT Chain's B DEX spot and derivatives pools. Over 200 trades across 90 days, your activity clusters around high-volatility periods — which tells us you trade on market energy rather than a systematic plan. Your BTC/USDT-PERP and DEPIN/BOT exposure shows genuine analytical ability. However, your impulsive spot market orders during volatile swings are quietly bleeding that edge dry.

## YOUR 3 BIGGEST BLIND SPOTS
**Blind Spot 1 — You size up on emotion, and emotion is expensive.** Your average losing trade is **$847 USDT**. Your average winning trade is **$312 USDT**. You are risking **2.7x more capital** on the trades you end up losing. This single pattern accounts for **64% of your total drawdown** over the last 90 days on BOT Chain.

**Blind Spot 2 — Market orders are a tax you keep paying voluntarily.** With BOT Chain's ultra-fast 0.75-second block time, your LIMIT orders win **61% of the time**. Your MARKET orders win **38% of the time**. That 23-point gap is the cost of impatience. Yet **68% of your trades are market orders**. You are choosing the inferior execution tool on the majority of your entries.

**Blind Spot 3 — You revenge trade, and the timestamps prove it.** Your first trade of each day wins **71% of the time**. Your second: **52%**. Your third: **44%**. Every trade after your third in a single day has a **negative expected value**. After the loss in TRD-1042, your next four positions were each **3.2x your normal size** and all executed via MARKET orders within 22 minutes.

## YOUR HIDDEN EDGES
Your **BTC/USDT-PERP** derivatives trades are genuinely profitable — a **58% win rate** with an average gain of **$340 per winning trade**. You have real alpha in perpetuals and DePIN markets when you are patient enough to let liquidity settle. Your **DEPIN/BOT** spot trades also show a **63% win rate**, showing that you understand AI and DePIN momentum rhythms on BOT Chain better than others. These two sectors are where your true edge lives.

## THIS WEEK'S FOCUS
**Hard rule: maximum 3 trades per calendar day.** No exceptions. BOT Chain's $0.06 fees make it tempting to overtrade, but discipline is your highest-yielding asset. Do not open a fourth trade under any circumstance this week. Log your P&L after trade 1, 2, and 3 separately. You will see the win-rate stabilization within 4 days. Change nothing else yet — isolate one variable at a time.`;