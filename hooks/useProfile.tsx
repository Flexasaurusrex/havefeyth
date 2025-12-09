import { useState, useEffect, useRef, useCallback } from 'react';
import { getUserProfile, hasUserProfile, findUserProfile } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  hasProfile: boolean;
  refetch: () => Promise<void>;
}

export function useProfile(address: string | undefined, fid?: string): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const hasCheckedRef = useRef(false);
  const lastAddressRef = useRef<string | undefined>(undefined);

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setProfile(null);
      setHasProfile(false);
      setLoading(false);
      hasCheckedRef.current = true;
      return;
    }

    // Only show loading on first check, not refreshes
    if (!hasCheckedRef.current) {
      setLoading(true);
    }

    try {
      // First try to find by FID if available
      if (fid) {
        const existingProfile = await findUserProfile(fid, undefined, address);
        if (existingProfile) {
          setProfile(existingProfile);
          setHasProfile(true);
          setLoading(false);
          hasCheckedRef.current = true;
          return;
        }
      }

      // Fall back to wallet address lookup
      const userProfile = await getUserProfile(address);
      if (userProfile) {
        setProfile(userProfile);
        setHasProfile(true);
      } else {
        const exists = await hasUserProfile(address);
        setHasProfile(exists);
        if (!exists) {
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setHasProfile(false);
    } finally {
      setLoading(false);
      hasCheckedRef.current = true;
    }
  }, [address, fid]);

  useEffect(() => {
    // Reset check state when address changes
    if (lastAddressRef.current !== address) {
      hasCheckedRef.current = false;
      lastAddressRef.current = address;
    }
    
    fetchProfile();
  }, [fetchProfile, address]);

  return {
    profile,
    loading,
    hasProfile,
    refetch: fetchProfile,
  };
}
