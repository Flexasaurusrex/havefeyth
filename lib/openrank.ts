// OpenRank Anti-Farmer Protection
// Settings are stored in database and configurable via admin panel

import { supabase } from './supabase';

export interface OpenRankResult {
  eligible: boolean;
  score?: number;
  reason?: string;
  hasPowerBadge?: boolean;
}

export interface OpenRankSettings {
  threshold: number;
  power_badge_bypass: boolean;
  follower_bypass_threshold: number;
}

// Default settings (used as fallback if database fetch fails)
const DEFAULT_SETTINGS: OpenRankSettings = {
  threshold: 50,
  power_badge_bypass: true,
  follower_bypass_threshold: 500
};

// Cache settings to avoid DB query on every check
let cachedSettings: OpenRankSettings | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

async function getSettings(): Promise<OpenRankSettings> {
  // Return cached settings if recent
  if (cachedSettings && Date.now() - lastFetch < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const { data, error } = await supabase
      .from('openrank_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Failed to fetch OpenRank settings, using defaults:', error);
      return DEFAULT_SETTINGS;
    }

    cachedSettings = {
      threshold: data.threshold,
      power_badge_bypass: data.power_badge_bypass,
      follower_bypass_threshold: data.follower_bypass_threshold
    };
    lastFetch = Date.now();

    return cachedSettings;
  } catch (error) {
    console.error('Error fetching OpenRank settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function checkOpenRank(
  fid: number,
  hasPowerBadge: boolean = false,
  followerCount?: number
): Promise<OpenRankResult> {
  try {
    const settings = await getSettings();
    let result: OpenRankResult;
    let score: number | undefined;

    // Power badge holders are always eligible (if bypass enabled)
    if (settings.power_badge_bypass && hasPowerBadge) {
      result = {
        eligible: true,
        hasPowerBadge: true,
        reason: 'Power badge holder'
      };
      
      // Log activity
      await logActivity(fid, null, settings.threshold, 'ALLOWED', 'Power badge bypass', hasPowerBadge, followerCount);
      return result;
    }

    // High follower count bypass (established accounts)
    if (followerCount && followerCount >= settings.follower_bypass_threshold) {
      result = {
        eligible: true,
        reason: `${followerCount} followers (established account)`
      };
      
      // Log activity
      await logActivity(fid, null, settings.threshold, 'ALLOWED', `${followerCount} followers bypass`, hasPowerBadge, followerCount);
      return result;
    }

    // Fetch OpenRank score
    const response = await fetch(
      `https://graph.cast.k3l.io/scores/global/engagement/fids?fid=${fid}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('OpenRank API error:', response.status);
      // On API failure, deny access (safer than allowing everyone)
      result = {
        eligible: false,
        reason: 'Unable to verify account eligibility'
      };
      
      // Log activity
      await logActivity(fid, null, settings.threshold, 'BLOCKED', 'API error', hasPowerBadge, followerCount);
      return result;
    }

    const data = await response.json();
    score = data?.result?.[0]?.score || 0;

    console.log(`OpenRank check - FID: ${fid}, Score: ${score}, Threshold: ${settings.threshold}`);

    if (score >= settings.threshold) {
      result = {
        eligible: true,
        score,
        reason: `OpenRank score: ${score}`
      };
      
      // Log activity
      await logActivity(fid, score, settings.threshold, 'ALLOWED', `Score ${score} >= ${settings.threshold}`, hasPowerBadge, followerCount);
      return result;
    }

    result = {
      eligible: false,
      score,
      reason: `OpenRank score too low (${score}/${settings.threshold}). This prevents airdrop farmers. DM @flexasaurusrex to appeal.`
    };
    
    // Log activity
    await logActivity(fid, score, settings.threshold, 'BLOCKED', `Score ${score} < ${settings.threshold}`, hasPowerBadge, followerCount);
    return result;
  } catch (error) {
    console.error('OpenRank check failed:', error);
    // On error, deny access (safer default)
    const result = {
      eligible: false,
      reason: 'Unable to verify account. Please try again or contact support.'
    };
    
    // Log activity
    await logActivity(fid, null, 0, 'BLOCKED', 'System error', hasPowerBadge, followerCount);
    return result;
  }
}

// Helper function to log activity
async function logActivity(
  fid: number,
  score: number | null,
  threshold: number,
  result: 'ALLOWED' | 'BLOCKED',
  reason: string,
  hasPowerBadge: boolean,
  followerCount?: number
) {
  try {
    await supabase.from('openrank_activity').insert({
      fid,
      score,
      threshold,
      result,
      reason,
      has_power_badge: hasPowerBadge,
      follower_count: followerCount
    });
  } catch (error) {
    // Don't fail the check if logging fails
    console.error('Failed to log OpenRank activity:', error);
  }
}

// Admin function to update settings
export async function updateOpenRankSettings(
  settings: OpenRankSettings,
  adminAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the first settings row
    const { data: rows } = await supabase
      .from('openrank_settings')
      .select('id');

    if (!rows || rows.length === 0) {
      // No row exists, insert one
      const { error } = await supabase
        .from('openrank_settings')
        .insert({
          threshold: settings.threshold,
          power_badge_bypass: settings.power_badge_bypass,
          follower_bypass_threshold: settings.follower_bypass_threshold,
          updated_by: adminAddress
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
    } else {
      // Update the first row
      const { error } = await supabase
        .from('openrank_settings')
        .update({
          threshold: settings.threshold,
          power_badge_bypass: settings.power_badge_bypass,
          follower_bypass_threshold: settings.follower_bypass_threshold,
          updated_by: adminAddress
        })
        .eq('id', rows[0].id);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
    }

    // Clear cache so new settings take effect immediately
    cachedSettings = null;

    return { success: true };
  } catch (error) {
    console.error('Failed to update OpenRank settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

// Admin function to get current settings
export async function getCurrentSettings(): Promise<OpenRankSettings> {
  return getSettings();
}

// Admin function to check a specific FID's eligibility (for debugging)
export async function debugCheckFID(fid: number): Promise<void> {
  const settings = await getSettings();
  console.log('=== OpenRank Debug Check ===');
  console.log(`FID: ${fid}`);
  console.log(`Current Threshold: ${settings.threshold}`);
  console.log(`Power Badge Bypass: ${settings.power_badge_bypass}`);
  console.log(`Follower Bypass: ${settings.follower_bypass_threshold}+`);
  
  const result = await checkOpenRank(fid);
  console.log('Result:', result);
  console.log('========================');
}
