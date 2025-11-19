'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CONTRACT_ADDRESS, HAVE_FEYTH_ABI } from '@/lib/contract';
import { getAllInteractions } from '@/lib/supabase';
import type { Interaction } from '@/lib/supabase';
import { formatEther } from 'viem';

export const dynamic = 'force-dynamic';

interface Reward {
  rewardAmount: bigint;
  requiredTokenAmount: bigint;
  rewardToken: string;
  requiredToken: string;
  isERC721: boolean;
  isActive: boolean;
  startTime: bigint;
  endTime: bigint;
  maxClaims: bigint;
  totalClaims: bigint;
  cooldown: bigint;
  lastClaimTime: bigint;
}

export default function AdminPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'settings'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [stats, setStats] = useState({
    totalInteractions: 0,
    uniqueUsers: 0,
    totalClaimed: 0,
  });
  
  // Form state
  const [newReward, setNewReward] = useState({
    rewardAmount: '',
    requiredTokenAmount: '0',
    rewardToken: '',
    requiredToken: '0x0000000000000000000000000000000000000000',
    isERC721: false,
    startTime: Math.floor(Date.now() / 1000).toString(),
    endTime: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60).toString(),
    maxClaims: '1000',
    cooldown: '86400',
  });

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'owner',
  });

  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'paused',
  });

  const { data: activeRewardIds, refetch: refetchRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'getAllActiveRewardIds',
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
    const userAddress = address?.toLowerCase();
    
    if (adminAddress !== userAddress && owner?.toString().toLowerCase() !== userAddress) {
      router.push('/');
    }
  }, [isConnected, address, router, owner]);

  useEffect(() => {
    async function loadData() {
      const data = await getAllInteractions();
      setInteractions(data);
      
      const uniqueUsers = new Set(data.map(i => i.wallet_address)).size;
      const claimed = data.filter(i => i.claimed).length;
      
      setStats({
        totalInteractions: data.length,
        uniqueUsers,
        totalClaimed: claimed,
      });
    }
    
    loadData();
    const interval = setInterval(loadData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const executeContractCall = async (
    functionName: any,
    args: any[],
    successMessage: string
  ) => {
    setIsUpdating(true);
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_ABI,
        functionName: functionName as any,
        args: args as any,
      });
      alert(successMessage);
      refetchRewards();
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error);
      alert(`Failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddReward = async () => {
    if (!newReward.rewardToken || !newReward.rewardAmount) {
      alert('Please fill required fields');
      return;
    }

    const rewardAmountInWei = BigInt(Math.floor(parseFloat(newReward.rewardAmount) * 1e18));

    await executeContractCall(
      'addReward',
      [
        rewardAmountInWei,
        BigInt(newReward.requiredTokenAmount),
        newReward.rewardToken,
        newReward.requiredToken,
        newReward.isERC721,
        BigInt(newReward.startTime),
        BigInt(newReward.endTime),
        BigInt(newReward.maxClaims),
        BigInt(newReward.cooldown),
      ],
      'Reward added successfully!'
    );

    // Reset form
    setNewReward({
      rewardAmount: '',
      requiredTokenAmount: '0',
      rewardToken: '',
      requiredToken: '0x0000000000000000000000000000000000000000',
      isERC721: false,
      startTime: Math.floor(Date.now() / 1000).toString(),
      endTime: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60).toString(),
      maxClaims: '1000',
      cooldown: '86400',
    });
  };

  if (!isConnected) return null;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-light mb-2">Feylon Control Center</h1>
            <p className="text-gray-500 text-sm">Manage your reward distribution</p>
          </div>
          <a href="/" className="text-gray-500 hover:text-white transition-colors text-sm">
            ← Back to Home
          </a>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-lg ${isPaused ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Contract Status</div>
              <div className="text-2xl font-bold">{isPaused ? '⏸️ PAUSED' : '✅ ACTIVE'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Active Rewards</div>
              <div className="text-xl font-medium">{activeRewardIds?.length || 0}</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{stats.totalInteractions}</div>
            <div className="text-xs text-gray-400">Total Shares</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            <div className="text-xs text-gray-400">Unique Users</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{stats.totalClaimed}</div>
            <div className="text-xs text-gray-400">Claims</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['overview', 'rewards', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Recent Activity</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="pb-3">User</th>
                      <th className="pb-3">Message</th>
                      <th className="pb-3">Platform</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interactions.slice(0, 10).map((interaction) => (
                      <tr key={interaction.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 font-mono text-xs">{interaction.wallet_address.slice(0, 6)}...{interaction.wallet_address.slice(-4)}</td>
                        <td className="py-3 max-w-xs truncate">{interaction.message}</td>
                        <td className="py-3 capitalize">{interaction.shared_platform}</td>
                        <td className="py-3 text-xs text-gray-400">
                          {new Date(interaction.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {/* Add New Reward */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Add New Reward</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Reward Token Address</label>
                  <input
                    type="text"
                    value={newReward.rewardToken}
                    onChange={(e) => setNewReward({...newReward, rewardToken: e.target.value})}
                    placeholder="0x..."
                    className="w-full bg-black border border-white/20 rounded p-3 font-mono text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Reward Amount (tokens)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newReward.rewardAmount}
                    onChange={(e) => setNewReward({...newReward, rewardAmount: e.target.value})}
                    placeholder="100"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Max Claims</label>
                  <input
                    type="number"
                    value={newReward.maxClaims}
                    onChange={(e) => setNewReward({...newReward, maxClaims: e.target.value})}
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Cooldown (seconds)</label>
                  <input
                    type="number"
                    value={newReward.cooldown}
                    onChange={(e) => setNewReward({...newReward, cooldown: e.target.value})}
                    placeholder="86400 (24 hours)"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
              </div>
              
              <button
                onClick={handleAddReward}
                disabled={isUpdating}
                className="mt-4 w-full px-4 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isUpdating ? 'Adding...' : 'Add Reward'}
              </button>
            </div>

            {/* Active Rewards List */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Active Rewards</h2>
              {!activeRewardIds || activeRewardIds.length === 0 ? (
                <p className="text-gray-400">No active rewards yet. Add one above!</p>
              ) : (
                <div className="space-y-3">
                  {activeRewardIds.map((rewardId: bigint) => (
                    <RewardCard key={rewardId.toString()} rewardId={Number(rewardId)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pause Control */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Contract Control</h3>
              <button
                onClick={() => executeContractCall(isPaused ? 'unpause' : 'pause', [], `Contract ${isPaused ? 'resumed' : 'paused'}!`)}
                disabled={isUpdating}
                className={`w-full px-4 py-3 font-medium rounded transition-colors ${
                  isPaused
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50`}
              >
                {isPaused ? '▶️ Resume Contract' : '⏸️ Pause Contract'}
              </button>
            </div>

            {/* Withdraw */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Emergency Withdraw</h3>
              <button
                onClick={() => {
                  if (confirm('Withdraw all ETH from contract?')) {
                    executeContractCall('withdrawETH', [], 'ETH withdrawn!');
                  }
                }}
                disabled={isUpdating}
                className="w-full px-4 py-3 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:opacity-50"
              >
                Withdraw ETH
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Reward Card Component
function RewardCard({ rewardId }: { rewardId: number }) {
  const { data: rewardInfo } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_ABI,
    functionName: 'getRewardInfo',
    args: [BigInt(rewardId)],
  });

  if (!rewardInfo) return null;

  const [rewardAmount, , rewardToken, , , isActive, , , maxClaims, totalClaims] = rewardInfo as any[];

  return (
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-lg">Reward #{rewardId}</div>
          <div className="text-sm text-gray-400">
            Amount: {formatEther(rewardAmount)} tokens
          </div>
          <div className="text-xs text-gray-500">
            Token: {rewardToken.slice(0, 6)}...{rewardToken.slice(-4)}
          </div>
          <div className="text-xs text-gray-500">
            Claims: {totalClaims.toString()} / {maxClaims.toString()}
          </div>
        </div>
        <div className={`px-4 py-2 rounded text-sm ${
          isActive ? 'bg-green-600' : 'bg-gray-600'
        }`}>
          {isActive ? '✓ Active' : '○ Inactive'}
        </div>
      </div>
    </div>
  );
}
