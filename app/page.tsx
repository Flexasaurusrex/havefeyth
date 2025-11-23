'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useProfile } from '@/hooks/useProfile';
import { UserStatsCard } from '@/components/UserStatsCard';
import Link from 'next/link';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { hasProfile, loading: profileLoading, refresh } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding modal when wallet connects and user has no profile
  useEffect(() => {
    if (isConnected && !profileLoading && !hasProfile && address) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [isConnected, profileLoading, hasProfile, address]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-7xl md:text-9xl font-light tracking-wider text-glow">
            FEYLON
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400">
            Share. Earn. Compete. 👁️
          </p>

          {/* Connect Wallet */}
          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <ConnectButton />
              <Link href="/leaderboard">
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all duration-200 transform hover:scale-105">
                  🏆 Leaderboard
                </button>
              </Link>
              <Link href="/profile">
                <button className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-bold transition-colors">
                  Profile
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Stats Card (if connected and has profile) */}
        {isConnected && address && hasProfile && (
          <div className="max-w-3xl mx-auto">
            <UserStatsCard walletAddress={address} />
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-3xl mx-auto">
          {!isConnected ? (
            <div className="text-center py-20">
              <div className="text-8xl mb-8">👁️</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Connect to Start
              </h2>
              <p className="text-gray-400 text-lg">
                Connect your wallet to share Feylons, earn points, and climb the leaderboard
              </p>
            </div>
          ) : !hasProfile && !profileLoading ? (
            <div className="text-center py-20">
              <div className="text-8xl mb-8">⏳</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Create Your Profile
              </h2>
              <p className="text-gray-400 text-lg">
                Complete your profile to start earning points...
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Share a Feylon
              </h2>
              
              <div className="space-y-6">
                {/* Share on Twitter */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-6 hover:border-purple-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">𝕏</div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Share on Twitter</h3>
                        <p className="text-gray-400 text-sm">Earn 10 points + streak bonus</p>
                      </div>
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg font-bold transition-all duration-200 transform hover:scale-105">
                      Share
                    </button>
                  </div>
                </div>

                {/* Share on Farcaster */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-6 hover:border-purple-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🟣</div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Share on Farcaster</h3>
                        <p className="text-gray-400 text-sm">Earn 10 points + streak bonus</p>
                      </div>
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg font-bold transition-all duration-200 transform hover:scale-105">
                      Share
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-sm text-gray-300 text-center">
                  💡 <strong>Pro tip:</strong> Share daily to build your streak and earn bonus points!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6 text-center">
              <div className="text-5xl mb-4">1️⃣</div>
              <h3 className="text-xl font-bold text-white mb-2">Share</h3>
              <p className="text-gray-400 text-sm">
                Share Feylons on Twitter or Farcaster
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6 text-center">
              <div className="text-5xl mb-4">2️⃣</div>
              <h3 className="text-xl font-bold text-white mb-2">Earn</h3>
              <p className="text-gray-400 text-sm">
                Get 10 points per share + streak bonuses
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6 text-center">
              <div className="text-5xl mb-4">3️⃣</div>
              <h3 className="text-xl font-bold text-white mb-2">Compete</h3>
              <p className="text-gray-400 text-sm">
                Climb the leaderboard and show your rank
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link href="/leaderboard">
            <button className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105">
              🏆 View Leaderboard
            </button>
          </Link>
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && address && (
        <OnboardingModal
          walletAddress={address}
          onComplete={() => {
            setShowOnboarding(false);
            refresh(); // Refresh profile status
          }}
        />
      )}
    </main>
  );
}
