export interface OpenRankResult {
  eligible: boolean;
  rank?: number;
  reason?: string;
  message?: string;
}

export async function checkOpenRankEligibility(fid: string | number, hasPowerBadge?: boolean): Promise<OpenRankResult> {
  try {
    const response = await fetch('/api/check-openrank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid: parseInt(String(fid)), hasPowerBadge })
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

// Alias for backward compatibility
export const checkOpenRank = checkOpenRankEligibility;
