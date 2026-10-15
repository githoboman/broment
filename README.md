# OrderFlow — AI Behavioral Trading Journal for BOT Chain

> *Find out why you're losing on BOT Chain.*

**Live Demo:** https://orderflow-hq.vercel.app

OrderFlow connects to your BOT Chain wallet (MetaMask or BO Wallet), ingests your on-chain trading and swap history across B DEX and ecosystem pairs, and uses Google Gemini AI to analyze your behavioral patterns — revealing exactly why you're losing money and amplifying your hidden edges.

---

## The Problem

Every active trader on DEXs knows this feeling: you're executing swaps and trades, taking wins and losses, but you have no systematic clarity on *why*. The patterns are in your execution data. You just can't see them.

Standard explorers and dashboards only show static charts, balances, and P&L numbers. None of them reveal:
- That you're sizing up **2.7x** on emotional revenge trades after a loss.
- That your win rate decays from **71% to 44%** after your third trade of the day.
- That your limit orders outperform your market orders by **23 percentage points**.

OrderFlow reveals the behavioral truth in real time.

---

## Why BOT Chain?

OrderFlow leverages BOT Chain's Layer 1 architecture designed specifically for DePIN and AI applications:

**1. 100% EVM Compatibility**
Developers and traders use standard Ethereum tooling (MetaMask, BO Wallet, Remix, Hardhat, ethers.js/viem) with zero Cosmos/gRPC friction.

**2. Sub-Second Confirmations (~0.75s Blocks)**
With near-instant transaction finality, trading data is indexed and evaluated almost immediately, allowing real-time behavioral coaching as market volatility unfolds.

**3. Ultra-Low Transaction Fees (~$0.06 Average)**
Economical on-chain fees allow active traders and AI agents to execute frequent portfolio adjustments without eating away edge.

---

## Network Configurations

### Bohr Testnet (Development & Testing)
- **Network Name:** BOT Chain (Bohr Testnet)
- **Chain ID:** `968` (`0x3c8`)
- **Currency Symbol:** `BOT` (18 Decimals)
- **RPC URL:** `https://rpc.bohr.life`
- **Block Explorer:** [BOTScan Testnet](https://scan.bohr.life/)
- **Testnet Faucet:** [BOT Chain Faucet](https://faucet.botchain.ai/basic)
- **Official Wallet:** [BO Wallet](https://wallet.bohr.life/)

### BOT Chain Mainnet (Production)
- **Network Name:** BOT Chain Mainnet
- **Chain ID:** `677` (`0x2a5`)
- **Currency Symbol:** `BOT` (150M Total Supply)
- **RPC URL:** `https://rpc.botchain.ai`
- **Block Explorer:** [BOTScan Mainnet](https://scan.botchain.ai)
- **Official DEX:** [B DEX](https://dex.botchain.ai/#/swap)
- **Official Bridge:** [BOT Bridge](https://bridge.botchain.ai/)

---

## Key Features

- **EVM Wallet Integration** — Connect with MetaMask or official BO Wallet with automated network switching to Bohr Testnet (968) or Mainnet (677).
- **On-Chain Swap & Trade Ingestion** — Indexes B DEX swap logs and EVM execution events.
- **Behavioral Pre-Analysis** — Computes 12 quantitative behavioral metrics (revenge scaling, daily fatigue curve, limit vs market alpha, sizing discipline).
- **Gemini AI Trading Coach** — Generates a 4-section structured psychological analysis with verified on-chain metrics.
- **Typewriter Real-Time Streaming** — Streams coach findings word-by-word via Server-Sent Events (SSE).
- **Shareable Public Reports** — Save and share analysis reports with Open Graph Twitter/X preview cards.
- **Interactive Demo Mode** — Full simulation mode with 200 realistic BOT Chain trades without requiring a wallet.
- **On-Chain Verification** — Direct clickable verification links to BOTScan.

---

## How It Works

```
User connects EVM wallet (MetaMask / BO Wallet)
           ↓
Auto-switch to Bohr Testnet (968) or BOT Mainnet (677)
           ↓
/api/fetch-trades queries BOT Chain RPC & B DEX Swap logs
           ↓
normalize.ts converts EVM receipts → unified Trade shape
           ↓
computeBehavioralStats() calculates 12 behavioral metrics
           ↓
Gemini AI receives structured statistics (no raw unscaled JSON)
           ↓
4-section analysis streams to UI via SSE typewriter effect
           ↓
User saves report → shareable public report on BOT Chain
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI, Lucide Icons |
| **Blockchain** | BOT Chain EVM Layer 1 (Bohr Testnet 968 / Mainnet 677) |
| **RPC & Indexer** | BOT Chain JSON-RPC (`rpc.bohr.life` / `rpc.botchain.ai`) |
| **AI Engine** | Google Gemini 1.5 Flash via Genkit (`@genkit-ai/google-genai`) |
| **Database** | Supabase (PostgreSQL) for shareable reports |
| **Styling** | Cyberpunk Dark Terminal Aesthetic (#0A0A0F, #00D4FF cyan glow) |

---

## Quick Start

1. **Clone repository:**
   ```bash
   git clone <repo-url>
   cd broment
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the keys from `secrets.txt` into `.env.local`:
   ```bash
   NEXT_PUBLIC_BOTCHAIN_NETWORK=testnet
   GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:9002](http://localhost:9002) in your browser.

---

## License

MIT © 2026 OrderFlow · Built for BOT Chain.