/**
 * src/app/report/[id]/page.tsx
 *
 * Public shareable report page.
 * Route: /report/[id]
 * /report/demo → shows MOCK_ANALYSIS (always works, no DB needed)
 * /report/[uuid] → fetches from Supabase reports table
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Navigation } from '@/components/Navigation';
import { MOCK_ANALYSIS } from '@/lib/mock-data';

// ─── Supabase (server-side) ───────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportData {
  id: string;
  walletAddress: string;
  analysisText: string;
  tradeCount: number;
  markets: string[];
  createdAt: string;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getReport(id: string): Promise<ReportData | null> {
  // Demo report — always available, no DB needed
  if (id === 'demo') {
    return {
      id: 'demo',
      walletAddress: 'inj1a8cd...f9x2',
      analysisText: MOCK_ANALYSIS,
      tradeCount: 200,
      markets: ['INJ/USDT', 'BTC/USDT-PERP', 'ETH/USDT', 'ATOM/USDT', 'SOL/USDT', 'TIA/USDT'],
      createdAt: new Date().toISOString(),
    };
  }

  // Real report from Supabase
  try {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        analysis_text,
        trade_count,
        markets_traded,
        created_at,
        is_public,
        users (injective_address, wallet_address)
      `)
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (error || !data) return null;

    const address = (data.users as any)?.wallet_address ?? (data.users as any)?.injective_address ?? '0x...';
    const truncated = address.length > 12
      ? `${address.slice(0, 8)}...${address.slice(-4)}`
      : address;

    return {
      id: data.id,
      walletAddress: truncated,
      analysisText: data.analysis_text,
      tradeCount: data.trade_count ?? 0,
      markets: data.markets_traded ?? [],
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[report page] Failed to fetch report:', err);
    return null;
  }
}

// ─── Metadata (Open Graph for Twitter card) ───────────────────────────────────

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const report = await getReport(params.id);
  const tradeCount = report?.tradeCount ?? 0;

  return {
    title: 'My OrderFlow Trading Analysis | BOT Chain',
    description: `I analyzed ${tradeCount} on-chain trades and found out exactly why I was losing. See my behavioral report on BOT Chain.`,
    openGraph: {
      title: 'My OrderFlow Trading Analysis | BOT Chain',
      description: `I analyzed ${tradeCount} on-chain trades and found out exactly why I was losing. See my behavioral report on BOT Chain.`,
      type: 'website',
      siteName: 'OrderFlow',
    },
    twitter: {
      card: 'summary',
      title: 'My OrderFlow Trading Analysis | BOT Chain',
      description: `${tradeCount} trades analyzed. Behavioral patterns exposed. #BOTChain #DePIN #AI`,
    },
  };
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderAnalysis(text: string) {
  const sections = text.split(/(## [^\n]+)/g);
  return sections.map((part, i) => {
    if (part.startsWith('## ')) {
      return (
        <h2
          key={i}
          className="text-[#00D4FF] text-xs font-semibold uppercase tracking-widest mt-8 mb-3"
        >
          {part.replace('## ', '')}
        </h2>
      );
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm text-white/80 leading-relaxed mb-3">
        {boldParts.map((bp, j) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return (
              <strong key={j} className="text-white font-semibold">
                {bp.slice(2, -2)}
              </strong>
            );
          }
          return <span key={j}>{bp}</span>;
        })}
      </p>
    );
  });
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function ReportPage({ params }: { params: { id: string } }) {
  const report = await getReport(params.id);

  if (!report) notFound();

  const formattedDate = new Date(report.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0F]">
      <Navigation />

      <main className="flex-1 container mx-auto px-6 py-12 max-w-3xl">

        {/* Report header card */}
        <div
          className="bg-[#13131A] border border-[#00D4FF]/20 rounded-2xl p-8 mb-8"
          style={{ boxShadow: '0 2px 20px rgba(0,212,255,0.06)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs text-[#8B8B9E] uppercase tracking-widest mb-1">
                Wallet
              </p>
              <p className="font-mono text-white text-sm">{report.walletAddress}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-[#8B8B9E] uppercase tracking-widest mb-1">
                Analyzed
              </p>
              <p className="text-white text-sm">{formattedDate}</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Trades Analyzed', value: report.tradeCount.toString() },
              { label: 'Markets', value: report.markets.length.toString() },
              { label: 'Chain', value: 'BOT Chain' },
              { label: 'Powered By', value: 'Gemini AI' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#0A0A0F] rounded-xl p-4 border border-[#00D4FF]/10"
              >
                <p className="text-[10px] text-[#8B8B9E] uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <p className="font-mono text-white text-sm font-semibold">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Markets traded */}
          {report.markets.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.markets.map((market) => (
                <span
                  key={market}
                  className="text-xs px-2 py-1 rounded-md bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20"
                >
                  {market}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Analysis content */}
        <div
          className="bg-[#13131A] border border-white/5 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
            <span className="w-2 h-2 rounded-full bg-[#00D084]" />
            <h1 className="text-white font-semibold text-base">
              AI Behavioral Analysis
            </h1>
          </div>
          <div>{renderAnalysis(report.analysisText)}</div>
        </div>

        {/* CTA */}
        <div
          className="bg-[#13131A] border border-[#00D4FF]/20 rounded-2xl p-8 text-center"
          style={{ boxShadow: '0 2px 20px rgba(0,212,255,0.06)' }}
        >
          <h2 className="text-xl font-bold text-white mb-2">
            Analyze Your Own Trades
          </h2>
          <p className="text-[#8B8B9E] text-sm mb-6 max-w-md mx-auto">
            Connect your BOT Chain EVM wallet to get your own personalized behavioral report.
            Free. No signup required.
          </p>
          <a
            href="/"
            className="inline-block bg-[#00D4FF] text-black font-bold px-8 py-3 rounded-lg hover:bg-[#00D4FF]/90 transition-colors"
          >
            Get My Analysis →
          </a>
        </div>

      </main>
    </div>
  );
}