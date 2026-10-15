/**
 * src/app/api/save-report/route.ts
 *
 * POST /api/save-report
 * Accepts: { walletAddress, analysisText, tradeCount, markets }
 * Returns: { reportId, url }
 */

export const runtime = 'nodejs';
export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, analysisText, tradeCount, markets } = body as {
      walletAddress: string;
      analysisText: string;
      tradeCount: number;
      markets: string[];
    };

    if (!walletAddress || !analysisText) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    if (!supabase) {
      // In-memory / local fallback ID if Supabase credentials are not set
      const fallbackId = `botchain-${Date.now().toString(36)}`;
      return NextResponse.json({
        reportId: fallbackId,
        url: `/report/${fallbackId}`,
      });
    }

    // Upsert user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          injective_address: walletAddress,
          wallet_address: walletAddress,
          last_active_at: new Date().toISOString(),
          trade_count: tradeCount,
        },
        { onConflict: 'injective_address' }
      )
      .select('id')
      .single();

    if (userError) {
      console.warn('[save-report] User upsert warning (non-fatal):', userError.message);
    }

    // Insert report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: user?.id ?? null,
        trade_count: tradeCount,
        analysis_text: analysisText,
        markets_traded: markets ?? [],
        is_public: true,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (reportError || !report) {
      console.error('[save-report] Report insert error:', reportError);
      return NextResponse.json(
        { error: 'Failed to save report to database', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reportId: report.id,
      url: `/report/${report.id}`,
    });

  } catch (err: any) {
    console.error('[save-report] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}