'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI } from '@/lib/contract';
import { saveInteraction } from '@/lib/supabase';
import Image from 'next/image';
import RewardToast from '@/components/RewardToast';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);

  const { data: canClaim } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
  });

  const { data: timeUntilNextClaim } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'timeUntilNextClaim',
    args: address ? [address] : undefined,
  });

  const { data: hash, writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isConfirmed && claimedRewards.length > 0) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setClaimedRewards([]);
      }, 8000);
    }
  }, [isConfirmed, claimedRewards]);

  const handleShare = async (platform: 'twitter' | 'farcaster') => {
    if (!message.trim() || !address) {
      alert('Please enter a message and connect your wallet');
      return;
    }

    setIsSharing(true);

    try {
      const shareText = encodeURIComponent(message);
      let shareUrl = '';

      if (platform === 'twitter') {
        shareUrl = `https://twitter.com/intent/tweet?text=${shareText}`;
      } else if (platform === 'farcaster') {
        shareUrl = `https://warpcast.com/~/compose?text=${shareText}`;
      }

      window.open(shareUrl, '_blank', 'width=600,height=400');

      await saveInteraction({
        wallet_address: address,
        message: message.trim(),
        shared_platform: platform,
        claimed: false,
      });

      setTimeout(() => {
        handleClaim();
      }, 2000);
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share message');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClaim = async () => {
    if (!address || !canClaim) {
      alert('You cannot claim rewards yet');
      return;
    }

    try {
      const result = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'claimReward',
      });

      console.log('Claim transaction:', result);
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      
      if (error?.message?.includes('user rejected')) {
        alert('Transaction cancelled');
      } else if (error?.message?.includes('Cannot claim yet')) {
        alert('Please wait for cooldown period');
      } else {
        alert(`Claim failed: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  const formatTimeRemaining = (seconds: bigint | undefined) => {
    if (!seconds) return 'N/A';
    const totalSeconds = Number(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      
      <div className="absolute top-4 right-4 z-50">
        <ConnectButton />
      </div>

      {address && (
        
          href="/admin"
          className="absolute top-4 left-4 z-50 text-gray-400 hover:text-white transition-colors text-sm"
        >
          Admin →
        </a>
      )}

      <div className="relative z-10 max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <Image
              src="/feylon-logo.png"
              alt="Feylon"
              width={120}
              height={120}
              className="rounded-full"
              priority
            />
          </div>
          
          <h1 className="text-6xl font-light tracking-wider">
            FEYLON
          </h1>
          <p className="text-gray-400 text-lg">
            Share your vision. Claim rewards.
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
            <p className="text-gray-400 mb-4">Connect your wallet to start</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your thoughts with the world..."
                className="w-full h-32 bg-black/50 border border-white/20 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                maxLength={280}
              />
              <div className="text-right text-sm text-gray-500 mt-2">
                {message.length}/280
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleShare('twitter')}
                disabled={isSharing || !message.trim()}
                className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>𝕏</span>
                Share on X
              </button>
              
              <button
                onClick={() => handleShare('farcaster')}
                disabled={isSharing || !message.trim()}
                className="px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>🎯</span>
                Share on Farcaster
              </button>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Reward Status</h3>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  canClaim ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {canClaim ? '✓ Ready' : '○ Cooldown'}
                </div>
              </div>
              
              {!canClaim && timeUntilNextClaim && Number(timeUntilNextClaim) > 0 && (
                <div className="text-sm text-gray-400">
                  Next claim in: {formatTimeRemaining(timeUntilNextClaim)}
                </div>
              )}

              {isConfirming && (
                <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-center">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-white/20 border-t-white rounded-full mb-2" />
                  <p className="text-sm text-blue-400">Claiming rewards...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showToast && claimedRewards.length > 0 && (
        <RewardToast rewards={claimedRewards} onClose={() => setShowToast(false)} />
      )}

      <footer className="absolute bottom-4 text-center text-gray-500 text-sm">
        <p>Powered by Base • Multi-Reward Distribution</p>
      </footer>
    </main>
  );
}
