'use client';

import { useState, useEffect, useMemo } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { recordInteraction, getAllInteractions, getUserProfile, getUserStats, canUserConfess, canUserShare, recordConfession, deleteInteraction, findUserProfile, linkFidToProfile, supabase, markInteractionAsClaimed } from '@/lib/supabase';
import type { Interaction, UserProfile, UserStats } from '@/lib/supabase';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI } from '@/lib/contract';
import { RewardToast, type RewardItem } from '@/components/RewardToast';
import { formatEther } from 'viem';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useProfile } from '@/hooks/useProfile';
import { Avatar } from '@/components/PixelGhost';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';
import { useReadContract } from 'wagmi';
import { 
  CollaborationModal, 
  CollaborationBanner, 
  useFeaturedCollaboration,
  useCollabIntroSeen,
  checkCollabEligibility,
  markCollabClaimed 
} from '@/components/CollaborationModal';

export const dynamic = 'force-dynamic';

function NotificationToast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const bgColor = type === 'success' ? 'bg-green-500/90' : type === 'error' ? 'bg-red-500/90' : 'bg-purple-500/90';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  
  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in max-w-sm`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">✕</button>
    </div>
  );
}

interface Transmission {
  id: string;
  secret: string;
  display_name?: string;
  created_at: string;
}

const ghostColors = [
  { text: 'text-purple-300/40', name: 'text-purple-400/40', glow: 'rgba(168, 85, 247, 0.6)' },
  { text: 'text-pink-300/40', name: 'text-pink-400/40', glow: 'rgba(236, 72, 153, 0.6)' },
  { text: 'text-blue-300/40', name: 'text-blue-400/40', glow: 'rgba(96, 165, 250, 0.6)' },
  { text: 'text-cyan-300/40', name: 'text-cyan-400/40', glow: 'rgba(103, 232, 249, 0.6)' },
  { text: 'text-violet-300/40', name: 'text-violet-400/40', glow: 'rgba(167, 139, 250, 0.6)' },
  { text: 'text-fuchsia-300/40', name: 'text-fuchsia-400/40', glow: 'rgba(232, 121, 249, 0.6)' },
];

function SplashExperience() {
  const [secret, setSecret] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isGlowing, setIsGlowing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTransmitted, setHasTransmitted] = useState(false);
  const [showEye, setShowEye] = useState(true);
  const [floatingSecrets, setFloatingSecrets] = useState<Transmission[]>([]);

  useEffect(() => {
    async function loadSecrets() {
      const { data, error } = await supabase
        .from('transmissions')
        .select('id, secret, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (!error && data) {
        setFloatingSecrets(data);
      }
    }
    
    loadSecrets();
    const interval = setInterval(loadSecrets, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!secret.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('transmissions')
        .insert({
          secret: secret.trim(),
          display_name: displayName.trim() || null,
          ip_address: null,
          user_agent: navigator.userAgent,
        });
      
      if (error) throw error;
      
      setHasTransmitted(true);
      setSecret('');
      setDisplayName('');
      
      setTimeout(() => {
        setShowEye(false);
      }, 3000);
      
      setTimeout(() => {
        setHasTransmitted(false);
        setShowEye(true);
      }, 8000);
      
    } catch (error) {
      console.error('Error transmitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingSecrets.map((transmission, index) => {
          const gridColumns = 3;
          const gridRows = 5;
          const col = index % gridColumns;
          const row = Math.floor(index / gridColumns);
          
          const baseLeft = (col / gridColumns) * 100;
          const baseTop = (row / gridRows) * 100;
          const randomOffsetX = (Math.random() - 0.5) * 15;
          const randomOffsetY = (Math.random() - 0.5) * 10;
          
          const randomDelay = Math.random() * 10;
          const randomDuration = 15 + Math.random() * 10;
          
          const colorSet = ghostColors[index % ghostColors.length];
          
          return (
            <div
              key={transmission.id}
              className={`absolute ${colorSet.text} text-sm blur-[0.8px] hover:blur-[0.3px] hover:opacity-70 transition-all duration-700 whitespace-nowrap animate-float-splash`}
              style={{
                top: `${baseTop + randomOffsetY}%`,
                left: `${baseLeft + randomOffsetX}%`,
                animationDelay: `${randomDelay}s`,
                animationDuration: `${randomDuration}s`,
                textShadow: `0 0 12px ${colorSet.glow}, 0 0 20px ${colorSet.glow}`,
              }}
            >
              <div className="flex flex-col items-start">
                <span className={`text-xs ${colorSet.name} mb-1`}>
                  {transmission.display_name || 'Anonymous'}
                </span>
                <span className="max-w-xs truncate">
                  &quot;{transmission.secret.slice(0, 60)}{transmission.secret.length > 60 ? '...' : ''}&quot;
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="relative z-10 max-w-2xl w-full space-y-8 text-center animate-fade-in">
        <div className={`relative w-80 h-80 mx-auto mb-8 transition-all duration-1000 ${
          showEye ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}>
          <img
            src="/feylonloop.gif"
            alt=""
            width={320}
            height={320}
            className="rounded-full w-full h-full object-cover"
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-2xl animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-light tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient">
            FEYLON
          </h1>
          <p className="text-gray-500 text-sm tracking-widest">
            The Eye Sees All
          </p>
        </div>

        {!hasTransmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6 mt-12">
            <div className="relative">
              <p className="text-gray-400 mb-4 text-sm">
                Whisper a secret truth to the Eye
              </p>
              
              <div className={`relative transition-all duration-300 ${isGlowing ? 'scale-105' : ''}`}>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  onFocus={() => setIsGlowing(true)}
                  onBlur={() => setIsGlowing(false)}
                  placeholder="Your secret transmission..."
                  maxLength={280}
                  className={`w-full bg-black/50 border-2 rounded-2xl p-4 text-center text-white placeholder-gray-600 focus:outline-none transition-all duration-300 ${
                    isGlowing 
                      ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]' 
                      : 'border-white/20'
                  }`}
                  disabled={isSubmitting}
                />
                
                {isGlowing && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl -z-10 animate-pulse" />
                )}
              </div>
              
              <p className="text-xs text-gray-600 mt-2">
                {secret.length}/280
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Anonymous"
                maxLength={30}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-center text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-600 mt-1">
                (optional - leave blank to stay anonymous)
              </p>
            </div>

            <button
              type="submit"
              disabled={!secret.trim() || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-full transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Transmitting...' : 'Transmit to the Eye'}
            </button>
          </form>
        ) : (
          <div className="space-y-6 mt-12 animate-fade-in">
            <div className="relative">
              <div className="text-5xl mb-4 animate-pulse">👁️</div>
              <p className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-8">
                The Eye has received your Transmission
              </p>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl -z-10 animate-pulse" />
            </div>
            
            <div className="pt-8 space-y-2">
              <p className="text-3xl font-light text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 tracking-wider">
                THE EYE AWAKENS
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-12 space-y-6">
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6 space-y-4">
            <p className="text-white font-medium">🎁 Earn rewards by sharing on Farcaster</p>
            <p className="text-gray-400 text-sm">Open Warpcast → Mini Apps → Search "Feylon" to start sharing and earning.</p>
            
              href="https://warpcast.com/feylon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-full transition-all duration-300 hover:scale-105"
            >
              🟪 Follow @feylon on Warpcast
            </a>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/about"
              className="px-6 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-400 font-medium rounded-full transition-all duration-300 hover:scale-105"
            >
              👁️ What is Feylon?
            </Link>
          </div>
        </div>

        <div className="pt-8">
          <p className="text-xs text-gray-600 tracking-widest">
            SOMETHING IS WATCHING
          </p>
        </div>
      </div>
    </div>
  );
}

function FloatingAvatars({ interactions }: { interactions: Interaction[] }) {
  const avatars = useMemo(() => {
    if (interactions.length === 0) return [];
    
    const walletImageMap = new Map<string, string | undefined>();
    interactions.forEach(i => {
      if (!walletImageMap.has(i.wallet_address) && i.profile_image_url) {
        walletImageMap.set(i.wallet_address, i.profile_image_url);
      }
    });
    
    const uniqueWallets = Array.from(new Set(interactions.map(i => i.wallet_address))).slice(0, 8);
    
    return uniqueWallets.map((wallet, i) => ({
      wallet,
      profileImage: walletImageMap.get(wallet),
      style: {
        left: `${10 + Math.random() * 80}%`,
        top: `${15 + Math.random() * 70}%`,
      },
      opacity: 0.15 + Math.random() * 0.15,
      scale: 0.6 + Math.random() * 0.4,
      delay: i * 4 + Math.random() * 8,
    }));
  }, [interactions]);

  if (avatars.length === 0) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {avatars.map((avatar) => (
        <div
          key={avatar.wallet}
          className="fixed animate-float-avatar"
          style={{
            left: avatar.style.left,
            top: avatar.style.top,
            opacity: avatar.opacity,
            transform: `scale(${avatar.scale})`,
            animationDelay: `${avatar.delay}s`,
          }}
        >
          <Avatar 
            walletAddress={avatar.wallet} 
            customImageUrl={avatar.profileImage}
            size={40} 
          />
        </div>
      ))}
    </div>
  );
}

function MiniAppExperience() {
  const { 
    isConnected, 
    isReady, 
    address, 
    isInMiniApp, 
    farcasterUser,
    connectionState,
    connectionMessage,
    retry,
    sendContractTransaction,
    openUrl,
    showNotification,
    notification,
    clearNotification,
    isPending,
    isConfirming,
    isConfirmed,
    txHash,
    resetTxState
  } = useWallet();
  
  const { hasProfile, loading: profileLoading, refresh } = useProfile();
  
  const { collaboration: featuredCollab } = useFeaturedCollaboration();
  const { seen: collabIntroSeen, markSeen: markCollabIntroSeen } = useCollabIntroSeen(featuredCollab?.id || null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabBonusEarned, setCollabBonusEarned] = useState<{ amount: number; symbol: string } | null>(null);
  
  useEffect(() => {
    if (hasProfile && featuredCollab && !collabIntroSeen && !profileLoading) {
      setShowCollabModal(true);
    }
  }, [hasProfile, featuredCollab, collabIntroSeen, profileLoading]);
  
  const handleCloseCollabModal = () => {
    markCollabIntroSeen();
    setShowCollabModal(false);
  };
  
  const [message, setMessage] = useState('');
  const [isGlowing, setIsGlowing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'farcaster' | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<RewardItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWhatIsModal, setShowWhatIsModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [confessionMode, setConfessionMode] = useState(false);
  const [canConfess, setCanConfess] = useState(true);
  const [nextConfessionDate, setNextConfessionDate] = useState<Date | null>(null);
  const [confessionCooldown, setConfessionCooldown] = useState('');

  const [canShareState, setCanShareState] = useState(true);
  const [nextShareDate, setNextShareDate] = useState<Date | null>(null);
  const [shareCooldown, setShareCooldown] = useState('');

  const [openRankEligible, setOpenRankEligible] = useState(false);
  const [openRankReason, setOpenRankReason] = useState('');
  const [openRankChecking, setOpenRankChecking] = useState(false);
  
  const [farcasterHandled, setFarcasterHandled] = useState(false);

  const isAdmin = address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

  const { data: previewRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'previewClaim',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  useEffect(() => {
    async function checkEligibility() {
      if (!farcasterUser?.fid) return;
      
      setOpenRankChecking(true);
      try {
        const response = await fetch('/api/check-openrank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: farcasterUser.fid,
            hasPowerBadge: (farcasterUser as any).powerBadge || false,
            followerCount: (farcasterUser as any).followerCount || 0
          })
        });
        
        const result = await response.json();
        setOpenRankEligible(result.eligible);
        if (!result.eligible) {
          setOpenRankReason(result.reason || 'Account not eligible for rewards');
        }
      } catch (error) {
        console.error('OpenRank check error:', error);
        setOpenRankEligible(false);
        setOpenRankReason('Unable to verify eligibility. Please refresh and try again.');
      } finally {
        setOpenRankChecking(false);
      }
    }
    
    if (farcasterUser) {
      checkEligibility();
    }
  }, [farcasterUser]);

  useEffect(() => {
    async function handleFarcasterUser() {
      if (!farcasterUser || !address || farcasterHandled) return;
      
      setFarcasterHandled(true);
      
      const existingProfile = await findUserProfile(
        farcasterUser.fid.toString(),
        farcasterUser.username,
        address
      );
      
      if (existingProfile) {
        if (!existingProfile.farcaster_fid) {
          await linkFidToProfile(
            farcasterUser.fid.toString(),
            farcasterUser.username,
            address
          );
        }
        setUserProfile(existingProfile as UserProfile);
        refresh();
      }
    }
    
    if (isReady && farcasterUser) {
      handleFarcasterUser();
    }
  }, [isReady, farcasterUser, address, farcasterHandled, refresh]);

  useEffect(() => {
    if (isConnected && !profileLoading && !hasProfile && !userProfile && address && isReady) {
      setShowOnboarding(true);
    }
  }, [isConnected, profileLoading, hasProfile, userProfile, address, isReady]);

  useEffect(() => {
    if ((hasProfile || userProfile) && showOnboarding) {
      setShowOnboarding(false);
    }
  }, [hasProfile, userProfile, showOnboarding]);

  useEffect(() => {
    async function loadInteractions() {
      const data = await getAllInteractions();
      setInteractions(data);
    }
    
    loadInteractions();
  }, []);

  useEffect(() => {
    async function loadUserData() {
      if (!address || !hasProfile) return;
      
      try {
        const [profile, stats] = await Promise.all([
          getUserProfile(address),
          getUserStats(address)
        ]);
        
        setUserProfile(profile);
        setUserStats(stats);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
    
    if (isConnected && hasProfile) {
      loadUserData();
    }
  }, [address, isConnected, hasProfile]);

  useEffect(() => {
    async function checkConfession() {
      if (!address) return;
      
      const result = await canUserConfess(address);
      setCanConfess(result.canConfess);
      
      if (!result.canConfess && result.nextAvailable) {
        setNextConfessionDate(result.nextAvailable);
      }
    }
    
    if (isConnected && hasProfile) {
      checkConfession();
    }
  }, [address, isConnected, hasProfile]);

  useEffect(() => {
    async function checkShare() {
      if (!address) return;
      
      const result = await canUserShare(address);
      setCanShareState(result.canShare);
      
      if (!result.canShare && result.nextAvailable) {
        setNextShareDate(result.nextAvailable);
      }
    }
    
    if (isConnected && hasProfile) {
      checkShare();
    }
  }, [address, isConnected, hasProfile]);

  useEffect(() => {
    if (!nextConfessionDate || canConfess) {
      setConfessionCooldown('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = nextConfessionDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCanConfess(true);
        setConfessionCooldown('');
        setNextConfessionDate(null);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setConfessionCooldown(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setConfessionCooldown(`${hours}h ${minutes}m`);
      } else {
        setConfessionCooldown(`${minutes}m`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [nextConfessionDate, canConfess]);

  useEffect(() => {
    if (!nextShareDate || canShareState) {
      setShareCooldown('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = nextShareDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCanShareState(true);
        setShareCooldown('');
        setNextShareDate(null);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setShareCooldown(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [nextShareDate, canShareState]);

  useEffect(() => {
    if (isConfirmed && claimedRewards.length > 0) {
      setShowToast(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [isConfirmed, claimedRewards]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(e.target.value);
    setIsGlowing(e.target.value.length > 0);
  }

  async function handleShareClick(platform: 'twitter' | 'farcaster') {
    if (!isConnected || !address || !message.trim()) return;
    
    if (!canShareState) {
      showNotification(`Please wait! Next share available in ${shareCooldown}`, 'error');
      return;
    }
    
    setSelectedPlatform(platform);
    setPendingMessage(message);

    const shareText = `${message}\n\nShared with FEYLON 👁️\n${window.location.origin}`;
    const shareLink = platform === 'twitter'
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
      : `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
    
    setShareUrl(shareLink);
    await openUrl(shareLink);
    setTimeout(() => setShowShareConfirm(true), 500);
  }

  async function handleConfession() {
    if (!address || !message.trim()) return;
    
    if (!canConfess) {
      showNotification('Please wait for the cooldown period to end', 'error');
      return;
    }
    
    setIsSharing(true);

    try {
      const result = await recordConfession(address, message);
      
      if (!result.success) {
        showNotification(result.error || 'Failed to post confession', 'error');
        setIsSharing(false);
        return;
      }

      const collabResult = await checkCollabEligibility(address, true);
      
      if (collabResult.eligible && collabResult.collaboration) {
        if (!farcasterUser?.fid) {
          showNotification('Unable to verify your account. Please reconnect your Farcaster account.', 'error');
          setIsSharing(false);
          return;
        }
        
        const openRankResponse = await fetch('/api/check-openrank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: farcasterUser.fid,
            hasPowerBadge: (farcasterUser as any).powerBadge || false,
            followerCount: (farcasterUser as any).followerCount || 0
          })
        });
        
        const openRankResult = await openRankResponse.json();
        
        if (!openRankResult.eligible) {
          showNotification(openRankResult.reason || 'Your account is not eligible for token rewards yet. DM @flexasaurusrex to appeal!', 'error');
          setIsSharing(false);
          return;
        }

        await markCollabClaimed(
          collabResult.collaboration.id, 
          address, 
          collabResult.collaboration.token_amount_per_claim
        );
        
        setCollabBonusEarned({
          amount: collabResult.collaboration.token_amount_per_claim,
          symbol: collabResult.collaboration.token_symbol || 'tokens'
        });
        
        showNotification(
          `Confession posted! +${collabResult.collaboration.token_amount_per_claim.toLocaleString()} ${collabResult.collaboration.token_symbol} will be airdropped at end of collab! 🤫`, 
          'success'
        );
      } else {
        showNotification('Confession posted! 🤫', 'success');
      }
      
      setMessage('');
      setIsGlowing(false);
      setShowSuccess(true);
      
      const [stats, newInteractions] = await Promise.all([
        getUserStats(address),
        getAllInteractions()
      ]);
      
      setUserStats(stats);
      setInteractions(newInteractions);
      
      const confessionCheck = await canUserConfess(address);
      setCanConfess(confessionCheck.canConfess);
      if (!confessionCheck.canConfess && confessionCheck.nextAvailable) {
        setNextConfessionDate(confessionCheck.nextAvailable);
      }
      
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      console.error('Error posting confession:', error);
      showNotification('Failed to post confession', 'error');
    } finally {
      setIsSharing(false);
    }
  }

  async function handleClaimAfterShare() {
    if (!address || !selectedPlatform) return;
    
    if (!farcasterUser?.fid) {
      showNotification('Unable to verify your account. Please reconnect your Farcaster account.', 'error');
      setShowShareConfirm(false);
      setSelectedPlatform(null);
      return;
    }
    
    const openRankResponse = await fetch('/api/check-openrank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: farcasterUser.fid,
        hasPowerBadge: (farcasterUser as any).powerBadge || false,
        followerCount: (farcasterUser as any).followerCount || 0
      })
    });
    
    const openRankResult = await openRankResponse.json();
    
    if (!openRankResult.eligible) {
      showNotification(openRankResult.reason || 'Your account is not eligible for token rewards yet. DM @flexasaurusrex to appeal!', 'error');
      setShowShareConfirm(false);
      setSelectedPlatform(null);
      return;
    }
    
    setIsSharing(true);
    setShowShareConfirm(false);

    try {
      const interactionResult = await recordInteraction(
        address, 
        pendingMessage, 
        selectedPlatform, 
        shareUrl,
        userProfile?.display_name,
        userProfile?.twitter_handle,
        userProfile?.farcaster_handle,
        userProfile?.profile_image_url || farcasterUser?.pfpUrl
      );
      
      if (!interactionResult.success) {
        showNotification(interactionResult.error || 'You must wait before sharing again!', 'error');
        setIsSharing(false);
        setSelectedPlatform(null);
        return;
      }
      
      const collabResult = await checkCollabEligibility(address);
      if (collabResult.eligible && collabResult.collaboration) {
        await markCollabClaimed(
          collabResult.collaboration.id, 
          address, 
          collabResult.collaboration.token_amount_per_claim
        );
        setCollabBonusEarned({
          amount: collabResult.collaboration.token_amount_per_claim,
          symbol: collabResult.collaboration.token_symbol || 'tokens'
        });
        
        showNotification(
          `Claim successful! +${collabResult.collaboration.token_amount_per_claim.toLocaleString()} ${collabResult.collaboration.token_symbol} will be airdropped at end of collab! 🎁`,
          'success'
        );
      } else {
        showNotification('Share recorded! 🎁', 'success');
      }
      
      setMessage('');
      setPendingMessage('');
      setIsGlowing(false);
      
      if (address) {
        const [stats, newInteractions, shareCheck] = await Promise.all([
          getUserStats(address),
          getAllInteractions(),
          canUserShare(address)
        ]);
        setUserStats(stats);
        setInteractions(newInteractions);
        setCanShareState(shareCheck.canShare);
        if (!shareCheck.canShare && shareCheck.nextAvailable) {
          setNextShareDate(shareCheck.nextAvailable);
        }
      }
    } catch (error: any) {
      console.error('Error claiming:', error);
      if (error?.message?.includes('user rejected')) {
        showNotification('Transaction cancelled. You can try again!', 'info');
      } else if (error?.message?.includes('Cooldown')) {
        showNotification('You must wait before claiming again!', 'error');
      } else {
        showNotification(`Error: ${error?.shortMessage || error?.message || 'Unknown error'}`, 'error');
      }
    } finally {
      setIsSharing(false);
      setSelectedPlatform(null);
    }
  }

  function handleCancelShare() {
    setShowShareConfirm(false);
    setIsSharing(false);
    setSelectedPlatform(null);
    setPendingMessage('');
  }

  async function handleDeleteInteraction(interactionId: string) {
    if (!address || !isAdmin) return;

    setDeletingId(interactionId);

    try {
      const result = await deleteInteraction(interactionId, address);
      
      if (!result.success) {
        showNotification(result.error || 'Failed to delete interaction', 'error');
        return;
      }

      const newInteractions = await getAllInteractions();
      setInteractions(newInteractions);
      showNotification('Feylon deleted', 'success');
    } catch (error) {
      console.error('Error deleting interaction:', error);
      showNotification('Failed to delete interaction', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const showUserDropdown = isConnected && (hasProfile || userProfile) && (userProfile || farcasterUser);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-x-hidden relative">
      {notification && (
        <NotificationToast 
          message={notification.message} 
          type={notification.type} 
          onClose={clearNotification} 
        />
      )}

      <FloatingAvatars interactions={interactions} />

      <div className="fixed top-4 left-4 z-40 px-3 py-1 bg-purple-600/80 backdrop-blur-sm rounded-full text-xs text-white">
        🟪 Warpcast
      </div>

      {showUserDropdown && (
        <div className="fixed top-4 right-4 z-40">
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-3 bg-gradient-to-r from-purple-900/80 to-pink-900/80 backdrop-blur-md border border-purple-500/50 rounded-full px-4 py-2 hover:border-purple-400/70 transition-all group"
            >
              <Avatar
                walletAddress={address!}
                customImageUrl={userProfile?.profile_image_url || farcasterUser?.pfpUrl}
                size={32}
              />
              <div className="hidden md:block text-left">
                <div className="text-sm font-bold text-white">
                  {userProfile?.display_name || farcasterUser?.displayName || farcasterUser?.username || 'User'}
                </div>
                {userStats && (
                  <div className="text-xs text-purple-300">{userStats.total_points} points</div>
                )}
              </div>
              <div className="text-white text-xs">
                {showProfileDropdown ? '▲' : '▼'}
              </div>
            </button>

            {showProfileDropdown && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-gradient-to-br from-purple-900/95 to-black/95 backdrop-blur-md border border-purple-500/50 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                {userStats && (
                  <div className="p-4 border-b border-white/10">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold text-purple-400">{userStats.total_points}</div>
                        <div className="text-xs text-gray-400">Points</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-400">{userStats.feylons_shared}</div>
                        <div className="text-xs text-gray-400">Shared</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <div className="text-2xl font-bold text-orange-400">{userStats.current_streak}</div>
                          {userStats.current_streak > 0 && <span className="text-lg">🔥</span>}
                        </div>
                        <div className="text-xs text-gray-400">Streak</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">{userStats.feylons_received_shares}</div>
                        <div className="text-xs text-gray-400">Received</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-2">
                  <Link href="/profile">
                    <button
                      onClick={() => setShowProfileDropdown(false)}
                      className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center gap-3"
                    >
                      <span className="text-lg">⚙️</span>
                      <span>Edit Profile</span>
                    </button>
                  </Link>

                  <Link href="/leaderboard">
                    <button
                      onClick={() => setShowProfileDropdown(false)}
                      className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center gap-3"
                    >
                      <span className="text-lg">🏆</span>
                      <span>Leaderboard</span>
                    </button>
                  </Link>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowWhatIsModal(true);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center gap-3"
                  >
                    <span className="text-lg">❓</span>
                    <span>What is a Feylon?</span>
                  </button>
                </div>
                
                {address && (
                  <div className="p-4 border-t border-white/10 text-center">
                    <div className="text-xs text-gray-400">Warplet</div>
                    <div className="text-xs text-purple-400 font-mono">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl mx-auto space-y-8 md:space-y-12 animate-fade-in relative z-10">
        <div className="text-center space-y-6 md:space-y-8">
          <h1 className="text-6xl md:text-8xl font-light tracking-wider text-glow">
            FEYLON
          </h1>

          <button
            onClick={() => setShowWhatIsModal(true)}
            className="text-sm text-gray-500 hover:text-purple-400 transition-colors underline decoration-dotted underline-offset-4"
          >
            What is a Feylon? 👁️
          </button>
          
          <div className={`flex justify-center transition-all duration-500 ${isGlowing ? 'animate-glow-pulse eye-glow-active' : 'eye-glow'}`}>
            <Image src="/feylon-logo.png" alt="Feylon Logo" width={150} height={150} className="select-none md:w-[200px] md:h-[200px]" priority />
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center space-y-4 px-4">
            <p className="text-gray-400 text-base md:text-lg">
              Connect to share your message of goodwill or make your confession
            </p>
            <div className="text-center">
              {(connectionState === 'connecting' || connectionState === 'awaiting-confirmation') && (
                <div className="space-y-3">
                  <div className="text-purple-400 animate-pulse">
                    {connectionMessage || 'Connecting to Warplet...'}
                  </div>
                  {connectionState === 'awaiting-confirmation' && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 max-w-sm mx-auto">
                      <p className="text-sm text-purple-300 mb-2">📱 Check your Warpcast mobile app</p>
                      <p className="text-xs text-gray-400">You may need to approve wallet access on your phone</p>
                    </div>
                  )}
                </div>
              )}
              {connectionState === 'failed' && (
                <div className="space-y-3">
                  <div className="text-red-400">{connectionMessage || 'Connection failed'}</div>
                  <button
                    onClick={retry}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Tap to Retry
                  </button>
                  <p className="text-gray-600 text-xs">If this keeps happening, try closing and reopening the app</p>
                </div>
              )}
              {connectionState === 'idle' && isInMiniApp && (
                <div className="space-y-3">
                  <div className="text-gray-500">Waiting for wallet...</div>
                  <button
                    onClick={retry}
                    className="px-6 py-2 bg-purple-600/50 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Tap to Connect
                  </button>
                </div>
              )}
              {connectionState === 'idle' && !isInMiniApp && (
                <div className="text-gray-500">Loading...</div>
              )}
            </div>
          </div>
        ) : (
          <>
            {!openRankEligible && !openRankChecking && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center mx-4">
                <p className="text-red-400 font-medium">⚠️ Not eligible for token rewards</p>
                <p className="text-sm text-gray-400 mt-2">
                  New to Farcaster? DM <a href="https://warpcast.com/flexasaurusrex" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">@flexasaurusrex</a> to appeal!
                </p>
                <p className="text-xs text-gray-500 mt-2">You can still share Feylons and earn points, but token claims are restricted to prevent bots.</p>
              </div>
            )}

            {openRankChecking && (
              <div className="text-center text-purple-400 text-sm">
                <div className="animate-pulse">Checking eligibility...</div>
              </div>
            )}

            {featuredCollab && (hasProfile || userProfile) && (

              <CollaborationBanner 
                collaboration={featuredCollab} 
                onClick={() => setShowCollabModal(true)} 
              />
            )}

            <div className="space-y-6">
              {(hasProfile || userProfile) && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className={`text-sm ${!confessionMode ? 'text-white font-bold' : 'text-gray-500'}`}>
                    Social Share (10pts)
                  </span>
                  <button
                    onClick={() => setConfessionMode(!confessionMode)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      confessionMode ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      confessionMode ? 'transform translate-x-7' : ''
                    }`} />
                  </button>
                  <span className={`text-sm ${confessionMode ? 'text-white font-bold' : 'text-gray-500'}`}>
                    Confession (5pts) 🤫
                  </span>
                </div>
              )}

              <textarea 
                value={message} 
                onChange={handleInputChange} 
                placeholder={confessionMode ? "Share your confession anonymously..." : "Share a message of goodwill or make your confession..."} 
                disabled={isSharing} 
                className="w-full h-32 bg-transparent border border-white/20 rounded-lg p-3 md:p-4 text-base md:text-lg resize-none focus:outline-none focus:border-white/60 transition-colors placeholder:text-gray-600 disabled:opacity-50" 
              />
              
              {message.trim() && (
                confessionMode ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleConfession}
                      disabled={isSharing || !canConfess}
                      className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-base md:text-lg"
                    >
                      {isSharing ? 'Posting...' : canConfess ? 'Post Confession 🤫 (5 points)' : `Cooldown: ${confessionCooldown}`}
                    </button>
                    
                    {!canConfess && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-400 text-center">
                        ⏰ Next confession available in {confessionCooldown}
                      </div>
                    )}
                    
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-xs text-gray-400 text-center">
                      💡 Confessions post to feed only (no social share) • {featuredCollab?.allow_confession_claims ? '24-hour' : '3-day'} cooldown between confessions
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!canShareState ? (
                      <>
                        <div className="flex gap-3 md:gap-4 justify-center flex-col sm:flex-row">
                          <button disabled className="px-6 py-3 bg-gray-600 text-gray-400 font-medium rounded-lg cursor-not-allowed text-sm md:text-base">
                            Share on Farcaster (10pts)
                          </button>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-400 text-center">
                          ⏰ Next share available in {shareCooldown}
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-3 md:gap-4 justify-center flex-col sm:flex-row">
                        <button onClick={() => handleShareClick('farcaster')} disabled={isSharing || isConfirming || isPending} className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base">Share on Farcaster (10pts)</button>
                      </div>
                    )}
                  </div>
                )
              )}
              
              {showSuccess && !showToast && <div className="text-center text-green-500 text-lg animate-fade-in">✓ {confessionMode ? 'Confession posted!' : 'Shared! Processing rewards...'}</div>}
            </div>

            {!hasProfile && !userProfile && (
              <div className="text-center space-y-2">
                <p className="text-gray-500 text-sm">
                  {farcasterUser 
                    ? `Connected as @${farcasterUser.username}` 
                    : `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
                  }
                </p>
              </div>
            )}
          </>
        )}

        {isConnected && isAdmin && (
          <div className="text-center"><a href="/admin" className="text-gray-500 hover:text-white transition-colors text-sm">Admin Panel →</a></div>
        )}
      </div>

      {showCollabModal && featuredCollab && (
        <CollaborationModal
          collaboration={featuredCollab}
          onClose={handleCloseCollabModal}
          openUrl={openUrl}
        />
      )}

      {showOnboarding && address && (
        <OnboardingModal 
          walletAddress={address} 
          onComplete={() => { setShowOnboarding(false); refresh(); }} 
          farcasterUser={farcasterUser || undefined}
        />
      )}

      {showToast && claimedRewards.length > 0 && (
        <RewardToast 
          rewards={claimedRewards} 
          collabBonus={collabBonusEarned || undefined}
          onClose={() => { 
            setShowToast(false); 
            setClaimedRewards([]); 
            setCollabBonusEarned(null);
          }} 
        />
      )}
    </main>
  );
}

export default function Home() {
  const { isInMiniApp, isReady } = useWallet();

  if (!isReady) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-pulse">👁️</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (isInMiniApp) {
    return <MiniAppExperience />;
  }

  return <SplashExperience />;
}

const styles = `
  html, body { overflow-x: hidden; max-width: 100vw; }
  
  @keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .animate-scale-in { animation: scale-in 0.3s ease-out; }
  
  @keyframes float-avatar {
    0% { opacity: 0; transform: translateY(30px) rotate(-5deg); }
    15% { opacity: 0.25; }
    85% { opacity: 0.25; }
    100% { opacity: 0; transform: translateY(-40px) rotate(5deg); }
  }
  .animate-float-avatar { animation: float-avatar 30s ease-in-out infinite; }
  
  @keyframes gradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fade-in 0.6s ease-out; }
  
  @keyframes float-splash {
    0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
    10% { opacity: 0.3; }
    50% { transform: translateY(-30px) translateX(20px); opacity: 0.5; }
    90% { opacity: 0.3; }
  }
  .animate-float-splash { animation: float-splash linear infinite; }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
