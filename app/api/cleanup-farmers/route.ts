// app/api/cleanup-farmers/route.ts
// 
// ONE-TIME USE: Deploy, visit /api/cleanup-farmers?secret=feylon-cleanup-2024, then DELETE this file
//

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://szbmumfyznhiofpecrox.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Ym11bWZ5em5oaW9mcGVjcm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc5NjcyNCwiZXhwIjoyMDc5MzcyNzI0fQ.xxrn5m7S7ce50X_DVV6ATP7NQM9Ug-yJwZasCtENv9o';

const MAX_RANK = 50000;
const SECRET = 'feylon-cleanup-2024'; // Simple protection

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Profile {
  id: string;
  wallet_address: string;
  farcaster_fid: string;
  farcaster_handle: string | null;
}

async function checkOpenRank(fid: string): Promise<{ eligible: boolean; rank: number; reason: string }> {
  try {
    const response = await fetch(
      `https://graph.cast.k3l.io/scores/global/engagement/fids?fids=${fid}`
    );

    if (!response.ok) {
      return { eligible: true, rank: 0, reason: 'API error - fail open' };
    }

    const data = await response.json();
    
    if (!data.result || data.result.length === 0) {
      return { eligible: false, rank: 0, reason: 'Not in OpenRank graph' };
    }

    const rank = data.result[0]?.rank || 0;

    if (rank === 0) {
      return { eligible: false, rank, reason: 'Rank is 0' };
    }

    if (rank > MAX_RANK) {
      return { eligible: false, rank, reason: `Rank ${rank} > ${MAX_RANK}` };
    }

    return { eligible: true, rank, reason: 'Eligible' };
  } catch (error) {
    return { eligible: true, rank: 0, reason: 'Error - fail open' };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const dryRun = searchParams.get('dry') === 'true';

  // Simple auth check
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const log: string[] = [];
  log.push(`=== FEYLON CLEANUP ${dryRun ? '(DRY RUN)' : '(LIVE)'} ===`);
  log.push(`Threshold: Top ${MAX_RANK.toLocaleString()}`);
  log.push('');

  // Fetch all profiles with FIDs
  const allProfiles: Profile[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, wallet_address, farcaster_fid, farcaster_handle')
      .not('farcaster_fid', 'is', null)
      .range(offset, offset + 99);

    if (error || !data) {
      log.push(`Error fetching: ${error?.message}`);
      break;
    }

    allProfiles.push(...(data as Profile[]));
    offset += 100;
    hasMore = data.length === 100;
  }

  log.push(`Total profiles with FIDs: ${allProfiles.length}`);
  log.push('');

  // Check each against OpenRank
  const ineligible: { profile: Profile; rank: number; reason: string }[] = [];
  let eligible = 0;

  for (const profile of allProfiles) {
    const result = await checkOpenRank(profile.farcaster_fid);
    
    if (!result.eligible) {
      ineligible.push({ profile, rank: result.rank, reason: result.reason });
      log.push(`❌ @${profile.farcaster_handle || 'unknown'} (FID:${profile.farcaster_fid}) - ${result.reason}`);
    } else {
      eligible++;
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 50));
  }

  log.push('');
  log.push(`✅ Eligible: ${eligible}`);
  log.push(`❌ Ineligible: ${ineligible.length}`);
  log.push('');

  // Delete if not dry run
  if (!dryRun && ineligible.length > 0) {
    let deletedProfiles = 0;
    let deletedInteractions = 0;

    for (const { profile } of ineligible) {
      // Delete interactions first
      const { data: intData } = await supabase
        .from('interactions')
        .delete()
        .eq('wallet_address', profile.wallet_address)
        .select('id');
      
      deletedInteractions += intData?.length || 0;

      // Delete profile
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('wallet_address', profile.wallet_address);

      if (!error) {
        deletedProfiles++;
      }
    }

    log.push(`🗑️ Deleted ${deletedProfiles} profiles`);
    log.push(`🗑️ Deleted ${deletedInteractions} interactions`);
  } else if (dryRun) {
    log.push('DRY RUN - no deletions made');
    log.push('Remove ?dry=true to actually delete');
  }

  return NextResponse.json({
    success: true,
    dryRun,
    eligible,
    ineligible: ineligible.length,
    details: ineligible.map(i => ({
      handle: i.profile.farcaster_handle,
      fid: i.profile.farcaster_fid,
      wallet: i.profile.wallet_address,
      reason: i.reason
    })),
    log: log.join('\n')
  });
}
