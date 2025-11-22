import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI } from './contract';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create public client to read contract
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export interface Interaction {
  id: string;
  wallet_address: string;
  message: string;
  shared_platform: 'twitter' | 'farcaster';
  share_link: string;
  claimed: boolean;
  created_at: string;
  claim_available_at: string;
  display_name?: string;
  twitter_handle?: string;
  farcaster_handle?: string;
}

const isConfigured = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && 
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// NEW: Check if address is whitelisted on contract
async function isAddressWhitelisted(address: string): Promise<boolean> {
  try {
    // First check if whitelist is enabled
    const whitelistEnabled = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: HAVE_FEYTH_MULTI_REWARD_ABI,
      functionName: 'whitelistEnabled',
    }) as boolean;

    if (!whitelistEnabled) {
      return false; // Whitelist not enabled, so no bypass
    }

    // Check if this specific address is whitelisted
    const isWhitelisted = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: HAVE_FEYTH_MULTI_REWARD_ABI,
      functionName: 'isWhitelisted',
      args: [address as `0x${string}`],
    }) as boolean;

    return isWhitelisted;
  } catch (error) {
    console.error('Error checking whitelist:', error);
    return false; // On error, don't bypass
  }
}

export async function canUserInteract(walletAddress: string): Promise<{
  canInteract: boolean;
  lastInteraction?: string;
  nextAvailable?: string;
  whitelisted?: boolean;
}> {
  if (!isConfigured()) {
    return { canInteract: true };
  }

  // ✅ FIRST: Check if address is whitelisted
  const isWhitelisted = await isAddressWhitelisted(walletAddress);
  
  if (isWhitelisted) {
    console.log('🎯 Address is whitelisted - bypassing cooldown check');
    return { 
      canInteract: true,
      whitelisted: true 
    };
  }

  // Continue with normal Supabase cooldown check
  const { data, error } = await supabase
    .from('interactions')
    .select('created_at, claim_available_at')
    .eq('wallet_address', walletAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { canInteract: true };
  }

  const now = new Date();
  const nextAvailable = new Date(data.claim_available_at);

  if (now >= nextAvailable) {
    return { canInteract: true };
  }

  return {
    canInteract: false,
    lastInteraction: data.created_at,
    nextAvailable: data.claim_available_at,
  };
}

export async function recordInteraction(
  walletAddress: string,
  message: string,
  platform: 'twitter' | 'farcaster',
  shareLink: string,
  displayName?: string,
  twitterHandle?: string,
  farcasterHandle?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const now = new Date();
  const claimAvailableAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { error } = await supabase.from('interactions').insert([
    {
      wallet_address: walletAddress.toLowerCase(),
      message,
      shared_platform: platform,
      share_link: shareLink,
      claimed: false,
      claim_available_at: claimAvailableAt.toISOString(),
      display_name: displayName || null,
      twitter_handle: twitterHandle || null,
      farcaster_handle: farcasterHandle || null,
    },
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function markAsClaimed(interactionId: string): Promise<boolean> {
  if (!isConfigured()) {
    return false;
  }

  const { error } = await supabase
    .from('interactions')
    .update({ claimed: true })
    .eq('id', interactionId);

  return !error;
}

export async function getUserInteractions(
  walletAddress: string
): Promise<Interaction[]> {
  if (!isConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getAllInteractions(): Promise<Interaction[]> {
  if (!isConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return data;
}
