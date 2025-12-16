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

type ConnectionState = 'idle' | 'connecting' | 'awaiting-confirmation' | 'connected' | 'failed';

export function useFarcaster() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  const connectWallet = useCallback(async (): Promise<string | null> => {
    try {
      const provider = sdk.wallet.ethProvider;
      
      // This call may require mobile confirmation for new wallets
      const accountsPromise = provider.request({ 
        method: 'eth_requestAccounts' 
      }) as Promise<string[]>;
      
      // After 4 seconds, show mobile confirmation hint (only if still waiting)
      const hintTimeout = setTimeout(() => {
        setConnectionState('awaiting-confirmation');
        setConnectionMessage('Check Warpcast mobile app to approve wallet access...');
      }, 4000);
      
      // 45 second timeout for wallet confirmation (user may need to switch to mobile app)
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Wallet confirmation timeout')), 45000)
      );
      
      const accounts = await Promise.race([accountsPromise, timeoutPromise]) as string[] | null;
      
      // Clear the hint timeout if we got a response
      clearTimeout(hintTimeout);
      
      return accounts?.[0] || null;
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      // Check if it's a user rejection vs timeout
      if (error?.message?.includes('rejected') || error?.message?.includes('denied')) {
        setConnectionMessage('Wallet access denied. Please approve in Warpcast.');
      } else if (error?.message?.includes('timeout')) {
        setConnectionMessage('Wallet confirmation timed out. Check your Warpcast app and try again.');
      }
      
      return null;
    }
  }, []);

  const initFarcaster = useCallback(async () => {
    if (typeof window === 'undefined') {
      setIsReady(true);
      return;
    }

    setConnectionState('connecting');
    setConnectionMessage('Initializing...');

    try {
      // Add timeout to sdk.context
      const contextPromise = sdk.context;
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('SDK context timeout')), 10000)
      );

      let context;
      try {
        context = await Promise.race([contextPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn('SDK context timed out');
        setConnectionState('failed');
        setConnectionMessage('Connection timed out. Tap to retry.');
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

        // Try to connect wallet
        setConnectionMessage('Connecting to Warplet...');
        
        const address = await connectWallet();
        
        if (address) {
          setWalletAddress(address);
          setConnectionState('connected');
          setConnectionMessage('');
        } else {
          // Fallback to verified address or custody address
          const fallbackAddress = u.verifiedAddresses?.ethAddresses?.[0] 
            || u.verified_addresses?.eth_addresses?.[0]
            || u.custodyAddress 
            || u.custody_address;
          
          if (fallbackAddress) {
            console.log('Using fallback address:', fallbackAddress);
            setWalletAddress(fallbackAddress);
            setConnectionState('connected');
            setConnectionMessage('');
          } else {
            setConnectionState('failed');
            setConnectionMessage('Wallet connection failed. Tap to retry.');
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
        setConnectionMessage('');
      }

      setIsReady(true);
    } catch (error) {
      console.log('Farcaster init error:', error);
      setConnectionState('failed');
      setConnectionMessage('Connection error. Tap to retry.');
      setIsReady(true);
    }
  }, [connectWallet]);

  // Initial connection
  useEffect(() => {
    initFarcaster();
  }, [initFarcaster]);

  // Retry mechanism
  const retry = useCallback(() => {
    if (retryCount < 5) {
      setRetryCount(prev => prev + 1);
      setIsReady(false);
      setConnectionState('connecting');
      setConnectionMessage('Retrying connection...');
      initFarcaster();
    } else {
      // After 5 retries, suggest a full reload
      setConnectionMessage('Multiple attempts failed. Try closing and reopening the app.');
      // Still allow one more try via reload
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
    connectionMessage,
    openUrl,
    retry,
  };
}
