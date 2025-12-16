'use client';

import { useState, useEffect } from 'react';
import { createUserProfile } from '@/lib/supabase';

interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
}

interface OnboardingModalProps {
  walletAddress: string;
  onComplete: () => void;
  farcasterUser?: FarcasterUser;
}

export function OnboardingModal({ walletAddress, onComplete, farcasterUser }: OnboardingModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill from Farcaster data
  useEffect(() => {
    if (farcasterUser) {
      setDisplayName(farcasterUser.displayName || farcasterUser.username || '');
      setFarcasterHandle(farcasterUser.username || '');
      if (farcasterUser.pfpUrl) {
        setProfileImageUrl(farcasterUser.pfpUrl);
      }
    }
  }, [farcasterUser]);

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
        farcaster_fid: farcasterUser?.fid?.toString() || undefined,
        profile_image_url: profileImageUrl || undefined,
        bio: bio.trim() || undefined,
      });

      onComplete();
    } catch (err: any) {
      console.error('Error creating profile:', err);
      const errorMessage = err.message || 'Failed to create profile. Please try again.';
      
      // If profile already exists, just complete the onboarding
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('unique constraint')) {
        console.log('Profile already exists, completing onboarding...');
        onComplete();
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle the "Continue anyway" for existing profiles
  const handleContinueAnyway = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border border-white/20 rounded-2xl max-w-md w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {farcasterUser?.pfpUrl ? (
            <img 
              src={farcasterUser.pfpUrl} 
              alt="Profile" 
              className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-purple-500"
            />
          ) : (
            <div className="text-6xl mb-4">👁️</div>
          )}
          <h2 className="text-3xl font-bold text-white mb-2">
            {farcasterUser ? `Welcome, ${farcasterUser.displayName || farcasterUser.username}!` : 'Welcome to Feylon!'}
          </h2>
          <p className="text-gray-300 text-sm">
            {farcasterUser 
              ? 'Confirm your profile details to start earning points'
              : 'Create your profile to start earning points and climbing the leaderboard'
            }
          </p>
          {farcasterUser && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300">
              🟪 Connected via Warpcast
            </div>
          )}
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
              Farcaster Handle {farcasterUser ? '' : '(optional)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500">@</span>
              <input
                type="text"
                value={farcasterHandle}
                onChange={(e) => setFarcasterHandle(e.target.value.replace('@', ''))}
                placeholder="yourhandle"
                disabled={!!farcasterUser}
                className={`w-full pl-8 pr-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors ${farcasterUser ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {farcasterUser && (
                <span className="absolute right-4 top-3.5 text-green-400 text-sm">✓ verified</span>
              )}
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
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400 mb-2">{error}</p>
              {error.toLowerCase().includes('already exists') && (
                <button
                  type="button"
                  onClick={handleContinueAnyway}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Continue to App →
                </button>
              )}
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
