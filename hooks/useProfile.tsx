'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { hasUserProfile } from '@/lib/supabase';

/**
 * Hook to check if user has a profile and show onboarding if needed
 * Returns:
 * - hasProfile: boolean - whether user has completed profile
 * - loading: boolean - whether we're checking
 * - refresh: function - manually refresh profile status
 */
export function useProfile() {
  const { address, isConnected } = useAccount();
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkProfile = async () => {
    if (!address || !isConnected) {
      setHasProfile(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const profileExists = await hasUserProfile(address);
      setHasProfile(profileExists);
    } catch (error) {
      console.error('Error checking profile:', error);
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkProfile();
  }, [address, isConnected]);

  return {
    hasProfile,
    loading,
    refresh: checkProfile,
  };
}
