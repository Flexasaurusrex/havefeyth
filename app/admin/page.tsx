'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CONTRACT_ADDRESS, HAVE_FEYTH_MULTI_REWARD_ABI, RewardType, DistributionMode } from '@/lib/contract';
import { getAllInteractions } from '@/lib/supabase';
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

type WizardStep = 1 | 2 | 3;

export default function AdminPage() {
  const router = useRouter();
  const { address, isConnected, isConnecting } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
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
      
      // Give blockchain time to update, then refetch
      setTimeout(() => {
        refetchRewards();
      }, 2000);
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error);
      alert(`Failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFundContract = async () => {
    if (!fundingInput.tokenAddress || !fundingInput.amount) {
      alert('Please fill both fields');
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

      alert(`✅ Successfully transferred ${fundingInput.amount} tokens to the contract!`);
      setFundingInput({ tokenAddress: '', amount: '' });
      
      const basescanUrl = `https://basescan.org/token/${fundingInput.tokenAddress}?a=${CONTRACT_ADDRESS}`;
      if (confirm('Tokens sent! Open BaseScan to verify balance?')) {
        window.open(basescanUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error funding contract:', error);
      
      if (error?.message?.includes('user rejected')) {
        alert('Transaction cancelled');
      } else if (error?.message?.includes('insufficient funds')) {
        alert('Insufficient token balance in your wallet');
      } else {
        alert(`Failed to transfer tokens: ${error?.message || 'Unknown error'}`);
      }
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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-white/20 border-t-purple-500 rounded-full mb-4" />
          <p className="text-gray-300">Loading admin panel...</p>
        </div>
      </main>
    );
  }

  if (!isConnected) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Feylon Control Center
            </h1>
            <p className="text-gray-400">Multi-Reward Distribution System</p>
          </div>
          <a 
            href="/" 
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm border border-white/10"
          >
            ← Home
          </a>
        </div>

        {/* Status Bar */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Contract Status</div>
              <div className={`text-2xl font-bold ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
                {isPaused ? '⏸️ PAUSED' : '✅ ACTIVE'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Rewards</div>
              <div className="text-2xl font-bold text-white">{rewardCount?.toString() || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Unique Users</div>
              <div className="text-2xl font-bold text-white">{stats.uniqueUsers}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Claims</div>
              <div className="text-2xl font-bold text-white">{stats.totalClaimed}</div>
            </div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center items-center mb-8 space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step as WizardStep)}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep === step
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-lg'
                    : currentStep > step
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {currentStep > step ? '✓' : step}
              </button>
              {step < 3 && (
                <div className={`w-16 md:w-32 h-1 mx-2 ${
                  currentStep > step ? 'bg-green-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-center mb-8">
          <div className="grid grid-cols-3 gap-8 md:gap-32 text-center">
            <div className={currentStep === 1 ? 'text-white font-bold' : 'text-gray-500'}>
              💰 Fund Contract
            </div>
            <div className={currentStep === 2 ? 'text-white font-bold' : 'text-gray-500'}>
              ⚙️ Configure
            </div>
            <div className={currentStep === 3 ? 'text-white font-bold' : 'text-gray-500'}>
              📊 Monitor
            </div>
          </div>
        </div>

        {/* STEP 1: FUND CONTRACT */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h2 className="text-3xl font-bold mb-2">💰 Step 1: Fund Your Contract</h2>
              <p className="text-gray-400 mb-6">
                Transfer tokens from your wallet to the reward contract. These tokens will be distributed to users when they claim.
              </p>

              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-xl border border-yellow-500/50 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-bold text-yellow-300 mb-1">DO THIS AFTER STEP 2!</div>
                    <p className="text-sm text-gray-300">
                      It's recommended to configure your rewards (Step 2) BEFORE funding the contract.
                      This prevents accidental over-distribution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token Contract Address
                  </label>
                  <input
                    type="text"
                    value={fundingInput.tokenAddress}
                    onChange={(e) => setFundingInput({...fundingInput, tokenAddress: e.target.value})}
                    placeholder="0x... (e.g., your token address)"
                    className="w-full bg-black/50 border border-white/20 rounded-lg p-4 font-mono text-sm focus:border-purple-500 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The ERC20 token address you want to distribute as rewards
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount to Transfer
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={fundingInput.amount}
                    onChange={(e) => setFundingInput({...fundingInput, amount: e.target.value})}
                    placeholder="20000"
                    className="w-full bg-black/50 border border-white/20 rounded-lg p-4 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter in regular tokens (we'll automatically convert to wei)
                  </p>
                </div>

                <button
                  onClick={handleFundContract}
                  disabled={isUpdating || !fundingInput.tokenAddress || !fundingInput.amount}
                  className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {isUpdating ? '⏳ Transferring...' : '💸 Transfer Tokens to Contract'}
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-500/20 rounded-xl border border-blue-500/50">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="text-sm text-gray-300">
                    <div className="font-bold mb-1">Pro Tip:</div>
                    After funding, click "View Balance →" on your reward in Step 3 to verify tokens arrived!
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Next: Configure Rewards →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIGURE REWARDS */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Add New Reward */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h2 className="text-3xl font-bold mb-2">⚙️ Step 2: Configure Rewards</h2>
              <p className="text-gray-400 mb-6">
                Set up what rewards users get when they claim. You can have multiple rewards.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Token Address
                    </label>
                    <input
                      type="text"
                      value={newReward.tokenAddress}
                      onChange={(e) => setNewReward({...newReward, tokenAddress: e.target.value})}
                      placeholder="0x..."
                      className="w-full bg-black/50 border border-white/20 rounded-lg p-3 font-mono text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reward Type
                    </label>
                    <select
                      value={newReward.rewardType}
                      onChange={(e) => setNewReward({...newReward, rewardType: Number(e.target.value)})}
                      className="w-full bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                    >
                      <option value={0}>ERC20 Token</option>
                      <option value={1}>NFT (ERC721)</option>
                      <option value={2}>ERC1155</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount Per Claim
                    <span className="ml-2 text-xs text-gray-500">
                      (How many tokens each user gets when they claim)
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={newReward.amount}
                    onChange={(e) => setNewReward({...newReward, amount: e.target.value})}
                    placeholder="100"
                    className="w-full bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Weight (1-100)
                    <span className="ml-2 text-xs text-gray-500">
                      (Higher = more likely to be selected in weighted random mode)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={newReward.weight}
                    onChange={(e) => setNewReward({...newReward, weight: e.target.value})}
                    min="1"
                    max="100"
                    className="w-full bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newReward.name}
                      onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                      placeholder="Regent Token"
                      className="w-full bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Symbol
                    </label>
                    <input
                      type="text"
                      value={newReward.symbol}
                      onChange={(e) => setNewReward({...newReward, symbol: e.target.value})}
                      placeholder="REGENT"
                      className="w-full bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleAddReward}
                disabled={isUpdating}
                className="mt-6 w-full px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 shadow-lg"
              >
                {isUpdating ? 'Adding...' : '+ Add Reward'}
              </button>
            </div>

            {/* Distribution Settings */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold mb-4">Distribution Settings</h3>
              <p className="text-gray-400 mb-6">Choose how rewards are given to users:</p>

              <div className="space-y-6">
                {/* Distribution Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Distribution Mode
                    <span className="ml-2 text-xs text-gray-500">
                      Current: {getDistributionModeLabel(Number(distributionMode))}
                    </span>
                  </label>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div 
                      onClick={() => executeContractCall('setDistributionMode', [0], 'Distribution mode set to All Rewards!')}
                      className="p-4 bg-black/50 border border-white/20 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🎁</div>
                        <div className="flex-1">
                          <div className="font-bold mb-1">All Rewards</div>
                          <div className="text-sm text-gray-400">
                            Users get ALL active rewards when they claim. Best for simple setups.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div 
                      onClick={() => executeContractCall('setDistributionMode', [1], 'Distribution mode set to Random Selection!')}
                      className="p-4 bg-black/50 border border-white/20 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🎲</div>
                        <div className="flex-1">
                          <div className="font-bold mb-1">Random Selection</div>
                          <div className="text-sm text-gray-400">
                            Users get X random rewards. Set "Random Selection Count" below.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div 
                      onClick={() => executeContractCall('setDistributionMode', [2], 'Distribution mode set to Weighted Random!')}
                      className="p-4 bg-black/50 border border-white/20 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">⚖️</div>
                        <div className="flex-1">
                          <div className="font-bold mb-1">Weighted Random</div>
                          <div className="text-sm text-gray-400">
                            Higher weight rewards are more likely to be selected. Great for rare/common tiers.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Random Selection Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Random Selection Count
                    <span className="ml-2 text-xs text-gray-500">
                      (Only used in Random Selection mode) Current: {randomSelectionCount?.toString()}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="randomCount"
                      placeholder="2"
                      defaultValue={randomSelectionCount?.toString()}
                      className="flex-1 bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('randomCount') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setRandomSelectionCount', [BigInt(input.value)], 'Random count updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    How many rewards to give in Random Selection mode
                  </p>
                </div>

                {/* Cooldown Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cooldown Period
                    <span className="ml-2 text-xs text-gray-500">
                      Current: {formatTime(cooldownPeriod)}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="cooldown"
                      placeholder="86400"
                      defaultValue={cooldownPeriod?.toString()}
                      className="flex-1 bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('cooldown') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setCooldownPeriod', [BigInt(input.value)], 'Cooldown updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Time in seconds between claims. 86400 = 24 hours, 0 = instant
                  </p>
                </div>

                {/* Max Lifetime Claims */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Lifetime Claims
                    <span className="ml-2 text-xs text-gray-500">
                      Current: {maxLifetimeClaimsPerUser?.toString()}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="maxLifetime"
                      placeholder="1000"
                      defaultValue={maxLifetimeClaimsPerUser?.toString()}
                      className="flex-1 bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('maxLifetime') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setMaxLifetimeClaimsPerUser', [BigInt(input.value)], 'Max lifetime claims updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum times a user can claim ever (lifetime limit)
                  </p>
                </div>

                {/* Max Claims Per Hour */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Claims Per Hour (Rate Limit)
                    <span className="ml-2 text-xs text-gray-500">
                      Current: {maxClaimsPerHour?.toString()}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="maxHourly"
                      placeholder="100"
                      defaultValue={maxClaimsPerHour?.toString()}
                      className="flex-1 bg-black/50 border border-white/20 rounded-lg p-3 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('maxHourly') as HTMLInputElement;
                        if (input.value) {
                          executeContractCall('setMaxClaimsPerHour', [BigInt(input.value)], 'Max hourly claims updated!');
                        }
                      }}
                      disabled={isUpdating}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum total claims allowed per hour (prevents spam/abuse)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                ← Back: Fund Contract
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Next: Monitor & Distribute →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MONITOR & DISTRIBUTE */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h2 className="text-3xl font-bold mb-2">📊 Step 3: Monitor & Distribute</h2>
              <p className="text-gray-400 mb-6">
                View your active rewards and monitor the system.
              </p>

              {/* Active Rewards */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Active Rewards</h3>
                  <button
                    onClick={() => {
                      refetchRewards();
                      alert('Refreshed! ✅');
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>
                {!allRewards || allRewards.length === 0 || allRewards.every((r: any) => r.tokenAddress === '0x0000000000000000000000000000000000000000') ? (
                  <div className="text-center py-12 bg-black/30 rounded-xl">
                    <div className="text-4xl mb-4">🎁</div>
                    <p className="text-gray-400 mb-2">No rewards configured yet.</p>
                    <p className="text-sm text-gray-500">Go to Step 2 to add your first reward!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allRewards
                      .map((reward: any, originalIndex: number) => ({ reward, originalIndex }))
                      .filter(({ reward }: any) => reward.tokenAddress !== '0x0000000000000000000000000000000000000000')
                      .map(({ reward, originalIndex }: any) => (
                      <div 
                        key={originalIndex} 
                        className="p-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="text-2xl font-bold">#{originalIndex}</div>
                              <div>
                                <div className="font-bold text-lg">{reward.name}</div>
                                <div className="text-sm text-gray-400">{reward.symbol}</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-300 mb-1">
                              💰 {formatEther(reward.amount)} tokens per claim
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
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => executeContractCall('toggleReward', [BigInt(originalIndex), !reward.isActive], `Reward ${!reward.isActive ? 'activated' : 'deactivated'}!`)}
                            disabled={isUpdating}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                          >
                            {reward.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Remove this reward?')) {
                                executeContractCall('removeReward', [BigInt(originalIndex)], 'Reward removed!');
                              }
                            }}
                            disabled={isUpdating}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                          >
                            Remove
                          </button>
                          <a
                            href={`https://basescan.org/token/${reward.tokenAddress}?a=${CONTRACT_ADDRESS}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            View Balance →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              {interactions.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-400 border-b border-white/10">
                        <tr>
                          <th className="pb-3 px-2">User</th>
                          <th className="pb-3 px-2">Message</th>
                          <th className="pb-3 px-2">Platform</th>
                          <th className="pb-3 px-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interactions.slice(0, 10).map((interaction) => (
                          <tr key={interaction.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2 font-mono text-xs">{interaction.wallet_address.slice(0, 6)}...{interaction.wallet_address.slice(-4)}</td>
                            <td className="py-3 px-2 max-w-xs truncate">{interaction.message}</td>
                            <td className="py-3 px-2 capitalize">{interaction.shared_platform}</td>
                            <td className="py-3 px-2 text-xs text-gray-400">
                              {new Date(interaction.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Controls */}
            <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/30">
              <h3 className="text-2xl font-bold mb-4 text-red-400">⚠️ Emergency Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => executeContractCall(isPaused ? 'unpause' : 'pause', [], `Contract ${isPaused ? 'resumed' : 'paused'}!`)}
                  disabled={isUpdating}
                  className={`px-6 py-4 font-bold rounded-lg transition-colors ${
                    isPaused
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {isPaused ? '▶️ Resume Contract' : '⏸️ Pause Contract'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Withdraw all ETH from contract?')) {
                      executeContractCall('withdrawETH', [], 'ETH withdrawn!');
                    }
                  }}
                  disabled={isUpdating}
                  className="px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
                >
                  💰 Withdraw ETH
                </button>
              </div>
            </div>

            <div className="flex justify-start">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                ← Back: Configure Rewards
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
