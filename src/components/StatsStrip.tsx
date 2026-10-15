"use client";

import { useEffect, useState } from 'react';
import { Trade } from "@/lib/mock-data";

interface StatsStripProps {
  trades: Trade[];
}

export function StatsStrip({ trades }: StatsStripProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const netPnl = closedTrades.reduce((acc, curr) => acc + (curr.pnl || 0), 0);
  const winRate = closedTrades.length > 0 
    ? (closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100 
    : 0;
  const totalVolume = trades.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const avgTrade = closedTrades.length > 0 ? netPnl / closedTrades.length : 0;

  const stats = [
    { label: 'Net P&L', value: `$${netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: netPnl >= 0 ? 'text-status-buy' : 'text-status-sell' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: 'text-white' },
    { label: 'Total Volume', value: `$${(totalVolume / 1000).toFixed(1)}k`, color: 'text-white' },
    { label: 'Avg Trade', value: `$${avgTrade.toFixed(2)}`, color: avgTrade >= 0 ? 'text-status-buy' : 'text-status-sell' },
    { label: 'Trade Count', value: trades.length.toString(), color: 'text-white' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="insight-card p-4 rounded-lg flex flex-col justify-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</span>
          <span className={`text-xl font-mono-data font-semibold ${stat.color}`}>
            {isMounted ? stat.value : "--"}
          </span>
        </div>
      ))}
    </div>
  );
}