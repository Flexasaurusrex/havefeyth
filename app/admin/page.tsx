'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletClient, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CONTRACT_ADDRESS, HAVE_FEYTH_ABI } from '@/lib/contract';
import { getAllInteractions } from '@/lib/supabase';
import { formatEther, shortenAddress } from '@/lib/utils';
import type { Interaction } from '@/lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const { authenticated, user } = usePrivy();
  const { data: walletClient } = useWalletClient();
  
  const [newRewardAmount, setNewRewardAmount] = useState('');
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [stats, setStats] = useState({
    totalInteractions: 0,
    uniqueUsers: 0,
    totalClaimed: 0,
    twitterShares: 0,
    farcasterShares: 0,
  });

  // Read contract data
  const { data: rewardAmount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'rewardAmount',
  });

  const { data: rewardToken } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'rewardToken',
  });

  const { data: contractBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'getContractBalance',
  });

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'owner',
  });

  // Check admin access
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
      return;
    }
    
    const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
    const userAddress = user?.wallet?.address?.toLowerCase();
    
    if (adminAddress !== userAddress && owner?.toLowerCase() !== userAddress) {
      router.push('/');
    }
  }, [authenticated, user, router, owner]);

  // Load interactions
  useEffect(() => {
    async function loadData() {
      const data = await getAllInteractions();
      setInteractions(data);
      
      // Calculate stats
      const uniqueUsers = new Set(data.map(i => i.wallet_address)).size;
      const claimed = data.filter(i => i.claimed).length;
      const twitter = data.filter(i => i.shared_platform === 'twitter').length;
      const farcaster = data.filter(i => i.shared_platform === 'farcaster').length;
      
      setStats({
        totalInteractions: data.length,
        uniqueUsers,
        totalClaimed: claimed,
        twitterShares: twitter,
        farcasterShares: farcaster,
      });
    }
    
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    
    return () => clearInterval(interval);
  }, []);

  const handleUpdateRewardAmount = async () => {
    if (!walletClient || !newRewardAmount) return;
    
    setIsUpdating(true);
    try {
      const amountInWei = BigInt(Math.floor(parseFloat(newRewardAmount) * 1e18));
      
      const { request } = await walletClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_ABI,
        functionName: 'setRewardAmount',
        args: [amountInWei],
        account: user?.wallet?.address as `0x${string}`,
      });
      
      await walletClient.writeContract(request);
      alert('Reward amount updated!');
      setNewRewardAmount('');
    } catch (error) {
      console.error('Error updating reward amount:', error);
      alert('Failed to update reward amount');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRewardToken = async () => {
    if (!walletClient || !newTokenAddress) return;
    
    setIsUpdating(true);
    try {
      const { request } = await walletClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_ABI,
        functionName: 'setRewardToken',
        args: [newTokenAddress as `0x${string}`],
        account: user?.wallet?.address as `0x${string}`,
      });
      
      await walletClient.writeContract(request);
      alert('Reward token updated!');
      setNewTokenAddress('');
    } catch (error) {
      console.error('Error updating reward token:', error);
      alert('Failed to update reward token');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-light">Admin Panel</h1>
          <a
            href="/"
            className="text-gray-500 hover:text-white transition-colors"
          >
            ← Back to Home
          </a>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white/5 p-6 rounded-lg">
            <div className="text-3xl font-bold">{stats.totalInteractions}</div>
            <div className="text-gray-400 text-sm">Total Interactions</div>
          </div>
          <div className="bg-white/5 p-6 rounded-lg">
            <div className="text-3xl font-bold">{stats.uniqueUsers}</div>
            <div className="text-gray-400 text-sm">Unique Users</div>
          </div>
          <div className="bg-white/5 p-6 rounded-lg">
            <div className="text-3xl font-bold">{stats.totalClaimed}</div>
            <div className="text-gray-400 text-sm">Claimed Rewards</div>
          </div>
          <div className="bg-white/5 p-6 rounded-lg">
            <div className="text-3xl font-bold">{stats.twitterShares}</div>
            <div className="text-gray-400 text-sm">Twitter Shares</div>
          </div>
          <div className="bg-white/5 p-6 rounded-lg">
            <div className="text-3xl font-bold">{stats.farcasterShares}</div>
            <div className="text-gray-400 text-sm">Farcaster Shares</div>
          </div>
        </div>

        {/* Contract Info */}
        <div className="bg-white/5 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-light">Contract Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Contract Address</div>
              <div className="font-mono">{shortenAddress(CONTRACT_ADDRESS)}</div>
            </div>
            <div>
              <div className="text-gray-400">Reward Token</div>
              <div className="font-mono">{rewardToken ? shortenAddress(rewardToken as string) : 'Loading...'}</div>
            </div>
            <div>
              <div className="text-gray-400">Reward Amount</div>
              <div>{rewardAmount ? formatEther(rewardAmount as bigint) : 'Loading...'} tokens</div>
            </div>
            <div>
              <div className="text-gray-400">Contract Balance</div>
              <div>{contractBalance ? formatEther(contractBalance as bigint) : 'Loading...'} tokens</div>
            </div>
          </div>
        </div>

        {/* Update Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Update Reward Amount */}
          <div className="bg-white/5 p-6 rounded-lg space-y-4">
            <h3 className="text-xl font-light">Update Reward Amount</h3>
            <input
              type="number"
              step="0.001"
              value={newRewardAmount}
              onChange={(e) => setNewRewardAmount(e.target.value)}
              placeholder="Enter amount (e.g., 10)"
              className="w-full bg-black border border-white/20 rounded p-3 focus:outline-none focus:border-white/60"
              disabled={isUpdating}
            />
            <button
              onClick={handleUpdateRewardAmount}
              disabled={isUpdating || !newRewardAmount}
              className="w-full px-4 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update Amount'}
            </button>
          </div>

          {/* Update Reward Token */}
          <div className="bg-white/5 p-6 rounded-lg space-y-4">
            <h3 className="text-xl font-light">Update Reward Token</h3>
            <input
              type="text"
              value={newTokenAddress}
              onChange={(e) => setNewTokenAddress(e.target.value)}
              placeholder="Enter token address (0x...)"
              className="w-full bg-black border border-white/20 rounded p-3 font-mono focus:outline-none focus:border-white/60"
              disabled={isUpdating}
            />
            <button
              onClick={handleUpdateRewardToken}
              disabled={isUpdating || !newTokenAddress}
              className="w-full px-4 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update Token'}
            </button>
          </div>
        </div>

        {/* Recent Interactions */}
        <div className="bg-white/5 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-light">Recent Interactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-400 border-b border-white/10">
                <tr>
                  <th className="pb-2">User</th>
                  <th className="pb-2">Message</th>
                  <th className="pb-2">Platform</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {interactions.map((interaction) => (
                  <tr key={interaction.id} className="border-b border-white/5">
                    <td className="py-3 font-mono">{shortenAddress(interaction.wallet_address)}</td>
                    <td className="py-3 max-w-xs truncate">{interaction.message}</td>
                    <td className="py-3 capitalize">{interaction.shared_platform}</td>
                    <td className="py-3">
                      {interaction.claimed ? (
                        <span className="text-green-500">✓ Claimed</span>
                      ) : (
                        <span className="text-yellow-500">Pending</span>
                      )}
                    </td>
                    <td className="py-3">{new Date(interaction.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
