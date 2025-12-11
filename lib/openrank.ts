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
      return { eligible: true, reason: 'proxy_error' };
    }

    return await response.json();

  } catch (error) {
    console.error('OpenRank check failed:', error);
    return { eligible: true, reason: 'network_error' };
  }
}

export const checkOpenRank = checkOpenRankEligibility;
