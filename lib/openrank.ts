// lib/openrank.ts
// Filters farmers by checking Farcaster reputation via OpenRank
// Uses server-side API route to avoid CORS issues

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
    // Call our API route (server-side) to avoid CORS
    const res = await fetch('/api/check-openrank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid })
    });
    
    if (!res.ok) {
      console.error('OpenRank API error:', res.status);
      // Fail open - don't block real users
      return { eligible: true, rank: 0, score: 0 };
    }
    
    const result = await res.json();
    return result;
    
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
