// app/api/check-openrank/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid, hasPowerBadge, followerCount } = await request.json();

    if (!fid) {
      return NextResponse.json(
        { eligible: false, reason: 'No FID provided' },
        { status: 400 }
      );
    }

    // Get settings from env or database
    const threshold = parseInt(process.env.OPENRANK_THRESHOLD || '100');
    const powerBadgeBypass = process.env.POWER_BADGE_BYPASS !== 'false';
    const followerBypassThreshold = parseInt(process.env.FOLLOWER_BYPASS_THRESHOLD || '500');

    // Power badge bypass
    if (powerBadgeBypass && hasPowerBadge) {
      return NextResponse.json({
        eligible: true,
        hasPowerBadge: true,
        reason: 'Power badge holder'
      });
    }

    // Follower count bypass
    if (followerCount && followerCount >= followerBypassThreshold) {
      return NextResponse.json({
        eligible: true,
        reason: `${followerCount} followers (established account)`
      });
    }

    // Fetch OpenRank score from server-side (no CORS issues)
    const response = await fetch(
      `https://graph.cast.k3l.io/scores/global/engagement/fids?fid=${fid}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('OpenRank API error:', response.status);
      return NextResponse.json({
        eligible: false,
        reason: 'Unable to verify account eligibility'
      });
    }

    const data = await response.json();
    const score = data?.result?.[0]?.score || 0;

    console.log(`OpenRank check - FID: ${fid}, Score: ${score}, Threshold: ${threshold}`);

    if (score >= threshold) {
      return NextResponse.json({
        eligible: true,
        score,
        reason: `OpenRank score: ${score}`
      });
    }

    return NextResponse.json({
      eligible: false,
      score,
      reason: `OpenRank score too low (${score}/${threshold}). This prevents airdrop farmers. DM @flexasaurusrex to appeal.`
    });

  } catch (error) {
    console.error('OpenRank check failed:', error);
    return NextResponse.json({
      eligible: false,
      reason: 'Unable to verify account. Please try again.'
    });
  }
}
