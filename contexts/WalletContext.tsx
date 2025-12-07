'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useFarcaster } from '@/hooks/useFarcaster';
import { encodeFunctionData } from 'viem';

interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isReady: boolean;
  address: string | null;
  
  // Environment
  isInMiniApp: boolean;
  
  // Farcaster user info (if in mini app)
  farcasterUser: {
    fid: number;
    username: string;
    displayName?: string;
    pfpUrl?: string;
  } | null;
  
  // Transaction handling
  sendContractTransaction: (params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
    value?: bigint;
  }) => Promise<string | null>;
  
  // Transaction state
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  txHash: string | null;
  
  // Reset transaction state
  resetTxState: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  // Wagmi hooks (for web browser)
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { writeContractAsync, data: wagmiHash, reset: resetWagmi } = useWriteContract();
  const { isLoading: wagmiConfirming, isSuccess: wagmiConfirmed } = useWaitForTransactionReceipt({ 
    hash: wagmiHash 
  });
  
  // Farcaster SDK (for mini app)
  const { 
    isInMiniApp, 
    isReady: farcasterReady, 
    user: farcasterUser, 
    walletAddress: farcasterAddress,
    sendTransaction: farcasterSendTx 
  } = useFarcaster();
  
  // Unified state
  const [isPending, setIsPending] = useState(false);
  const [fcTxHash, setFcTxHash] = useState<string | null>(null);
  const [fcConfirmed, setFcConfirmed] = useState(false);
  
  // Determine which connection to use
  const isConnected = isInMiniApp ? !!farcasterAddress : wagmiConnected;
  const address = isInMiniApp ? farcasterAddress : wagmiAddress;
  const isReady = isInMiniApp ? farcasterReady : true;
  
  // Unified transaction sender
  const sendContractTransaction = useCallback(async (params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
    value?: bigint;
  }): Promise<string | null> => {
    setIsPending(true);
    setFcConfirmed(false);
    
    try {
      if (isInMiniApp && farcasterSendTx) {
        // Use Farcaster SDK
        const data = encodeFunctionData({
          abi: params.abi,
          functionName: params.functionName,
          args: params.args || [],
        });
        
        const txHash = await farcasterSendTx({
          to: params.address,
          data,
          value: params.value ? `0x${params.value.toString(16)}` : '0x0',
        });
        
        setFcTxHash(txHash);
        
        // Simple confirmation - wait a bit then assume confirmed
        // In production, you'd poll for receipt
        if (txHash) {
          setTimeout(() => setFcConfirmed(true), 3000);
        }
        
        return txHash;
      } else {
        // Use wagmi
        const hash = await writeContractAsync({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
          value: params.value,
        });
        
        return hash;
      }
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [isInMiniApp, farcasterSendTx, writeContractAsync]);
  
  const resetTxState = useCallback(() => {
    setFcTxHash(null);
    setFcConfirmed(false);
    resetWagmi?.();
  }, [resetWagmi]);
  
  // Determine transaction state
  const txHash = isInMiniApp ? fcTxHash : wagmiHash;
  const isConfirming = isInMiniApp ? (!!fcTxHash && !fcConfirmed) : wagmiConfirming;
  const isConfirmed = isInMiniApp ? fcConfirmed : wagmiConfirmed;
  
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
      isConfirming,
      isConfirmed,
      txHash: txHash || null,
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
