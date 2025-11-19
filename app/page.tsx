'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { canUserInteract, recordInteraction } from '@/lib/supabase';
import { CONTRACT_ADDRESS, HAVE_FEYTH_ABI } from '@/lib/contract';
import { formatDistanceToNow } from '@/lib/utils';

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
    if (isConfirmed) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [isConfirmed]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsGlowing(e.target.value.length > 0);
  };

  const handleShare = async (platform: 'twitter' | 'farcaster') => {
    if (!isConnected || !address || !message.trim()) return;
    
    setSelectedPlatform(platform);
    setIsSharing(true);

    try {
      const shareText = `${message}\n\nCast your Feylon 👁️\n${window.location.origin}`;
      
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
      
      if (writeContractAsync) {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: HAVE_FEYTH_ABI,
          functionName: 'claimReward',
        });
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
          
          <p className="text-xl text-gray-400 font-light">
            Cast your Feylon
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-gray-400 text-lg">
              Connect to share your message
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
                placeholder="Share a message or make a confession..."
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
              
              {showSuccess && (
                <div className="text-center text-green-500 text-lg animate-fade-in">
                  ✓ Reward claimed successfully!
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
    </main>
  );
}
