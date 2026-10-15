"use client";

import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { WalletModal } from "@/components/WalletModal";
import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, Target, TrendingUp } from "lucide-react";

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setDemoMode } = useWallet();
  const router = useRouter();

  const handleDemo = () => {
    setDemoMode(true);
    router.push('/dashboard');
  };

  const insightCards = [
    {
      title: "Behavioral Patterns",
      icon: <TrendingUp className="text-primary w-5 h-5" />,
      tag: "SAMPLE INSIGHT",
      content: "You frequently 'revenge trade' after losses exceeding 2%. This leads to an average drawdown 4x larger than planned."
    },
    {
      title: "Blind Spots",
      icon: <Target className="text-primary w-5 h-5" />,
      tag: "SAMPLE INSIGHT",
      content: "Holding winners too long on high-volatility pairs is costing you ~$840/month in unrealized gains."
    },
    {
      title: "Hidden Edges",
      icon: <Zap className="text-primary w-5 h-5" />,
      tag: "SAMPLE INSIGHT",
      content: "Your LIMIT orders on ETH pairs have a 74% win rate, significantly outperforming your MARKET entries."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-status-buy animate-pulse" />
            Native to BOT Chain EVM · 0.75s Ultra-Fast Analytics
          </div>
          <h1 className="text-5xl md:text-7xl font-headline font-bold mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-tight">
            Trade with the clarity of <br />
            <span className="text-primary">AI behavioral coaching</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            OrderFlow analyzes your BOT Chain trading history across B DEX and AI/DePIN markets to reveal hidden patterns, 
            fix costly blind spots, and amplify your unique trading edges.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 font-bold"
            >
              Connect Wallet <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleDemo}
              className="border-white/10 hover:bg-white/5 text-lg px-8 py-6"
            >
              View Demo
            </Button>
          </div>
        </section>

        {/* Insight Cards */}
        <section className="container mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {insightCards.map((card, i) => (
              <div key={i} className="insight-card p-8 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {card.icon}
                  </div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest bg-secondary/10 px-2 py-1 rounded">
                    {card.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-headline">{card.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {card.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} OrderFlow. Precision data for the sovereign trader.
        </p>
      </footer>

      <WalletModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
