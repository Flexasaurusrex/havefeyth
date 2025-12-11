import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { fid, hasPowerBadge } = await request.json();
    
    if (!fid) {
      return NextResponse.json({ eligible: false, error: 'No FID provided' }, { status: 400 });
    }

    // Check whitelist first
    const { data: whitelisted } = await supabase
      .from('whitelist')
      .select('id')
      .eq('fid', String(fid))
      .single();

    if (whitelisted) {
      return NextResponse.json({
        eligible: true,
        reason: 'whitelisted'
      });
    }

    // Power badge = verified account = eligible
    if (hasPowerBadge) {
      return NextResponse.json({
        eligible: true,
        reason: 'power_badge'
      });
    }

    const response = await fetch('https://graph.cast.k3l.io/scores/global/engagement/fids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([parseInt(fid)])
    });

    if (!response.ok) {
      console.error('OpenRank API error:', response.status);
      // Fail open - don't block real users if API is down
      return NextResponse.json({ eligible: true, reason: 'api_error' });
    }

    const data = await response.json();
    
    if (!data.result || data.result.length === 0) {
      // User not in OpenRank graph and no power badge - likely a farmer/bot
      return NextResponse.json({ 
        eligible: false, 
        reason: 'not_in_graph',
        message: 'Account not found in reputation graph. DM @flexasaurusrex to appeal if you are a real person!'
      });
    }

    // If they're in the graph at all, they're a real user
    const userRank = data.result[0].rank;
    
    return NextResponse.json({
      eligible: true,
      rank: userRank,
      reason: 'in_graph'
    });

  } catch (error) {
    console.error('OpenRank check error:', error);
    // Fail open on errors
    return NextResponse.json({ eligible: true, reason: 'error' });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
