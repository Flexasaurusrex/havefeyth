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
  wallet_address: string;
  farcaster_fid: string;
  farcaster_handle: string | null;
}

async function checkOpenRank(fid: string): Promise<{ eligible: boolean; rank: number; reason: string }> {
  try {
    const response = await fetch(
      `https://graph.cast.k3l.io/scores/global/engagement/fids`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([parseInt(fid)])
      }
    );

    if (!response.ok) {
      return { eligible: true, rank: -1, reason: 'API error - fail open' };
    }

    const data = await response.json();
    
    // Check if result exists and has entries
    if (!data.result || data.result.length === 0) {
      return { eligible: false, rank: 0, reason: 'Not in OpenRank graph (no result)' };
    }

    const entry = data.result[0];
    
    // OpenRank returns rank as a number, but unranked users might have null/undefined
    // or might not be in results at all
    const rank = typeof entry.rank === 'number' ? entry.rank : null;
    
    // If rank is null/undefined, they're not properly ranked
    if (rank === null || rank === undefined) {
      return { eligible: false, rank: 0, reason: `Not ranked (rank field: ${entry.rank})` };
    }

    // Rank 0 typically means not in the graph
    if (rank === 0) {
      return { eligible: false, rank: 0, reason: 'Rank is 0 (not in graph)' };
    }

    // Check against threshold
    if (rank > MAX_RANK) {
      return { eligible: false, rank, reason: `Rank ${rank.toLocaleString()} > ${MAX_RANK.toLocaleString()}` };
    }

    return { eligible: true, rank, reason: 'Eligible' };
  } catch (error) {
    return { eligible: true, rank: -1, reason: 'Error - fail open' };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const dryRun = searchParams.get('dry') === 'true';
  const checkNoFid = searchParams.get('nofid') === 'true'; // Check profiles WITHOUT farcaster
  const batchStart = parseInt(searchParams.get('start') || '0');
  const batchSize = 50; // Process 50 at a time to avoid timeout

  // Simple auth check
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // DEBUG MODE: Check what OpenRank returns for a specific FID
  const debugFid = searchParams.get('debug');
  if (debugFid) {
    // Try POST request
    const response = await fetch(
      `https://graph.cast.k3l.io/scores/global/engagement/fids`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([parseInt(debugFid)])
      }
    );
    const data = await response.json();
    return NextResponse.json({
      mode: 'DEBUG',
      fid: debugFid,
      rawResponse: data,
      resultLength: data.result?.length,
      firstEntry: data.result?.[0],
      rankValue: data.result?.[0]?.rank,
      rankType: typeof data.result?.[0]?.rank
    });
  }

  // MODE: Check profiles WITHOUT Farcaster FID (suspicious wallet-only signups)
  if (checkNoFid) {
    const log: string[] = [];
    log.push(`=== PROFILES WITHOUT FARCASTER FID ${dryRun ? '(DRY RUN)' : '(LIVE DELETE)'} ===`);
    log.push('These are wallet-only signups - likely farmers who bypassed Farcaster auth');
    log.push('');

    // Fetch profiles without FIDs
    const { data: profiles, error, count } = await supabase
      .from('user_profiles')
      .select('wallet_address, display_name, created_at', { count: 'exact' })
      .is('farcaster_fid', null)
      .range(batchStart, batchStart + batchSize - 1);

    if (error) {
      return NextResponse.json({ error: `Fetch error: ${error.message}` });
    }

    log.push(`Total profiles without FID: ${count}`);
    log.push(`This batch: ${profiles?.length || 0} (starting at ${batchStart})`);
    log.push('');

    const toDelete = profiles || [];
    
    toDelete.forEach((p: any) => {
      log.push(`❌ ${p.display_name || 'No name'} - ${p.wallet_address} - Created: ${p.created_at}`);
    });

    let deletedProfiles = 0;
    let deletedInteractions = 0;

    if (!dryRun && toDelete.length > 0) {
      for (const profile of toDelete) {
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

        if (!error) deletedProfiles++;
      }

      log.push('');
      log.push(`🗑️ Deleted ${deletedProfiles} profiles`);
      log.push(`🗑️ Deleted ${deletedInteractions} interactions`);
    }

    const hasMore = (profiles?.length || 0) === batchSize;

    return NextResponse.json({
      success: true,
      mode: 'NO_FID_CHECK',
      dryRun,
      totalWithoutFid: count,
      batch: { start: batchStart, size: profiles?.length || 0 },
      toDelete: toDelete.length,
      deleted: dryRun ? 0 : deletedProfiles,
      deletedInteractions: dryRun ? 0 : deletedInteractions,
      hasMore,
      nextUrl: hasMore ? `/api/cleanup-farmers?secret=${SECRET}&nofid=true&start=${batchStart + batchSize}${dryRun ? '&dry=true' : ''}` : null,
      profiles: toDelete.map((p: any) => ({
        wallet: p.wallet_address,
        name: p.display_name,
        created: p.created_at
      })),
      log: log.join('\n')
    });
  }

  // MODE: Check profiles WITH Farcaster FID against OpenRank
  const log: string[] = [];
  log.push(`=== FEYLON CLEANUP ${dryRun ? '(DRY RUN)' : '(LIVE)'} ===`);
  log.push(`Threshold: Top ${MAX_RANK.toLocaleString()}`);
  log.push(`Batch: ${batchStart} to ${batchStart + batchSize}`);
  log.push('');

  // Fetch batch of profiles with FIDs
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('wallet_address, farcaster_fid, farcaster_handle')
    .not('farcaster_fid', 'is', null)
    .range(batchStart, batchStart + batchSize - 1);

  if (error || !profiles) {
    return NextResponse.json({ error: `Fetch error: ${error?.message}` });
  }

  log.push(`Profiles in this batch: ${profiles.length}`);
  log.push('');

  // Check each against OpenRank
  const ineligible: { profile: Profile; rank: number; reason: string }[] = [];
  let eligible = 0;

  for (const profile of profiles as Profile[]) {
    const result = await checkOpenRank(profile.farcaster_fid);
    
    if (!result.eligible) {
      ineligible.push({ profile, rank: result.rank, reason: result.reason });
      log.push(`❌ @${profile.farcaster_handle || 'unknown'} (FID:${profile.farcaster_fid}) - ${result.reason}`);
    } else {
      eligible++;
      log.push(`✅ @${profile.farcaster_handle || 'unknown'} (FID:${profile.farcaster_fid}) - Rank #${result.rank}`);
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

  const hasMore = profiles.length === batchSize;
  const nextStart = batchStart + batchSize;

  return NextResponse.json({
    success: true,
    dryRun,
    batch: { start: batchStart, size: profiles.length },
    eligible,
    ineligible: ineligible.length,
    hasMore,
    nextUrl: hasMore ? `/api/cleanup-farmers?secret=${SECRET}&start=${nextStart}${dryRun ? '&dry=true' : ''}` : null,
    details: ineligible.map(i => ({
      handle: i.profile.farcaster_handle,
      fid: i.profile.farcaster_fid,
      wallet: i.profile.wallet_address,
      reason: i.reason
    })),
    log: log.join('\n')
  });
}
