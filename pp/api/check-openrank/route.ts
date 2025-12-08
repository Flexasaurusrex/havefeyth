// app/api/check-openrank/route.ts
// Server-side proxy for OpenRank API to avoid CORS issues

import { NextResponse } from 'next/server';

const OPENRANK_API = 'https://graph.cast.k3l.io/scores/global/engagement/fids';
const MAX_RANK = 50000;

export async function POST(request: Request) {
  try {
    const { fid } = await request.json();

    if (!fid) {
      return NextResponse.json({
        eligible: false,
        rank: 0,
        score: 0,
        reason: 'No Farcaster ID provided'
      });
    }

    const res = await fetch(OPENRANK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([parseInt(fid)])
    });

    if (!res.ok) {
      console.error('OpenRank API error:', res.status);
      // Fail open - don't block real users
      return NextResponse.json({ eligible: true, rank: 0, score: 0 });
    }

    const data = await res.json();
    const result = data?.result?.[0];

    if (!result) {
      return NextResponse.json({
        eligible: false,
        rank: 0,
        score: 0,
        reason: 'Account not found in Farcaster social graph'
      });
    }

    const rank = result.rank || 0;
    const score = result.score || 0;

    if (rank === 0) {
      return NextResponse.json({
        eligible: false,
        rank: 0,
        score: 0,
        reason: 'Account has no social reputation yet'
      });
    }

    if (rank > MAX_RANK) {
      return NextResponse.json({
        eligible: false,
        rank,
        score,
        reason: `Account rank (${rank.toLocaleString()}) is outside top ${MAX_RANK.toLocaleString()}`
      });
    }

    return NextResponse.json({ eligible: true, rank, score });

  } catch (error) {
    console.error('OpenRank check failed:', error);
    // Fail open on errors
    return NextResponse.json({ eligible: true, rank: 0, score: 0 });
  }
}
