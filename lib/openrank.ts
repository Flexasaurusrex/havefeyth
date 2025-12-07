// lib/openrank.ts
// Filters farmers by checking Farcaster reputation via OpenRank

const OPENRANK_API = 'https://graph.cast.k3l.io/scores/global/engagement/fids';
const MAX_RANK = 50000; // Top 50k users only

export interface OpenRankResult {
  eligible: boolean;
  rank: number;
  score: number;
  reason?: string;
}

export async function checkOpenRank(fid: number): Promise<OpenRankResult> {
  // No FID = not eligible (shouldn't happen in mini app)
  if (!fid) {
    return { 
      eligible: false, 
      rank: 0, 
      score: 0, 
      reason: 'No Farcaster ID found' 
    };
  }

  try {
    const res = await fetch(OPENRANK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([fid])
    });
    
    if (!res.ok) {
      // API error - fail open to not block real users
      console.error('OpenRank API error:', res.status);
      return { eligible: true, rank: 0, score: 0 };
    }
    
    const data = await res.json();
    // Response: { result: [{ fid, username, rank, score, percentile }] }
    const result = data?.result?.[0];
    
    if (!result) {
      // Not in the graph at all = likely bot/farmer
      return { 
        eligible: false, 
        rank: 0, 
        score: 0, 
        reason: 'Account not found in Farcaster social graph' 
      };
    }
    
    const rank = result.rank || 0;
    const score = result.score || 0;
    
    // Rank 0 means unranked (not in graph)
    if (rank === 0) {
      return { 
        eligible: false, 
        rank: 0, 
        score: 0, 
        reason: 'Account has no social reputation yet' 
      };
    }
    
    // Check if within top 50k
    if (rank > MAX_RANK) {
      return { 
        eligible: false, 
        rank, 
        score, 
        reason: `Account rank (${rank.toLocaleString()}) is outside top ${MAX_RANK.toLocaleString()}` 
      };
    }
    
    // Passed all checks
    return { eligible: true, rank, score };
    
  } catch (error) {
    console.error('OpenRank check failed:', error);
    // Fail open on network errors - don't block real users
    return { eligible: true, rank: 0, score: 0 };
  }
}

// Quick check without full details
export async function isEligibleFid(fid: number): Promise<boolean> {
  const result = await checkOpenRank(fid);
  return result.eligible;
}
