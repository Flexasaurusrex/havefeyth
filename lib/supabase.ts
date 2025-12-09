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
  is_confession?: boolean;
}

export interface UserStats {
  wallet_address: string;
  total_points: number;
  feylons_shared: number;
  feylons_received_shares: number;
  current_streak: number;
  best_streak: number;
  last_share_date: string;
  last_confession_date?: string;
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
  farcaster_fid?: string;
  profile_image_url?: string;
  bio?: string;
  claim_wallet?: string;
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

export function isConfigured() {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url' && supabaseAnonKey !== 'your-supabase-anon-key');
}

export async function canUserInteract(walletAddress: string) {
  if (!isConfigured()) {
    return { canInteract: true };
  }
  console.log('✅ Frontend cooldown check disabled - letting contract handle it');
  return { canInteract: true };
}

function calculatePoints(reason: 'own_share' | 'received_share' | 'streak_bonus' | 'confession', streakDays?: number): number {
  switch (reason) {
    case 'own_share':
      return 10;
    case 'received_share':
      return 5;
    case 'confession':
      return 5;
    case 'streak_bonus':
      return streakDays === 7 ? 20 : 5;
    default:
      return 0;
  }
}

export async function awardPoints(
  walletAddress: string,
  reason: 'own_share' | 'received_share' | 'streak_bonus' | 'confession',
  metadata?: any
) {
  if (!isConfigured()) {
    console.log('Supabase not configured, skipping points award');
    return { points: 0 };
  }

  try {
    const wallet = walletAddress.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get current stats
    const { data: stats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('wallet_address', wallet)
      .single();

    // Ignore "no rows" error
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching stats:', fetchError);
    }

    let streakDays = 1;
    let newStreak = 1;
    
    if (stats && reason === 'own_share') {
      const lastShare = stats.last_share_date ? new Date(stats.last_share_date) : null;
      
      if (lastShare) {
        const lastShareDate = new Date(lastShare);
        lastShareDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastShareDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day - increment streak
          newStreak = (stats.current_streak || 0) + 1;
        } else if (daysDiff === 0) {
          // Same day - keep streak
          newStreak = stats.current_streak || 1;
        } else {
          // Streak broken - reset to 1
          newStreak = 1;
        }
      }
      streakDays = newStreak;
    } else if (stats) {
      newStreak = stats.current_streak || 1;
    }

    const points = calculatePoints(reason, streakDays);

    if (stats) {
      // Update existing stats
      const updates: any = {
        total_points: (stats.total_points || 0) + points,
        updated_at: new Date().toISOString()
      };
      
      if (reason === 'own_share') {
        updates.feylons_shared = (stats.feylons_shared || 0) + 1;
        updates.current_streak = newStreak;
        updates.best_streak = Math.max(stats.best_streak || 0, newStreak);
        updates.last_share_date = today.toISOString().split('T')[0];
      } else if (reason === 'received_share') {
        updates.feylons_received_shares = (stats.feylons_received_shares || 0) + 1;
      }
      
      const { error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('wallet_address', wallet);
      
      if (error) {
        console.error('Error updating stats:', error);
        throw error;
      }
    } else {
      // Insert new stats
      const { error } = await supabase
        .from('user_stats')
        .insert({
          wallet_address: wallet,
          total_points: points,
          feylons_shared: reason === 'own_share' ? 1 : 0,
          feylons_received_shares: reason === 'received_share' ? 1 : 0,
          current_streak: 1,
          best_streak: 1,
          last_share_date: today.toISOString().split('T')[0],
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error inserting stats:', error);
        throw error;
      }
    }

    console.log(`✅ Awarded ${points} points to ${wallet} for ${reason}`);
    return { points, streak: streakDays };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { points: 0 };
  }
}

export async function recordInteraction(
  walletAddress: string,
  message: string,
  platform: 'twitter' | 'farcaster',
  shareUrl: string,
  displayName?: string,
  twitterHandle?: string,
  farcasterHandle?: string
): Promise<{ points: number; success?: boolean; error?: string }> {
  if (!isConfigured()) {
    console.log('Supabase not configured, skipping interaction record');
    return { points: 0, success: false };
  }

  try {
    const { canShare, nextAvailable } = await canUserShare(walletAddress);
    if (!canShare) {
      return { 
        points: 0, 
        success: false, 
        error: `Next share available ${nextAvailable?.toLocaleString()}` 
      };
    }

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
          is_confession: false,
        },
      ]);

    if (error) throw error;

    const result = await awardPoints(walletAddress, 'own_share', {
      platform,
      message_preview: message.substring(0, 50)
    });

    return { ...result, success: true };
  } catch (error) {
    console.error('Error recording interaction:', error);
    return { points: 0, success: false, error: 'Failed to record interaction' };
  }
}

export async function canUserConfess(walletAddress: string): Promise<{ canConfess: boolean; nextAvailable?: Date }> {
  if (!isConfigured()) {
    return { canConfess: true };
  }

  try {
    const { data: recentConfession, error } = await supabase
      .from('interactions')
      .select('created_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('is_confession', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    
    if (!recentConfession) {
      return { canConfess: true };
    }

    const lastConfession = new Date(recentConfession.created_at);
    const now = new Date();
    const hoursSinceLastConfession = (now.getTime() - lastConfession.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastConfession >= 72) {
      return { canConfess: true };
    }

    const nextAvailable = new Date(lastConfession);
    nextAvailable.setHours(nextAvailable.getHours() + 72);
    
    return { canConfess: false, nextAvailable };
  } catch (error) {
    console.error('Error checking confession cooldown:', error);
    return { canConfess: false };
  }
}

export async function canUserShare(walletAddress: string): Promise<{ canShare: boolean; nextAvailable?: Date }> {
  if (!isConfigured()) {
    return { canShare: true };
  }

  try {
    const { data: recentShare, error } = await supabase
      .from('interactions')
      .select('created_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('is_confession', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    
    if (!recentShare) {
      return { canShare: true };
    }

    const lastShare = new Date(recentShare.created_at);
    const now = new Date();
    const hoursSinceLastShare = (now.getTime() - lastShare.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastShare >= 24) {
      return { canShare: true };
    }

    const nextAvailable = new Date(lastShare);
    nextAvailable.setHours(nextAvailable.getHours() + 24);
    
    return { canShare: false, nextAvailable };
  } catch (error) {
    console.error('Error checking share cooldown:', error);
    return { canShare: false };
  }
}

export async function recordConfession(
  walletAddress: string,
  message: string
) {
  if (!isConfigured()) {
    console.log('Supabase not configured, skipping confession record');
    return { points: 0, success: false };
  }

  try {
    const { canConfess, nextAvailable } = await canUserConfess(walletAddress);
    if (!canConfess) {
      return { 
        points: 0, 
        success: false, 
        error: `Next confession available ${nextAvailable?.toLocaleDateString()}` 
      };
    }

    const { error: interactionError } = await supabase
      .from('interactions')
      .insert([
        {
          wallet_address: walletAddress.toLowerCase(),
          message,
          shared_platform: 'twitter',
          share_url: '',
          claimed: true,
          is_confession: true,
        },
      ]);

    if (interactionError) throw interactionError;

    const result = await awardPoints(walletAddress, 'confession', {
      confession: true,
      message_preview: message.substring(0, 50)
    });

    const { error: updateError } = await supabase
      .from('user_stats')
      .update({ last_confession_date: new Date().toISOString() })
      .eq('wallet_address', walletAddress.toLowerCase());

    if (updateError) throw updateError;

    return { points: result.points, success: true };
  } catch (error) {
    console.error('Error recording confession:', error);
    return { points: 0, success: false, error: 'Failed to record confession' };
  }
}

export async function deleteInteraction(interactionId: string, adminAddress: string): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const expectedAdmin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
    if (!expectedAdmin || adminAddress.toLowerCase() !== expectedAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', interactionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting interaction:', error);
    return { success: false, error: 'Failed to delete interaction' };
  }
}

export async function recordFeytonShare(originalWalletAddress: string, sharerWalletAddress: string, feytonId: string) {
  if (!isConfigured()) return;

  try {
    await awardPoints(originalWalletAddress, 'received_share', {
      shared_by: sharerWalletAddress,
      feylon_id: feytonId
    });
  } catch (error) {
    console.error('Error recording feylon share:', error);
  }
}

export async function getUserStats(walletAddress: string): Promise<UserStats | null> {
  if (!isConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  if (!isConfigured()) return [];

  try {
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(limit);

    if (statsError) throw statsError;
    if (!stats || stats.length === 0) return [];

    const walletAddresses = stats.map(s => s.wallet_address);

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('wallet_address, display_name, twitter_handle, farcaster_handle, profile_image_url')
      .in('wallet_address', walletAddresses);

    const profileMap = new Map(
      (profiles || []).map(p => [p.wallet_address, p])
    );

    return stats.map((entry: any) => {
      const profile = profileMap.get(entry.wallet_address);
      return {
        ...entry,
        display_name: profile?.display_name,
        twitter_handle: profile?.twitter_handle,
        farcaster_handle: profile?.farcaster_handle,
        profile_image_url: profile?.profile_image_url,
      };
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export async function getUserRank(walletAddress: string): Promise<number> {
  if (!isConfigured()) return 0;

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

export async function getAllInteractions(): Promise<Interaction[]> {
  if (!isConfigured()) return [];

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

export async function getUserInteractionCount(walletAddress: string): Promise<number> {
  if (!isConfigured()) return 0;

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
    const { count: totalInteractions } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true });

    const { data: users } = await supabase
      .from('interactions')
      .select('wallet_address');
    
    const uniqueUsers = new Set(users?.map(u => u.wallet_address)).size;

    const { data: platforms } = await supabase
      .from('interactions')
      .select('shared_platform');
    
    const platformBreakdown = {
      twitter: platforms?.filter(p => p.shared_platform === 'twitter').length || 0,
      farcaster: platforms?.filter(p => p.shared_platform === 'farcaster').length || 0,
    };

    const { data: recentActivity } = await supabase
      .from('interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

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

export async function getUserProfile(walletAddress: string): Promise<UserProfile | null> {
  if (!isConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function createUserProfile(profile: {
  wallet_address: string;
  display_name: string;
  twitter_handle?: string;
  farcaster_handle?: string;
  farcaster_fid?: string;
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
          farcaster_fid: profile.farcaster_fid,
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

export async function updateUserProfile(
  walletAddress: string,
  updates: {
    display_name?: string;
    twitter_handle?: string;
    farcaster_handle?: string;
    farcaster_fid?: string;
    profile_image_url?: string;
    bio?: string;
    claim_wallet?: string;
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

export async function hasUserProfile(walletAddress: string): Promise<boolean> {
  if (!isConfigured()) return false;

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

export async function findUserProfile(
  fid?: string,
  farcasterHandle?: string,
  walletAddress?: string
): Promise<UserProfile | null> {
  if (!isConfigured()) return null;

  try {
    const { data, error } = await supabase.rpc('find_user_profile', {
      p_fid: fid || null,
      p_farcaster_handle: farcasterHandle || null,
      p_wallet_address: walletAddress?.toLowerCase() || null,
    });

    if (error) throw error;
    
    if (data && data.length > 0) {
      return data[0] as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user profile:', error);
    return null;
  }
}

export async function linkFidToProfile(
  fid: string,
  farcasterHandle: string,
  walletAddress: string
): Promise<string | null> {
  if (!isConfigured()) return null;

  try {
    const { data, error } = await supabase.rpc('link_fid_to_profile', {
      p_fid: fid,
      p_farcaster_handle: farcasterHandle,
      p_wallet_address: walletAddress.toLowerCase(),
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error linking FID to profile:', error);
    return null;
  }
}

export async function compressAndConvertImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        
        const sizeInKB = (base64.length * 3) / 4 / 1024;
        
        if (sizeInKB > 200) {
          const lowerQuality = canvas.toDataURL('image/jpeg', 0.6);
          resolve(lowerQuality);
        } else {
          resolve(base64);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
