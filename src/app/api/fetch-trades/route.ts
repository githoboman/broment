/**
 * src/app/api/fetch-trades/route.ts
 *
 * POST /api/fetch-trades
 *
 * Accepts: { address: string, isDemo?: boolean }
 *   address — standard EVM address (0x...) on BOT Chain
 *
 * Returns: { trades: Trade[], stats: TradeStats, cached: boolean, tradeCount: number }
 *   or:    { error: string, code: string }
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { fetchBotChainTrades, isBotChainAddress, CURRENT_NETWORK } from '@/lib/botchain';
import { computeStats } from '@/lib/normalize';
import { createClient } from '@supabase/supabase-js';

// ─── Optional Supabase client ─────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const CACHE_TTL_MINUTES = 5;
const DEMO_CACHE_TTL_MINUTES = 30;

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function getCachedTrades(address: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('trade_cache')
      .select('trade_data, fetched_at, trade_count')
      .or(`injective_address.eq.${address},wallet_address.eq.${address}`)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

async function setCachedTrades(address: string, trades: any[], isDemo: boolean) {
  if (!supabase) return;
  try {
    const ttlMinutes = isDemo ? DEMO_CACHE_TTL_MINUTES : CACHE_TTL_MINUTES;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    await supabase.from('trade_cache').upsert(
      {
        injective_address: address, // legacy column name
        wallet_address: address,
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        trade_data: trades,
        trade_count: trades.length,
      },
      { onConflict: 'injective_address' }
    );
  } catch (err) {
    console.error('[fetch-trades] Cache write error (non-fatal):', err);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, isDemo } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid address', code: 'INVALID_ADDRESS' },
        { status: 400 }
      );
    }

    const cleanAddress = address.trim();

    // Verify BOT Chain EVM format (0x...) or demo
    if (cleanAddress !== 'demo' && !isBotChainAddress(cleanAddress)) {
      return NextResponse.json(
        { error: 'Address must be a valid EVM address (0x...) for BOT Chain', code: 'INVALID_EVM_ADDRESS' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await getCachedTrades(cleanAddress);
    if (cached) {
      const stats = computeStats(cached.trade_data);
      return NextResponse.json({
        trades: cached.trade_data,
        stats,
        cached: true,
        tradeCount: cached.trade_count,
        network: CURRENT_NETWORK.name,
      });
    }

    // Fetch trades from BOT Chain RPC & DEX
    const trades = await fetchBotChainTrades(cleanAddress);
    const stats = computeStats(trades);

    // Write to cache non-blocking
    setCachedTrades(cleanAddress, trades, !!isDemo);

    // Upsert user record
    if (supabase) {
      try {
        await supabase.from('users').upsert(
          {
            injective_address: cleanAddress,
            wallet_address: cleanAddress,
            last_active_at: new Date().toISOString(),
            trade_count: trades.length,
          },
          { onConflict: 'injective_address' }
        );
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      trades,
      stats,
      cached: false,
      tradeCount: trades.length,
      network: CURRENT_NETWORK.name,
    });

  } catch (err: any) {
    console.error('[fetch-trades] Error processing trades on BOT Chain:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch BOT Chain trades', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}