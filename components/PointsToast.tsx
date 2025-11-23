'use client';

import { useEffect, useState } from 'react';

interface PointsToastProps {
  points: number;
  streak?: number;
  onClose: () => void;
}

export function PointsToast({ points, streak, onClose }: PointsToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 100);

    // Auto close after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-24 right-4 md:right-8 z-50 transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-br from-purple-900 to-pink-900 border border-purple-500/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm min-w-[280px]">
        {/* Points Earned */}
        <div className="flex items-center gap-3 mb-3">
          <div className="text-4xl">🎯</div>
          <div>
            <div className="text-2xl font-bold text-white">+{points} Points</div>
            <div className="text-sm text-gray-300">Feylon shared!</div>
          </div>
        </div>

        {/* Streak Bonus */}
        {streak && streak > 1 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🔥</div>
              <div>
                <div className="text-lg font-bold text-orange-400">{streak} Day Streak!</div>
                <div className="text-xs text-gray-400">Keep it going!</div>
              </div>
            </div>
          </div>
        )}

        {/* Special Milestones */}
        {streak === 7 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="text-2xl">⭐</div>
              <div className="text-sm text-yellow-400 font-bold">
                +20 BONUS: 7-Day Streak Master!
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-1 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
