/**
 * src/lib/contracts/index.ts
 *
 * Multi-network smart contract registry and ABI exports for OrderFlow on BOT Chain.
 */

import OrderFlowRegistryArtifact from './OrderFlowRegistry.json';

export const ORDERFLOW_REGISTRY_ABI = OrderFlowRegistryArtifact.abi;

export const ORDERFLOW_REGISTRY_NETWORKS = {
  testnet: {
    chainId: 968,
    name: 'BOT Chain (Bohr Testnet)',
    address:
      process.env.NEXT_PUBLIC_ORDERFLOW_REGISTRY_ADDRESS ||
      '0xeeA153f4C7B6d11A54d2934Bda63FEC8edbCa552',
    explorer: 'https://scan.bohr.life',
  },
  mainnet: {
    chainId: 677,
    name: 'BOT Chain Mainnet',
    address:
      process.env.NEXT_PUBLIC_ORDERFLOW_REGISTRY_ADDRESS_MAINNET ||
      (OrderFlowRegistryArtifact as any).networks?.['677']?.address ||
      '0x28d3EE0C8242eE27907bc068B25f54da00A729Ad',
    explorer: 'https://scan.botchain.ai',
  },
};

export function getOrderFlowContractAddress(networkOrChainId: 'testnet' | 'mainnet' | number = 677): string {
  if (networkOrChainId === 677 || networkOrChainId === 'mainnet') {
    return ORDERFLOW_REGISTRY_NETWORKS.mainnet.address;
  }
  return ORDERFLOW_REGISTRY_NETWORKS.testnet.address;
}

export default OrderFlowRegistryArtifact;

