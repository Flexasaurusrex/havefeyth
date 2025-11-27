'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getUserProfile, updateUserProfile, compressAndConvertImage } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import Link from 'next/link';
import { UserStatsCard } from '@/components/UserStatsCard';
import { Avatar } from '@/components/PixelGhost';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

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
        setProfileImageUrl(userProfile.profile_image_url || null);
      }
      
      setLoading(false);
    }

    if (isConnected) {
      loadProfile();
    }
  }, [address, isConnected]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG or PNG)');
      return;
    }

    // Validate file size (5MB max before compression)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large! Please upload an image under 5MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      // Compress and convert to Base64
      const base64Image = await compressAndConvertImage(file);
      
      // Check final size
      const sizeInKB = (base64Image.length * 3) / 4 / 1024;
      console.log(`Compressed image size: ${sizeInKB.toFixed(2)}KB`);

      if (sizeInKB > 200) {
        setError('Compressed image still too large. Please use a smaller image.');
        setUploadingImage(false);
        return;
      }

      // Update profile with new image
      await updateUserProfile(address, {
        profile_image_url: base64Image,
      });

      setProfileImageUrl(base64Image);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!address) return;

    setSaving(true);
    setError('');

    try {
      await updateUserProfile(address, {
        profile_image_url: null as any,
      });

      setProfileImageUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error removing image:', err);
      setError(err.message || 'Failed to remove image');
    } finally {
      setSaving(false);
    }
  };

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
            {/* Left Column - Stats & Avatar */}
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Profile Picture</h3>
                
                <div className="flex flex-col items-center gap-4">
                  <Avatar 
                    walletAddress={address!}
                    customImageUrl={profileImageUrl}
                    size={120}
                  />
                  
                  <div className="text-center space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all text-sm"
                    >
                      {uploadingImage ? 'Uploading...' : profileImageUrl ? 'Change Picture' : 'Upload Picture'}
                    </button>
                    
                    {profileImageUrl && (
                      <button
                        onClick={handleRemoveImage}
                        disabled={saving}
                        className="block w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors text-sm"
                      >
                        Remove Picture
                      </button>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Max 200KB • Square format recommended
                    </p>
                  </div>
                </div>
              </div>

              <UserStatsCard walletAddress={address!} />
              
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Wallet</h3>
                <p className="font-mono text-sm text-gray-400 break-all">{address}</p>
              </div>

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

                {success && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
                    ✓ Profile updated successfully!
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

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
