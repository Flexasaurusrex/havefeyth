'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useFarcaster } from '@/hooks/useFarcaster';
import { encodeFunctionData } from 'viem';
import sdk from '@farcaster/frame-sdk';

interface WalletContextType {
  isConnected: boolean;
  isReady: boolean;
  address: string | null;
  isInMiniApp: boolean;
  connectionState: 'idle' | 'connecting' | 'awaiting-confirmation' | 'connected' | 'failed';
  connectionMessage: string;
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
  openUrl: (url: string) => Promise<void>;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  clearNotification: () => void;
  retry: () => void;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  txHash: string | null;
  resetTxState: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { writeContractAsync, data: wagmiHash, reset: resetWagmi, isPending: wagmiPending } = useWriteContract();
  const { isLoading: wagmiConfirming, isSuccess: wagmiConfirmed } = useWaitForTransactionReceipt({ 
    hash: wagmiHash 
  });
  
  const { 
    isInMiniApp, 
    isReady: farcasterReady, 
    user: farcasterUser, 
    walletAddress: farcasterAddress,
    connectionState,
    connectionMessage,
    openUrl,
    retry,
  } = useFarcaster();
  
  const [fcTxHash, setFcTxHash] = useState<string | null>(null);
  const [fcPending, setFcPending] = useState(false);
  const [fcConfirming, setFcConfirming] = useState(false);
  const [fcConfirmed, setFcConfirmed] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const isConnected = isInMiniApp 
    ? (!!farcasterAddress && connectionState === 'connected') 
    : wagmiConnected;
  const address = isInMiniApp ? farcasterAddress : wagmiAddress;
  const isReady = farcasterReady;

  // Show notification instead of alert (alerts are blocked in mini app sandbox)
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    // Auto-clear after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);
  
  const sendContractTransaction = useCallback(async (params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
    value?: bigint;
  }): Promise<string | null> => {
    // If in mini app, use Farcaster SDK's ethProvider directly
    if (isInMiniApp && farcasterAddress) {
      try {
        setFcPending(true);
        setFcConfirmed(false);
        
        const provider = sdk.wallet.ethProvider;
        
        // Encode the function call
        const data = encodeFunctionData({
          abi: params.abi,
          functionName: params.functionName,
          args: params.args || [],
        });
        
        // Send transaction via Farcaster SDK
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: farcasterAddress as `0x${string}`,
            to: params.address,
            data: data,
            value: params.value ? `0x${params.value.toString(16)}` : undefined,
          }],
        }) as string;
        
        setFcTxHash(txHash);
        setFcPending(false);
        setFcConfirming(true);
        
        // Wait for confirmation (poll for receipt)
        let confirmed = false;
        let attempts = 0;
        while (!confirmed && attempts < 60) {
          try {
            const receipt = await provider.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash as `0x${string}`],
            });
            if (receipt) {
              confirmed = true;
              setFcConfirming(false);
              setFcConfirmed(true);
            }
          } catch (e) {
            // Receipt not ready yet
          }
          if (!confirmed) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
        }
        
        return txHash;
      } catch (error: any) {
        setFcPending(false);
        setFcConfirming(false);
        console.error('Farcaster transaction error:', error);
        throw error;
      }
    }
    
    // Otherwise use wagmi
    const hash = await writeContractAsync({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args || [],
      value: params.value,
    });
    
    return hash;
  }, [isInMiniApp, farcasterAddress, writeContractAsync]);
  
  const resetTxState = useCallback(() => {
    resetWagmi?.();
    setFcTxHash(null);
    setFcPending(false);
    setFcConfirming(false);
    setFcConfirmed(false);
  }, [resetWagmi]);
  
  // Combine wagmi and farcaster tx states
  const isPending = isInMiniApp ? fcPending : wagmiPending;
  const isConfirming = isInMiniApp ? fcConfirming : wagmiConfirming;
  const isConfirmed = isInMiniApp ? fcConfirmed : wagmiConfirmed;
  const txHash = isInMiniApp ? fcTxHash : (wagmiHash || null);
  
  return (
    <WalletContext.Provider value={{
      isConnected,
      isReady,
      address: address || null,
      isInMiniApp,
      connectionState,
      connectionMessage,
      farcasterUser: farcasterUser ? {
        fid: farcasterUser.fid,
        username: farcasterUser.username,
        displayName: farcasterUser.displayName,
        pfpUrl: farcasterUser.pfpUrl,
      } : null,
      sendContractTransaction,
      openUrl,
      showNotification,
      notification,
      clearNotification,
      retry,
      isPending,
      isConfirming,
      isConfirmed,
      txHash,
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
