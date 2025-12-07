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
          
          const u = context.user as any;
          
          setUser({
            fid: u.fid,
            username: u.username || '',
            displayName: u.displayName,
            pfpUrl: u.pfpUrl,
            custodyAddress: u.custodyAddress || u.custody_address || '',
            verifiedAddresses: u.verifiedAddresses?.ethAddresses || u.verified_addresses?.eth_addresses || [],
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

  const openUrl = useCallback(async (url: string) => {
    if (isInMiniApp) {
      await sdk.actions.openUrl(url);
    } else {
      window.open(url, '_blank', 'width=600,height=400');
    }
  }, [isInMiniApp]);

  return {
    isInMiniApp,
    isReady,
    user,
    walletAddress: user?.custodyAddress || null,
    openUrl,
  };
}
