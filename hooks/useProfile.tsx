'use client';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { hasUserProfile } from '@/lib/supabase';

/**
 * Hook to check if user has a profile and show onboarding if needed
 * Works with both RainbowKit (web) and Farcaster SDK (mini app)
 * Returns:
 * - hasProfile: boolean - whether user has completed profile
 * - loading: boolean - whether we're still checking (true until first check completes)
 * - refresh: function - manually refresh profile status
 */
export function useProfile() {
  const { address, isConnected, isReady } = useWallet();
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const hasChecked = useRef(false);

  const checkProfile = async () => {
    if (!address || !isConnected || !isReady) {
      // Not ready yet - keep loading true until we can actually check
      if (!isReady) {
        setLoading(true);
        return;
      }
      // Ready but no address/connection - no profile
      setHasProfile(false);
      setLoading(false);
      hasChecked.current = true;
      return;
    }

    // Don't set loading true on refresh if we've already checked
    // This prevents the modal from flickering
    if (!hasChecked.current) {
      setLoading(true);
    }

    try {
      const profileExists = await hasUserProfile(address);
      setHasProfile(profileExists);
      hasChecked.current = true;
    } catch (error) {
      console.error('Error checking profile:', error);
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset check state when address changes
    if (!address) {
      hasChecked.current = false;
      setHasProfile(false);
      setLoading(true);
      return;
    }

    if (isReady && address) {
      checkProfile();
    }
  }, [address, isConnected, isReady]);

  return {
    hasProfile,
    loading,
    refresh: checkProfile,
  };
}
