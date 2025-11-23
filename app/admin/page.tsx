'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI, RewardType, DistributionMode } from '@/lib/contract';
import { formatEther, parseEther } from 'viem';
import { getAnalytics } from '@/lib/supabase';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [activeTab, setActiveTab] = useState<'fund' | 'rewards' | 'manage' | 'analytics'>('fund');
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalInteractions: 0,
    uniqueUsers: 0,
    platformBreakdown: { twitter: 0, farcaster: 0 },
    recentActivity: [],
  });

  // Contract state
  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'paused',
  });

  const { data: cooldownPeriod } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'cooldownPeriod',
  });

  const { data: allRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'getAllRewards',
  });

  const { data: claimsThisHour } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'claimsThisHour',
  });

  const { data: maxClaimsPerHour } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'maxClaimsPerHour',
  });

  // Form states
  const [fundForm, setFundForm] = useState({
    tokenAddress: '',
    amount: '',
  });

  const [rewardForm, setRewardForm] = useState({
    tokenAddress: '',
    rewardType: RewardType.ERC20,
    amount: '',
    tokenId: '',
    weight: '50',
    name: '',
    symbol: '',
  });

  // Load analytics
  useEffect(() => {
    async function loadAnalytics() {
      const data = await getAnalytics();
      setAnalytics(data);
    }
    loadAnalytics();
    
    const interval = setInterval(loadAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Check if user is admin
  const isAdmin = address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <p className="text-gray-400">Connect your wallet to access</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Unauthorized</h1>
          <p className="text-gray-400">This address is not authorized to access the admin panel</p>
          <a href="/" className="text-purple-400 hover:text-purple-300">← Back to Home</a>
        </div>
      </div>
    );
  }

  const handleFundERC20 = async () => {
    try {
      // First approve
      const approveAbi = [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ];

      await writeContractAsync({
        address: fundForm.tokenAddress as `0x${string}`,
        abi: approveAbi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, parseEther(fundForm.amount)],
      });

      alert('Approval successful! Now transfer the tokens...');

      // Then transfer
      const transferAbi = [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ];

      await writeContractAsync({
        address: fundForm.tokenAddress as `0x${string}`,
        abi: transferAbi,
        functionName: 'transfer',
        args: [CONTRACT_ADDRESS, parseEther(fundForm.amount)],
      });

      alert('✅ Tokens transferred successfully!');
      setFundForm({ tokenAddress: '', amount: '' });
    } catch (error) {
      console.error(error);
      alert('Transaction failed!');
    }
  };

  const handleAddReward = async () => {
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'addReward',
        args: [
          rewardForm.tokenAddress as `0x${string}`,
          rewardForm.rewardType,
          parseEther(rewardForm.amount),
          BigInt(rewardForm.tokenId || 0),
          BigInt(rewardForm.weight),
          rewardForm.name,
          rewardForm.symbol,
        ],
      });

      alert('✅ Reward added successfully!');
      setRewardForm({
        tokenAddress: '',
        rewardType: RewardType.ERC20,
        amount: '',
        tokenId: '',
        weight: '50',
        name: '',
        symbol: '',
      });
    } catch (error) {
      console.error(error);
      alert('Transaction failed!');
    }
  };

  const handleToggleReward = async (rewardId: number, currentStatus: boolean) => {
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'toggleReward',
        args: [BigInt(rewardId), !currentStatus],
      });
      alert(`✅ Reward ${!currentStatus ? 'activated' : 'deactivated'}!`);
    } catch (error) {
      console.error(error);
      alert('Transaction failed!');
    }
  };

  const handleRemoveReward = async (rewardId: number) => {
    if (!confirm('Are you sure you want to remove this reward?')) return;
    
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'removeReward',
        args: [BigInt(rewardId)],
      });
      alert('✅ Reward removed!');
    } catch (error) {
      console.error(error);
      alert('Transaction failed!');
    }
  };

  const handlePauseToggle = async () => {
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: isPaused ? 'unpause' : 'pause',
      });
      alert(`✅ Contract ${isPaused ? 'unpaused' : 'paused'}!`);
    } catch (error) {
      console.error(error);
      alert('Transaction failed!');
    }
  };

  const handleSetCooldown = async (hours: number) => {
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'setCooldownPeriod',
        args: [BigInt(hours * 3600)],
      });
      alert(`✅ Cooldown set to ${hours} hours!`);
    } catch (error) {
      console.error(error);
      alert('Transaction failed!');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">FEYLON Admin Panel</h1>
            <p className="text-gray-400">Manage your reward distribution system</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg ${isPaused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {isPaused ? '⏸️ PAUSED' : '✅ ACTIVE'}
            </div>
            <ConnectButton />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Total Feylons</div>
            <div className="text-3xl font-bold">{analytics.totalInteractions}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Unique Users</div>
            <div className="text-3xl font-bold">{analytics.uniqueUsers}</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Claims This Hour</div>
            <div className="text-3xl font-bold">{claimsThisHour?.toString() || '0'}</div>
            <div className="text-xs text-gray-500 mt-1">/ {maxClaimsPerHour?.toString() || '100'} max</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Cooldown Period</div>
            <div className="text-3xl font-bold">{cooldownPeriod ? Number(cooldownPeriod) / 3600 : 24}h</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {(['fund', 'rewards', 'manage', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'fund' && '💰 Fund Contract'}
              {tab === 'rewards' && '🎁 Add Rewards'}
              {tab === 'manage' && '⚙️ Manage Rewards'}
              {tab === 'analytics' && '📊 Analytics'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'fund' && (
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-white/10 rounded-xl p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Step 1: Fund the Contract</h2>
                <p className="text-gray-400">Transfer ERC20 tokens to the contract for distribution</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Token Address</label>
                  <input
                    type="text"
                    value={fundForm.tokenAddress}
                    onChange={(e) => setFundForm({ ...fundForm, tokenAddress: e.target.value })}
                    placeholder="0x..."
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount</label>
                  <input
                    type="text"
                    value={fundForm.amount}
                    onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                    placeholder="1000"
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  onClick={handleFundERC20}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all"
                >
                  Transfer ERC20 Tokens
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-white/10 rounded-xl p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Step 2: Add Reward</h2>
                <p className="text-gray-400">Configure rewards that users can claim</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Token Address</label>
                  <input
                    type="text"
                    value={rewardForm.tokenAddress}
                    onChange={(e) => setRewardForm({ ...rewardForm, tokenAddress: e.target.value })}
                    placeholder="0x..."
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Reward Type</label>
                  <select
                    value={rewardForm.rewardType}
                    onChange={(e) => setRewardForm({ ...rewardForm, rewardType: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3"
                  >
                    <option value={RewardType.ERC20}>ERC20 Token</option>
                    <option value={RewardType.ERC721}>NFT (ERC721)</option>
                    <option value={RewardType.ERC1155}>Multi-Token (ERC1155)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount Per Claim</label>
                  <input
                    type="text"
                    value={rewardForm.amount}
                    onChange={(e) => setRewardForm({ ...rewardForm, amount: e.target.value })}
                    placeholder="100"
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Weight (1-100)</label>
                  <input
                    type="number"
                    value={rewardForm.weight}
                    onChange={(e) => setRewardForm({ ...rewardForm, weight: e.target.value })}
                    min="1"
                    max="100"
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Name</label>
                  <input
                    type="text"
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="My Token"
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={rewardForm.symbol}
                    onChange={(e) => setRewardForm({ ...rewardForm, symbol: e.target.value })}
                    placeholder="TKN"
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3"
                  />
                </div>
              </div>

              <button
                onClick={handleAddReward}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-lg font-bold transition-all"
              >
                + Add Reward
              </button>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-6">
              {/* Rewards List */}
              <div className="bg-gradient-to-br from-purple-900/20 to-black border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-6">Step 3: Manage Active Rewards</h2>

                {allRewards && allRewards.length > 0 ? (
                  <div className="space-y-4">
                    {allRewards.map((reward: any, index: number) => (
                      <div
                        key={index}
                        className="bg-black/30 border border-white/10 rounded-lg p-6 space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold">{reward.name} ({reward.symbol})</h3>
                            <p className="text-sm text-gray-400 font-mono">{reward.tokenAddress}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm ${
                            reward.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {reward.isActive ? '✓ Active' : '○ Inactive'}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">Amount</div>
                            <div className="font-bold">{formatEther(reward.amount)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Type</div>
                            <div className="font-bold">
                              {reward.rewardType === 0 ? 'ERC20' : reward.rewardType === 1 ? 'ERC721' : 'ERC1155'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Weight</div>
                            <div className="font-bold">{reward.weight.toString()}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleReward(index, reward.isActive)}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                              reward.isActive
                                ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                                : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            }`}
                          >
                            {reward.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleRemoveReward(index)}
                            className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg font-medium transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No rewards configured yet
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="bg-gradient-to-br from-blue-900/20 to-black border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-6">Contract Settings</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold mb-2">Cooldown Period</h3>
                    <div className="flex gap-2">
                      {[1, 6, 12, 24].map((hours) => (
                        <button
                          key={hours}
                          onClick={() => handleSetCooldown(hours)}
                          className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors"
                        >
                          {hours}h
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">Contract Status</h3>
                    <button
                      onClick={handlePauseToggle}
                      className={`px-6 py-3 rounded-lg font-bold transition-all ${
                        isPaused
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isPaused ? 'Unpause Contract' : 'Pause Contract'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Platform Breakdown */}
              <div className="bg-gradient-to-br from-purple-900/20 to-black border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-6">Platform Distribution</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                    <div className="text-blue-400 text-sm mb-2">𝕏 Twitter</div>
                    <div className="text-4xl font-bold">{analytics.platformBreakdown.twitter}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {analytics.totalInteractions > 0
                        ? Math.round((analytics.platformBreakdown.twitter / analytics.totalInteractions) * 100)
                        : 0}% of total
                    </div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
                    <div className="text-purple-400 text-sm mb-2">🟪 Farcaster</div>
                    <div className="text-4xl font-bold">{analytics.platformBreakdown.farcaster}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {analytics.totalInteractions > 0
                        ? Math.round((analytics.platformBreakdown.farcaster / analytics.totalInteractions) * 100)
                        : 0}% of total
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gradient-to-br from-green-900/20 to-black border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
                {analytics.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.recentActivity.map((activity: any) => (
                      <div key={activity.id} className="bg-black/30 border border-white/10 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-mono text-sm text-gray-400">
                            {activity.wallet_address.slice(0, 6)}...{activity.wallet_address.slice(-4)}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            activity.shared_platform === 'twitter'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {activity.shared_platform}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">"{activity.message}"</p>
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(activity.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <a href="/" className="hover:text-white transition-colors">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
