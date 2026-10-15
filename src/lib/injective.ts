/**
 * src/lib/injective.ts
 *
 * Migration Compatibility Shim:
 * Proxies calls to BOT Chain EVM architecture in src/lib/botchain.ts.
 */

import {
  BOTCHAIN_MARKETS,
  MarketMeta,
  resolveMarketTicker as resolveBotChainMarketTicker,
  fetchBotChainTrades,
} from './botchain';

export interface RawSpotTrade {
  tradeId: string;
  orderHash: string;
  marketId: string;
  subaccountId: string;
  tradeExecutionType: string;
  tradeDirection: string;
  price: { price: string; quantity: string; timestamp: number };
  fee: string;
  feeRecipient: string;
  executedAt: number;
}

export interface RawDerivativeTrade {
  tradeId: string;
  orderHash: string;
  marketId: string;
  subaccountId: string;
  tradeExecutionType: string;
  tradeDirection: string;
  executionPrice: string;
  executionQuantity: string;
  executionMargin: string;
  fee: string;
  executedAt: number;
  pnl: string;
}

export type { MarketMeta };

export function resolveMarketTicker(marketId: string, allMarkets: MarketMeta[]): MarketMeta | undefined {
  return resolveBotChainMarketTicker(marketId);
}

export async function getAllMarkets(): Promise<MarketMeta[]> {
  return BOTCHAIN_MARKETS;
}

export function toInjectiveAddress(evmAddress: string): string {
  // On BOT Chain, standard EVM addresses (0x...) are native!
  return evmAddress.toLowerCase();
}

export function getSubaccountId(address: string): string {
  return address.toLowerCase();
}

export async function fetchSpotTrades(address: string): Promise<RawSpotTrade[]> {
  const trades = await fetchBotChainTrades(address);
  return trades
    .filter((t) => !t.market.includes('PERP'))
    .map((t) => ({
      tradeId: t.id,
      orderHash: t.txHash,
      marketId: t.market,
      subaccountId: address,
      tradeExecutionType: t.orderType.toLowerCase(),
      tradeDirection: t.type.toLowerCase(),
      price: { price: String(t.price), quantity: String(t.size / t.price), timestamp: Date.parse(t.timestamp) },
      fee: '0.06',
      feeRecipient: '0x0000000000000000000000000000000000000000',
      executedAt: Date.parse(t.timestamp),
    }));
}

export async function fetchDerivativeTrades(address: string): Promise<RawDerivativeTrade[]> {
  const trades = await fetchBotChainTrades(address);
  return trades
    .filter((t) => t.market.includes('PERP'))
    .map((t) => ({
      tradeId: t.id,
      orderHash: t.txHash,
      marketId: t.market,
      subaccountId: address,
      tradeExecutionType: t.orderType.toLowerCase(),
      tradeDirection: t.type.toLowerCase(),
      executionPrice: String(t.price),
      executionQuantity: String(t.size / t.price),
      executionMargin: String(t.size * 0.1),
      fee: '0.06',
      executedAt: Date.parse(t.timestamp),
      pnl: String(t.pnl ?? 0),
    }));
}