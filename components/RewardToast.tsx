'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export interface RewardItem {
  tokenAddress: string;
  rewardType: number;
  amount: string;
  tokenId: string;
  name: string;
  symbol: string;
}

interface RewardToastProps {
  rewards: RewardItem[];
  onClose: () => void;
}

export function RewardToast({ rewards, onClose }: RewardToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 50);
    
    // Show rewards with stagger
    setTimeout(() => setShowRewards(true), 300);
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  const getRewardEmoji = (rewardType: number) => {
    if (rewardType === 0) return '🪙'; // ERC20
    if (rewardType === 1) return '🖼️'; // ERC721
    if (rewardType === 2) return '💎'; // ERC1155
    return '🎁';
  };

  const formatAmount = (amount: string, rewardType: number) => {
    if (rewardType === 1) return '1'; // NFT
    // Convert from wei to readable format
    const num = BigInt(amount);
    if (num >= BigInt(1e18)) {
      return (Number(num) / 1e18).toFixed(2);
    }
    return amount;
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-black/95 backdrop-blur-lg border-2 border-white/20 rounded-xl p-6 shadow-2xl max-w-sm">
        {/* Header with Eye */}
        <div className="flex items-center gap-3 mb-4">
          <div className="eye-glow-active animate-glow-pulse">
            <Image
              src="/logo.png"
              alt="Eye"
              width={50}
              height={50}
              className="select-none"
            />
          </div>
          <div>
            <h3 className="text-2xl font-light text-glow">Rewards Claimed!</h3>
            <p className="text-xs text-gray-400">Your goodwill has been rewarded</p>
          </div>
        </div>

        {/* Rewards List */}
        <div className="space-y-3">
          {rewards.map((reward, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 transition-all duration-300 ${
                showRewards
                  ? 'translate-x-0 opacity-100'
                  : 'translate-x-4 opacity-0'
              }`}
              style={{
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <div className="text-4xl">{getRewardEmoji(reward.rewardType)}</div>
              <div className="flex-1">
                <div className="font-medium text-lg">
                  {formatAmount(reward.amount, reward.rewardType)} {reward.symbol}
                </div>
                <div className="text-xs text-gray-400">{reward.name}</div>
                {reward.rewardType === 1 && reward.tokenId !== '0' && (
                  <div className="text-xs text-gray-500">Token ID: {reward.tokenId}</div>
                )}
              </div>
              <div className="text-green-400 text-xl">✓</div>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Add these animations to your globals.css:
/*
@keyframes glow-pulse {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.9)) 
            drop-shadow(0 0 40px rgba(255, 255, 255, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(255, 255, 255, 1)) 
            drop-shadow(0 0 60px rgba(255, 255, 255, 0.7));
  }
}

.animate-glow-pulse {
  animation: glow-pulse 2s ease-in-out infinite;
}
*/
