'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getUserProfile, updateUserProfile } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import Link from 'next/link';
import { UserStatsCard } from '@/components/UserStatsCard';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    async function loadProfile() {
      if (!address) return;
      
      setLoading(true);
      const userProfile = await getUserProfile(address);
      setProfile(userProfile);
      
      if (userProfile) {
        setDisplayName(userProfile.display_name);
        setTwitterHandle(userProfile.twitter_handle || '');
        setFarcasterHandle(userProfile.farcaster_handle || '');
        setBio(userProfile.bio || '');
      }
      
      setLoading(false);
    }

    if (isConnected) {
      loadProfile();
    }
  }, [address, isConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) return;

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (displayName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await updateUserProfile(address, {
        display_name: displayName.trim(),
        twitter_handle: twitterHandle.trim() || undefined,
        farcaster_handle: farcasterHandle.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">👁️</div>
          <h1 className="text-4xl font-bold text-white mb-2">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to view and edit your profile</p>
          <ConnectButton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-block text-gray-500 hover:text-white transition-colors text-sm mb-4">
            ← Back to Home
          </Link>
          
          <h1 className="text-6xl md:text-7xl font-light tracking-wider text-glow">
            YOUR PROFILE
          </h1>
          
          <p className="text-gray-400">
            Manage your Feylon identity
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👁️</div>
            <p className="text-gray-500">No profile found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Stats */}
            <div className="space-y-6">
              <UserStatsCard walletAddress={address!} />
              
              {/* Wallet Info */}
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Wallet</h3>
                <p className="font-mono text-sm text-gray-400 break-all">{address}</p>
              </div>

              {/* Member Since */}
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Member Since</h3>
                <p className="text-gray-400">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Right Column - Edit Form */}
            <div>
              <form onSubmit={handleSubmit} className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Edit Profile</h3>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">{displayName.length}/50</p>
                </div>

                {/* Twitter Handle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Twitter Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-500">@</span>
                    <input
                      type="text"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                      className="w-full pl-8 pr-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Farcaster Handle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Farcaster Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-500">@</span>
                    <input
                      type="text"
                      value={farcasterHandle}
                      onChange={(e) => setFarcasterHandle(e.target.value.replace('@', ''))}
                      className="w-full pl-8 pr-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={280}
                    rows={4}
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{bio.length}/280</p>
                </div>

                {/* Success Message */}
                {success && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
                    ✓ Profile updated successfully!
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
