'use client';

import { useState } from 'react';
import { createUserProfile } from '@/lib/supabase';

interface OnboardingModalProps {
  walletAddress: string;
  onComplete: () => void;
}

export function OnboardingModal({ walletAddress, onComplete }: OnboardingModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (displayName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (displayName.length > 50) {
      setError('Display name must be less than 50 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createUserProfile({
        wallet_address: walletAddress,
        display_name: displayName.trim(),
        twitter_handle: twitterHandle.trim() || undefined,
        farcaster_handle: farcasterHandle.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      onComplete();
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border border-white/20 rounded-2xl max-w-md w-full p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👁️</div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome to Feylon!</h2>
          <p className="text-gray-300 text-sm">
            Create your profile to start earning points and climbing the leaderboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="CryptoKing69"
              maxLength={50}
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{displayName.length}/50 characters</p>
          </div>

          {/* Twitter Handle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Twitter Handle (optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500">@</span>
              <input
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                placeholder="yourhandle"
                className="w-full pl-8 pr-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Farcaster Handle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Farcaster Handle (optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500">@</span>
              <input
                type="text"
                value={farcasterHandle}
                onChange={(e) => setFarcasterHandle(e.target.value.replace('@', ''))}
                placeholder="yourhandle"
                className="w-full pl-8 pr-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bio (optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={280}
              rows={3}
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/280 characters</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Profile...
              </span>
            ) : (
              'START EARNING POINTS 🔥'
            )}
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 text-center mt-6">
          You can update your profile anytime from settings
        </p>
      </div>
    </div>
  );
}
