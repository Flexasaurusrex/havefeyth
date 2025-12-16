'use client';

import { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';

interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  custodyAddress: string;
  verifiedAddresses: string[];
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed';

export function useFarcaster() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [retryCount, setRetryCount] = useState(0);

  const connectWallet = useCallback(async (): Promise<string | null> => {
    try {
      const provider = sdk.wallet.ethProvider;
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      return accounts?.[0] || null;
    } catch (error) {
      console.error('Wallet connection error:', error);
      return null;
    }
  }, []);

  const initFarcaster = useCallback(async () => {
    if (typeof window === 'undefined') {
      setIsReady(true);
      return;
    }

    setConnectionState('connecting');

    try {
      // Add timeout to sdk.context - this is where it hangs!
      const contextPromise = sdk.context;
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('SDK context timeout')), 8000)
      );

      let context;
      try {
        context = await Promise.race([contextPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn('SDK context timed out, retrying...');
        setConnectionState('failed');
        setIsReady(true);
        return;
      }

      if (context?.user) {
        setIsInMiniApp(true);
        
        const u = context.user as any;
        
        setUser({
          fid: u.fid,
          username: u.username || '',
          displayName: u.displayName,
          pfpUrl: u.pfpUrl,
          custodyAddress: u.custodyAddress || u.custody_address || '',
          verifiedAddresses: u.verifiedAddresses?.ethAddresses || u.verified_addresses?.eth_addresses || [],
        });

        // Actually connect to Warplet wallet with timeout
        const walletPromise = connectWallet();
        const walletTimeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), 6000)
        );

        const address = await Promise.race([walletPromise, walletTimeoutPromise]);
        
        if (address) {
          setWalletAddress(address);
          setConnectionState('connected');
        } else {
          // Fallback to verified address or custody address
          const fallbackAddress = u.verifiedAddresses?.ethAddresses?.[0] 
            || u.verified_addresses?.eth_addresses?.[0]
            || u.custodyAddress 
            || u.custody_address;
          
          if (fallbackAddress) {
            setWalletAddress(fallbackAddress);
            setConnectionState('connected');
          } else {
            setConnectionState('failed');
          }
        }

        // Signal ready to Farcaster
        try {
          await sdk.actions.ready();
        } catch (e) {
          console.warn('sdk.actions.ready() failed:', e);
        }
      } else {
        // Not in mini app
        setConnectionState('idle');
      }

      setIsReady(true);
    } catch (error) {
      console.log('Farcaster init error:', error);
      setConnectionState('failed');
      setIsReady(true);
    }
  }, [connectWallet]);

  // Initial connection
  useEffect(() => {
    initFarcaster();
  }, [initFarcaster]);

  // Retry mechanism
  const retry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setIsReady(false);
      setConnectionState('connecting');
      initFarcaster();
    } else {
      // After 3 retries, try a full reload
      window.location.reload();
    }
  }, [retryCount, initFarcaster]);

  const openUrl = useCallback(async (url: string) => {
    if (isInMiniApp) {
      try {
        await sdk.actions.openUrl(url);
      } catch (e) {
        // Fallback if sdk.actions.openUrl fails
        window.open(url, '_blank', 'width=600,height=400');
      }
    } else {
      window.open(url, '_blank', 'width=600,height=400');
    }
  }, [isInMiniApp]);

  return {
    isInMiniApp,
    isReady,
    user,
    walletAddress,
    connectionState,
    openUrl,
    retry,
  };
}
