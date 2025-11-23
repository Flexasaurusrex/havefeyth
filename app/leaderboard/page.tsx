'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getLeaderboard, getUserRank } from '@/lib/supabase';
import type { UserStats } from '@/lib/supabase';
import Link from 'next/link';

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      const data = await getLeaderboard(100);
      setLeaderboard(data);

      if (address) {
        const rank = await getUserRank(address);
        setUserRank(rank);
      }

      setLoading(false);
    }

    loadLeaderboard();

    // Refresh every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [address, timeframe]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-block text-gray-500 hover:text-white transition-colors text-sm mb-4">
            ← Back to Home
          </Link>
          
          <h1 className="text-6xl md:text-7xl font-light tracking-wider text-glow">
            LEADERBOARD
          </h1>
          
          <p className="text-gray-400">
            Top Feylon sharers ranked by points 🏆
          </p>

          {!isConnected && (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          )}
        </div>

        {/* Timeframe Filter */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setTimeframe('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              timeframe === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              timeframe === 'month'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            disabled
          >
            This Month (Coming Soon)
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              timeframe === 'week'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            disabled
          >
            This Week (Coming Soon)
          </button>
        </div>

        {/* Your Rank (if connected) */}
        {isConnected && userRank > 0 && (
          <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Your Rank</div>
                <div className="text-3xl font-bold text-yellow-400">#{userRank}</div>
              </div>
              <div className="text-5xl">👁️</div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
                <div className="h-12 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👁️</div>
            <p className="text-gray-500">No users yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((user, index) => {
              const isCurrentUser = address?.toLowerCase() === user.wallet_address.toLowerCase();
              const isTop3 = index < 3;

              return (
                <div
                  key={user.wallet_address}
                  className={`group rounded-xl p-4 transition-all duration-200 ${
                    isCurrentUser
                      ? 'bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50'
                      : 'bg-gradient-to-r from-purple-900/10 to-pink-900/10 border border-white/10 hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 text-center">
                      {isTop3 ? (
                        <div className="text-3xl">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                        </div>
                      ) : (
                        <div className="text-xl font-bold text-gray-500">#{index + 1}</div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-gray-300 truncate">
                          {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                        </span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            You
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>{user.feylons_shared} shared</span>
                        {user.current_streak > 0 && (
                          <span className="flex items-center gap-1">
                            <span>🔥</span> {user.current_streak} day streak
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-2xl font-bold text-purple-400">
                        {user.total_points.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {leaderboard.length >= 100 && (
          <div className="text-center">
            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm">
              Load More
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
