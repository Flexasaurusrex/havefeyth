'use client';

import { useState, useEffect } from 'react';
import { supabase, getCollabClaimersForAirdrop } from '@/lib/supabase';
import { useAccount } from 'wagmi';
import AdminNav from '@/components/AdminNav';

interface Collaboration {
  id: string;
  partner_name: string;
  partner_logo_url: string | null;
  partner_color: string;
  token_symbol: string | null;
  token_amount_per_claim: number;
  remaining_budget: number;
  custom_message: string | null;
  twitter_url: string | null;
  farcaster_url: string | null;
  discord_url: string | null;
  website_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  require_all_socials: boolean;
  allow_confession_claims: boolean;
  end_date: string | null;
  claims_count: number;
  max_claims: number | null;
  created_at: string;
}

export default function CollaborationsAdmin() {
  const { address, isConnected } = useAccount();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (address) {
      const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
      setIsAdmin(address.toLowerCase() === adminAddress);
    }
  }, [address]);

  useEffect(() => {
    if (isAdmin) {
      loadCollaborations();
    }
  }, [isAdmin]);

  async function loadCollaborations() {
    try {
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

  async function toggleConfessionClaims(collabId: string, currentValue: boolean) {
    setUpdating(collabId);
    try {
      const { error } = await supabase
        .from('collaborations')
        .update({ allow_confession_claims: !currentValue })
        .eq('id', collabId);

      if (error) throw error;
      
      await loadCollaborations();
      alert(`Confession claims ${!currentValue ? 'enabled' : 'disabled'}!`);
    } catch (error) {
      console.error('Error updating collaboration:', error);
      alert('Failed to update collaboration');
    } finally {
      setUpdating(null);
    }
  }

  async function toggleActive(collabId: string, currentValue: boolean) {
    setUpdating(collabId);
    try {
      const { error } = await supabase
        .from('collaborations')
        .update({ is_active: !currentValue })
        .eq('id', collabId);

      if (error) throw error;
      
      await loadCollaborations();
      alert(`Collaboration ${!currentValue ? 'activated' : 'deactivated'}!`);
    } catch (error) {
      console.error('Error updating collaboration:', error);
      alert('Failed to update collaboration');
    } finally {
      setUpdating(null);
    }
  }

  async function handleExportClaimers(collabId: string, partnerName: string) {
    setExporting(collabId);
    try {
      const claimers = await getCollabClaimersForAirdrop(collabId);
      
      if (claimers.length === 0) {
        alert('No claims to export yet!');
        return;
      }
      
      // Create CSV
      const csv = [
        'Wallet Address,Total Amount,Claim Count,Display Name,Farcaster Handle,First Claim,Last Claim',
        ...claimers.map((c: any) => 
          `${c.wallet_address},${c.total_amount},${c.claim_count},"${c.display_name || ''}","${c.farcaster_handle || ''}","${c.first_claim}","${c.last_claim}"`
        )
      ].join('\n');
      
      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${partnerName}_airdrop_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert(`Exported ${claimers.length} addresses for airdrop!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export claimers');
    } finally {
      setExporting(null);
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
          <p className="text-xl">Loading collaborations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNav />
      
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Collaborations Admin</h1>
          <p className="text-gray-400">Manage active collaborations and settings</p>
        </div>

        {collaborations.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <p className="text-gray-400">No collaborations found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {collaborations.map((collab) => (
              <div
                key={collab.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {collab.partner_logo_url ? (
                      <img
                        src={collab.partner_logo_url}
                        alt={collab.partner_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                        style={{ backgroundColor: collab.partner_color }}
                      >
                        {collab.partner_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold">{collab.partner_name}</h2>
                      <p className="text-gray-400 text-sm">
                        {collab.token_amount_per_claim.toLocaleString()} {collab.token_symbol} per claim
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {collab.is_active && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-lg">
                        ACTIVE
                      </span>
                    )}
                    {collab.is_featured && (
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-lg">
                        FEATURED
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-400">Claims:</span>{' '}
                    <span className="text-white font-medium">
                      {collab.claims_count} / {collab.max_claims || '∞'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Budget:</span>{' '}
                    <span className="text-white font-medium">
                      {collab.remaining_budget.toLocaleString()} {collab.token_symbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">End Date:</span>{' '}
                    <span className="text-white font-medium">
                      {collab.end_date ? new Date(collab.end_date).toLocaleDateString() : 'No limit'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>{' '}
                    <span className="text-white font-medium">
                      {new Date(collab.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {collab.custom_message && (
                  <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                    <p className="text-sm italic text-gray-300">"{collab.custom_message}"</p>
                  </div>
                )}

                <div className="border-t border-gray-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow Confession Claims</p>
                      <p className="text-sm text-gray-400">
                        Users can earn tokens by posting confessions (24hr cooldown)
                      </p>
                    </div>
                    <button
                      onClick={() => toggleConfessionClaims(collab.id, collab.allow_confession_claims)}
                      disabled={updating === collab.id}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        collab.allow_confession_claims
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      } disabled:opacity-50`}
                    >
                      {updating === collab.id ? '...' : collab.allow_confession_claims ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Active Status</p>
                      <p className="text-sm text-gray-400">
                        Enable or disable this entire collaboration
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActive(collab.id, collab.is_active)}
                      disabled={updating === collab.id}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        collab.is_active
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      } disabled:opacity-50`}
                    >
                      {updating === collab.id ? '...' : collab.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>

                  {/* Export for Airdrop */}
                  <div className="border-t border-gray-700 pt-3">
                    <button
                      onClick={() => handleExportClaimers(collab.id, collab.partner_name)}
                      disabled={exporting === collab.id || collab.claims_count === 0}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {exporting === collab.id ? (
                        '📥 Exporting...'
                      ) : (
                        <>
                          📥 Export {collab.claims_count} Claims for Airdrop
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Downloads CSV with wallet addresses and amounts
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
