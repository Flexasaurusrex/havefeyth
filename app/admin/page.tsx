'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI, RewardType, DistributionMode } from '@/lib/contract';
import { getAllInteractions } from '@/lib/supabase';
import type { Interaction } from '@/lib/supabase';
import { formatEther, parseEther } from 'viem';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const router = useRouter();
  const { address, isConnected, isConnecting } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'distribution' | 'access' | 'settings'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInteractions: 0,
    uniqueUsers: 0,
    totalClaimed: 0,
  });
  
  const [newReward, setNewReward] = useState({
    tokenAddress: '',
    rewardType: 0,
    amount: '',
    tokenId: '0',
    weight: '50',
    name: '',
    symbol: '',
  });

  const [nftQueueInput, setNftQueueInput] = useState({
    rewardId: '',
    tokenIds: '',
  });

  const [whitelistInput, setWhitelistInput] = useState('');
  const [blacklistInput, setBlacklistInput] = useState('');

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'owner',
  });

  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'paused',
  });

  const { data: rewardCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'rewardCount',
  });

  const { data: distributionMode } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'distributionMode',
  });

  const { data: randomSelectionCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'randomSelectionCount',
  });

  const { data: cooldownPeriod } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'cooldownPeriod',
  });

  const { data: maxLifetimeClaimsPerUser } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'maxLifetimeClaimsPerUser',
  });

  const { data: maxClaimsPerHour } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'maxClaimsPerHour',
  });

  const { data: whitelistEnabled } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'whitelistEnabled',
  });

  const { data: allRewards, refetch: refetchRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'getAllRewards',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!isConnecting && !isConnected) {
        router.push('/');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isConnected, isConnecting, router]);

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
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
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
    if (!newReward.tokenAddress || !newReward.amount || !newReward.name || !newReward.symbol) {
      alert('Please fill all required fields');
      return;
    }

    const amountInWei = parseEther(newReward.amount);

    await executeContractCall(
      'addReward',
      [
        newReward.tokenAddress,
        Number(newReward.rewardType),
        amountInWei,
        BigInt(newReward.tokenId),
        BigInt(newReward.weight),
        newReward.name,
        newReward.symbol,
      ],
      'Reward added successfully!'
    );

    setNewReward({
      tokenAddress: '',
      rewardType: 0,
      amount: '',
      tokenId: '0',
      weight: '50',
      name: '',
      symbol: '',
    });
  };

  const handleBatchAddNFTs = async () => {
    if (!nftQueueInput.rewardId || !nftQueueInput.tokenIds) {
      alert('Please fill all fields');
      return;
    }

    const tokenIds = nftQueueInput.tokenIds.split(',').map(id => BigInt(id.trim()));

    await executeContractCall(
      'batchAddNFTsToQueue',
      [BigInt(nftQueueInput.rewardId), tokenIds],
      'NFTs added to queue!'
    );

    setNftQueueInput({ rewardId: '', tokenIds: '' });
  };

  const formatTime = (seconds: bigint | undefined) => {
    if (!seconds) return 'N/A';
    const hours = Number(seconds) / 3600;
    return `${hours.toFixed(1)} hours`;
  };

  const getDistributionModeLabel = (mode: number | undefined) => {
    if (mode === undefined) return 'Unknown';
    if (mode === 0) return 'All Rewards';
    if (mode === 1) return 'Random Selection';
    if (mode === 2) return 'Weighted Random';
    return 'Unknown';
  };

  if (isLoading || isConnecting) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-white/20 border-t-white rounded-full mb-4" />
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </main>
    );
  }

  if (!isConnected) return null;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-light mb-2">Feylon Control Center</h1>
            <p className="text-gray-500 text-sm">Multi-Reward Distribution System</p>
          </div>
          <a href="/" className="text-gray-500 hover:text-white transition-colors text-sm">
            ← Back to Home
          </a>
        </div>

        <div className={`p-4 rounded-lg ${isPaused ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Contract Status</div>
              <div className="text-2xl font-bold">{isPaused ? '⏸️ PAUSED' : '✅ ACTIVE'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total Rewards</div>
              <div className="text-xl font-medium">{rewardCount?.toString() || 0}</div>
            </div>
          </div>
        </div>

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

        <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
          {['overview', 'rewards', 'distribution', 'access', 'settings'].map((tab) => (
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

        {activeTab === 'overview' && (
          <div className="space-y-6">
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
                    onChange={(e) => setNewReward({...newReward, rewardType: Number(e.target.value)})}
                    className="w-full bg-black border border-white/20 rounded p-3"
                  >
                    <option value={0}>ERC20 Token</option>
                    <option value={1}>NFT (ERC721)</option>
                    <option value={2}>ERC1155</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Amount (tokens)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newReward.amount}
                    onChange={(e) => setNewReward({...newReward, amount: e.target.value})}
                    placeholder="100"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Weight (1-100)</label>
                  <input
                    type="number"
                    value={newReward.weight}
                    onChange={(e) => setNewReward({...newReward, weight: e.target.value})}
                    min="1"
                    max="100"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
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
              </div>
              
              <button
                onClick={handleAddReward}
                disabled={isUpdating}
                className="mt-4 w-full px-4 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isUpdating ? 'Adding...' : 'Add Reward'}
              </button>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">NFT Queue Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Reward ID</label>
                  <input
                    type="number"
                    value={nftQueueInput.rewardId}
                    onChange={(e) => setNftQueueInput({...nftQueueInput, rewardId: e.target.value})}
                    placeholder="0"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Token IDs (comma-separated)</label>
                  <input
                    type="text"
                    value={nftQueueInput.tokenIds}
                    onChange={(e) => setNftQueueInput({...nftQueueInput, tokenIds: e.target.value})}
                    placeholder="1,2,3,4,5"
                    className="w-full bg-black border border-white/20 rounded p-3"
                  />
                </div>
              </div>
              <button
                onClick={handleBatchAddNFTs}
                disabled={isUpdating}
                className="mt-4 w-full px-4 py-3 bg-purple-600 text-white font-medium rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isUpdating ? 'Adding NFTs...' : 'Batch Add NFTs to Queue'}
              </button>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Active Rewards</h2>
              {!allRewards || allRewards.length === 0 ? (
                <p className="text-gray-400">No rewards yet. Add one above!</p>
              ) : (
                <div className="space-y-3">
                  {allRewards.map((reward: any, index: number) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-lg">#{index} - {reward.name}</div>
                          <div className="text-sm text-gray-400">
                            {reward.symbol} • {formatEther(reward.amount)} tokens
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {reward.tokenAddress.slice(0, 10)}...{reward.tokenAddress.slice(-8)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Weight: {reward.weight.toString()}
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded text-sm ${
                          reward.isActive ? 'bg-green-600' : 'bg-gray-600'
                        }`}>
                          {reward.isActive ? '✓ Active' : '○ Inactive'}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => executeContractCall('toggleReward', [BigInt(index), !reward.isActive], `Reward ${!reward.isActive ? 'activated' : 'deactivated'}!`)}
                          disabled={isUpdating}
                          className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {reward.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Remove this reward?')) {
                              executeContractCall('removeReward', [BigInt(index)], 'Reward removed!');
                            }
                          }}
                          disabled={isUpdating}
                          className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Distribution Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Current Mode: {getDistributionModeLabel(Number(distributionMode))}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => executeContractCall('setDistributionMode', [0], 'Distribution mode set to All Rewards!')}
                      disabled={isUpdating}
                      className="px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      All Rewards
                    </button>
                    <button
                      onClick={() => executeContractCall('setDistributionMode', [1], 'Distribution mode set to Random Selection!')}
                      disabled={isUpdating}
                      className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Random Selection
                    </button>
                    <button
                      onClick={() => executeContractCall('setDistributionMode', [2], 'Distribution mode set to Weighted Random!')}
                      disabled={isUpdating}
                      className="px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      Weighted Random
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Random Selection Count: {randomSelectionCount?.toString()}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="randomCount"
                      placeholder="2"
                      className="flex-1 bg-black border border-white/20 rounded p-3"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('randomCount') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setRandomSelectionCount', [BigInt(input.value)], 'Random count updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Cooldown Period: {formatTime(cooldownPeriod)}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="cooldown"
                      placeholder="86400"
                      className="flex-1 bg-black border border-white/20 rounded p-3"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('cooldown') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setCooldownPeriod', [BigInt(input.value)], 'Cooldown updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Set (seconds)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Max Lifetime Claims: {maxLifetimeClaimsPerUser?.toString()}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="maxLifetime"
                      placeholder="1000"
                      className="flex-1 bg-black border border-white/20 rounded p-3"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('maxLifetime') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setMaxLifetimeClaimsPerUser', [BigInt(input.value)], 'Max lifetime claims updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Max Claims Per Hour: {maxClaimsPerHour?.toString()}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="maxHourly"
                      placeholder="100"
                      className="flex-1 bg-black border border-white/20 rounded p-3"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('maxHourly') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setMaxClaimsPerHour', [BigInt(input.value)], 'Max hourly claims updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Whitelist Control</h2>
              <div className="mb-4">
                <div className={`inline-block px-4 py-2 rounded ${whitelistEnabled ? 'bg-green-600' : 'bg-gray-600'}`}>
                  Whitelist: {whitelistEnabled ? 'ENABLED' : 'DISABLED'}
                </div>
              </div>
              <button
                onClick={() => executeContractCall('toggleWhitelist', [!whitelistEnabled], `Whitelist ${!whitelistEnabled ? 'enabled' : 'disabled'}!`)}
                disabled={isUpdating}
                className={`w-full px-4 py-3 font-medium rounded ${whitelistEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white disabled:opacity-50`}
              >
                {whitelistEnabled ? 'Disable Whitelist' : 'Enable Whitelist'}
              </button>

              <div className="mt-6">
                <label className="text-sm text-gray-400 mb-2 block">Add to Whitelist</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={whitelistInput}
                    onChange={(e) => setWhitelistInput(e.target.value)}
                    placeholder="0x... (one address)"
                    className="flex-1 bg-black border border-white/20 rounded p-3 font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      if (whitelistInput) {
                        executeContractCall('addToWhitelist', [whitelistInput as `0x${string}`], 'Address whitelisted!');
                        setWhitelistInput('');
                      }
                    }}
                    disabled={isUpdating}
                    className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h2 className="text-2xl font-light mb-4">Blacklist Control</h2>
              <div className="mt-6">
                <label className="text-sm text-gray-400 mb-2 block">Add to Blacklist</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value)}
                    placeholder="0x... (one address)"
                    className="flex-1 bg-black border border-white/20 rounded p-3 font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      if (blacklistInput) {
                        executeContractCall('addToBlacklist', [blacklistInput as `0x${string}`], 'Address blacklisted!');
                        setBlacklistInput('');
                      }
                    }}
                    disabled={isUpdating}
                    className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Emergency Withdraw ETH</h3>
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

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Withdraw ERC20</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  id="tokenAddress"
                  placeholder="Token Address (0x...)"
                  className="w-full bg-black border border-white/20 rounded p-3 font-mono text-sm"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('tokenAddress') as HTMLInputElement;
                    if (input.value && confirm(`Withdraw all ${input.value}?`)) {
                      executeContractCall('withdrawAllERC20', [input.value as `0x${string}`], 'Tokens withdrawn!');
                    }
                  }}
                  disabled={isUpdating}
                  className="w-full px-4 py-3 bg-orange-600 text-white font-medium rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  Withdraw All
                </button>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-light mb-4">Contract Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span className="font-mono">{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Owner:</span>
                  <span className="font-mono">{owner?.toString().slice(0, 10)}...{owner?.toString().slice(-8)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
