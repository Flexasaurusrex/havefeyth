import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Interaction {
  id: string;
  wallet_address: string;
  message: string;
  shared_platform: 'twitter' | 'farcaster';
  share_url: string;
  created_at: string;
  claimed: boolean;
  display_name?: string;
  twitter_handle?: string;
  farcaster_handle?: string;
}

// Check if Supabase is configured
export function isConfigured() {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url' && supabaseAnonKey !== 'your-supabase-anon-key');
}

// Check if user can interact (NO COOLDOWN CHECK - let contract handle it)
export async function canUserInteract(walletAddress: string) {
  if (!isConfigured()) {
    return { canInteract: true };
  }

  // ✅ Let the contract handle ALL cooldown logic
  console.log('✅ Frontend cooldown check disabled - letting contract handle it');
  return { canInteract: true };
}

// Record a new interaction
export async function recordInteraction(
  walletAddress: string,
  message: string,
  platform: 'twitter' | 'farcaster',
  shareUrl: string,
  displayName?: string,
  twitterHandle?: string,
  farcasterHandle?: string
) {
  if (!isConfigured()) {
    console.log('Supabase not configured, skipping interaction record');
    return;
  }

  try {
    const { error } = await supabase
      .from('interactions')
      .insert([
        {
          wallet_address: walletAddress.toLowerCase(),
          message,
          shared_platform: platform,
          share_url: shareUrl,
          claimed: true,
          display_name: displayName,
          twitter_handle: twitterHandle,
          farcaster_handle: farcasterHandle,
        },
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Error recording interaction:', error);
  }
}

// Get all interactions for the social feed
export async function getAllInteractions(): Promise<Interaction[]> {
  if (!isConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('claimed', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return [];
  }
}

// Get user's interaction count
export async function getUserInteractionCount(walletAddress: string): Promise<number> {
  if (!isConfigured()) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching user interaction count:', error);
    return 0;
  }
}

// Get analytics data
export async function getAnalytics() {
  if (!isConfigured()) {
    return {
      totalInteractions: 0,
      uniqueUsers: 0,
      platformBreakdown: { twitter: 0, farcaster: 0 },
      recentActivity: [],
    };
  }

  try {
    // Total interactions
    const { count: totalInteractions } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true });

    // Unique users
    const { data: users } = await supabase
      .from('interactions')
      .select('wallet_address');
    
    const uniqueUsers = new Set(users?.map(u => u.wallet_address)).size;

    // Platform breakdown
    const { data: platforms } = await supabase
      .from('interactions')
      .select('shared_platform');
    
    const platformBreakdown = {
      twitter: platforms?.filter(p => p.shared_platform === 'twitter').length || 0,
      farcaster: platforms?.filter(p => p.shared_platform === 'farcaster').length || 0,
    };

    // Recent activity (last 10)
    const { data: recentActivity } = await supabase
      .from('interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      totalInteractions: totalInteractions || 0,
      uniqueUsers,
      platformBreakdown,
      recentActivity: recentActivity || [],
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      totalInteractions: 0,
      uniqueUsers: 0,
      platformBreakdown: { twitter: 0, farcaster: 0 },
      recentActivity: [],
    };
  }
}
