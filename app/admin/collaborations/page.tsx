'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Collaboration {
  id: string;
  partner_name: string;
  partner_logo_url: string | null;
  partner_color: string;
  token_address: string | null;
  token_symbol: string | null;
  token_amount_per_claim: number;
  total_budget: number;
  remaining_budget: number;
  custom_message: string | null;
  twitter_url: string | null;
  farcaster_url: string | null;
  discord_url: string | null;
  website_url: string | null;
  require_all_socials: boolean;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_featured: boolean;
  claims_count: number;
  max_claims: number | null;
  created_at: string;
}

const emptyCollab: Partial<Collaboration> = {
  partner_name: '',
  partner_logo_url: '',
  partner_color: '#8B5CF6',
  token_address: '',
  token_symbol: '',
  token_amount_per_claim: 0,
  total_budget: 0,
  remaining_budget: 0,
  custom_message: '',
  twitter_url: '',
  farcaster_url: '',
  discord_url: '',
  website_url: '',
  require_all_socials: false,
  start_date: new Date().toISOString().slice(0, 16),
  end_date: '',
  is_active: false, // Start inactive by default
  is_featured: false,
  max_claims: null,
};

export default function AdminCollaborationsPage() {
  const { address, isConnected } = useAccount();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Collaboration>>(emptyCollab);
  const [saving, setSaving] = useState(false);

  const isAdmin = address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

  useEffect(() => {
    if (isAdmin) {
      loadCollaborations();
    }
  }, [isAdmin]);

  async function loadCollaborations() {
    try {
      // Use service role or direct query since we need all collabs, not just active
      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollaborations(data || []);
    } catch (error) {
      console.error('Error loading collaborations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);

    try {
      const payload = {
        partner_name: formData.partner_name,
        partner_logo_url: formData.partner_logo_url || null,
        partner_color: formData.partner_color || '#8B5CF6',
        token_address: formData.token_address || null,
        token_symbol: formData.token_symbol || null,
        token_amount_per_claim: formData.token_amount_per_claim || 0,
        total_budget: formData.total_budget || 0,
        remaining_budget: editingId ? formData.remaining_budget : (formData.total_budget || 0),
        custom_message: formData.custom_message || null,
        twitter_url: formData.twitter_url || null,
        farcaster_url: formData.farcaster_url || null,
        discord_url: formData.discord_url || null,
        website_url: formData.website_url || null,
        require_all_socials: formData.require_all_socials || false,
        start_date: formData.start_date || new Date().toISOString(),
        end_date: formData.end_date || null,
        is_active: formData.is_active || false,
        is_featured: formData.is_featured || false,
        max_claims: formData.max_claims || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('collaborations')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('collaborations')
          .insert([payload]);
        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyCollab);
      loadCollaborations();
    } catch (error) {
      console.error('Error saving collaboration:', error);
      alert('Failed to save collaboration');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this collaboration? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('collaborations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadCollaborations();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  }

  async function toggleActive(id: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from('collaborations')
        .update({ is_active: !currentState, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      loadCollaborations();
    } catch (error) {
      console.error('Error toggling:', error);
    }
  }

  async function toggleFeatured(id: string, currentState: boolean) {
    try {
      // Only one can be featured at a time
      if (!currentState) {
        await supabase
          .from('collaborations')
          .update({ is_featured: false })
          .neq('id', id);
      }
      
      const { error } = await supabase
        .from('collaborations')
        .update({ is_featured: !currentState, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      loadCollaborations();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  }

  function startEdit(collab: Collaboration) {
    setFormData({
      ...collab,
      start_date: collab.start_date?.slice(0, 16) || '',
      end_date: collab.end_date?.slice(0, 16) || '',
    });
    setEditingId(collab.id);
    setShowForm(true);
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="text-gray-400">Connect your admin wallet to continue</p>
        </div>
        <ConnectButton />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-xl">Unauthorized</p>
          <p className="text-gray-400 text-sm">Connected wallet is not an admin</p>
          <p className="text-gray-500 text-xs font-mono">{address}</p>
        </div>
        <ConnectButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-gray-500 hover:text-white text-sm mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-4xl font-bold">Collaborations</h1>
            <p className="text-gray-400 mt-1">Manage partner token distributions</p>
          </div>
          <button
            onClick={() => {
              setFormData(emptyCollab);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
          >
            + Add Collaboration
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm">
            <strong>How it works:</strong> Create a collaboration, set it to <strong>Active</strong> and <strong>Featured</strong> to show it to users. 
            Only ONE collaboration can be featured at a time. Turn off Active to disable without deleting.
          </p>
        </div>

        {/* Collaboration List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">👁️</div>
          </div>
        ) : collaborations.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <p className="text-gray-500">No collaborations yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {collaborations.map((collab) => (
              <div
                key={collab.id}
                className={`bg-gradient-to-r from-purple-900/20 to-pink-900/20 border rounded-xl p-6 ${
                  collab.is_active && collab.is_featured 
                    ? 'border-green-500/50 ring-2 ring-green-500/20' 
                    : collab.is_active 
                      ? 'border-purple-500/30' 
                      : 'border-gray-700 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    {collab.partner_logo_url ? (
                      <img
                        src={collab.partner_logo_url}
                        alt={collab.partner_name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                        style={{ backgroundColor: collab.partner_color + '40' }}
                      >
                        {collab.partner_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold">{collab.partner_name}</h3>
                        {collab.is_featured && collab.is_active && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                            🟢 LIVE
                          </span>
                        )}
                        {collab.is_featured && !collab.is_active && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                            ⭐ Featured (Inactive)
                          </span>
                        )}
                        {!collab.is_active && (
                          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        {collab.token_amount_per_claim} {collab.token_symbol || 'tokens'} per claim
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => toggleFeatured(collab.id, collab.is_featured)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        collab.is_featured
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                      title="Featured shows to users"
                    >
                      ⭐ Featured
                    </button>
                    <button
                      onClick={() => toggleActive(collab.id, collab.is_active)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        collab.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                      title="Active enables the collaboration"
                    >
                      {collab.is_active ? '✓ Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => startEdit(collab)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(collab.id)}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-xs text-gray-500">Budget Remaining</div>
                    <div className="font-medium">
                      {collab.remaining_budget.toLocaleString()} / {collab.total_budget.toLocaleString()} {collab.token_symbol}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Claims</div>
                    <div className="font-medium">
                      {collab.claims_count}{collab.max_claims ? ` / ${collab.max_claims}` : ' (unlimited)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Socials Required</div>
                    <div className="flex gap-2 mt-1">
                      {collab.twitter_url && <span title="Twitter">𝕏</span>}
                      {collab.farcaster_url && <span title="Farcaster">🟪</span>}
                      {collab.discord_url && <span title="Discord">💬</span>}
                      {collab.website_url && <span title="Website">🌐</span>}
                      {!collab.twitter_url && !collab.farcaster_url && !collab.discord_url && !collab.website_url && (
                        <span className="text-gray-500 text-sm">None</span>
                      )}
                      {collab.require_all_socials && <span className="text-xs text-orange-400">(all required)</span>}
                    </div>
                  </div>
                  {collab.end_date && (
                    <div>
                      <div className="text-xs text-gray-500">Ends</div>
                      <div className="text-sm">
                        {new Date(collab.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900/95 to-black border border-purple-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-purple-900/95 backdrop-blur-sm">
                <h2 className="text-2xl font-bold">
                  {editingId ? 'Edit Collaboration' : 'New Collaboration'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="text-gray-500 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Partner Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400">Partner Info</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Partner Name *</label>
                      <input
                        type="text"
                        value={formData.partner_name || ''}
                        onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Brand Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.partner_color || '#8B5CF6'}
                          onChange={(e) => setFormData({ ...formData, partner_color: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.partner_color || ''}
                          onChange={(e) => setFormData({ ...formData, partner_color: e.target.value })}
                          className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Logo URL</label>
                    <input
                      type="url"
                      value={formData.partner_logo_url || ''}
                      onChange={(e) => setFormData({ ...formData, partner_logo_url: e.target.value })}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Token Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400">Token Rewards</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Token Symbol</label>
                      <input
                        type="text"
                        value={formData.token_symbol || ''}
                        onChange={(e) => setFormData({ ...formData, token_symbol: e.target.value })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        placeholder="$TOKEN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Amount Per Claim</label>
                      <input
                        type="number"
                        value={formData.token_amount_per_claim || ''}
                        onChange={(e) => setFormData({ ...formData, token_amount_per_claim: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Total Budget</label>
                      <input
                        type="number"
                        value={formData.total_budget || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            total_budget: val, 
                            remaining_budget: editingId ? formData.remaining_budget : val 
                          });
                        }}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Token Address (optional)</label>
                      <input
                        type="text"
                        value={formData.token_address || ''}
                        onChange={(e) => setFormData({ ...formData, token_address: e.target.value })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        placeholder="0x..."
                      />
                    </div>
                  </div>
                </div>

                {/* Social Requirements */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400">Social Requirements</h3>
                  <p className="text-sm text-gray-500">Users must click these links before their share counts for bonus tokens</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Twitter/X URL</label>
                      <input
                        type="url"
                        value={formData.twitter_url || ''}
                        onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Farcaster URL</label>
                      <input
                        type="url"
                        value={formData.farcaster_url || ''}
                        onChange={(e) => setFormData({ ...formData, farcaster_url: e.target.value })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        placeholder="https://warpcast.com/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Discord URL</label>
                      <input
                        type="url"
                        value={formData.discord_url || ''}
                        onChange={(e) => setFormData({ ...formData, discord_url: e.target.value })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        placeholder="https://discord.gg/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={formData.website_url || ''}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.require_all_socials || false}
                      onChange={(e) => setFormData({ ...formData, require_all_socials: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-400">Require ALL socials to be clicked (not just one)</span>
                  </label>
                </div>

                {/* Messaging */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400">Messaging</h3>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Custom Message (shown in modal)</label>
                    <textarea
                      value={formData.custom_message || ''}
                      onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 h-20 resize-none"
                      placeholder="Sponsored by Partner - Share positivity and earn!"
                    />
                  </div>
                </div>

                {/* Timing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400">Timing & Limits</h3>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">End Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.end_date || ''}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Claims (leave empty for unlimited)</label>
                    <input
                      type="number"
                      value={formData.max_claims || ''}
                      onChange={(e) => setFormData({ ...formData, max_claims: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.partner_name}
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
