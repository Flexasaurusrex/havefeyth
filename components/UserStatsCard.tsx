'use client';

import { useEffect, useState } from 'react';
import { getUserStats, getUserRank } from '@/lib/supabase';
import type { UserStats } from '@/lib/supabase';

interface UserStatsCardProps {
  walletAddress: string;
}

export function UserStatsCard({ walletAddress }: UserStatsCardProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [rank, setRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const [userStats, userRank] = await Promise.all([
        getUserStats(walletAddress),
        getUserRank(walletAddress),
      ]);
      setStats(userStats);
      setRank(userRank);
      setLoading(false);
    }

    if (walletAddress) {
      loadStats();
    }
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6 animate-pulse">
        <div className="h-20 bg-white/5 rounded" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">👁️</div>
        <p className="text-gray-400 text-sm">Share your first Feylon to start earning points!</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Your Stats</h3>
        {rank > 0 && (
          <div className="px-3 py-1 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-full">
            <span className="text-yellow-400 text-sm font-bold">#{rank}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Points */}
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-400">{stats.total_points}</div>
          <div className="text-xs text-gray-500 mt-1">Points</div>
        </div>

        {/* Feylons Shared */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.feylons_shared}</div>
          <div className="text-xs text-gray-500 mt-1">Shared</div>
        </div>

        {/* Current Streak */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-3xl font-bold text-orange-400">{stats.current_streak}</span>
            {stats.current_streak > 0 && <span className="text-xl">🔥</span>}
          </div>
          <div className="text-xs text-gray-500 mt-1">Day Streak</div>
        </div>

        {/* Times Shared */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">{stats.feylons_received_shares}</div>
          <div className="text-xs text-gray-500 mt-1">Times Shared</div>
        </div>
      </div>

      {/* Best Streak Badge */}
      {stats.best_streak >= 7 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-xl">⭐</span>
            <span className="text-gray-300">Best Streak: <span className="text-yellow-400 font-bold">{stats.best_streak} days</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
