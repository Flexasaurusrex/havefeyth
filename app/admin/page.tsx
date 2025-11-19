'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI, RewardType, DistributionMode } from '@/lib/contract';
import { getAllInteractions } from '@/lib/supabase';
import { formatEther, shortenAddress } from '@/lib/utils';
import type { Interaction } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Reward {
  tokenAddress: string;
  rewardType: number;
  amount: bigint;
  tokenId: bigint;
  isActive: boolean;
  weight: bigint;
  name: string;
  symbol: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'settings' | 'users' | 'emergency'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [stats, setStats] = useState({
    totalInteractions: 0,
    uniqueUsers: 0,
    totalClaimed: 0,
    twitterShares: 0,
    farcasterShares: 0,
  });
  
  // Form states for adding rewards
  const [newReward, setNewReward] = useState({
    tokenAddress: '',
    rewardType: '0',
    amount: '',
    tokenId: '0',
    weight: '50',
    name: '',
    symbol: '',
  });
  
  // Other form states
  const [nftTokenIds, setNftTokenIds] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [withdrawTokenAddress, setWithdrawTokenAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Contract reads
  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'owner',
  });

  const { data: contractInfo, refetch: refetchContractInfo } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'getContractInfo',
  });

  const { data: allRewards, refetch: refetchRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'getAllRewards',
  });

  // Check admin access
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

  // Load interactions
  useEffect(() => {
    async function loadData() {
      const data = await getAllInteractions();
      setInteractions(data);
      
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
    const interval = setInterval(loadData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Parse contract info
  const distributionMode = contractInfo?.[0] as number | undefined;
  const rewardCount = contractInfo?.[1] as bigint | undefined;
  const activeRewardCount = contractInfo?.[2] as bigint | undefined;
  const cooldownPeriod = contractInfo?.[3] as bigint | undefined;
  const maxLifetimeClaims = contractInfo?.[4] as bigint | undefined;
  const maxClaimsPerHour = contractInfo?.[5] as bigint | undefined;
  const claimsThisHour = contractInfo?.[6] as bigint | undefined;
  const isPaused = contractInfo?.[7] as boolean | undefined;
  const whitelistEnabled = contractInfo?.[8] as boolean | undefined;

  const rewards = (allRewards as Reward[]) || [];

  const executeContractCall = async (
    functionName: string,
    args: any[],
    successMessage: string
  ) => {
    setIsUpdating(true);
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName,
        args,
      });
      alert(successMessage);
      refetchContractInfo();
      refetchRewards();
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error);
      alert(`Failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddReward = async () => {
    if (!newReward.tokenAddress || !newReward.name || !newReward.symbol) {
      alert('Please fill all fields');
      return;
    }

    const amountInWei = newReward.rewardType === '0' // ERC20
      ? BigInt(Math.floor(parseFloat(newReward.amount) * 1e18))
      : BigInt(newReward.amount);

    await executeContractCall(
      'addReward',
      [
        newReward.tokenAddress,
        parseInt(newReward.rewardType),
        amountInWei,
        BigInt(newReward.tokenId),
        BigInt(newReward.weight),
        newReward.name,
        newReward.symbol,
      ],
      'Reward added successfully!'
    );

    // Reset form
    setNewReward({
      tokenAddress: '',
      rewardType: '0',
      amount: '',
      tokenId: '0',
      weight: '50',
      name: '',
      symbol: '',
    });
  };

  const handleAddNFTs = async (rewardId: number) => {
    const tokenIds = nftTokenIds.split(',').map(id => BigInt(id.trim()));
    
    await executeContractCall(
      'batchAddNFTsToQueue',
      [rewardId, tokenIds],
      'NFTs added to queue!'
    );
    
    setNftTokenIds('');
  };

  const getRewardTypeLabel = (type: number) => {
    if (type === 0) return 'ERC20';
    if (type === 1) return 'NFT (ERC721)';
    if (type === 2) return 'ERC1155';
    return 'Unknown';
  };

  const getDistributionModeLabel = (mode: number | undefined) => {
    if (mode === 0) return 'All Rewards';
    if (mode === 1) return 'Random Selection';
    if (mode === 2) return 'Weighted Random';
    return 'Unknown';
  };

  if (!isConnected) return null;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-light mb-2">Multi-Reward Control Center</h1>
            <p className="text-gray-500 text-sm">Manage your multi-token distribution system</p>
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
              <div className="text-sm text-gray-400">Distribution Mode</div>
              <div className="text-xl font-medium">{getDistributionModeLabel(distributionMode)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Active Rewards</div>
              <div className="text-xl font-medium">{activeRewardCount?.toString() || '0'} / {rewardCount?.toString() || '0'}</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{stats.totalInteractions}</div>
            <div className="text-xs text-gray-400">Total Shares</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            <div className="text-xs text-gray-400">Unique Users</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{rewardCount?.toString() || '0'}</div>
            <div className="text-xs text-gray-400">Total Rewards</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{activeRewardCount?.toString() || '0'}</div>
            <div className="text-xs text-gray-400">Active Rewards</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-2xl font-bold">{claimsThisHour?.toString() || '0'}</div>
            <div className="text-xs text-gray-400">Claims This Hour</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
          {['overview', 'rewards', 'settings', 'users', 'emergency'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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
            {/* Current Rewards */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Active Rewards</h2>
              {rewards.length === 0 ? (
                <p className="text-gray-400">No rewards configured yet. Add rewards in the "Rewards" tab.</p>
              ) : (
                <div className="space-y-3">
                  {rewards.map((reward, index) => (
                    reward.isActive && (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">
                            {reward.rewardType === 0 ? '🪙' : reward.rewardType === 1 ? '🖼️' : '💎'}
                          </div>
                          <div>
                            <div className="font-medium text-lg">{reward.name}</div>
                            <div className="text-sm text-gray-400">
                              {getRewardTypeLabel(Number(reward.rewardType))} • {reward.symbol}
                            </div>
                            <div className="text-xs text-gray-500">
                              Amount: {reward.rewardType === 0 ? formatEther(reward.amount) : reward.amount.toString()}
                              {reward.rewardType === 2 && ` • Token ID: ${reward.tokenId.toString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          Weight: {reward.weight.toString()}%
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

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
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interactions.slice(0, 10).map((interaction) => (
                      <tr key={interaction.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 font-mono text-xs">{shortenAddress(interaction.wallet_address)}</td>
                        <td className="py-3 max-w-xs truncate">{interaction.message}</td>
                        <td className="py-3 capitalize">{interaction.shared_platform}</td>
                        <td className="py-3">
                          {interaction.claimed ? (
                            <span className="text-green-500">✓ Claimed</span>
                          ) : (
                            <span className="text-yellow-500">Pending</span>
                          )}
                        </td>
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
                  <label className="text-sm text-gray-400 mb-2 block">Token Address</label>
                  <input
                    type="text"
                    value={newReward.tokenAddress}
                    onChange={(e) => setNewReward({...newReward, tokenAddress: e.target.value})}
                    placeholder="0x..."
                    className="w-full bg-black border border-white/20 rounded p-3 font-mono text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Reward Type</label>
                  <select
                    value={newReward.rewardType}
                    onChange={(e) => setNewReward({...newReward, rewardType: e.target.value})}
                    className="w-full bg-black border border-white/20 rounded p-3"
                  >
                    <option value="0">ERC20 Token</option>
                    <option value="1">NFT (ERC721)</option>
                    <option value="2">ERC1155</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Name</label>
                  <input
                    type="text"
                    value={newReward.name}
                    onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                    placeholder="Feyth Token"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Symbol</label>
                  <input
                    type="text"
                    value={newReward.symbol}
                    onChange={(e) => setNewReward({...newReward, symbol: e.target.value})}
                    placeholder="FEYTH"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Amount {newReward.rewardType === '0' ? '(tokens)' : '(count)'}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newReward.amount}
                    onChange={(e) => setNewReward({...newReward, amount: e.target.value})}
                    placeholder="100"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
                
                {newReward.rewardType === '2' && (
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Token ID (for ERC1155)</label>
                    <input
                      type="number"
                      value={newReward.tokenId}
                      onChange={(e) => setNewReward({...newReward, tokenId: e.target.value})}
                      placeholder="1"
                      className="w-full bg-black border border-white/20 rounded p-3"
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Weight (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newReward.weight}
                    onChange={(e) => setNewReward({...newReward, weight: e.target.value})}
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

            {/* Manage Existing Rewards */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Manage Rewards</h2>
              <div className="space-y-3">
                {rewards.map((reward, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {reward.rewardType === 0 ? '🪙' : reward.rewardType === 1 ? '🖼️' : '💎'}
                        </div>
                        <div>
                          <div className="font-medium">{reward.name} ({reward.symbol})</div>
                          <div className="text-xs text-gray-400">{getRewardTypeLabel(Number(reward.rewardType))}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => executeContractCall('toggleReward', [index, !reward.isActive], `Reward ${reward.isActive ? 'disabled' : 'enabled'}!`)}
                          className={`px-4 py-2 rounded text-sm font-medium ${
                            reward.isActive
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600 hover:bg-gray-700'
                          } transition-colors`}
                        >
                          {reward.isActive ? '✓ Active' : '○ Inactive'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Remove this reward?')) {
                              executeContractCall('removeReward', [index], 'Reward removed!');
                            }
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    
                    {/* NFT Queue Management */}
                    {reward.rewardType === 1 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <label className="text-xs text-gray-400 mb-2 block">Add NFT Token IDs (comma-separated)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={nftTokenIds}
                            onChange={(e) => setNftTokenIds(e.target.value)}
                            placeholder="1, 2, 3, 4, 5"
                            className="flex-1 bg-black border border-white/20 rounded p-2 text-sm"
                          />
                          <button
                            onClick={() => handleAddNFTs(index)}
                            disabled={isUpdating}
                            className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-gray-200"
                          >
                            Add NFTs
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribution Mode */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Distribution Mode</h3>
              <div className="space-y-3">
                {[0, 1, 2].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => executeContractCall('setDistributionMode', [mode], 'Distribution mode updated!')}
                    disabled={isUpdating || distributionMode === mode}
                    className={`w-full px-4 py-3 rounded border transition-colors ${
                      distributionMode === mode
                        ? 'bg-white/20 border-white/40 text-white'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                    } disabled:opacity-50`}
                  >
                    {getDistributionModeLabel(mode)}
                    {distributionMode === mode && ' ✓'}
                  </button>
                ))}
              </div>
            </div>

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
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Whitelist Toggle */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Whitelist Mode</h3>
              <button
                onClick={() => executeContractCall('toggleWhitelist', [!whitelistEnabled], `Whitelist ${!whitelistEnabled ? 'enabled' : 'disabled'}!`)}
                disabled={isUpdating}
                className={`w-full px-4 py-3 font-medium rounded transition-colors ${
                  whitelistEnabled
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                } disabled:opacity-50`}
              >
                {whitelistEnabled ? '✅ Whitelist Active' : '❌ Whitelist Inactive'}
              </button>
            </div>

            {/* Add to Whitelist */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Manage Users</h3>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black border border-white/20 rounded p-3 mb-3 font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    executeContractCall('addToWhitelist', [userAddress], 'User whitelisted!');
                    setUserAddress('');
                  }}
                  disabled={isUpdating || !userAddress}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Whitelist
                </button>
                <button
                  onClick={() => {
                    executeContractCall('addToBlacklist', [userAddress], 'User blacklisted!');
                    setUserAddress('');
                  }}
                  disabled={isUpdating || !userAddress}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Blacklist
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg">
              <p className="text-red-400 text-sm">⚠️ Warning: Emergency functions - use with caution</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-6 rounded-lg border border-red-500/50">
                <h3 className="text-xl font-light mb-4">Withdraw All ERC20</h3>
                <input
                  type="text"
                  value={withdrawTokenAddress}
                  onChange={(e) => setWithdrawTokenAddress(e.target.value)}
                  placeholder="Token address (0x...)"
                  className="w-full bg-black border border-white/20 rounded p-3 mb-3 font-mono"
                />
                <button
                  onClick={() => {
                    if (confirm('Withdraw ALL tokens? This cannot be undone.')) {
                      executeContractCall('withdrawAllERC20', [withdrawTokenAddress], 'All tokens withdrawn!');
                      setWithdrawTokenAddress('');
                    }
                  }}
                  disabled={isUpdating || !withdrawTokenAddress}
                  className="w-full px-4 py-3 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Withdraw All Tokens
                </button>
              </div>

              <div className="bg-white/5 p-6 rounded-lg border border-red-500/50">
                <h3 className="text-xl font-light mb-4">Withdraw ETH</h3>
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
          </div>
        )}
      </div>
    </main>
  );
}
