// app/api/verify-filter/route.ts
// Quick check to see if OpenRank filter is working
// DELETE THIS FILE AFTER USE

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://szbmumfyznhiofpecrox.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Ym11bWZ5em5oaW9mcGVjcm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc5NjcyNCwiZXhwIjoyMDc5MzcyNzI0fQ.xxrn5m7S7ce50X_DVV6ATP7NQM9Ug-yJwZasCtENv9o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== 'feylon-verify-2024') {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // Get profiles created in the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recentProfiles, error } = await supabase
    .from('user_profiles')
    .select('wallet_address, farcaster_fid, farcaster_handle, display_name, created_at')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  const withFid = recentProfiles?.filter(p => p.farcaster_fid) || [];
  const withoutFid = recentProfiles?.filter(p => !p.farcaster_fid) || [];

  // Check OpenRank for those with FIDs
  const rankChecks = [];
  for (const profile of withFid.slice(0, 50)) { // Check first 50
    try {
      const res = await fetch('https://graph.cast.k3l.io/scores/global/engagement/fids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([parseInt(profile.farcaster_fid)])
      });
      const data = await res.json();
      const rank = data.result?.[0]?.rank || 0;
      
      rankChecks.push({
        handle: profile.farcaster_handle,
        fid: profile.farcaster_fid,
        rank,
        eligible: rank > 0 && rank <= 50000,
        created: profile.created_at
      });
      
      await new Promise(r => setTimeout(r, 50)); // Rate limit
    } catch (e) {
      rankChecks.push({
        handle: profile.farcaster_handle,
        fid: profile.farcaster_fid,
        rank: 'error',
        eligible: 'unknown',
        created: profile.created_at
      });
    }
  }

  const eligible = rankChecks.filter(r => r.eligible === true);
  const ineligible = rankChecks.filter(r => r.eligible === false);

  return NextResponse.json({
    summary: {
      totalNewProfiles: recentProfiles?.length || 0,
      withFarcaster: withFid.length,
      withoutFarcaster: withoutFid.length,
      checkedRanks: rankChecks.length,
      eligible: eligible.length,
      ineligible: ineligible.length,
      filterWorking: ineligible.length === 0 && withoutFid.length === 0
    },
    ineligibleAccounts: ineligible,
    walletOnlyAccounts: withoutFid.map(p => ({
      name: p.display_name,
      wallet: p.wallet_address,
      created: p.created_at
    })),
    recentEligible: eligible.slice(0, 10) // Show first 10 good ones
  });
}
