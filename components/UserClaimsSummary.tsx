'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabase';

interface PendingClaim {
  partner: string;
  symbol: string;
  total: number;
  endDate: string | null;
}

export default function UserClaimsSummary() {
  const { address } = useAccount();
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      loadPendingClaims();
    }
  }, [address]);

  async function loadPendingClaims() {
    if (!address) return;

    const { data } = await supabase
      .from('collaboration_claims')
      .select(`
        token_amount,
        collaborations (
          partner_name,
          token_symbol,
          end_date
        )
      `)
      .eq('wallet_address', address.toLowerCase());

    if (data) {
      // Aggregate by collaboration
      const aggregated = data.reduce((acc: any, claim: any) => {
        const key = claim.collaborations.partner_name;
        if (!acc[key]) {
          acc[key] = {
            partner: claim.collaborations.partner_name,
            symbol: claim.collaborations.token_symbol,
            total: 0,
            endDate: claim.collaborations.end_date
          };
        }
        acc[key].total += claim.token_amount;
        return acc;
      }, {});

      setPendingClaims(Object.values(aggregated));
    }
    setLoading(false);
  }

  if (!address || loading || pendingClaims.length === 0) return null;

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-4">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <span>💰</span>
        <span>Pending Airdrops</span>
      </h3>
      <div className="space-y-2">
        {pendingClaims.map((claim) => (
          <div 
            key={claim.partner} 
            className="flex justify-between items-center text-sm bg-black/30 rounded-lg p-3"
          >
            <div>
              <p className="font-medium">{claim.partner}</p>
              {claim.endDate && (
                <p className="text-xs text-gray-400">
                  Ends: {new Date(claim.endDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <span className="font-bold text-purple-400 text-lg">
              {claim.total.toLocaleString()} {claim.symbol}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center border-t border-gray-700 pt-2">
        ✨ Tokens will be airdropped when collaboration ends
      </p>
    </div>
  );
}
