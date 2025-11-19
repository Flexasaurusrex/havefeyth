'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { canUserInteract, recordInteraction } from '@/lib/supabase';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI } from '@/lib/contract';
import { formatDistanceToNow } from '@/lib/utils';
import { RewardToast, type RewardItem } from '@/components/RewardToast';

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

  useEffect(() => {
    async function checkCooldown() {
      if (!address) return;
      
      const status = await canUserInteract(address);
      setCanInteract(status.canInteract);
      setNextAvailable(status.nextAvailable || null);
    }
    
    checkCooldown();
  }, [address]);

  // Watch for transaction confirmation
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

  const handleShare = async (platform: 'twitter' | 'farcaster') => {
    if (!isConnected || !address || !message.trim()) return;
    
    setSelectedPlatform(platform);
    setIsSharing(true);

    try {
      const shareText = `${message}\n\nShared with HAVE FEYTH 👁️\n${window.location.origin}`;
      
      let shareLink = '';
      
      if (platform === 'twitter') {
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      } else {
        shareLink = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
      }
      
      window.open(shareLink, '_blank', 'width=600,height=400');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await recordInteraction(
        address,
        message,
        platform,
        shareLink
      );
      
      // Call contract and get rewards
      if (writeContractAsync) {
        const result = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: HAVE_FEYTH_MULTI_REWARD_ABI,
          functionName: 'claimReward',
        });
        
        // The transaction will emit RewardsClaimed event with details
        // We'll parse it from the transaction receipt
        // For now, we'll fetch from preview
        try {
          const { request } = await fetch(`https://mainnet.base.org`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_call',
              params: [{
                to: CONTRACT_ADDRESS,
                data: '0x...' // previewClaim encoded call
              }, 'latest']
            })
          }).then(r => r.json());
          
          // In practice, you'd decode the event logs
          // For simplicity, setting dummy rewards here
          // In production, parse the transaction receipt
          setClaimedRewards([
            // These will come from the transaction logs
          ]);
        } catch (error) {
          console.error('Error fetching rewards:', error);
        }
      }
      
      setMessage('');
      setIsGlowing(false);
      setCanInteract(false);
      
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Error processing your share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl mx-auto space-y-12 animate-fade-in">
        <div className="text-center space-y-8">
          <h1 className="text-8xl font-light tracking-wider text-glow">
            HAVE FEYTH
          </h1>
          
          <div className={`flex justify-center transition-all duration-500 ${
            isGlowing ? 'animate-glow-pulse eye-glow-active' : 'eye-glow'
          }`}>
            <Image
              src="/logo.png"
              alt="Eye Logo"
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
                    onClick={() => handleShare('twitter')}
                    disabled={isSharing || isConfirming}
                    className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSharing && selectedPlatform === 'twitter' 
                      ? 'Sharing...' 
                      : isConfirming && selectedPlatform === 'twitter'
                      ? 'Confirming...'
                      : 'Share on 𝕏'}
                  </button>
                  <button
                    onClick={() => handleShare('farcaster')}
                    disabled={isSharing || isConfirming}
                    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSharing && selectedPlatform === 'farcaster' 
                      ? 'Sharing...' 
                      : isConfirming && selectedPlatform === 'farcaster'
                      ? 'Confirming...'
                      : 'Share on Farcaster'}
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

      {/* Reward Toast Modal */}
      {showToast && claimedRewards.length > 0 && (
        <RewardToast
          rewards={claimedRewards}
          onClose={() => {
            setShowToast(false);
            setClaimedRewards([]);
          }}
        />
      )}
    </main>
  );
}
