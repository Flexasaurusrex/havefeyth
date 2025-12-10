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

interface CollabBonus {
  amount: number;
  symbol: string;
}

interface RewardToastProps {
  rewards: RewardItem[];
  collabBonus?: CollabBonus;
  onClose: () => void;
}

export function RewardToast({ rewards, collabBonus, onClose }: RewardToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 50);
    
    // Show rewards with stagger
    setTimeout(() => setShowRewards(true), 300);
    
    // Auto close after 6 seconds (extra time if collab bonus)
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, collabBonus ? 6000 : 5000);
    
    return () => clearTimeout(timer);
  }, [onClose, collabBonus]);

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

          {/* Collaboration Bonus */}
          {collabBonus && (
            <div
              className={`flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30 transition-all duration-300 ${
                showRewards
                  ? 'translate-x-0 opacity-100'
                  : 'translate-x-4 opacity-0'
              }`}
              style={{
                transitionDelay: `${rewards.length * 100 + 100}ms`,
              }}
            >
              <div className="text-4xl">🎁</div>
              <div className="flex-1">
                <div className="font-medium text-lg text-purple-300">
                  +{collabBonus.amount.toLocaleString()} ${collabBonus.symbol}
                </div>
                <div className="text-xs text-purple-400">Partner Collaboration Bonus!</div>
              </div>
              <div className="text-purple-400 text-xl animate-pulse">✨</div>
            </div>
          )}
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
