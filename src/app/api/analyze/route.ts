/**
 * src/app/api/analyze/route.ts
 *
 * POST /api/analyze
 * Accepts: { trades: Trade[], walletAddress: string }
 * Returns: Server-Sent Events stream of the formatted analysis text
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { Trade } from '@/lib/mock-data';
import { computeBehavioralStats } from '@/lib/normalize';
import { analyzeTradingBehavior } from '@/ai/flows/analyze-trading-behavior-flow';

function formatAnalysisAsMarkdown(output: {
  tradingDna: string;
  blindSpots: string;
  hiddenEdges: string;
  weeklyFocus: string;
}): string {
  return `## YOUR TRADING DNA\n${output.tradingDna}\n\n## YOUR 3 BIGGEST BLIND SPOTS\n${output.blindSpots}\n\n## YOUR HIDDEN EDGES\n${output.hiddenEdges}\n\n## THIS WEEK'S FOCUS\n${output.weeklyFocus}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trades, walletAddress } = body as { trades: Trade[]; walletAddress: string };

    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No trades provided', code: 'NO_TRADES' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address', code: 'NO_ADDRESS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stats = computeBehavioralStats(trades);

    const flowInput = {
      walletAddress,
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      avgWinSize: stats.avgWinSize,
      avgLossSize: stats.avgLossSize,
      sizeRatio: stats.sizeRatio,
      marketOrderCount: stats.marketOrderCount,
      limitOrderCount: stats.limitOrderCount,
      marketOrderWinRate: stats.marketOrderWinRate,
      limitOrderWinRate: stats.limitOrderWinRate,
      winRateByDayPosition: stats.winRateByDayPosition,
      winRateByMarket: stats.winRateByMarket,
      derivativeWinRate: stats.derivativeWinRate,
      spotWinRate: stats.spotWinRate,
      topLosingTrades: stats.topLosingTrades.map((t) => ({
        market: t.market,
        type: t.type,
        size: t.size,
        pnl: t.pnl,
      })),
      topWinningTrades: stats.topWinningTrades.map((t) => ({
        market: t.market,
        type: t.type,
        size: t.size,
        pnl: t.pnl,
      })),
    };

    const output = await analyzeTradingBehavior(flowInput);
    const markdownText = formatAnalysisAsMarkdown(output);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const words = markdownText.split(' ');
          const chunkSize = 3;
          for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
            const escaped = chunk.replace(/\n/g, '\\n');
            controller.enqueue(encoder.encode(`data: ${escaped}\n\n`));
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamErr: any) {
          controller.enqueue(
            encoder.encode(`data: [ERROR] ${streamErr.message ?? 'Analysis failed'}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err: any) {
    console.error('[analyze] Unhandled error:', err);
    if (err?.message?.includes('API_KEY') || err?.message?.includes('quota')) {
      return new Response(
        JSON.stringify({ error: 'AI service unavailable.', code: 'AI_ERROR' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}