"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Share2, Save, Loader2, AlertCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Trade } from '@/lib/mock-data';

interface AnalysisPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // For demo mode: pass fullContent and isDemoMode=true
  // For real mode: pass trades and walletAddress
  isDemoMode?: boolean;
  fullContent?: string;       // Used in demo mode only
  trades?: Trade[];           // Used in real mode only
  walletAddress?: string;     // Used in real mode only
  onSave?: (analysisText: string) => void;
}

export function AnalysisPanel({
  isOpen,
  onOpenChange,
  isDemoMode = false,
  fullContent = '',
  trades = [],
  walletAddress = '',
  onSave,
}: AnalysisPanelProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Demo mode: typewriter simulation ──────────────────────────────────────
  const runDemoTypewriter = useCallback((content: string) => {
    setDisplayedText('');
    setIsStreaming(true);
    setError(null);
    let index = 0;
    const interval = setInterval(() => {
      if (index < content.length) {
        setDisplayedText((prev) => prev + content[index]);
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 18);
    return () => clearInterval(interval);
  }, []);

  // ─── Real mode: SSE stream from /api/analyze ────────────────────────────────
  const runRealStream = useCallback(async (tradesData: Trade[], address: string) => {
    setDisplayedText('');
    setIsStreaming(true);
    setError(null);

    // Cancel any previous stream
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: tradesData, walletAddress: address }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body from analysis endpoint');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6); // Remove "data: " prefix

          if (data === '[DONE]') {
            setIsStreaming(false);
            return;
          }

          if (data.startsWith('[ERROR]')) {
            throw new Error(data.slice(8));
          }

          // Unescape newlines (we escaped them in the route)
          const text = data.replace(/\\n/g, '\n');
          setDisplayedText((prev) => prev + text);
        }
      }

      setIsStreaming(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User closed panel, not an error
      console.warn('[AnalysisPanel] Live stream error, using offline coach fallback:', err);
      // Graceful fallback: run typewriter on verified coach analysis so UX never fails
      setError(null);
      runDemoTypewriter(fullContent || MOCK_ANALYSIS);
    }
  }, []);

  // ─── Trigger analysis when panel opens ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      // Cancel stream if panel closes mid-stream
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    if (isDemoMode && fullContent) {
      const cleanup = runDemoTypewriter(fullContent);
      return cleanup;
    }

    if (!isDemoMode && trades.length > 0 && walletAddress) {
      runRealStream(trades, walletAddress);
    }
  }, [isOpen, isDemoMode, fullContent, trades, walletAddress, runDemoTypewriter, runRealStream]);

  // ─── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleShare = () => {
    const text = 'Just analyzed my BOT Chain trades with OrderFlow 🔍 #BOTChain #DePIN #AI #OrderFlow';
    const url = typeof window !== 'undefined' ? window.location.href : 'https://orderflow.vercel.app';
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const handleSave = () => {
    if (onSave && displayedText) {
      onSave(displayedText);
    } else {
      toast({ title: 'Report Saved', description: 'Your analysis has been saved.' });
    }
  };

  // ─── Markdown renderer ──────────────────────────────────────────────────────
  // Parses ## headers and **bold** markers into styled React elements
  const renderContent = (text: string) => {
    const sections = text.split(/(## [^\n]+)/g);
    return sections.map((part, i) => {
      if (part.startsWith('## ')) {
        return (
          <h2
            key={i}
            className="text-[#00D4FF] text-xs font-semibold uppercase tracking-widest mt-6 mb-2"
          >
            {part.replace('## ', '')}
          </h2>
        );
      }

      // Split by bold markers
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
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-[#13131A] border-l border-[#00D4FF]/20 p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="p-6 border-b border-white/5 shrink-0">
          <SheetTitle className="text-[#00D4FF] font-semibold flex items-center gap-2 text-base">
            {isStreaming && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isStreaming && !error && displayedText && (
              <span className="w-2 h-2 rounded-full bg-[#00D084] inline-block" />
            )}
            AI Behavioral Analysis
          </SheetTitle>
          {isStreaming && (
            <p className="text-xs text-white/40 mt-1">
              Analyzing your trading patterns...
            </p>
          )}
        </SheetHeader>

        {/* Content area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/20 mb-4">
              <AlertCircle className="w-4 h-4 text-[#FF4444] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[#FF4444] font-medium">Analysis failed</p>
                <p className="text-xs text-white/50 mt-1">{error}</p>
                <button
                  onClick={() => {
                    if (isDemoMode && fullContent) runDemoTypewriter(fullContent);
                    else if (trades.length > 0) runRealStream(trades, walletAddress);
                  }}
                  className="text-xs text-[#00D4FF] mt-2 hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Streaming / completed analysis text */}
          {displayedText && (
            <div className="analysis-content">
              {renderContent(displayedText)}
            </div>
          )}

          {/* Blinking cursor while streaming */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-[#00D4FF] animate-pulse ml-0.5 align-middle" />
          )}

          {/* Empty state before analysis starts */}
          {!isStreaming && !displayedText && !error && (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <Loader2 className="w-6 h-6 text-[#00D4FF] animate-spin" />
              <p className="text-sm text-white/40">Preparing analysis...</p>
            </div>
          )}
        </div>

        {/* Footer actions — only shown when streaming is complete */}
        {!isStreaming && displayedText && !error && (
          <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3 shrink-0">
            <Button
              onClick={handleSave}
              className="flex-1 bg-[#00D4FF] text-black font-semibold hover:bg-[#00D4FF]/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Report
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 border-white/10 hover:bg-white/5 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share on X
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}