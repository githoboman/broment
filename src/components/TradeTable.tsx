"use client";

import { useState, useEffect } from 'react';
import { Trade } from '@/lib/mock-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useWallet } from '@/hooks/use-wallet';
import { getExplorerTxUrl } from '@/lib/botchain';

interface TradeTableProps {
  trades: Trade[];
}

export function TradeTable({ trades }: TradeTableProps) {
  const { currentNetwork } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalPages = Math.ceil(trades.length / itemsPerPage);

  const paginatedTrades = trades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ', '
      + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (!isMounted) {
    return (
      <div className="rounded-md border border-white/5 bg-[#13131A] h-[600px] flex items-center justify-center">
        <span className="text-muted-foreground animate-pulse">Loading trade history...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-white/5 bg-[#13131A] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Date</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Market</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Direction</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold text-right">Size (USDT)</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold text-right">Price</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Type</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold text-right">P&L</TableHead>
              <TableHead className="w-[90px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrades.map((trade) => (
              <TableRow key={trade.id} className="border-white/5 hover:bg-white/[0.02]">

                <TableCell className="font-mono-data text-xs py-3 text-muted-foreground">
                  {formatDate(trade.timestamp)}
                </TableCell>

                <TableCell className="font-bold py-3 text-sm">{trade.market}</TableCell>

                <TableCell className="py-3">
                  <Badge
                    className={
                      trade.type === 'BUY'
                        ? 'bg-[#00D084] text-black text-xs font-bold px-2 py-0.5'
                        : 'bg-[#FF4444] text-white text-xs font-bold px-2 py-0.5'
                    }
                  >
                    {trade.type}
                  </Badge>
                </TableCell>

                <TableCell className="font-mono-data text-sm text-right py-3">
                  {trade.size != null
                    ? '$' + trade.size.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}
                </TableCell>

                <TableCell className="font-mono-data text-sm text-right py-3 text-muted-foreground">
                  {trade.price != null
                    ? '$' + trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}
                </TableCell>

                <TableCell className="py-3">
                  <Badge
                    variant="outline"
                    className={
                      trade.orderType === 'MARKET'
                        ? 'border-[#FDC20B] text-[#FDC20B] text-xs px-2 py-0.5'
                        : 'border-[#4C8BE6] text-[#4C8BE6] text-xs px-2 py-0.5'
                    }
                  >
                    {trade.orderType}
                  </Badge>
                </TableCell>

                <TableCell
                  className={`font-mono-data text-sm text-right py-3 ${
                    trade.pnl !== null && trade.pnl > 0
                      ? 'text-[#00D084]'
                      : trade.pnl !== null && trade.pnl < 0
                      ? 'text-[#FF4444]'
                      : 'text-muted-foreground'
                  }`}
                >
                  {trade.pnl !== null
                    ? `${trade.pnl > 0 ? '+' : ''}$${Math.abs(trade.pnl).toFixed(2)}`
                    : '—'}
                </TableCell>

                <TableCell className="py-3 text-right">
                  {trade.txHash && trade.txHash.length === 66 ? (
                    <a
                      href={getExplorerTxUrl(trade.txHash, currentNetwork)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 ml-auto transition-colors duration-200"
                      title={`Verify on ${currentNetwork.name}`}
                    >
                      Verify <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-[#6366F1] ml-auto font-mono">demo</span>
                  )}
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages || 1} &nbsp;·&nbsp; {trades.length} total trades
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="border-white/10 hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="border-white/10 hover:bg-white/5"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}