'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { canUserInteract, recordInteraction } from '@/lib/supabase';
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
  const [canInteract, setCanInteract] = useState(true);
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'farcaster' | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<RewardItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  
  // NEW: Share confirmation modal state
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');

  // Preview what user will claim
  const { data: previewRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'previewClaim',
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    async function checkCooldown() {
      if (!address) return;
      
      const status = await canUserInteract(address);
      setCanInteract(status.canInteract);
      setNextAvailable(status.nextAvailable || null);
    }
    
    checkCooldown();
  }, [address]);

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
      // Record interaction in database
      await recordInteraction(
        address,
        pendingMessage,
        selectedPlatform,
        shareUrl
      );
      
      // NOW trigger wallet transaction (AFTER share confirmed)
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'claimReward',
      });
      
      // Get actual claimed rewards from preview
      if (previewRewards && Array.isArray(previewRewards)) {
        const formattedRewards: RewardItem[] = previewRewards.map((reward: any) => ({
          name: reward.name,
          symbol: reward.symbol,
          amount: formatEther(reward.amount),
          type: reward.rewardType === 0 ? 'ERC20' : reward.rewardType === 1 ? 'ERC721' : 'ERC1155',
        }));
        setClaimedRewards(formattedRewards);
      }
      
      setMessage('');
      setPendingMessage('');
      setIsGlowing(false);
      setCanInteract(false);
      
    } catch (error: any) {
      console.error('Error claiming:', error);
      if (error?.message?.includes('user rejected')) {
        alert('Transaction cancelled. You can try again!');
      } else {
        alert('Error claiming rewards. Please try again.');
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
              Connect to share your message of goodwill
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
                placeholder="Share a message of goodwill or make a confession..."
                disabled={!canInteract || isSharing}
                className="w-full h-32 bg-transparent border border-white/20 rounded-lg p-4 text-lg resize-none focus:outline-none focus:border-white/60 transition-colors placeholder:text-gray-600 disabled:opacity-50"
              />
              
              {!canInteract && nextAvailable && (
                <p className="text-yellow-500 text-center">
                  Next interaction available {formatDistanceToNow(new Date(nextAvailable))}
                </p>
              )}
              
              {canInteract && message.trim() && (
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

      {/* SHARE CONFIRMATION MODAL */}
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
              >
                {isSharing || isConfirming ? 'Claiming...' : 'Yes, I Shared! 🎁'}
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
