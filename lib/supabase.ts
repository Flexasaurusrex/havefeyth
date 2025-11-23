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

export interface UserStats {
  wallet_address: string;
  total_points: number;
  feylons_shared: number;
  feylons_received_shares: number;
  current_streak: number;
  best_streak: number;
  last_share_date: string;
  created_at: string;
}

export interface PointTransaction {
  id: string;
  wallet_address: string;
  points_earned: number;
  reason: string;
  metadata?: any;
  created_at: string;
}

export interface UserProfile {
  wallet_address: string;
  display_name: string;
  twitter_handle?: string;
  farcaster_handle?: string;
  profile_image_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileWithStats extends UserProfile {
  total_points: number;
  feylons_shared: number;
  current_streak: number;
  best_streak: number;
}

export interface LeaderboardEntry extends UserStats {
  display_name?: string;
  twitter_handle?: string;
  farcaster_handle?: string;
  profile_image_url?: string;
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

// Calculate points for a share action
function calculatePoints(reason: 'own_share' | 'received_share' | 'streak_bonus', streakDays?: number): number {
  switch (reason) {
    case 'own_share':
      return 10;
    case 'received_share':
      return 5;
    case 'streak_bonus':
      return streakDays === 7 ? 20 : 5; // 20 for 7-day streak, 5 for daily
    default:
      return 0;
  }
}

// Award points to a user
export async function awardPoints(
  walletAddress: string,
  reason: 'own_share' | 'received_share' | 'streak_bonus',
  metadata?: any
) {
  if (!isConfigured()) {
    console.log('Supabase not configured, skipping points award');
    return { points: 0 };
  }

  try {
    // Get current streak to calculate bonus
    const { data: stats } = await supabase
      .from('user_stats')
      .select('current_streak, last_share_date')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    let streakDays = 1;
    if (stats && reason === 'own_share') {
      const lastShare = stats.last_share_date ? new Date(stats.last_share_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (lastShare) {
        const lastShareDate = new Date(lastShare);
        lastShareDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastShareDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          streakDays = (stats.current_streak || 0) + 1;
        } else if (daysDiff === 0) {
          // Same day
          streakDays = stats.current_streak || 1;
        }
      }
    }

    const points = calculatePoints(reason, streakDays);

    // Call the database function to update stats
    const { error } = await supabase.rpc('update_user_stats', {
      p_wallet_address: walletAddress.toLowerCase(),
      p_points: points,
      p_reason: reason,
      p_metadata: metadata || {}
    });

    if (error) throw error;

    return { points, streak: streakDays };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { points: 0 };
  }
}

// Record a new interaction (with points)
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
    return { points: 0 };
  }

  try {
    // Record the interaction
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

    // Award points for sharing
    const result = await awardPoints(walletAddress, 'own_share', {
      platform,
      message_preview: message.substring(0, 50)
    });

    return result;
  } catch (error) {
    console.error('Error recording interaction:', error);
    return { points: 0 };
  }
}

// Record when someone shares another user's Feylon
export async function recordFeytonShare(originalWalletAddress: string, sharerWalletAddress: string, feytonId: string) {
  if (!isConfigured()) {
    return;
  }

  try {
    // Award points to the original creator
    await awardPoints(originalWalletAddress, 'received_share', {
      shared_by: sharerWalletAddress,
      feylon_id: feytonId
    });
  } catch (error) {
    console.error('Error recording feylon share:', error);
  }
}

// Get user stats
export async function getUserStats(walletAddress: string): Promise<UserStats | null> {
  if (!isConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

// Get leaderboard (top users by points) - ENHANCED WITH PROFILES
export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  if (!isConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select(`
        *,
        user_profiles (
          display_name,
          twitter_handle,
          farcaster_handle,
          profile_image_url
        )
      `)
      .order('total_points', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Flatten the joined data
    return (data || []).map((entry: any) => ({
      ...entry,
      display_name: entry.user_profiles?.display_name,
      twitter_handle: entry.user_profiles?.twitter_handle,
      farcaster_handle: entry.user_profiles?.farcaster_handle,
      profile_image_url: entry.user_profiles?.profile_image_url,
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// Get user's rank
export async function getUserRank(walletAddress: string): Promise<number> {
  if (!isConfigured()) {
    return 0;
  }

  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('wallet_address, total_points')
      .order('total_points', { ascending: false });

    if (error) throw error;
    
    const rank = data?.findIndex(u => u.wallet_address === walletAddress.toLowerCase()) ?? -1;
    return rank >= 0 ? rank + 1 : 0;
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return 0;
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
      totalPoints: 0,
      avgPointsPerUser: 0,
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

    // Points stats
    const { data: pointsData } = await supabase
      .from('user_stats')
      .select('total_points');
    
    const totalPoints = pointsData?.reduce((sum, u) => sum + u.total_points, 0) || 0;
    const avgPointsPerUser = uniqueUsers > 0 ? Math.round(totalPoints / uniqueUsers) : 0;

    return {
      totalInteractions: totalInteractions || 0,
      uniqueUsers,
      platformBreakdown,
      recentActivity: recentActivity || [],
      totalPoints,
      avgPointsPerUser,
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      totalInteractions: 0,
      uniqueUsers: 0,
      platformBreakdown: { twitter: 0, farcaster: 0 },
      recentActivity: [],
      totalPoints: 0,
      avgPointsPerUser: 0,
    };
  }
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

// Get user profile
export async function getUserProfile(walletAddress: string): Promise<UserProfile | null> {
  if (!isConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Create user profile
export async function createUserProfile(profile: {
  wallet_address: string;
  display_name: string;
  twitter_handle?: string;
  farcaster_handle?: string;
  profile_image_url?: string;
  bio?: string;
}): Promise<void> {
  if (!isConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabase
      .from('user_profiles')
      .insert([
        {
          wallet_address: profile.wallet_address.toLowerCase(),
          display_name: profile.display_name,
          twitter_handle: profile.twitter_handle,
          farcaster_handle: profile.farcaster_handle,
          profile_image_url: profile.profile_image_url,
          bio: profile.bio,
        },
      ]);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error creating user profile:', error);
    
    if (error.code === '23505') {
      throw new Error('Profile already exists for this wallet');
    }
    
    throw new Error(error.message || 'Failed to create profile');
  }
}

// Update user profile
export async function updateUserProfile(
  walletAddress: string,
  updates: {
    display_name?: string;
    twitter_handle?: string;
    farcaster_handle?: string;
    profile_image_url?: string;
    bio?: string;
  }
): Promise<void> {
  if (!isConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
}

// Check if user has profile
export async function hasUserProfile(walletAddress: string): Promise<boolean> {
  if (!isConfigured()) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking user profile:', error);
    return false;
  }
}
