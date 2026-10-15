"use client";

// src/components/WalletModal.tsx
// Real BOT Chain EVM Wallet Connection Modal (MetaMask & BO Wallet)

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, Coins } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletModal({ isOpen, onOpenChange }: WalletModalProps) {
  const { connectMetaMask, connectBoWallet, currentNetwork } = useWallet();
  const { toast } = useToast();
  const router = useRouter();
  const [connecting, setConnecting] = useState<'metamask' | 'bo_wallet' | null>(null);

  const handleMetaMask = async () => {
    setConnecting('metamask');
    try {
      await connectMetaMask();
      onOpenChange(false);
      toast({
        title: "MetaMask connected",
        description: `Connected to ${currentNetwork.name}. Loading trades...`,
      });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err.message ?? "Could not connect MetaMask.",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleBoWallet = async () => {
    setConnecting('bo_wallet');
    try {
      await connectBoWallet();
      onOpenChange(false);
      toast({
        title: "BO Wallet connected",
        description: `Connected to ${currentNetwork.name}. Loading trades...`,
      });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err.message ?? "Could not connect BO Wallet.",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const isConnecting = connecting !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#13131A] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-white font-headline">
            Connect to BOT Chain
          </DialogTitle>
          <p className="text-center text-sm text-[#8B8B9E] mt-1">
            Connect your EVM wallet to analyze your on-chain trading behavior on {currentNetwork.name}
          </p>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {/* MetaMask */}
          <button
            onClick={handleMetaMask}
            disabled={isConnecting}
            className="h-16 flex items-center gap-4 px-6 rounded-xl border border-white/10 hover:border-[#00D4FF]/40 hover:bg-[#00D4FF]/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left w-full group"
          >
            {connecting === 'metamask' ? (
              <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-tr from-amber-600 to-orange-400 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.4)]">
                M
              </div>
            )}
            <div>
              <div className="font-semibold text-white text-sm group-hover:text-[#00D4FF] transition-colors">
                MetaMask
              </div>
              <div className="text-xs text-[#8B8B9E]">
                {connecting === 'metamask' ? 'Connecting...' : 'Connect with MetaMask (EVM)'}
              </div>
            </div>
          </button>

          {/* BO Wallet (Bohr / BOT Chain Official Wallet) */}
          <button
            onClick={handleBoWallet}
            disabled={isConnecting}
            className="h-16 flex items-center gap-4 px-6 rounded-xl border border-white/10 hover:border-[#00D4FF]/40 hover:bg-[#00D4FF]/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left w-full group"
          >
            {connecting === 'bo_wallet' ? (
              <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_0_12px_rgba(0,212,255,0.4)]">
                BO
              </div>
            )}
            <div>
              <div className="font-semibold text-white text-sm group-hover:text-[#00D4FF] transition-colors">
                BO Wallet
              </div>
              <div className="text-xs text-[#8B8B9E]">
                {connecting === 'bo_wallet' ? 'Connecting...' : 'Official BOT Chain / Bohr Wallet'}
              </div>
            </div>
          </button>
        </div>

        {/* Faucet Link & Get Wallet */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/5 text-center text-xs text-[#8B8B9E]">
          <div className="flex items-center justify-center gap-1.5 text-amber-300/90 font-medium">
            <Coins className="w-3.5 h-3.5" />
            <span>Need test tokens? </span>
            <a
              href="https://faucet.botchain.ai/basic"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4FF] underline hover:text-[#00D4FF]/80 ml-1"
            >
              Get Free tBOT Faucet
            </a>
          </div>

          <p className="pt-1">
            Need a wallet?{' '}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4FF] hover:underline"
            >
              MetaMask
            </a>
            {' '}or{' '}
            <a
              href="https://wallet.bohr.life/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4FF] hover:underline"
            >
              BO Wallet
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}