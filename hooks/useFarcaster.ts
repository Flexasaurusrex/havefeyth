'use client';

import { useState, useEffect, useCallback } from 'react';

interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  custodyAddress: string;
  verifiedAddresses: string[];
}

export function useFarcaster() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [sdk, setSdk] = useState<any>(null);

  useEffect(() => {
    async function initFarcaster() {
      if (typeof window === 'undefined') return;

      // Check for Farcaster SDK
      const farcasterSDK = (window as any).farcaster;
      
      if (!farcasterSDK) {
        setIsReady(true);
        return;
      }

      try {
        setSdk(farcasterSDK);
        setIsInMiniApp(true);

        await farcasterSDK.ready();

        const context = await farcasterSDK.context;
        
        if (context?.user) {
          setUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
            custodyAddress: context.user.custodyAddress,
            verifiedAddresses: context.user.verifiedAddresses || [],
          });
        }

        setIsReady(true);
      } catch (error) {
        console.error('Error initializing Farcaster SDK:', error);
        setIsReady(true);
      }
    }

    initFarcaster();
  }, []);

  const sendTransaction = useCallback(async (tx: {
    to: string;
    data: string;
    value?: string;
  }): Promise<string | null> => {
    if (!sdk || !isInMiniApp) return null;

    try {
      const result = await sdk.actions.sendTransaction({
        chainId: 'eip155:8453',
        method: 'eth_sendTransaction',
        params: {
          to: tx.to,
          data: tx.data,
          value: tx.value || '0x0',
        },
      });

      return result?.transactionHash || null;
    } catch (error) {
      console.error('Farcaster sendTransaction error:', error);
      throw error;
    }
  }, [sdk, isInMiniApp]);

  return {
    isInMiniApp,
    isReady,
    user,
    walletAddress: user?.custodyAddress || null,
    sdk,
    sendTransaction,
  };
}
