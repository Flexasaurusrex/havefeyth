'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { recordInteraction, getAllInteractions, getUserProfile, getUserStats } from '@/lib/supabase';
import type { Interaction, UserProfile, UserStats } from '@/lib/supabase';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI } from '@/lib/contract';
import { RewardToast, type RewardItem } from '@/components/RewardToast';
import { formatEther } from 'viem';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useProfile } from '@/hooks/useProfile';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { hasProfile, loading: profileLoading, refresh } = useProfile();
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
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

  const { data: previewRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'previewClaim',
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    if (isConnected && !profileLoading && !hasProfile && address) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [isConnected, profileLoading, hasProfile, address]);

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

  function handleShareClick(platform: 'twitter' | 'farcaster') {
    if (!isConnected || !address || !message.trim()) return;
    
    setSelectedPlatform(platform);
    setPendingMessage(message);

    const shareText = `${message}\n\nShared with FEYLON 👁️\n${window.location.origin}`;
    const shareLink = platform === 'twitter'
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
      : `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
    
    setShareUrl(shareLink);
    window.open(shareLink, '_blank', 'width=600,height=400');
    setTimeout(() => setShowShareConfirm(true), 500);
  }

  async function handleClaimAfterShare() {
    if (!address || !selectedPlatform) return;
    
    setIsSharing(true);
    setShowShareConfirm(false);

    try {
      await recordInteraction(address, pendingMessage, selectedPlatform, shareUrl);
      
      const result = await writeContractAsync({
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
      
      // Reload user stats after claiming
      if (address) {
        const stats = await getUserStats(address);
        setUserStats(stats);
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-x-hidden">
      {/* USER PROFILE HEADER - Upper Right */}
      {isConnected && hasProfile && userProfile && (
        <div className="fixed top-4 right-4 z-40">
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-3 bg-gradient-to-r from-purple-900/80 to-pink-900/80 backdrop-blur-md border border-purple-500/50 rounded-full px-4 py-2 hover:border-purple-400/70 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg animate-glow-pulse">
                👁️
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-bold text-white">{userProfile.display_name}</div>
                {userStats && (
                  <div className="text-xs text-purple-300">{userStats.total_points} points</div>
                )}
              </div>
              <div className="text-white">
                {showProfileDropdown ? '▲' : '▼'}
              </div>
            </button>

            {/* Dropdown Menu */}
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

                <div className="p-4 border-t border-white/10">
                  <ConnectButton />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl mx-auto space-y-8 md:space-y-12 animate-fade-in">
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
            <div className="flex justify-center"><ConnectButton /></div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <textarea value={message} onChange={handleInputChange} placeholder="Share a message of goodwill or make your confession..." disabled={isSharing} className="w-full h-32 bg-transparent border border-white/20 rounded-lg p-3 md:p-4 text-base md:text-lg resize-none focus:outline-none focus:border-white/60 transition-colors placeholder:text-gray-600 disabled:opacity-50" />
              
              {message.trim() && (
                <div className="flex gap-3 md:gap-4 justify-center flex-col sm:flex-row">
                  <button onClick={() => handleShareClick('twitter')} disabled={isSharing || isConfirming} className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base">Share on 𝕏</button>
                  <button onClick={() => handleShareClick('farcaster')} disabled={isSharing || isConfirming} className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base">Share on Farcaster</button>
                </div>
              )}
              
              {showSuccess && !showToast && <div className="text-center text-green-500 text-lg animate-fade-in">✓ Shared! Processing rewards...</div>}
            </div>

            {!hasProfile && (
              <div className="text-center space-y-2">
                <p className="text-gray-500 text-sm">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                <div className="flex justify-center"><ConnectButton /></div>
              </div>
            )}
          </>
        )}

        {isConnected && address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase() && (
          <div className="text-center"><a href="/admin" className="text-gray-500 hover:text-white transition-colors text-sm">Admin Panel →</a></div>
        )}
      </div>

      <div className="w-full max-w-3xl mx-auto mt-12 md:mt-16 px-4 animate-fade-in">
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
              const hasProfile = feylon.display_name || feylon.twitter_handle || feylon.farcaster_handle;
              
              return (
                <div key={feylon.id} className="group bg-gradient-to-r from-purple-900/10 to-pink-900/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 md:p-4 hover:border-purple-500/30 transition-all duration-200 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex gap-3 md:gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-lg md:text-xl">👁️</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap text-xs md:text-sm">
                        <span className="font-semibold text-white truncate">{displayName}</span>
                        
                        {hasProfile && (
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
                        <span className={`px-2 py-1 rounded text-xs ${feylon.shared_platform === 'twitter' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{feylon.shared_platform === 'twitter' ? '𝕏' : '🟪'}</span>
                        {feylon.claimed && <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">✓ Claimed</span>}
                        <button onClick={() => {
                          const authorCredit = hasProfile ? `by ${displayName}${feylon.twitter_handle ? ` (@${feylon.twitter_handle})` : ''}` : `by Anon (${feylon.wallet_address.slice(0, 6)}...${feylon.wallet_address.slice(-4)})`;
                          const shareText = `Check out this Feylon ${authorCredit}:\n\n"${feylon.message}"\n\nShared via FEYLON 👁️\n${window.location.origin}`;
                          const encodedText = encodeURIComponent(shareText);
                          const shareUrl = feylon.shared_platform === 'twitter' ? `https://twitter.com/intent/tweet?text=${encodedText}` : `https://warpcast.com/~/compose?text=${encodedText}`;
                          window.open(shareUrl, '_blank', 'width=600,height=400');
                        }} className="ml-auto px-2 md:px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors text-xs whitespace-nowrap">🔄 Share</button>
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
              <button onClick={handleClaimAfterShare} disabled={isSharing || isConfirming} className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isSharing || isConfirming ? 'Claiming...' : 'Yes, I Shared! 🎁'}</button>
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
                  <span className="text-2xl">🎁</span> Earn Rewards
                </h3>
                <p className="leading-relaxed">
                  Every time you share a Feylon, you earn crypto rewards. Share on Twitter or Farcaster, and claim your tokens instantly.
                </p>
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
                  Create your profile, link your socials, and build your Feylon identity. Others can share your messages and amplify your voice.
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
        <OnboardingModal walletAddress={address} onComplete={() => { setShowOnboarding(false); refresh(); }} />
      )}

      {showToast && claimedRewards.length > 0 && (
        <RewardToast rewards={claimedRewards} onClose={() => { setShowToast(false); setClaimedRewards([]); }} />
      )}

      <style jsx global>{`
        html, body { overflow-x: hidden; max-width: 100vw; }
        @keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
      `}</style>
    </main>
  );
}
