'use client';

import { useState, useEffect, useMemo } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { recordInteraction, getAllInteractions, getUserProfile, getUserStats, canUserConfess, canUserShare, recordConfession, deleteInteraction, findUserProfile, linkFidToProfile } from '@/lib/supabase';
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

export const dynamic = 'force-dynamic';

function FloatingTransmission({ message, style, delay }: { message: string; style: React.CSSProperties; delay: number }) {
  return (
    <div
      className="fixed pointer-events-none select-none whitespace-nowrap animate-float-transmission"
      style={{
        ...style,
        animationDelay: `${delay}s`,
        opacity: 0,
      }}
    >
      <span className="text-sm md:text-base italic">"{message.length > 60 ? message.slice(0, 60) + '...' : message}"</span>
    </div>
  );
}

function FloatingTransmissions({ interactions }: { interactions: Interaction[] }) {
  const ghostMessages = useMemo(() => {
    if (interactions.length === 0) return [];
    
    const messages = interactions.slice(0, 12);
    
    return messages.map((interaction, i) => {
      const colors = [
        'rgba(255, 255, 255, 0.25)',
        'rgba(200, 200, 200, 0.22)',
        'rgba(245, 245, 220, 0.23)',
        'rgba(220, 220, 220, 0.20)',
        'rgba(255, 250, 240, 0.22)',
      ];
      
      return {
        id: interaction.id,
        message: interaction.message,
        style: {
          left: `${5 + Math.random() * 85}%`,
          top: `${10 + Math.random() * 75}%`,
          color: colors[i % colors.length],
          fontSize: `${0.7 + Math.random() * 0.4}rem`,
          transform: `rotate(${-8 + Math.random() * 16}deg)`,
        },
        delay: i * 3 + Math.random() * 5,
      };
    });
  }, [interactions]);

  if (ghostMessages.length === 0) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {ghostMessages.map((ghost) => (
        <FloatingTransmission
          key={ghost.id}
          message={ghost.message}
          style={ghost.style}
          delay={ghost.delay}
        />
      ))}
    </div>
  );
}

function FloatingAvatars({ interactions }: { interactions: Interaction[] }) {
  const avatars = useMemo(() => {
    if (interactions.length === 0) return [];
    
    // Get unique wallet addresses
    const uniqueWallets = Array.from(new Set(interactions.map(i => i.wallet_address))).slice(0, 8);
    
    return uniqueWallets.map((wallet, i) => ({
      wallet,
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
          <Avatar walletAddress={avatar.wallet} size={40} />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { 
    isConnected, 
    isReady, 
    address, 
    isInMiniApp, 
    farcasterUser,
    sendContractTransaction,
    openUrl,
    isPending,
    isConfirming,
    isConfirmed,
    txHash,
    resetTxState
  } = useWallet();
  
  const { hasProfile, loading: profileLoading, refresh } = useProfile();
  
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

  const isAdmin = address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

  const { data: previewRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'previewClaim',
    args: address ? [address as `0x${string}`] : undefined,
  });

  useEffect(() => {
    async function handleFarcasterUser() {
      if (!isInMiniApp || !farcasterUser || !address) return;
      
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
    
    if (isReady && isInMiniApp && farcasterUser) {
      handleFarcasterUser();
    }
  }, [isReady, isInMiniApp, farcasterUser, address, refresh]);

  useEffect(() => {
    if (isConnected && !profileLoading && !hasProfile && address && isReady) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [isConnected, profileLoading, hasProfile, address, isReady]);

  useEffect(() => {
    async function loadInteractions() {
      const data = await getAllInteractions();
      setInteractions(data);
    }
    
    loadInteractions();
    const interval = setInterval(loadInteractions, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadUserData() {
      if (!address || !hasProfile) return;
      
      const [profile, stats] = await Promise.all([
        getUserProfile(address),
        getUserStats(address)
      ]);
      
      setUserProfile(profile);
      setUserStats(stats);
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
      alert(`Please wait! Next share available in ${shareCooldown}`);
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
      alert('Please wait for the cooldown period to end');
      return;
    }
    
    setIsSharing(true);

    try {
      const result = await recordConfession(address, message);
      
      if (!result.success) {
        alert(result.error || 'Failed to post confession');
        setIsSharing(false);
        return;
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
      alert('Failed to post confession');
    } finally {
      setIsSharing(false);
    }
  }

  async function handleClaimAfterShare() {
    if (!address || !selectedPlatform) return;
    
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
        userProfile?.farcaster_handle
      );
      
      if (!interactionResult.success) {
        alert(interactionResult.error || 'You must wait before sharing again!');
        setIsSharing(false);
        setSelectedPlatform(null);
        return;
      }
      
      const result = await sendContractTransaction({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'claimReward',
      });
      
      if (previewRewards && Array.isArray(previewRewards)) {
        const formattedRewards: RewardItem[] = previewRewards.map((reward: any) => ({
          tokenAddress: reward.tokenAddress,
          rewardType: reward.rewardType,
          name: reward.name,
          symbol: reward.symbol,
          amount: formatEther(reward.amount),
          tokenId: reward.tokenId,
          type: reward.rewardType === 0 ? 'ERC20' : reward.rewardType === 1 ? 'ERC721' : 'ERC1155',
        }));
        setClaimedRewards(formattedRewards);
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
        alert('Transaction cancelled. You can try again!');
      } else if (error?.message?.includes('Cooldown')) {
        alert('You must wait before claiming again!');
      } else {
        alert(`Error: ${error?.shortMessage || error?.message || 'Unknown error'}`);
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

    if (!confirm('Are you sure you want to delete this Feylon? This cannot be undone.')) {
      return;
    }

    setDeletingId(interactionId);

    try {
      const result = await deleteInteraction(interactionId, address);
      
      if (!result.success) {
        alert(result.error || 'Failed to delete interaction');
        return;
      }

      const newInteractions = await getAllInteractions();
      setInteractions(newInteractions);
    } catch (error) {
      console.error('Error deleting interaction:', error);
      alert('Failed to delete interaction');
    } finally {
      setDeletingId(null);
    }
  }

  if (!isReady) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-pulse">👁️</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-x-hidden relative">
      <FloatingTransmissions interactions={interactions} />
      <FloatingAvatars interactions={interactions} />

      {isInMiniApp && (
        <div className="fixed top-4 left-4 z-40 px-3 py-1 bg-purple-600/80 backdrop-blur-sm rounded-full text-xs text-white">
          🟪 Warpcast
        </div>
      )}

      {isConnected && hasProfile && userProfile && (
        <div className="fixed top-4 right-4 z-40">
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-3 bg-gradient-to-r from-purple-900/80 to-pink-900/80 backdrop-blur-md border border-purple-500/50 rounded-full px-4 py-2 hover:border-purple-400/70 transition-all group"
            >
              <Avatar
                walletAddress={address!}
                customImageUrl={userProfile.profile_image_url || farcasterUser?.pfpUrl}
                size={32}
              />
              <div className="hidden md:block text-left">
                <div className="text-sm font-bold text-white">
                  {userProfile.display_name || farcasterUser?.displayName || farcasterUser?.username}
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

                {!isInMiniApp && (
                  <div className="p-4 border-t border-white/10">
                    <ConnectButton />
                  </div>
                )}
                
                {isInMiniApp && address && (
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
            <p className="text-gray-400 text-base md:text-lg">Connect to share your message of goodwill or make your confession</p>
            {!isInMiniApp ? (
              <div className="flex justify-center"><ConnectButton /></div>
            ) : (
              <div className="text-center text-purple-400">
                <div className="animate-pulse">Connecting to Warplet...</div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {hasProfile && (
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
                      💡 Confessions post to feed only (no social share) • 3-day cooldown between confessions
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!canShareState ? (
                      <>
                        <div className="flex gap-3 md:gap-4 justify-center flex-col sm:flex-row">
                          <button disabled className="px-6 py-3 bg-gray-600 text-gray-400 font-medium rounded-lg cursor-not-allowed text-sm md:text-base">
                            Share on 𝕏 (10pts)
                          </button>
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
                        <button onClick={() => handleShareClick('twitter')} disabled={isSharing || isConfirming || isPending} className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base">Share on 𝕏 (10pts)</button>
                        <button onClick={() => handleShareClick('farcaster')} disabled={isSharing || isConfirming || isPending} className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base">Share on Farcaster (10pts)</button>
                      </div>
                    )}
                  </div>
                )
              )}
              
              {showSuccess && !showToast && <div className="text-center text-green-500 text-lg animate-fade-in">✓ {confessionMode ? 'Confession posted!' : 'Shared! Processing rewards...'}</div>}
            </div>

            {!hasProfile && (
              <div className="text-center space-y-2">
                <p className="text-gray-500 text-sm">
                  {isInMiniApp && farcasterUser 
                    ? `Connected as @${farcasterUser.username}` 
                    : `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
                  }
                </p>
                {!isInMiniApp && (
                  <div className="flex justify-center"><ConnectButton /></div>
                )}
              </div>
            )}
          </>
        )}

        {isConnected && isAdmin && (
          <div className="text-center"><a href="/admin" className="text-gray-500 hover:text-white transition-colors text-sm">Admin Panel →</a></div>
        )}
      </div>

      <div className="w-full max-w-3xl mx-auto mt-12 md:mt-16 px-4 animate-fade-in relative z-10">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-light mb-2 text-glow">Recent Feylons</h2>
          <p className="text-gray-500 text-sm md:text-base">See what others are sharing 👁️</p>
        </div>

        {interactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👁️</div>
            <p className="text-gray-500">No Feylons yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.slice(0, 20).map((feylon, index) => {
              const displayName = feylon.display_name || 'Anon';
              const hasFeylonProfile = feylon.display_name || feylon.twitter_handle || feylon.farcaster_handle;
              const isConfessionPost = feylon.is_confession;
              
              return (
                <div key={feylon.id} className="group bg-gradient-to-r from-purple-900/10 to-pink-900/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 md:p-4 hover:border-purple-500/30 transition-all duration-200 animate-fade-in relative" style={{ animationDelay: `${index * 0.05}s` }}>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteInteraction(feylon.id)}
                      disabled={deletingId === feylon.id}
                      className="absolute top-2 right-2 p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete this Feylon"
                    >
                      {deletingId === feylon.id ? (
                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <span className="text-sm">🗑️</span>
                      )}
                    </button>
                  )}

                  <div className="flex gap-3 md:gap-4">
                    <div className="flex-shrink-0">
                      <Avatar
                        walletAddress={feylon.wallet_address}
                        customImageUrl={hasFeylonProfile ? (feylon as any).profile_image_url : null}
                        size={40}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap text-xs md:text-sm">
                        <span className="font-semibold text-white truncate">{displayName}</span>
                        
                        {isConfessionPost && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            🤫 Confession
                          </span>
                        )}
                        
                        {hasFeylonProfile && !isConfessionPost && (
                          <>
                            {feylon.twitter_handle && <a href={`https://twitter.com/${feylon.twitter_handle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors truncate">@{feylon.twitter_handle}</a>}
                            {feylon.farcaster_handle && <a href={`https://warpcast.com/${feylon.farcaster_handle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 transition-colors truncate">@{feylon.farcaster_handle}</a>}
                          </>
                        )}
                        
                        <span className="text-xs text-gray-500 font-mono hidden sm:inline">{feylon.wallet_address.slice(0, 6)}...{feylon.wallet_address.slice(-4)}</span>
                        <span className="text-xs text-gray-600 hidden sm:inline">•</span>
                        <span className="text-xs text-gray-500">{new Date(feylon.created_at).toLocaleDateString()}</span>
                      </div>

                      <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-3 break-words">"{feylon.message}"</p>

                      <div className="flex items-center gap-2 md:gap-3 text-xs flex-wrap">
                        {!isConfessionPost && (
                          <span className={`px-2 py-1 rounded text-xs ${feylon.shared_platform === 'twitter' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {feylon.shared_platform === 'twitter' ? '𝕏' : '🟪'}
                          </span>
                        )}
                        
                        {feylon.claimed && !isConfessionPost && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                            ✓ Claimed
                          </span>
                        )}
                        
                        {!isConfessionPost && (
                          <button onClick={() => {
                            const authorCredit = hasFeylonProfile ? `by ${displayName}${feylon.twitter_handle ? ` (@${feylon.twitter_handle})` : ''}` : `by Anon (${feylon.wallet_address.slice(0, 6)}...${feylon.wallet_address.slice(-4)})`;
                            const shareText = `Check out this Feylon ${authorCredit}:\n\n"${feylon.message}"\n\nShared via FEYLON 👁️\n${window.location.origin}`;
                            const encodedText = encodeURIComponent(shareText);
                            const shareUrlLink = feylon.shared_platform === 'twitter' ? `https://twitter.com/intent/tweet?text=${encodedText}` : `https://warpcast.com/~/compose?text=${encodedText}`;
                            openUrl(shareUrlLink);
                          }} className="ml-auto px-2 md:px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors text-xs whitespace-nowrap">🔄 Share</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {interactions.length > 20 && (
          <div className="text-center mt-6">
            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm">Load More Feylons</button>
          </div>
        )}
      </div>

      {showShareConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-purple-900 to-black border border-purple-500/50 rounded-2xl p-8 max-w-md mx-4 space-y-6 animate-scale-in">
            <div className="text-center">
              <div className="text-6xl mb-4">👁️</div>
              <h2 className="text-3xl font-bold mb-2">Did you share?</h2>
              <p className="text-gray-400">Click "Yes, I Shared!" to claim your rewards</p>
            </div>

            {previewRewards && previewRewards.length > 0 && (
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-sm text-gray-400 mb-2">You'll receive:</div>
                {previewRewards.map((reward: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="font-medium">{reward.name}</span>
                    <span className="text-green-400">{formatEther(reward.amount)} {reward.symbol}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleCancelShare} className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">Cancel</button>
              <button onClick={handleClaimAfterShare} disabled={isSharing || isConfirming || isPending} className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isSharing || isConfirming || isPending ? 'Claiming...' : 'Yes, I Shared! 🎁'}</button>
            </div>
          </div>
        </div>
      )}

      {showWhatIsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-gradient-to-br from-purple-900/90 via-black to-pink-900/90 border-2 border-purple-500/50 rounded-2xl max-w-2xl w-full p-8 md:p-12 space-y-6 animate-scale-in relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowWhatIsModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-2xl">✕</button>

            <div className="text-center space-y-4">
              <div className="text-7xl">👁️</div>
              <h2 className="text-4xl md:text-5xl font-light tracking-wider text-glow">What is a Feylon?</h2>
            </div>

            <div className="space-y-6 text-gray-300">
              <div className="bg-black/30 border border-purple-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">💭</span> Share Your Truth
                </h3>
                <p className="leading-relaxed">
                  A Feylon is a message of goodwill or confession shared on social media. It could be something uplifting, a deep thought, or something you need to get off your chest.
                </p>
              </div>

              <div className="bg-black/30 border border-pink-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎯</span> Two Ways to Share
                </h3>
                <div className="space-y-4">
                  <div className="bg-black/20 border border-blue-500/20 rounded-lg p-4">
                    <div className="font-bold text-blue-400 mb-2">🌐 Social Share Mode (10 points)</div>
                    <ul className="text-sm space-y-1 text-gray-400">
                      <li>• Share on Twitter or Farcaster</li>
                      <li>• Build daily streaks for bonus points</li>
                      <li>• Claim contract rewards instantly</li>
                      <li>• Appears in feed with your profile</li>
                    </ul>
                  </div>
                  
                  <div className="bg-black/20 border border-purple-500/20 rounded-lg p-4">
                    <div className="font-bold text-purple-400 mb-2">🤫 Confession Mode (5 points)</div>
                    <ul className="text-sm space-y-1 text-gray-400">
                      <li>• Post anonymously to feed only</li>
                      <li>• No social media sharing required</li>
                      <li>• 3-day cooldown between confessions</li>
                      <li>• Perfect for private thoughts</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 border border-purple-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏆</span> Compete & Climb
                </h3>
                <p className="leading-relaxed">
                  Build streaks by sharing daily. Earn bonus points and climb the leaderboard. Show the world your dedication.
                </p>
              </div>

              <div className="bg-black/30 border border-pink-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">✨</span> Build Your Reputation
                </h3>
                <p className="leading-relaxed">
                  Create your profile, upload a custom avatar (or rock your unique pixel ghost!), link your socials, and build your Feylon identity.
                </p>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-white/10">
              <button onClick={() => setShowWhatIsModal(false)} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all transform hover:scale-105">
                Got it! Let's Share 🔥
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && address && (
        <OnboardingModal 
          walletAddress={address} 
          onComplete={() => { setShowOnboarding(false); refresh(); }} 
          farcasterUser={farcasterUser || undefined}
        />
      )}

      {showToast && claimedRewards.length > 0 && (
        <RewardToast rewards={claimedRewards} onClose={() => { setShowToast(false); setClaimedRewards([]); }} />
      )}

      <style jsx global>{`
        html, body { overflow-x: hidden; max-width: 100vw; }
        @keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        
        @keyframes float-transmission {
          0% {
            opacity: 0;
            transform: translateY(20px) translateX(0);
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) translateX(20px);
          }
        }
        
        .animate-float-transmission {
          animation: float-transmission 25s ease-in-out infinite;
        }
        
        @keyframes float-avatar {
          0% {
            opacity: 0;
            transform: translateY(30px) rotate(-5deg);
          }
          15% {
            opacity: 0.25;
          }
          85% {
            opacity: 0.25;
          }
          100% {
            opacity: 0;
            transform: translateY(-40px) rotate(5deg);
          }
        }
        
        .animate-float-avatar {
          animation: float-avatar 30s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
