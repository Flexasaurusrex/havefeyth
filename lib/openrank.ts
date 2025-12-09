const MAX_RANK = 50000;

export interface OpenRankResult {
  eligible: boolean;
  rank?: number;
  reason?: string;
  message?: string;
}

export async function checkOpenRankEligibility(fid: string | number): Promise<OpenRankResult> {
  try {
    const response = await fetch('/api/check-openrank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid: parseInt(String(fid)) })
    });

    if (!response.ok) {
      console.error('OpenRank proxy error:', response.status);
      // Fail open - don't block real users
      return { eligible: true, reason: 'proxy_error' };
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('OpenRank check failed:', error);
    // Fail open on network errors
    return { eligible: true, reason: 'network_error' };
  }
}

export { MAX_RANK };
