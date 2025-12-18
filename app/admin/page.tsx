'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI, RewardType, DistributionMode } from '@/lib/contract';
import { getAllInteractions, supabase } from '@/lib/supabase';
import type { Interaction } from '@/lib/supabase';
import { formatEther, parseEther } from 'viem';

export const dynamic = 'force-dynamic';

// ERC20 Transfer ABI
const ERC20_TRANSFER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

type AdminTab = 'dashboard' | 'rewards' | 'settings' | 'activity' | 'transmissions';

export default function AdminPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isUpdating, setIsUpdating] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<'all' | 'claims' | 'shares'>('all');
  const [transmissions, setTransmissions] = useState<any[]>([]);
  
  const [newReward, setNewReward] = useState({
    tokenAddress: '',
    rewardType: 0,
    amount: '',
    tokenId: '0',
    weight: '50',
    name: '',
    symbol: '',
  });

  const [fundingInput, setFundingInput] = useState({
    tokenAddress: '',
    amount: '',
  });

  // Read contract data
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

  const { data: allRewards, refetch: refetchRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
    functionName: 'getAllRewards',
  });

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  // Load interactions and stats
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      
      // Get accurate counts using COUNT queries (efficient for large datasets)
      const { getInteractionCounts } = await import('@/lib/supabase');
      const counts = await getInteractionCounts();
      
      // Get recent interactions for display (limited to 100 for performance)
      const data = await getAllInteractions();
      const recentInteractions = data.slice(0, 100); // Only take first 100 for display
      setInteractions(recentInteractions);
      
      const uniqueUsers = new Set(data.map(i => i.wallet_address)).size;
      
      setStats({
        totalInteractions: counts.totalInteractions,
        uniqueUsers,
        totalClaimed: counts.totalClaims,
      });

      // Load transmissions
      const { data: transmissionsData } = await supabase
        .from('transmissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      setTransmissions(transmissionsData || []);
      setIsLoading(false);
    }
    
    loadData();
  }, []);

  const [stats, setStats] = useState({
    totalInteractions: 0,
    uniqueUsers: 0,
    totalClaimed: 0,
  });

  // Auth check
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-gray-400">Connect your wallet to access the admin panel</p>
        </div>
      </div>
    );
  }

  if (!isOwner && owner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-4">Only the contract owner can access this page</p>
          <p className="text-xs text-gray-500 font-mono mb-4">Owner: {owner as string}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rewards', label: 'Rewards', icon: '🎁' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'activity', label: 'Activity', icon: '📈' },
    { id: 'transmissions', label: 'Transmissions', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">👁️</div>
              <div>
                <h1 className="text-2xl font-bold">Feylon Admin</h1>
                <p className="text-sm text-gray-400">Contract Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                isPaused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {isPaused ? '⏸️ Paused' : '▶️ Active'}
              </div>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                ← Back to App
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <DashboardTab stats={stats} isPaused={isPaused} distributionMode={distributionMode} allRewards={allRewards} interactions={interactions} />}
        {activeTab === 'rewards' && <RewardsTab allRewards={allRewards} refetchRewards={refetchRewards} distributionMode={distributionMode} newReward={newReward} setNewReward={setNewReward} writeContractAsync={writeContractAsync} isUpdating={isUpdating} setIsUpdating={setIsUpdating} fundingInput={fundingInput} setFundingInput={setFundingInput} />}
        {activeTab === 'settings' && <SettingsTab isPaused={isPaused} distributionMode={distributionMode} randomSelectionCount={randomSelectionCount} cooldownPeriod={cooldownPeriod} maxLifetimeClaimsPerUser={maxLifetimeClaimsPerUser} writeContractAsync={writeContractAsync} isUpdating={isUpdating} setIsUpdating={setIsUpdating} />}
        {activeTab === 'activity' && <ActivityTab interactions={interactions} activityFilter={activityFilter} setActivityFilter={setActivityFilter} stats={stats} />}
        {activeTab === 'transmissions' && <TransmissionsTab transmissions={transmissions} setTransmissions={setTransmissions} />}
      </div>
    </div>
  );
}

// ==================== DASHBOARD TAB ====================
function DashboardTab({ stats, isPaused, distributionMode, allRewards, interactions }: any) {
  const activeRewardCount = allRewards?.filter((r: any) => r.isActive && r.tokenAddress !== '0x0000000000000000000000000000000000000000').length || 0;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
        <p className="text-gray-400">Quick stats and system status</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Interactions</div>
          <div className="text-4xl font-bold text-purple-400">{stats.totalInteractions}</div>
          <div className="text-xs text-gray-500 mt-2">All shares & claims</div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Unique Wallets</div>
          <div className="text-4xl font-bold text-cyan-400">{stats.uniqueUsers}</div>
          <div className="text-xs text-gray-500 mt-2">Participating users</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Claims</div>
          <div className="text-4xl font-bold text-green-400">{stats.totalClaimed}</div>
          <div className="text-xs text-gray-500 mt-2">Successful claims</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Active Rewards</div>
          <div className="text-4xl font-bold text-orange-400">{activeRewardCount}</div>
          <div className="text-xs text-gray-500 mt-2">Currently claimable</div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
            <span className="text-gray-400">Contract State</span>
            <span className={`px-3 py-1 rounded-lg font-medium ${
              isPaused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {isPaused ? 'Paused' : 'Active'}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
            <span className="text-gray-400">Distribution Mode</span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg font-medium">
              {distributionMode === 0 ? 'All Rewards' : distributionMode === 1 ? 'Random' : 'Weighted'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity Preview */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Recent Activity</h3>
          <span className="text-sm text-gray-400">Last 5 interactions</span>
        </div>
        {interactions.slice(0, 5).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {interactions.slice(0, 5).map((interaction: Interaction) => (
              <div key={interaction.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    interaction.claimed ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {interaction.claimed ? '🎁' : '💬'}
                  </span>
                  <span className="font-mono text-sm">
                    {interaction.wallet_address.slice(0, 6)}...{interaction.wallet_address.slice(-4)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(interaction.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== REWARDS TAB ====================
function RewardsTab({ allRewards, refetchRewards, distributionMode, newReward, setNewReward, writeContractAsync, isUpdating, setIsUpdating, fundingInput, setFundingInput }: any) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddReward = async () => {
    if (!newReward.tokenAddress || !newReward.amount || !newReward.name || !newReward.symbol) {
      alert('Please fill all required fields');
      return;
    }

    setIsUpdating(true);
    try {
      let finalAmount = newReward.amount;
      
      if (newReward.rewardType === 0) {
        finalAmount = parseEther(newReward.amount).toString();
      }

      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HAVE_FEYTH_MULTI_REWARD_ABI,
        functionName: 'addReward',
        args: [
          newReward.tokenAddress as `0x${string}`,
          Number(newReward.rewardType),
          BigInt(finalAmount),
          BigInt(newReward.tokenId),
          BigInt(newReward.weight),
          newReward.name,
          newReward.symbol,
        ],
      });

      alert('✅ Reward added successfully!');
      setNewReward({
        tokenAddress: '',
        rewardType: 0,
        amount: '',
        tokenId: '0',
        weight: '50',
        name: '',
        symbol: '',
      });
      setShowAddForm(false);
      refetchRewards();
    } catch (error: any) {
      console.error(error);
      alert(`❌ Error: ${error.message || 'Failed to add reward'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFundContract = async () => {
    if (!fundingInput.tokenAddress || !fundingInput.amount) {
      alert('Please fill all fields');
      return;
    }

    setIsUpdating(true);
    try {
      const amountInWei = parseEther(fundingInput.amount);

      await writeContractAsync({
        address: fundingInput.tokenAddress as `0x${string}`,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [CONTRACT_ADDRESS, amountInWei],
      });

      alert('✅ Tokens transferred successfully!');
      setFundingInput({ tokenAddress: '', amount: '' });
    } catch (error: any) {
      console.error(error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Reward Management</h2>
          <p className="text-gray-400">Add and configure rewards</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium"
        >
          {showAddForm ? '✕ Cancel' : '+ Add Reward'}
        </button>
      </div>

      {/* Distribution Mode Banner */}
      {distributionMode === 0 && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-bold text-green-400">All Rewards Mode Active</div>
              <div className="text-sm text-gray-300">Users will receive ALL active rewards when they claim</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Reward Form */}
      {showAddForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">Add New Reward</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Reward Type</label>
              <select
                value={newReward.rewardType}
                onChange={(e) => setNewReward({ ...newReward, rewardType: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value={0}>ERC20 Token</option>
                <option value={1}>ERC721 NFT</option>
                <option value={2}>ERC1155</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Token Contract Address</label>
              <input
                type="text"
                value={newReward.tokenAddress}
                onChange={(e) => setNewReward({ ...newReward, tokenAddress: e.target.value })}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reward Name</label>
                <input
                  type="text"
                  value={newReward.name}
                  onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                  placeholder="My Token"
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Symbol</label>
                <input
                  type="text"
                  value={newReward.symbol}
                  onChange={(e) => setNewReward({ ...newReward, symbol: e.target.value })}
                  placeholder="TKN"
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {newReward.rewardType === 0 ? 'Amount (in tokens)' : 'Token ID'}
                </label>
                <input
                  type="text"
                  value={newReward.rewardType === 0 ? newReward.amount : newReward.tokenId}
                  onChange={(e) => newReward.rewardType === 0 
                    ? setNewReward({ ...newReward, amount: e.target.value })
                    : setNewReward({ ...newReward, tokenId: e.target.value })
                  }
                  placeholder={newReward.rewardType === 0 ? "100" : "1"}
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
              {newReward.rewardType === 2 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount per claim</label>
                  <input
                    type="text"
                    value={newReward.amount}
                    onChange={(e) => setNewReward({ ...newReward, amount: e.target.value })}
                    placeholder="1"
                    className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
              {distributionMode !== 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Weight (1-100)</label>
                  <input
                    type="number"
                    value={newReward.weight}
                    onChange={(e) => setNewReward({ ...newReward, weight: e.target.value })}
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleAddReward}
              disabled={isUpdating}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              {isUpdating ? 'Adding...' : '✓ Add Reward'}
            </button>
          </div>
        </div>
      )}

      {/* Fund Contract Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">💰 Fund Contract</h3>
        <p className="text-sm text-gray-400 mb-4">Transfer ERC20 tokens to the contract for distribution</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Token Address</label>
            <input
              type="text"
              value={fundingInput.tokenAddress}
              onChange={(e) => setFundingInput({ ...fundingInput, tokenAddress: e.target.value })}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount</label>
            <input
              type="text"
              value={fundingInput.amount}
              onChange={(e) => setFundingInput({ ...fundingInput, amount: e.target.value })}
              placeholder="1000"
              className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleFundContract}
            disabled={isUpdating}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {isUpdating ? 'Transferring...' : '→ Transfer Tokens'}
          </button>
        </div>
      </div>

      {/* Active Rewards List */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Active Rewards</h3>
          <button
            onClick={() => refetchRewards()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {!allRewards || allRewards.length === 0 || allRewards.every((r: any) => r.tokenAddress === '0x0000000000000000000000000000000000000000') ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎁</div>
            <p className="text-gray-400">No rewards configured yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allRewards
              .map((reward: any, index: number) => ({ reward, index }))
              .filter(({ reward }: any) => reward.tokenAddress !== '0x0000000000000000000000000000000000000000')
              .map(({ reward, index }: any) => (
                <div key={index} className="p-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl font-bold">#{index}</div>
                        <div>
                          <div className="font-bold text-lg">{reward.name}</div>
                          <div className="text-sm text-gray-400">{reward.symbol}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 mb-1">
                        💰 {formatEther(reward.amount)} per claim
                      </div>
                      <div className="text-xs text-gray-500 font-mono mb-1">
                        {reward.tokenAddress.slice(0, 10)}...{reward.tokenAddress.slice(-8)}
                      </div>
                      <div className="text-xs text-gray-500">
                        ⚖️ Weight: {reward.weight.toString()}
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold ${
                      reward.isActive 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                    }`}>
                      {reward.isActive ? '✓ Active' : '○ Inactive'}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={async () => {
                        try {
                          await writeContractAsync({
                            address: CONTRACT_ADDRESS,
                            abi: HAVE_FEYTH_MULTI_REWARD_ABI,
                            functionName: 'toggleReward',
                            args: [BigInt(index), !reward.isActive],
                          });
                          alert('✅ Reward toggled!');
                          refetchRewards();
                        } catch (error: any) {
                          alert(`❌ Error: ${error.message}`);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        reward.isActive
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {reward.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Remove this reward?')) return;
                        try {
                          await writeContractAsync({
                            address: CONTRACT_ADDRESS,
                            abi: HAVE_FEYTH_MULTI_REWARD_ABI,
                            functionName: 'removeReward',
                            args: [BigInt(index)],
                          });
                          alert('✅ Reward removed!');
                          refetchRewards();
                        } catch (error: any) {
                          alert(`❌ Error: ${error.message}`);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Remove
                    </button>
                    <a
                      href={`https://basescan.org/address/${reward.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                    >
                      View on BaseScan →
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SETTINGS TAB ====================
function SettingsTab({ isPaused, distributionMode, randomSelectionCount, cooldownPeriod, maxLifetimeClaimsPerUser, writeContractAsync, isUpdating, setIsUpdating }: any) {
  const [newCooldown, setNewCooldown] = useState('');
  const [newMaxClaims, setNewMaxClaims] = useState('');
  const [newDistributionMode, setNewDistributionMode] = useState('0');
  const [newRandomCount, setNewRandomCount] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Contract Settings</h2>
        <p className="text-gray-400">Configure system parameters</p>
      </div>

      {/* Current Settings */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Current Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-black/30 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Contract Status</div>
            <div className={`text-2xl font-bold ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
              {isPaused ? '⏸️ Paused' : '▶️ Active'}
            </div>
          </div>
          <div className="p-4 bg-black/30 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Distribution Mode</div>
            <div className="text-2xl font-bold">
              {distributionMode === 0 ? '📦 All' : distributionMode === 1 ? '🎲 Random' : '⚖️ Weighted'}
            </div>
          </div>
          <div className="p-4 bg-black/30 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Cooldown Period</div>
            <div className="text-2xl font-bold">
              {cooldownPeriod ? `${Number(cooldownPeriod) / 3600}h` : 'Loading...'}
            </div>
          </div>
          <div className="p-4 bg-black/30 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Max Lifetime Claims</div>
            <div className="text-2xl font-bold">
              {maxLifetimeClaimsPerUser?.toString() || 'Loading...'}
            </div>
          </div>
          {(distributionMode === 1 || distributionMode === 2) && (
            <div className="p-4 bg-black/30 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Random Selection Count</div>
              <div className="text-2xl font-bold">
                {randomSelectionCount?.toString() || 'Loading...'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pause/Unpause */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Emergency Controls</h3>
        <button
          onClick={async () => {
            setIsUpdating(true);
            try {
              await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: HAVE_FEYTH_MULTI_REWARD_ABI,
                functionName: isPaused ? 'unpause' : 'pause',
              });
              alert(`✅ Contract ${isPaused ? 'unpaused' : 'paused'}!`);
            } catch (error: any) {
              alert(`❌ Error: ${error.message}`);
            } finally {
              setIsUpdating(false);
            }
          }}
          disabled={isUpdating}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isPaused
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-yellow-600 hover:bg-yellow-700'
          }`}
        >
          {isPaused ? '▶️ Unpause Contract' : '⏸️ Pause Contract'}
        </button>
      </div>

      {/* Distribution Mode */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Distribution Mode</h3>
        <div className="space-y-4">
          <select
            value={newDistributionMode}
            onChange={(e) => setNewDistributionMode(e.target.value)}
            className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
          >
            <option value="0">All Rewards (Users get everything)</option>
            <option value="1">Random Selection (Pick N random rewards)</option>
            <option value="2">Weighted Random (Based on weights)</option>
          </select>
          <button
            onClick={async () => {
              setIsUpdating(true);
              try {
                await writeContractAsync({
                  address: CONTRACT_ADDRESS,
                  abi: HAVE_FEYTH_MULTI_REWARD_ABI,
                  functionName: 'setDistributionMode',
                  args: [Number(newDistributionMode)],
                });
                alert('✅ Distribution mode updated!');
              } catch (error: any) {
                alert(`❌ Error: ${error.message}`);
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {isUpdating ? 'Updating...' : 'Update Distribution Mode'}
          </button>
        </div>
      </div>

      {/* Random Selection Count */}
      {(distributionMode === 1 || distributionMode === 2) && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">Random Selection Count</h3>
          <div className="space-y-4">
            <input
              type="number"
              value={newRandomCount}
              onChange={(e) => setNewRandomCount(e.target.value)}
              placeholder="Enter number (e.g., 2)"
              className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={async () => {
                if (!newRandomCount) return;
                setIsUpdating(true);
                try {
                  await writeContractAsync({
                    address: CONTRACT_ADDRESS,
                    abi: HAVE_FEYTH_MULTI_REWARD_ABI,
                    functionName: 'setRandomSelectionCount',
                    args: [BigInt(newRandomCount)],
                  });
                  alert('✅ Random count updated!');
                  setNewRandomCount('');
                } catch (error: any) {
                  alert(`❌ Error: ${error.message}`);
                } finally {
                  setIsUpdating(false);
                }
              }}
              disabled={isUpdating}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              {isUpdating ? 'Updating...' : 'Update Random Count'}
            </button>
          </div>
        </div>
      )}

      {/* Cooldown Period */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Cooldown Period</h3>
        <p className="text-sm text-gray-400 mb-4">Minimum time between claims (minimum 1 hour)</p>
        <div className="space-y-4">
          <input
            type="number"
            value={newCooldown}
            onChange={(e) => setNewCooldown(e.target.value)}
            placeholder="Enter hours (e.g., 24)"
            className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={async () => {
              if (!newCooldown || Number(newCooldown) < 1) {
                alert('Minimum 1 hour required');
                return;
              }
              setIsUpdating(true);
              try {
                const seconds = Number(newCooldown) * 3600;
                await writeContractAsync({
                  address: CONTRACT_ADDRESS,
                  abi: HAVE_FEYTH_MULTI_REWARD_ABI,
                  functionName: 'setCooldownPeriod',
                  args: [BigInt(seconds)],
                });
                alert('✅ Cooldown period updated!');
                setNewCooldown('');
              } catch (error: any) {
                alert(`❌ Error: ${error.message}`);
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {isUpdating ? 'Updating...' : 'Update Cooldown'}
          </button>
        </div>
      </div>

      {/* Max Lifetime Claims */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Max Lifetime Claims Per User</h3>
        <div className="space-y-4">
          <input
            type="number"
            value={newMaxClaims}
            onChange={(e) => setNewMaxClaims(e.target.value)}
            placeholder="Enter max claims (e.g., 1000)"
            className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={async () => {
              if (!newMaxClaims) return;
              setIsUpdating(true);
              try {
                await writeContractAsync({
                  address: CONTRACT_ADDRESS,
                  abi: HAVE_FEYTH_MULTI_REWARD_ABI,
                  functionName: 'setMaxLifetimeClaimsPerUser',
                  args: [BigInt(newMaxClaims)],
                });
                alert('✅ Max claims updated!');
                setNewMaxClaims('');
              } catch (error: any) {
                alert(`❌ Error: ${error.message}`);
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {isUpdating ? 'Updating...' : 'Update Max Claims'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== ACTIVITY TAB ====================
function ActivityTab({ interactions, activityFilter, setActivityFilter, stats }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Activity Log</h2>
          <p className="text-gray-400">Track all user interactions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const csv = [
                ['Type', 'User', 'Message', 'Platform', 'Timestamp'],
                ...interactions.map((i: Interaction) => [
                  i.claimed ? 'Claim' : 'Share',
                  i.wallet_address,
                  i.message,
                  i.shared_platform,
                  new Date(i.created_at).toISOString()
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `feylon-activity-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => {
              const uniqueAddresses = Array.from(new Set(interactions.map((i: Interaction) => i.wallet_address)));
              const addressList = uniqueAddresses.join('\n');
              navigator.clipboard.writeText(addressList);
              alert(`✅ Copied ${uniqueAddresses.length} unique wallet addresses!`);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
          >
            📋 Copy All Addresses
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Claims</div>
          <div className="text-3xl font-bold text-green-400">{stats.totalClaimed}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Shares</div>
          <div className="text-3xl font-bold text-blue-400">{stats.totalInteractions - stats.totalClaimed}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Interactions</div>
          <div className="text-3xl font-bold text-purple-400">{stats.totalInteractions}</div>
          <div className="text-xs text-gray-500 mt-1">All shares + claims</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Claim Rate</div>
          <div className="text-3xl font-bold text-orange-400">
            {stats.totalInteractions > 0 
              ? Math.round((stats.totalClaimed / stats.totalInteractions) * 100)
              : 0}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Conversion rate</div>
        </div>
      </div>

      {/* Note about table limit */}
      <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <span>💡</span>
          <span className="text-gray-300">
            <strong>Note:</strong> Stats above show ALL {stats.totalInteractions} interactions. Table below shows most recent 100 for performance.
          </span>
        </div>
      </div>

      {/* Collab Info */}
      {interactions.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤝</span>
            <div className="flex-1">
              <div className="font-bold mb-2 text-cyan-300">Collab Tracking Ready</div>
              <div className="text-sm text-gray-300 mb-3">
                All wallet addresses captured for your collab partners
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const uniqueAddresses = Array.from(new Set(interactions.map((i: Interaction) => i.wallet_address)));
                    navigator.clipboard.writeText(uniqueAddresses.join('\n'));
                    alert(`✅ Copied ${uniqueAddresses.length} unique addresses!`);
                  }}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded text-xs font-medium transition-colors"
                >
                  📋 Copy Unique ({Array.from(new Set(interactions.map((i: Interaction) => i.wallet_address))).length})
                </button>
                <button
                  onClick={() => {
                    const addresses = interactions.map((i: Interaction) => i.wallet_address).join('\n');
                    navigator.clipboard.writeText(addresses);
                    alert(`✅ Copied all ${interactions.length} addresses!`);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                >
                  📋 Copy All ({interactions.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActivityFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activityFilter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          📊 All ({stats.totalInteractions})
        </button>
        <button
          onClick={() => setActivityFilter('claims')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activityFilter === 'claims'
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          🎁 Claims ({stats.totalClaimed})
        </button>
        <button
          onClick={() => setActivityFilter('shares')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activityFilter === 'shares'
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          💬 Shares ({stats.totalInteractions - stats.totalClaimed})
        </button>
      </div>

      {/* Activity Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 bg-black/30 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing most recent {Math.min(interactions.length, 100)} of {stats.totalInteractions} total interactions
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400 bg-black/30">
              <tr>
                <th className="p-4">Type</th>
                <th className="p-4">User</th>
                <th className="p-4">Details</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {interactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🚀</div>
                      <div className="text-xl font-bold mb-2">No Activity Yet</div>
                      <div className="text-gray-400">Interactions will appear here</div>
                    </div>
                  </td>
                </tr>
              ) : (
                interactions
                  .filter((i: Interaction) => {
                    if (activityFilter === 'claims') return i.claimed;
                    if (activityFilter === 'shares') return !i.claimed;
                    return true;
                  })
                  .map((interaction: Interaction) => (
                    <tr key={interaction.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          interaction.claimed 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {interaction.claimed ? '🎁' : '💬'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-xs">{interaction.wallet_address}</div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(interaction.wallet_address);
                              alert('✅ Address copied!');
                            }}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                          >
                            📋
                          </button>
                        </div>
                        <a
                          href={`https://basescan.org/address/${interaction.wallet_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                          View on BaseScan →
                        </a>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs truncate text-gray-300">{interaction.message}</div>
                        <div className="text-xs text-gray-500 capitalize">via {interaction.shared_platform}</div>
                      </td>
                      <td className="p-4 text-xs text-gray-400">
                        {new Date(interaction.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this entry?')) return;
                            const { error } = await supabase
                              .from('interactions')
                              .delete()
                              .eq('id', interaction.id);
                            
                            if (!error) {
                              window.location.reload();
                            }
                          }}
                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== TRANSMISSIONS TAB ====================
function TransmissionsTab({ transmissions, setTransmissions }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Secret Transmissions</h2>
        <p className="text-gray-400">Messages sent through the portal</p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        {transmissions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👁️</div>
            <p className="text-xl font-bold mb-2">No Transmissions Yet</p>
            <p className="text-gray-400">The Eye waits for secrets...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transmissions.map((transmission: any) => (
              <div
                key={transmission.id}
                className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-white/10"
              >
                <p className="text-gray-300 mb-3">"{transmission.secret}"</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(transmission.created_at).toLocaleString()}
                  </span>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this transmission?')) return;
                      const { error } = await supabase
                        .from('transmissions')
                        .delete()
                        .eq('id', transmission.id);
                      
                      if (!error) {
                        setTransmissions(transmissions.filter((t: any) => t.id !== transmission.id));
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
