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

export function useFarcaster() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);

  useEffect(() => {
    async function initFarcaster() {
      if (typeof window === 'undefined') {
        setIsReady(true);
        return;
      }

      try {
        const context = await sdk.context;
        
        if (context?.user) {
          setIsInMiniApp(true);
          setUser({
            fid: context.user.fid,
            username: context.user.username || '',
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
            custodyAddress: context.user.custody_address || '',
            verifiedAddresses: context.user.verified_addresses?.eth_addresses || [],
          });
          
          await sdk.actions.ready();
        }
        
        setIsReady(true);
      } catch (error) {
        console.log('Not in Farcaster mini app:', error);
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
    if (!isInMiniApp) return null;

    try {
      const result = await sdk.actions.sendTransaction({
        chainId: 'eip155:8453',
        method: 'eth_sendTransaction',
        params: {
          to: tx.to as `0x${string}`,
          data: tx.data as `0x${string}`,
          value: tx.value || '0x0',
        },
      });

      return result?.transactionHash || null;
    } catch (error) {
      console.error('Farcaster sendTransaction error:', error);
      throw error;
    }
  }, [isInMiniApp]);

  return {
    isInMiniApp,
    isReady,
    user,
    walletAddress: user?.custodyAddress || null,
    sdk,
    sendTransaction,
  };
}
