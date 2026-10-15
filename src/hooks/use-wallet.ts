"use client";

// src/hooks/use-wallet.ts
// Native BOT Chain EVM Wallet Connection (MetaMask & BO Wallet)
// Supports Bohr Testnet (Chain ID 968) and BOT Mainnet (Chain ID 677)

import { useState, useEffect } from 'react';
import { BOTCHAIN_NETWORKS, BotChainNetwork } from '@/lib/botchain';

// ─── Global singleton state ───────────────────────────────────────────────────

let globalState: {
  address: string | null;
  chainId: number | null;
  networkType: 'testnet' | 'mainnet';
  isDemoMode: boolean;
  isConnecting: boolean;
  walletType: 'metamask' | 'bo_wallet' | 'demo' | null;
  listeners: Array<() => void>;
} = {
  address: null,
  chainId: null,
  networkType: (process.env.NEXT_PUBLIC_BOTCHAIN_NETWORK as any) === 'mainnet' ? 'mainnet' : 'testnet',
  isDemoMode: false,
  isConnecting: false,
  walletType: null,
  listeners: [],
};

const notify = () => globalState.listeners.forEach((l) => l());

// ─── Network Switching Helper ─────────────────────────────────────────────────

export async function switchBotChainNetwork(
  ethereum: any,
  targetType: 'testnet' | 'mainnet' = globalState.networkType
): Promise<void> {
  const targetConfig = BOTCHAIN_NETWORKS[targetType];

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetConfig.chainIdHex }],
    });
  } catch (switchError: any) {
    // 4902 means the chain has not been added to MetaMask/Wallet yet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: targetConfig.chainIdHex,
            chainName: targetConfig.name,
            nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
            rpcUrls: [targetConfig.rpcUrl],
            blockExplorerUrls: [targetConfig.explorerUrl],
          },
        ],
      });
    } else {
      console.warn('[useWallet] Network switch warning:', switchError.message);
    }
  }
}

// ─── EVM Wallet Connection (MetaMask / Generic Injected) ───────────────────────

async function connectEVM(preferredProvider?: any): Promise<{ address: string; chainId: number }> {
  if (typeof window === 'undefined') throw new Error('Not in browser environment');

  const ethereum = preferredProvider || (window as any).ethereum;
  if (!ethereum) {
    throw new Error('EVM Wallet is not installed. Please install MetaMask or BO Wallet.');
  }

  // Request accounts
  const accounts: string[] = await ethereum.request({
    method: 'eth_requestAccounts',
  });

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts selected. Please unlock your wallet and try again.');
  }

  // Ensure network is set to BOT Chain
  try {
    await switchBotChainNetwork(ethereum, globalState.networkType);
  } catch {
    // Non-fatal, continue with user's active network
  }

  // Read chainId
  const hexChainId = await ethereum.request({ method: 'eth_chainId' }).catch(() => '0x3c8');
  const chainId = parseInt(hexChainId, 16);

  return { address: accounts[0], chainId };
}

// ─── Hook Definition ──────────────────────────────────────────────────────────

export function useWallet() {
  const [state, setState] = useState({
    address: globalState.address,
    chainId: globalState.chainId,
    networkType: globalState.networkType,
    isDemoMode: globalState.isDemoMode,
    isConnecting: globalState.isConnecting,
    walletType: globalState.walletType,
  });

  useEffect(() => {
    const listener = () =>
      setState({
        address: globalState.address,
        chainId: globalState.chainId,
        networkType: globalState.networkType,
        isDemoMode: globalState.isDemoMode,
        isConnecting: globalState.isConnecting,
        walletType: globalState.walletType,
      });
    globalState.listeners.push(listener);

    // Listen for MetaMask account & chain changes
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handleAccountsChanged = (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          globalState.address = null;
        } else {
          globalState.address = accounts[0];
        }
        notify();
      };
      const handleChainChanged = (hexChain: string) => {
        globalState.chainId = parseInt(hexChain, 16);
        notify();
      };

      eth.on?.('accountsChanged', handleAccountsChanged);
      eth.on?.('chainChanged', handleChainChanged);

      return () => {
        globalState.listeners = globalState.listeners.filter((l) => l !== listener);
        eth.removeListener?.('accountsChanged', handleAccountsChanged);
        eth.removeListener?.('chainChanged', handleChainChanged);
      };
    }

    return () => {
      globalState.listeners = globalState.listeners.filter((l) => l !== listener);
    };
  }, []);

  const connectMetaMask = async (): Promise<void> => {
    globalState.isConnecting = true;
    notify();
    try {
      const { address, chainId } = await connectEVM();
      globalState.address = address;
      globalState.chainId = chainId;
      globalState.walletType = 'metamask';
      globalState.isDemoMode = false;
    } finally {
      globalState.isConnecting = false;
      notify();
    }
  };

  const connectBoWallet = async (): Promise<void> => {
    globalState.isConnecting = true;
    notify();
    try {
      // BO Wallet may inject as window.bohr, window.botchain, or default window.ethereum
      const boProvider = (window as any).bohr || (window as any).botchain || (window as any).ethereum;
      const { address, chainId } = await connectEVM(boProvider);
      globalState.address = address;
      globalState.chainId = chainId;
      globalState.walletType = 'bo_wallet';
      globalState.isDemoMode = false;
    } finally {
      globalState.isConnecting = false;
      notify();
    }
  };

  const disconnect = () => {
    globalState.address = null;
    globalState.chainId = null;
    globalState.isDemoMode = false;
    globalState.walletType = null;
    globalState.isConnecting = false;
    notify();
  };

  const setDemoMode = (val: boolean) => {
    globalState.isDemoMode = val;
    globalState.walletType = val ? 'demo' : null;
    globalState.address = val ? 'demo' : null;
    notify();
  };

  const setNetworkType = async (type: 'testnet' | 'mainnet') => {
    globalState.networkType = type;
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      await switchBotChainNetwork((window as any).ethereum, type).catch(() => {});
    }
    notify();
  };

  return {
    ...state,
    currentNetwork: BOTCHAIN_NETWORKS[state.networkType],
    connectMetaMask,
    connectBoWallet,
    connectKeplr: connectMetaMask, // Compatibility alias
    disconnect,
    setDemoMode,
    setNetworkType,
  };
}