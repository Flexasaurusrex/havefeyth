import { NextRequest, NextResponse } from 'next/server';

const MAX_RANK = 50000;

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json();
    
    if (!fid) {
      return NextResponse.json({ eligible: false, error: 'No FID provided' }, { status: 400 });
    }

    const response = await fetch('https://graph.cast.k3l.io/scores/global/engagement/fids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([parseInt(fid)])
    });

    if (!response.ok) {
      console.error('OpenRank API error:', response.status);
      return NextResponse.json({ eligible: true, reason: 'api_error' });
    }

    const data = await response.json();
    
    if (!data.result || data.result.length === 0) {
      return NextResponse.json({ 
        eligible: false, 
        reason: 'not_in_graph',
        message: 'Account not found in reputation graph'
      });
    }

    const userRank = data.result[0].rank;
    const eligible = userRank <= MAX_RANK;

    return NextResponse.json({
      eligible,
      rank: userRank,
      maxRank: MAX_RANK,
      reason: eligible ? 'rank_ok' : 'rank_too_low'
    });
  } catch (error) {
    console.error('OpenRank check error:', error);
    return NextResponse.json({ eligible: true, reason: 'error' });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
