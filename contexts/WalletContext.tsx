'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useFarcaster } from '@/hooks/useFarcaster';

interface WalletContextType {
  isConnected: boolean;
  isReady: boolean;
  address: string | null;
  isInMiniApp: boolean;
  farcasterUser: {
    fid: number;
    username: string;
    displayName?: string;
    pfpUrl?: string;
  } | null;
  sendContractTransaction: (params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
    value?: bigint;
  }) => Promise<string | null>;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  txHash: string | null;
  resetTxState: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { writeContractAsync, data: wagmiHash, reset: resetWagmi, isPending } = useWriteContract();
  const { isLoading: wagmiConfirming, isSuccess: wagmiConfirmed } = useWaitForTransactionReceipt({ 
    hash: wagmiHash 
  });
  
  const { 
    isInMiniApp, 
    isReady: farcasterReady, 
    user: farcasterUser, 
    walletAddress: farcasterAddress,
  } = useFarcaster();
  
  // Use farcaster address if in mini app and available, otherwise wagmi
  const isConnected = isInMiniApp ? (!!farcasterAddress || wagmiConnected) : wagmiConnected;
  const address = isInMiniApp ? (farcasterAddress || wagmiAddress) : wagmiAddress;
  const isReady = farcasterReady;
  
  const sendContractTransaction = useCallback(async (params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
    value?: bigint;
  }): Promise<string | null> => {
    // Always use wagmi for transactions
    const hash = await writeContractAsync({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args || [],
      value: params.value,
    });
    
    return hash;
  }, [writeContractAsync]);
  
  const resetTxState = useCallback(() => {
    resetWagmi?.();
  }, [resetWagmi]);
  
  return (
    <WalletContext.Provider value={{
      isConnected,
      isReady,
      address: address || null,
      isInMiniApp,
      farcasterUser: farcasterUser ? {
        fid: farcasterUser.fid,
        username: farcasterUser.username,
        displayName: farcasterUser.displayName,
        pfpUrl: farcasterUser.pfpUrl,
      } : null,
      sendContractTransaction,
      isPending,
      isConfirming: wagmiConfirming,
      isConfirmed: wagmiConfirmed,
      txHash: wagmiHash || null,
      resetTxState,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
