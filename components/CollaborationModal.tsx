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
  onClose: () => void;
  openUrl: (url: string) => void;
}

// Full-screen intro modal shown when app opens with active campaign
export function CollaborationModal({
  collaboration,
  onClose,
  openUrl,
}: CollaborationModalProps) {
  
  const socials = [
    { key: 'twitter', url: collaboration.twitter_url, label: 'Follow on X', icon: '𝕏' },
    { key: 'farcaster', url: collaboration.farcaster_url, label: 'Follow on Warpcast', icon: '🟪' },
    { key: 'discord', url: collaboration.discord_url, label: 'Join Discord', icon: '💬' },
    { key: 'website', url: collaboration.website_url, label: 'Visit Website', icon: '🌐' },
  ].filter(s => s.url);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
      {/* Background gradient */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: `linear-gradient(135deg, ${collaboration.partner_color}30 0%, #000 50%, rgba(168, 85, 247, 0.2) 100%)` 
        }}
      />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white text-2xl p-2"
      >
        ✕
      </button>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        
        {/* Partner logo */}
        <div className="mb-6">
          {collaboration.partner_logo_url ? (
            <img
              src={collaboration.partner_logo_url}
              alt={collaboration.partner_name}
              className="w-24 h-24 rounded-2xl object-cover mx-auto"
              style={{ boxShadow: `0 0 40px ${collaboration.partner_color}50` }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold mx-auto"
              style={{ backgroundColor: collaboration.partner_color }}
            >
              {collaboration.partner_name.charAt(0)}
            </div>
          )}
        </div>

        {/* Partner name + Feylon */}
        <h1 className="text-2xl font-bold text-white mb-2">
          {collaboration.partner_name} × Feylon
        </h1>
        <p className="text-gray-400 text-sm mb-6">Limited Time Collaboration</p>

        {/* Reward amount - big and prominent */}
        <div 
          className="bg-black/50 border rounded-2xl px-8 py-6 mb-6"
          style={{ borderColor: collaboration.partner_color + '50' }}
        >
          <p className="text-gray-400 text-sm mb-2">Earn per share:</p>
          <div 
            className="text-4xl font-black"
            style={{ color: collaboration.partner_color }}
          >
            {collaboration.token_amount_per_claim.toLocaleString()} {collaboration.token_symbol}
          </div>
          <p className="text-gray-500 text-xs mt-2">+ regular Feylon rewards</p>
        </div>

        {/* Custom message from partner */}
        {collaboration.custom_message && (
          <p className="text-gray-300 text-sm mb-6 max-w-xs italic">
            "{collaboration.custom_message}"
          </p>
        )}

        {/* Social CTAs */}
        {socials.length > 0 && (
          <div className="w-full max-w-xs space-y-3 mb-8">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">
              Support the partner
            </p>
            {socials.map((social) => (
              <button
                key={social.key}
                onClick={() => openUrl(social.url!)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all bg-white/10 hover:bg-white/20 text-white"
              >
                <span className="text-xl">{social.icon}</span>
                <span>{social.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={onClose}
          className="w-full max-w-xs py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all"
        >
          Start Sharing 👁️
        </button>
      </div>
    </div>
  );
}

// Small banner for main page (shown after modal dismissed)
export function CollaborationBanner({ 
  collaboration, 
  onClick,
  walletAddress,
}: { 
  collaboration: Collaboration;
  onClick: () => void;
  walletAddress: string;
}) {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const { data } = await supabase
        .from('collaboration_claims')
        .select('claimed_reward')
        .eq('collaboration_id', collaboration.id)
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      setClaimed(data?.claimed_reward || false);
      setLoading(false);
    }

    checkStatus();
  }, [collaboration.id, walletAddress]);

  // Don't show banner if already claimed or still loading
  if (loading || claimed) return null;

  return (
    <button
      onClick={onClick}
      className="w-full bg-gradient-to-r from-purple-900/50 to-pink-900/50 border rounded-xl p-3 text-left hover:border-purple-400 transition-all group"
      style={{ 
        borderColor: collaboration.partner_color + '60',
        background: `linear-gradient(135deg, ${collaboration.partner_color}20, rgba(168, 85, 247, 0.2))`
      }}
    >
      <div className="flex items-center gap-3">
        {collaboration.partner_logo_url ? (
          <img
            src={collaboration.partner_logo_url}
            alt={collaboration.partner_name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: collaboration.partner_color }}
          >
            {collaboration.partner_name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">
              🎁 {collaboration.partner_name}
            </span>
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded flex-shrink-0">
              LIVE
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate">
            {collaboration.token_amount_per_claim.toLocaleString()} {collaboration.token_symbol} per share
          </p>
        </div>
        <div className="text-gray-400 group-hover:text-white transition-colors flex-shrink-0">
          →
        </div>
      </div>
    </button>
  );
}

// Hook to get featured collaboration
export function useFeaturedCollaboration() {
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .single();

      if (data && !error) {
        // Check if not expired
        if (data.end_date && new Date(data.end_date) < new Date()) {
          setCollaboration(null);
        } 
        // Check if not sold out
        else if (data.max_claims && data.claims_count >= data.max_claims) {
          setCollaboration(null);
        }
        // Check if has budget
        else if (data.remaining_budget < data.token_amount_per_claim) {
          setCollaboration(null);
        }
        else {
          setCollaboration(data);
        }
      }
      
      setLoading(false);
    }

    load();
  }, []);

  return { collaboration, loading };
}

// Hook to check if user has seen the collab intro modal this session
export function useCollabIntroSeen(collabId: string | null) {
  const [seen, setSeen] = useState(false);
  
  useEffect(() => {
    if (!collabId) return;
    
    // Check sessionStorage for this collab
    const key = `collab_intro_seen_${collabId}`;
    if (typeof window !== 'undefined') {
      const wasSeen = sessionStorage.getItem(key) === 'true';
      setSeen(wasSeen);
    }
  }, [collabId]);
  
  const markSeen = () => {
    if (!collabId) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`collab_intro_seen_${collabId}`, 'true');
    }
    setSeen(true);
  };
  
  return { seen, markSeen };
}

// Check if user can claim collab bonus (no gating, just check if already claimed)
export async function checkCollabEligibility(walletAddress: string): Promise<{
  eligible: boolean;
  collaboration?: Collaboration;
}> {
  try {
    // Get active featured collaboration
    const { data: collab } = await supabase
      .from('collaborations')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
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

    // Check if user already claimed this collab
    const { data: claim } = await supabase
      .from('collaboration_claims')
      .select('claimed_reward')
      .eq('collaboration_id', collab.id)
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    // If already claimed, not eligible
    if (claim?.claimed_reward) {
      return { eligible: false };
    }

    // Everyone with an active collab gets the bonus (no social gate)
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
    // Upsert the claim record (handles users who never clicked banner)
    await supabase
      .from('collaboration_claims')
      .upsert({
        collaboration_id: collaborationId,
        wallet_address: walletAddress.toLowerCase(),
        claimed_reward: true,
        claimed_at: new Date().toISOString(),
      }, {
        onConflict: 'collaboration_id,wallet_address'
      });

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
