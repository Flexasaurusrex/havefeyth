import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Interaction {
  id: string;
  wallet_address: string;
  message: string;
  shared_platform: 'twitter' | 'farcaster';
  share_link: string;
  claimed: boolean;
  created_at: string;
  claim_available_at: string;
}

// Check if user can interact (24hr cooldown)
export async function canUserInteract(walletAddress: string): Promise<{
  canInteract: boolean;
  lastInteraction?: string;
  nextAvailable?: string;
}> {
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

// Record a new interaction
export async function recordInteraction(
  walletAddress: string,
  message: string,
  platform: 'twitter' | 'farcaster',
  shareLink: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const claimAvailableAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

  const { error } = await supabase.from('interactions').insert([
    {
      wallet_address: walletAddress.toLowerCase(),
      message,
      shared_platform: platform,
      share_link: shareLink,
      claimed: false,
      claim_available_at: claimAvailableAt.toISOString(),
    },
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Mark interaction as claimed
export async function markAsClaimed(interactionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('interactions')
    .update({ claimed: true })
    .eq('id', interactionId);

  return !error;
}

// Get user's interactions
export async function getUserInteractions(
  walletAddress: string
): Promise<Interaction[]> {
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

// Get all interactions (admin)
export async function getAllInteractions(): Promise<Interaction[]> {
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
