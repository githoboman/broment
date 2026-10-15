"use client";

import Link from 'next/link';
import { useWallet } from '@/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { WalletModal } from './WalletModal';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function Navigation() {
  const { address, disconnect, setDemoMode, currentNetwork, networkType, setNetworkType } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleDisconnect = () => {
    disconnect();
    router.push('/');
  };

  const handleDemo = () => {
    setDemoMode(true);
    router.push('/dashboard');
  };

  const toggleNetwork = () => {
    setNetworkType(networkType === 'testnet' ? 'mainnet' : 'testnet');
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-headline font-bold flex items-center">
            Order<span className="text-primary">Flow</span>
            <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 tracking-wider">
              BOT Chain
            </span>
          </Link>
          <button 
            onClick={handleDemo}
            className="text-sm text-muted-foreground hover:text-white transition-colors hidden sm:block"
          >
            View Demo
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Network Switcher Pill */}
          <button
            onClick={toggleNetwork}
            title="Click to toggle between Bohr Testnet and BOT Mainnet"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-card border border-white/10 hover:border-primary/40 text-muted-foreground hover:text-white transition-all"
          >
            <div className={`w-2 h-2 rounded-full ${networkType === 'mainnet' ? 'bg-[#00D084]' : 'bg-[#FDC20B]'}`} />
            <span>{networkType === 'mainnet' ? 'BOT Mainnet (677)' : 'Bohr Testnet (968)'}</span>
          </button>

          {address ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-mono-data text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-md border border-white/5">
                <div className="w-2 h-2 rounded-full bg-status-buy shadow-[0_0_8px_rgba(0,208,132,0.8)]" />
                {address === 'demo' ? 'DEMO WALLET' : `${address.slice(0, 6)}...${address.slice(-4)}`}
              </div>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-xs text-muted-foreground hover:text-white">
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
      <WalletModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </nav>
  );
}
