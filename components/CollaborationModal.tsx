'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Collaboration {
  id: string;
  partner_name: string;
  partner_logo_url: string | null;
  partner_color: string;
  token_symbol: string | null;
  token_amount_per_claim: number;
  remaining_budget: number;
  custom_message: string | null;
  twitter_url: string | null;
  farcaster_url: string | null;
  discord_url: string | null;
  website_url: string | null;
  require_all_socials: boolean;
  end_date: string | null;
  claims_count: number;
  max_claims: number | null;
}

interface CollaborationModalProps {
  collaboration: Collaboration;
  walletAddress: string;
  onClose: () => void;
  openUrl: (url: string) => void;
}

export function CollaborationModal({
  collaboration,
  walletAddress,
  onClose,
  openUrl,
}: CollaborationModalProps) {
  const [clickedTwitter, setClickedTwitter] = useState(false);
  const [clickedFarcaster, setClickedFarcaster] = useState(false);
  const [clickedDiscord, setClickedDiscord] = useState(false);
  const [clickedWebsite, setClickedWebsite] = useState(false);
  const [loading, setLoading] = useState(true);

  const socials = [
    { key: 'twitter', url: collaboration.twitter_url, label: 'Follow on X', icon: '𝕏', clicked: clickedTwitter, setClicked: setClickedTwitter },
    { key: 'farcaster', url: collaboration.farcaster_url, label: 'Follow on Warpcast', icon: '🟪', clicked: clickedFarcaster, setClicked: setClickedFarcaster },
    { key: 'discord', url: collaboration.discord_url, label: 'Join Discord', icon: '💬', clicked: clickedDiscord, setClicked: setClickedDiscord },
    { key: 'website', url: collaboration.website_url, label: 'Visit Website', icon: '🌐', clicked: clickedWebsite, setClicked: setClickedWebsite },
  ].filter(s => s.url);

  const requiredSocials = socials.length;
  const clickedCount = socials.filter(s => s.clicked).length;
  
  const allComplete = collaboration.require_all_socials
    ? clickedCount === requiredSocials
    : clickedCount > 0 || requiredSocials === 0;

  // Load existing progress
  useEffect(() => {
    async function loadProgress() {
      const { data } = await supabase
        .from('collaboration_claims')
        .select('clicked_twitter, clicked_farcaster, clicked_discord, clicked_website')
        .eq('collaboration_id', collaboration.id)
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (data) {
        setClickedTwitter(data.clicked_twitter);
        setClickedFarcaster(data.clicked_farcaster);
        setClickedDiscord(data.clicked_discord);
        setClickedWebsite(data.clicked_website);
      }
      setLoading(false);
    }

    loadProgress();
  }, [collaboration.id, walletAddress]);

  async function handleSocialClick(social: typeof socials[0]) {
    // Open the URL in new tab
    openUrl(social.url!);
    
    // Update local state
    social.setClicked(true);

    // Update database
    const updateField = `clicked_${social.key}`;
    
    // Check if we now have all required socials
    const newClickedCount = clickedCount + (social.clicked ? 0 : 1);
    const nowComplete = collaboration.require_all_socials
      ? newClickedCount === requiredSocials
      : newClickedCount > 0;
    
    await supabase
      .from('collaboration_claims')
      .upsert({
        collaboration_id: collaboration.id,
        wallet_address: walletAddress.toLowerCase(),
        [updateField]: true,
        completed_socials: nowComplete,
      }, {
        onConflict: 'collaboration_id,wallet_address'
      });
  }

  // Calculate time remaining
  const timeRemaining = collaboration.end_date
    ? Math.max(0, new Date(collaboration.end_date).getTime() - Date.now())
    : null;
  
  const daysRemaining = timeRemaining ? Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)) : null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin text-4xl">👁️</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="bg-gradient-to-br from-purple-900/95 to-black border-2 rounded-2xl max-w-md w-full overflow-hidden animate-scale-in"
        style={{ borderColor: collaboration.partner_color + '80' }}
      >
        {/* Header with co-branding */}
        <div 
          className="p-6 text-center relative"
          style={{ background: `linear-gradient(135deg, ${collaboration.partner_color}30, transparent)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>

          <div className="flex items-center justify-center gap-4 mb-4">
            {collaboration.partner_logo_url ? (
              <img
                src={collaboration.partner_logo_url}
                alt={collaboration.partner_name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: collaboration.partner_color }}
              >
                {collaboration.partner_name.charAt(0)}
              </div>
            )}
            <span className="text-2xl text-gray-500">×</span>
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <span className="text-3xl">👁️</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            🎁 {collaboration.partner_name} × Feylon
          </h2>
          <p className="text-gray-400 text-sm">Limited Time Collaboration</p>
        </div>

        <div className="p-6 space-y-6">
          {/* What you earn */}
          <div className="bg-black/30 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-2">Complete tasks and share to earn:</p>
            <div className="text-3xl font-bold" style={{ color: collaboration.partner_color }}>
              {collaboration.token_amount_per_claim} {collaboration.token_symbol}
            </div>
            <p className="text-xs text-gray-500 mt-1">+ regular Feylon rewards & points</p>
          </div>

          {/* Custom message */}
          {collaboration.custom_message && (
            <p className="text-center text-gray-300 text-sm italic">
              "{collaboration.custom_message}"
            </p>
          )}

          {/* Social requirements */}
          {socials.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 text-center">
                {collaboration.require_all_socials 
                  ? `Complete all ${requiredSocials} tasks:` 
                  : 'Complete at least one task:'}
              </p>
              <div className="space-y-2">
                {socials.map((social) => (
                  <button
                    key={social.key}
                    onClick={() => handleSocialClick(social)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                      social.clicked
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <span className="text-xl">{social.clicked ? '✓' : social.icon}</span>
                    <span className="flex-1 text-left">{social.label}</span>
                    {!social.clicked && <span className="text-gray-500">→</span>}
                  </button>
                ))}
              </div>
              {socials.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${(clickedCount / requiredSocials) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{clickedCount}/{requiredSocials}</span>
                </div>
              )}
            </div>
          )}

          {/* Status message */}
          {allComplete ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-green-400 font-medium">✓ Tasks complete!</p>
              <p className="text-sm text-gray-400 mt-1">
                Now share a Feylon to claim your {collaboration.token_symbol} bonus
              </p>
            </div>
          ) : (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
              <p className="text-purple-400 font-medium">Complete the tasks above</p>
              <p className="text-sm text-gray-400 mt-1">
                Then share a Feylon to earn bonus rewards
              </p>
            </div>
          )}

          {/* Done button */}
          <button
            onClick={onClose}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all"
          >
            {allComplete ? 'Done - Ready to Share!' : 'Close'}
          </button>

          {/* Stats footer */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2 border-t border-white/10">
            {daysRemaining !== null && (
              <span>⏰ {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>
            )}
            {collaboration.max_claims && (
              <span>📊 {Math.max(0, collaboration.max_claims - collaboration.claims_count)} remaining</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to get featured collaboration
export function useFeaturedCollaboration() {
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .lte('start_date', now)
        .single();

      // Filter out expired collabs client-side
      if (data && (!data.end_date || new Date(data.end_date) > new Date())) {
        setCollaboration(data);
      }
      setLoading(false);
    }

    load();
  }, []);

  return { collaboration, loading };
}

// Check if user is eligible for collab bonus (call after share)
export async function checkCollabEligibility(walletAddress: string): Promise<{
  eligible: boolean;
  collaboration?: Collaboration;
}> {
  try {
    const now = new Date().toISOString();
    
    // Get active featured collaboration
    const { data: collab } = await supabase
      .from('collaborations')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .lte('start_date', now)
      .single();

    if (!collab) return { eligible: false };

    // Check if expired
    if (collab.end_date && new Date(collab.end_date) < new Date()) {
      return { eligible: false };
    }

    // Check if sold out
    if (collab.max_claims && collab.claims_count >= collab.max_claims) {
      return { eligible: false };
    }

    if (collab.remaining_budget < collab.token_amount_per_claim) {
      return { eligible: false };
    }

    // Check user's progress
    const { data: claim } = await supabase
      .from('collaboration_claims')
      .select('*')
      .eq('collaboration_id', collab.id)
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    // Must have completed socials and not already claimed
    if (!claim || !claim.completed_socials || claim.claimed_reward) {
      return { eligible: false };
    }

    return { eligible: true, collaboration: collab };
  } catch (error) {
    console.error('Error checking collab eligibility:', error);
    return { eligible: false };
  }
}

// Mark collab as claimed (call after successful share)
export async function markCollabClaimed(
  collaborationId: string, 
  walletAddress: string,
  tokenAmount: number
): Promise<boolean> {
  try {
    // Update the claim record
    await supabase
      .from('collaboration_claims')
      .update({
        claimed_reward: true,
        claimed_at: new Date().toISOString(),
      })
      .eq('collaboration_id', collaborationId)
      .eq('wallet_address', walletAddress.toLowerCase());

    // Update collaboration stats
    const { data: collab } = await supabase
      .from('collaborations')
      .select('claims_count, remaining_budget')
      .eq('id', collaborationId)
      .single();

    if (collab) {
      await supabase
        .from('collaborations')
        .update({
          claims_count: (collab.claims_count || 0) + 1,
          remaining_budget: (collab.remaining_budget || 0) - tokenAmount,
        })
        .eq('id', collaborationId);
    }

    return true;
  } catch (error) {
    console.error('Error marking collab claimed:', error);
    return false;
  }
}

// Banner component for main page
export function CollaborationBanner({ 
  collaboration, 
  onClick,
  walletAddress,
}: { 
  collaboration: Collaboration;
  onClick: () => void;
  walletAddress: string;
}) {
  const [status, setStatus] = useState<'loading' | 'incomplete' | 'ready' | 'claimed'>('loading');

  useEffect(() => {
    async function checkStatus() {
      const { data } = await supabase
        .from('collaboration_claims')
        .select('completed_socials, claimed_reward')
        .eq('collaboration_id', collaboration.id)
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (data?.claimed_reward) {
        setStatus('claimed');
      } else if (data?.completed_socials) {
        setStatus('ready');
      } else {
        setStatus('incomplete');
      }
    }

    checkStatus();
  }, [collaboration.id, walletAddress]);

  // Don't show banner if already claimed
  if (status === 'claimed') return null;

  return (
    <button
      onClick={onClick}
      className="w-full bg-gradient-to-r from-purple-900/50 to-pink-900/50 border rounded-xl p-4 text-left hover:border-purple-400 transition-all group"
      style={{ 
        borderColor: collaboration.partner_color + '60',
        background: `linear-gradient(135deg, ${collaboration.partner_color}20, rgba(168, 85, 247, 0.2))`
      }}
    >
      <div className="flex items-center gap-4">
        {collaboration.partner_logo_url ? (
          <img
            src={collaboration.partner_logo_url}
            alt={collaboration.partner_name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: collaboration.partner_color }}
          >
            {collaboration.partner_name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              🎁 {collaboration.partner_name} Collab
            </span>
            {status === 'ready' ? (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                ✓ READY
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {status === 'ready' 
              ? `Share to claim ${collaboration.token_amount_per_claim} ${collaboration.token_symbol}!`
              : `Earn ${collaboration.token_amount_per_claim} ${collaboration.token_symbol} per share`
            }
          </p>
        </div>
        <div className="text-gray-400 group-hover:text-white transition-colors">
          →
        </div>
      </div>
    </button>
  );
}
