/**
 * src/ai/flows/analyze-trading-behavior-flow.ts
 *
 * Genkit flow for behavioral trading analysis.
 * Uses pre-computed stats as input to Gemini.
 * Prompt is built as a plain string function — no Handlebars interpolation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input Schema ─────────────────────────────────────────────────────────────

const WinRateByDaySchema = z.object({
  first: z.number(),
  second: z.number(),
  third: z.number(),
  fourthPlus: z.number(),
});

const MarketStatSchema = z.object({
  wins: z.number(),
  total: z.number(),
  winRate: z.number(),
});

const TradeSnapshotSchema = z.object({
  market: z.string(),
  type: z.enum(['BUY', 'SELL']),
  size: z.number(),
  pnl: z.number().nullable(),
});

export const AnalyzeTradingBehaviorInputSchema = z.object({
  walletAddress: z.string(),
  totalTrades: z.number(),
  winRate: z.number(),
  avgWinSize: z.number(),
  avgLossSize: z.number(),
  sizeRatio: z.number(),
  marketOrderCount: z.number(),
  limitOrderCount: z.number(),
  marketOrderWinRate: z.number(),
  limitOrderWinRate: z.number(),
  winRateByDayPosition: WinRateByDaySchema,
  winRateByMarket: z.record(z.string(), MarketStatSchema),
  derivativeWinRate: z.number(),
  spotWinRate: z.number(),
  topLosingTrades: z.array(TradeSnapshotSchema),
  topWinningTrades: z.array(TradeSnapshotSchema),
});

export type AnalyzeTradingBehaviorInput = z.infer<typeof AnalyzeTradingBehaviorInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const AnalyzeTradingBehaviorOutputSchema = z.object({
  tradingDna: z.string().describe('2-3 sentences on trader type and dominant pattern.'),
  blindSpots: z.string().describe('Three numbered blind spots with specific metrics.'),
  hiddenEdges: z.string().describe('What the trader is genuinely doing well.'),
  weeklyFocus: z.string().describe('One specific, concrete, actionable change.'),
});

export type AnalyzeTradingBehaviorOutput = z.infer<typeof AnalyzeTradingBehaviorOutputSchema>;

// ─── Prompt builder — plain string, no Handlebars ────────────────────────────

function buildPromptString(input: AnalyzeTradingBehaviorInput): string {
  const marketBreakdown = Object.entries(input.winRateByMarket)
    .map(([market, data]) => `  ${market}: ${data.winRate}% win rate (${data.total} trades)`)
    .join('\n');

  const topLosers = input.topLosingTrades
    .map((t) => `  ${t.market} ${t.type} $${t.size} → P&L: $${t.pnl?.toFixed(2) ?? 'N/A'}`)
    .join('\n');

  const topWinners = input.topWinningTrades
    .map((t) => `  ${t.market} ${t.type} $${t.size} → P&L: $${t.pnl?.toFixed(2) ?? 'N/A'}`)
    .join('\n');

  return `You are a professional trading psychologist and on-chain DeFi analyst specializing in BOT Chain (B DEX, AI & DePIN ecosystem Layer 1).
You have been given pre-computed behavioral statistics for a real trader's on-chain history on BOT Chain (0.75s block execution, $0.06 fees).
Your job is to find the SPECIFIC, SURPRISING patterns this trader cannot see themselves.
Write like a direct mentor. Never use generic advice. Every insight MUST reference a specific number from the data.
Do not invent numbers. Only use what is provided below.

WALLET: ${input.walletAddress}
TOTAL TRADES: ${input.totalTrades}
OVERALL WIN RATE: ${input.winRate}%

TRADE SIZING:
- Average winning trade size: $${input.avgWinSize} USDT
- Average losing trade size: $${input.avgLossSize} USDT
- Loss/Win size ratio: ${input.sizeRatio}x

ORDER TYPE PERFORMANCE:
- MARKET orders: ${input.marketOrderCount} trades at ${input.marketOrderWinRate}% win rate
- LIMIT orders: ${input.limitOrderCount} trades at ${input.limitOrderWinRate}% win rate
- Gap: ${Math.abs(input.limitOrderWinRate - input.marketOrderWinRate).toFixed(1)} percentage points

DAILY FATIGUE PATTERN:
- 1st trade of day: ${input.winRateByDayPosition.first}% win rate
- 2nd trade of day: ${input.winRateByDayPosition.second}% win rate
- 3rd trade of day: ${input.winRateByDayPosition.third}% win rate
- 4th+ trade of day: ${input.winRateByDayPosition.fourthPlus}% win rate

PERFORMANCE BY MARKET:
${marketBreakdown}

DERIVATIVES vs SPOT:
- Derivatives win rate: ${input.derivativeWinRate}%
- Spot win rate: ${input.spotWinRate}%

TOP 5 WORST TRADES:
${topLosers}

TOP 5 BEST TRADES:
${topWinners}

Return a JSON object with EXACTLY these four fields. No other fields. No preamble.

"tradingDna": 2-3 sentences. What type of trader is this based on the data? Name the dominant pattern explicitly.

"blindSpots": Three numbered blind spots. Each MUST cite a specific number from above. 3-5 sentences each. Make the trader feel you are reading their mind.

"hiddenEdges": What is this trader genuinely doing well? At least 2 real edges from the data. If derivatives win rate is strong, name it explicitly.

"weeklyFocus": One specific rule they can follow starting today. Reference their exact numbers to justify it. Not generic advice.`;
}

// ─── Exported function ────────────────────────────────────────────────────────

export async function analyzeTradingBehavior(
  input: AnalyzeTradingBehaviorInput
): Promise<AnalyzeTradingBehaviorOutput> {
  return analyzeTradingBehaviorFlow(input);
}

// ─── Flow — uses generateText directly, bypassing Handlebars ─────────────────

const analyzeTradingBehaviorFlow = ai.defineFlow(
  {
    name: 'analyzeTradingBehaviorFlow',
    inputSchema: AnalyzeTradingBehaviorInputSchema,
    outputSchema: AnalyzeTradingBehaviorOutputSchema,
  },
  async (input) => {
    const promptString = buildPromptString(input);

    const { output } = await ai.generate({
      prompt: promptString,
      output: { schema: AnalyzeTradingBehaviorOutputSchema },
      config: {
        temperature: 0.7,
        maxOutputTokens: 1200,
      },
    });

    if (!output) {
      throw new Error('AI analysis returned no output.');
    }

    return output;
  }
);