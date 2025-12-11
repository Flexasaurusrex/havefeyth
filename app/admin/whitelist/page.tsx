'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

interface WhitelistEntry {
  id: string;
  fid: string;
  username: string | null;
  reason: string | null;
  created_at: string;
}

export default function WhitelistAdmin() {
  const { address, isConnected } = useAccount();
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFid, setNewFid] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS;

  useEffect(() => {
    if (isAdmin) {
      loadEntries();
    }
  }, [isAdmin]);

  async function loadEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from('whitelist')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setEntries(data);
    }
    setLoading(false);
  }

  async function addEntry() {
    if (!newFid.trim()) {
      alert('FID is required');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('whitelist')
      .insert({
        fid: newFid.trim(),
        username: newUsername.trim() || null,
        reason: newReason.trim() || null,
      });

    if (error) {
      alert('Failed to add: ' + error.message);
    } else {
      setNewFid('');
      setNewUsername('');
      setNewReason('');
      loadEntries();
    }
    setSaving(false);
  }

  async function removeEntry(id: string) {
    if (!confirm('Remove this user from whitelist?')) return;

    const { error } = await supabase
      .from('whitelist')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Failed to remove: ' + error.message);
    } else {
      loadEntries();
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Whitelist Admin</h1>
        <p className="text-gray-400 mb-6">Connect your wallet to access</p>
        <ConnectButton />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p className="text-gray-400 mb-2">Connected: {address}</p>
        <p className="text-gray-500 text-sm">This wallet is not authorized to access the admin panel.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Back to Admin
        </Link>

        <h1 className="text-3xl font-bold mb-2">Whitelist</h1>
        <p className="text-gray-400 mb-8">
          Manually approve users who appeal. They will bypass OpenRank checks.
        </p>

        {/* Add new entry */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Add User</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">FID *</label>
              <input
                type="text"
                value={newFid}
                onChange={(e) => setNewFid(e.target.value)}
                placeholder="e.g. 1536156"
                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. feylon"
                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reason</label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g. DMed on Warpcast"
                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
          <button
            onClick={addEntry}
            disabled={saving || !newFid.trim()}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Adding...' : 'Add to Whitelist'}
          </button>
        </div>

        {/* List */}
        <div className="bg-gray-900/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-bold">Whitelisted Users ({entries.length})</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No users whitelisted yet</div>
          ) : (
            <div className="divide-y divide-white/10">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-400">FID: {entry.fid}</span>
                      {entry.username && (
                        <span className="text-gray-400">@{entry.username}</span>
                      )}
                    </div>
                    {entry.reason && (
                      <p className="text-sm text-gray-500 mt-1">{entry.reason}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      Added {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
