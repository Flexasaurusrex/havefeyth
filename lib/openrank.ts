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

    // Power badge holders are always eligible (if bypass enabled)
    if (settings.power_badge_bypass && hasPowerBadge) {
      return {
        eligible: true,
        hasPowerBadge: true,
        reason: 'Power badge holder'
      };
    }

    // High follower count bypass (established accounts)
    if (followerCount && followerCount >= settings.follower_bypass_threshold) {
      return {
        eligible: true,
        reason: `${followerCount} followers (established account)`
      };
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
      return {
        eligible: false,
        reason: 'Unable to verify account eligibility'
      };
    }

    const data = await response.json();
    const score = data?.result?.[0]?.score || 0;

    console.log(`OpenRank check - FID: ${fid}, Score: ${score}, Threshold: ${settings.threshold}`);

    if (score >= settings.threshold) {
      return {
        eligible: true,
        score,
        reason: `OpenRank score: ${score}`
      };
    }

    return {
      eligible: false,
      score,
      reason: `OpenRank score too low (${score}/${settings.threshold}). This prevents airdrop farmers. DM @flexasaurusrex to appeal.`
    };
  } catch (error) {
    console.error('OpenRank check failed:', error);
    // On error, deny access (safer default)
    return {
      eligible: false,
      reason: 'Unable to verify account. Please try again or contact support.'
    };
  }
}

// Admin function to update settings
export async function updateOpenRankSettings(
  settings: OpenRankSettings,
  adminAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('openrank_settings')
      .update({
        threshold: settings.threshold,
        power_badge_bypass: settings.power_badge_bypass,
        follower_bypass_threshold: settings.follower_bypass_threshold,
        updated_by: adminAddress
      })
      .limit(1);

    if (error) throw error;

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
