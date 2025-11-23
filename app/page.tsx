'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { canUserInteract, recordInteraction, getAllInteractions } from '@/lib/supabase';
import type { Interaction } from '@/lib/supabase';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI } from '@/lib/contract';
import { formatDistanceToNow } from '@/lib/utils';
import { RewardToast, type RewardItem } from '@/components/RewardToast';
import { formatEther } from 'viem';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  const [message, setMessage] = useState('');
  const [isGlowing, setIsGlowing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'farcaster' | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<RewardItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  
  // Share confirmation modal state
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');

  // Social feed data
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  
  // Profile setup state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '',
    twitterHandle: '',
    farcasterHandle: '',
  });

  // Preview what user will claim
  const { data: previewRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'previewClaim',
    args: address ? [address] : undefined,
  });

  // Load all interactions for social feed
  useEffect(() => {
    async function loadInteractions() {
      const data = await getAllInteractions();
      setInteractions(data);
    }
    
    loadInteractions();
    
    // Auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(loadInteractions, 10000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isConfirmed && claimedRewards.length > 0) {
      setShowToast(true);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }
  }, [isConfirmed, claimedRewards]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsGlowing(e.target.value.length > 0);
  };

  // STEP 1: Open share window (NO WALLET YET!)
  const handleShareClick = (platform: 'twitter' | 'farcaster') => {
    if (!isConnected || !address || !message.trim()) return;
    
    setSelectedPlatform(platform);
    setPendingMessage(message);

    const shareText = `${message}\n\nShared with FEYLON 👁️\n${window.location.origin}`;
    
    let shareLink = '';
    
    if (platform === 'twitter') {
      shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    } else {
      shareLink = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
    }
    
    setShareUrl(shareLink);
    
    // Open share window FIRST
    window.open(shareLink, '_blank', 'width=600,height=400');
    
    // Show confirmation modal AFTER (slight delay so window opens first)
    setTimeout(() => {
      setShowShareConfirm(true);
    }, 500);
  };

  // STEP 2: User confirms they shared, NOW trigger wallet
  const handleClaimAfterShare = async () => {
    if (!address || !selectedPlatform) return;
    
    setIsSharing(true);
    setShowShareConfirm(false);

    try {
      console.log('🔍 Starting claim process...');
      console.log('📍 Address:', address);
      console.log('🎁 Preview rewards:', previewRewards);
      
      // Check if user has set profile - if not, show modal after share
      const hasProfile = profile.displayName || profile.twitterHandle || profile.farcasterHandle;
      
      // Record interaction in database with profile data
      await recordInteraction(
        address,
        pendingMessage,
        selectedPlatform,
        shareUrl,
        profile.displayName || undefined,
        profile.twitterHandle || undefined,
        profile.farcasterHandle || undefined
      );
      
      console.log('✅ Interaction recorded');
      
      // NOW trigger wallet transaction (AFTER share confirmed)
      console.log('💰 Calling claimReward...');
      const result = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'claimReward',
      });
      
      console.log('✅ Transaction sent:', result);
      
      // Get actual claimed rewards from preview
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
      
      // Show profile modal if they haven't set one yet
      if (!hasProfile) {
        setTimeout(() => {
          setShowProfileModal(true);
        }, 2000); // Show after success toast
      }
      
    } catch (error: any) {
      console.error('❌ Error claiming:', error);
      
      // Better error messages
      if (error?.message?.includes('user rejected')) {
        alert('Transaction cancelled. You can try again!');
      } else if (error?.message?.includes('insufficient funds')) {
        alert('Contract has insufficient tokens! Contact admin.');
      } else if (error?.message?.includes('Cooldown')) {
        alert('You must wait before claiming again!');
      } else if (error?.message?.includes('Blacklisted')) {
        alert('This address is not eligible to claim.');
      } else if (error?.message?.includes('paused')) {
        alert('Contract is paused. Try again later.');
      } else {
        alert(`Error: ${error?.shortMessage || error?.message || 'Unknown error'}`);
      }
    } finally {
      setIsSharing(false);
      setSelectedPlatform(null);
    }
  };

  // Cancel if user didn't actually share
  const handleCancelShare = () => {
    setShowShareConfirm(false);
    setIsSharing(false);
    setSelectedPlatform(null);
    setPendingMessage('');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl mx-auto space-y-12 animate-fade-in">
        <div className="text-center space-y-8">
          <h1 className="text-8xl font-light tracking-wider text-glow">
            FEYLON
          </h1>
          
          <div className={`flex justify-center transition-all duration-500 ${
            isGlowing ? 'animate-glow-pulse eye-glow-active' : 'eye-glow'
          }`}>
            <Image
              src="/feylon-logo.png"
              alt="Feylon Logo"
              width={200}
              height={200}
              className="select-none"
              priority
            />
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-gray-400 text-lg">
              Connect to share your message of goodwill or make your confession
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <textarea
                value={message}
                onChange={handleInputChange}
                placeholder="Share a message of goodwill or make your confession..."
                disabled={isSharing}
                className="w-full h-32 bg-transparent border border-white/20 rounded-lg p-4 text-lg resize-none focus:outline-none focus:border-white/60 transition-colors placeholder:text-gray-600 disabled:opacity-50"
              />
              
              {message.trim() && (
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => handleShareClick('twitter')}
                    disabled={isSharing || isConfirming}
                    className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Share on 𝕏
                  </button>
                  <button
                    onClick={() => handleShareClick('farcaster')}
                    disabled={isSharing || isConfirming}
                    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Share on Farcaster
                  </button>
                </div>
              )}
              
              {showSuccess && !showToast && (
                <div className="text-center text-green-500 text-lg animate-fade-in">
                  ✓ Shared! Processing rewards...
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <p className="text-gray-500 text-sm">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          </>
        )}

        {isConnected && address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase() && (
          <div className="text-center">
            <a
              href="/admin"
              className="text-gray-500 hover:text-white transition-colors text-sm"
            >
              Admin Panel →
            </a>
          </div>
        )}
      </div>

      {/* SOCIAL FEED - Reddit/Twitter Style Linear Feed */}
      <div className="w-full max-w-3xl mx-auto mt-16 px-4 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-light mb-2 text-glow">Recent Feylons</h2>
          <p className="text-gray-500">See what others are sharing 👁️</p>
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
                <div
                  key={feylon.id}
                  className="group bg-gradient-to-r from-purple-900/10 to-pink-900/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex gap-4">
                    {/* Left: Eye Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-xl">
                        👁️
                      </div>
                    </div>

                    {/* Center: Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-white">{displayName}</span>
                        
                        {hasProfile && (
                          <>
                            {feylon.twitter_handle && (
                              <a
                                href={`https://twitter.com/${feylon.twitter_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                @{feylon.twitter_handle}
                              </a>
                            )}
                            {feylon.farcaster_handle && (
                              <a
                                href={`https://warpcast.com/${feylon.farcaster_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                @{feylon.farcaster_handle}
                              </a>
                            )}
                          </>
                        )}
                        
                        <span className="text-xs text-gray-500 font-mono">
                          {feylon.wallet_address.slice(0, 6)}...{feylon.wallet_address.slice(-4)}
                        </span>
                        
                        <span className="text-xs text-gray-600">•</span>
                        
                        <span className="text-xs text-gray-500">
                          {new Date(feylon.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Message */}
                      <p className="text-gray-300 text-sm leading-relaxed mb-3">
                        "{feylon.message}"
                      </p>

                      {/* Footer */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          feylon.shared_platform === 'twitter' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {feylon.shared_platform === 'twitter' ? '𝕏' : '🟪'}
                        </span>
                        
                        {feylon.claimed && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                            ✓ Claimed
                          </span>
                        )}
                        
                        <button
                          onClick={() => {
                            const authorCredit = hasProfile 
                              ? `by ${displayName}${feylon.twitter_handle ? ` (@${feylon.twitter_handle})` : ''}`
                              : `by Anon (${feylon.wallet_address.slice(0, 6)}...${feylon.wallet_address.slice(-4)})`;
                            
                            const shareText = `Check out this Feylon ${authorCredit}:\n\n"${feylon.message}"\n\nShared via FEYLON 👁️\n${window.location.origin}`;
                            const encodedText = encodeURIComponent(shareText);
                            
                            const shareUrl = feylon.shared_platform === 'twitter'
                              ? `https://twitter.com/intent/tweet?text=${encodedText}`
                              : `https://warpcast.com/~/compose?text=${encodedText}`;
                            
                            window.open(shareUrl, '_blank', 'width=600,height=400');
                          }}
                          className="ml-auto px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors"
                        >
                          🔄 Share
                        </button>
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
            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm">
              Load More Feylons
            </button>
          </div>
        )}
      </div>

      {/* SHARE CONFIRMATION MODAL - CLEAN VERSION (NO WHITELIST MESSAGES) */}
      {showShareConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-purple-900 to-black border border-purple-500/50 rounded-2xl p-8 max-w-md mx-4 space-y-6 animate-scale-in">
            <div className="text-center">
              <div className="text-6xl mb-4">👁️</div>
              <h2 className="text-3xl font-bold mb-2">Did you share?</h2>
              <p className="text-gray-400">
                Click "Yes, I Shared!" to claim your rewards
              </p>
            </div>

            {previewRewards && previewRewards.length > 0 && (
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-sm text-gray-400 mb-2">You'll receive:</div>
                {previewRewards.map((reward: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="font-medium">{reward.name}</span>
                    <span className="text-green-400">
                      {formatEther(reward.amount)} {reward.symbol}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancelShare}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimAfterShare}
                disabled={isSharing || isConfirming}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing || isConfirming 
                  ? 'Claiming...' 
                  : 'Yes, I Shared! 🎁'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && claimedRewards.length > 0 && (
        <RewardToast
          rewards={claimedRewards}
          onClose={() => {
            setShowToast(false);
            setClaimedRewards([]);
          }}
        />
      )}

      {/* PROFILE SETUP MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-purple-900 to-black border border-purple-500/50 rounded-2xl p-8 max-w-md mx-4 space-y-6 animate-scale-in">
            <div className="text-center">
              <div className="text-6xl mb-4">👁️</div>
              <h2 className="text-3xl font-bold mb-2">Set Your Feylon Identity</h2>
              <p className="text-gray-400 text-sm">
                Optional: Add your name and socials so others can find you
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  placeholder="e.g. CryptoVibe"
                  className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Twitter Handle (optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">@</span>
                  <input
                    type="text"
                    value={profile.twitterHandle}
                    onChange={(e) => setProfile({ ...profile, twitterHandle: e.target.value.replace('@', '') })}
                    placeholder="username"
                    className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    maxLength={15}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Farcaster Handle (optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">@</span>
                  <input
                    type="text"
                    value={profile.farcasterHandle}
                    onChange={(e) => setProfile({ ...profile, farcasterHandle: e.target.value.replace('@', '') })}
                    placeholder="username"
                    className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all"
              >
                Save Profile ✓
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              You can always share anonymously by skipping this step
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
