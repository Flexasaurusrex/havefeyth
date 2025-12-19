'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getCurrentSettings, updateOpenRankSettings, type OpenRankSettings } from '@/lib/openrank';

export default function OpenRankAdmin() {
  const { address, isConnected } = useAccount();
  const [settings, setSettings] = useState<OpenRankSettings>({
    threshold: 50,
    power_badge_bypass: true,
    follower_bypass_threshold: 500
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (address) {
      const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
      setIsAdmin(address.toLowerCase() === adminAddress);
    }
  }, [address]);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  async function loadSettings() {
    try {
      const current = await getCurrentSettings();
      setSettings(current);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!address) return;

    setSaving(true);
    try {
      const result = await updateOpenRankSettings(settings, address);
      
      if (result.success) {
        alert('Settings updated successfully! Changes take effect immediately.');
      } else {
        alert('Failed to update settings: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl text-red-400">⛔ Admin access required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🛡️ OpenRank Anti-Farmer Settings</h1>
          <p className="text-gray-400">Adjust thresholds to block airdrop farmers while allowing legitimate users</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          
          {/* OpenRank Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-lg">OpenRank Threshold</label>
              <span className="text-2xl font-bold text-purple-400">{settings.threshold}</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={settings.threshold}
              onChange={(e) => setSettings({ ...settings, threshold: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0 (Everyone)</span>
              <span>100 (Active)</span>
              <span>500 (Power Users)</span>
            </div>
            <div className="mt-3 p-3 bg-gray-800 rounded-lg text-sm">
              <p className="text-gray-300 mb-2"><strong>Current Setting:</strong></p>
              {settings.threshold === 0 && <p className="text-yellow-400">⚠️ No protection - All users allowed</p>}
              {settings.threshold > 0 && settings.threshold < 50 && <p className="text-yellow-400">⚠️ Very Permissive - Some farmers may get through</p>}
              {settings.threshold >= 50 && settings.threshold < 100 && <p className="text-green-400">✓ Moderate - Blocks obvious farmers (Recommended)</p>}
              {settings.threshold >= 100 && settings.threshold < 200 && <p className="text-blue-400">✓ Strict - Only active users allowed</p>}
              {settings.threshold >= 200 && <p className="text-purple-400">✓ Very Strict - Only power users allowed</p>}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="font-medium text-lg mb-4">Bypass Rules</h3>
            
            {/* Power Badge Bypass */}
            <div className="flex items-center justify-between mb-4 p-4 bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Power Badge Bypass</p>
                <p className="text-sm text-gray-400">Power badge holders always allowed (verified users)</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, power_badge_bypass: !settings.power_badge_bypass })}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  settings.power_badge_bypass
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {settings.power_badge_bypass ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Follower Bypass */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">Follower Bypass Threshold</p>
                  <p className="text-sm text-gray-400">Users with this many followers bypass OpenRank check</p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="50"
                  value={settings.follower_bypass_threshold}
                  onChange={(e) => setSettings({ ...settings, follower_bypass_threshold: parseInt(e.target.value) })}
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center"
                />
              </div>
              <p className="text-xs text-gray-500">Established accounts with many followers are likely legitimate</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="border-t border-gray-800 pt-6">
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <h4 className="font-medium mb-2">💡 Quick Guide</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• <strong>Farmers typically have:</strong> 0-30 OpenRank score, 0-10 followers, new accounts</li>
                <li>• <strong>Active users have:</strong> 100+ OpenRank score, regular engagement</li>
                <li>• <strong>Power users have:</strong> 500+ OpenRank score, strong community presence</li>
                <li>• <strong>Recommended for most collabs:</strong> Threshold 50-100</li>
                <li>• <strong>Under heavy farming attack:</strong> Increase to 100-200</li>
              </ul>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-800 pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              Changes take effect immediately for all new claims
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
