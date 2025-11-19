// Multi-Reward System Contract Configuration
export const CONTRACT_ADDRESS = '0x1D0E95B387cE5054d2952116c937458fEEEe202b' as `0x${string}`;
export const CHAIN_ID = 8453; // Base

// Multi-Reward System Contract ABI
export const HAVE_FEYTH_MULTI_REWARD_ABI = [
  // Constructor (for reference only, not callable)
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "tuple[]", "name": "rewards", "type": "tuple[]", "components": [
        { "name": "tokenAddress", "type": "address" },
        { "name": "rewardType", "type": "uint8" },
        { "name": "amount", "type": "uint256" },
        { "name": "tokenId", "type": "uint256" },
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" }
      ]},
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "RewardsClaimed",
    "type": "event"
  },
  
  // User Functions
  {
    "inputs": [],
    "name": "claimReward",
    "outputs": [
      { "internalType": "tuple[]", "name": "claimDetails", "type": "tuple[]", "components": [
        { "name": "tokenAddress", "type": "address" },
        { "name": "rewardType", "type": "uint8" },
        { "name": "amount", "type": "uint256" },
        { "name": "tokenId", "type": "uint256" },
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" }
      ]}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "previewClaim",
    "outputs": [
      { "internalType": "tuple[]", "name": "", "type": "tuple[]", "components": [
        { "name": "tokenAddress", "type": "address" },
        { "name": "rewardType", "type": "uint8" },
        { "name": "amount", "type": "uint256" },
        { "name": "tokenId", "type": "uint256" },
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" }
      ]}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "canClaim",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "timeUntilNextClaim",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Reward Management
  {
    "inputs": [
      { "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "internalType": "enum HaveFeythMultiReward.RewardType", "name": "rewardType", "type": "uint8" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "weight", "type": "uint256" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" }
    ],
    "name": "addReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "rewardId", "type": "uint256" }],
    "name": "removeReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "rewardId", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" }
    ],
    "name": "toggleReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "rewardId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "setRewardAmount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "rewardId", "type": "uint256" },
      { "internalType": "uint256", "name": "weight", "type": "uint256" }
    ],
    "name": "setRewardWeight",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // NFT Queue Management
  {
    "inputs": [
      { "internalType": "uint256", "name": "rewardId", "type": "uint256" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "addNFTToQueue",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "rewardId", "type": "uint256" },
      { "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" }
    ],
    "name": "batchAddNFTsToQueue",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "rewardId", "type": "uint256" }],
    "name": "getNFTQueueLength",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "rewardId", "type": "uint256" }],
    "name": "getNFTQueue",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Distribution Settings
  {
    "inputs": [{ "internalType": "enum HaveFeythMultiReward.DistributionMode", "name": "mode", "type": "uint8" }],
    "name": "setDistributionMode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "count", "type": "uint256" }],
    "name": "setRandomSelectionCount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "period", "type": "uint256" }],
    "name": "setCooldownPeriod",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "max", "type": "uint256" }],
    "name": "setMaxLifetimeClaimsPerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "max", "type": "uint256" }],
    "name": "setMaxClaimsPerHour",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Access Control
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "addToBlacklist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "removeFromBlacklist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "addToWhitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "removeFromWhitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address[]", "name": "users", "type": "address[]" }],
    "name": "batchAddToWhitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address[]", "name": "users", "type": "address[]" }],
    "name": "batchAddToBlacklist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bool", "name": "enabled", "type": "bool" }],
    "name": "toggleWhitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Pause/Emergency
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawERC20",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "withdrawAllERC20",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "nftContract", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "withdrawNFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawERC1155",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // View Functions
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "distributionMode",
    "outputs": [{ "internalType": "enum HaveFeythMultiReward.DistributionMode", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rewardCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "randomSelectionCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cooldownPeriod",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxLifetimeClaimsPerUser",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxClaimsPerHour",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "whitelistEnabled",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "lastClaimTime",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "lifetimeClaimCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveRewardCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllActiveRewards",
    "outputs": [
      { "internalType": "tuple[]", "name": "", "type": "tuple[]", "components": [
        { "name": "tokenAddress", "type": "address" },
        { "name": "rewardType", "type": "uint8" },
        { "name": "amount", "type": "uint256" },
        { "name": "tokenId", "type": "uint256" },
        { "name": "isActive", "type": "bool" },
        { "name": "weight", "type": "uint256" },
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" }
      ]}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllRewards",
    "outputs": [
      { "internalType": "tuple[]", "name": "", "type": "tuple[]", "components": [
        { "name": "tokenAddress", "type": "address" },
        { "name": "rewardType", "type": "uint8" },
        { "name": "amount", "type": "uint256" },
        { "name": "tokenId", "type": "uint256" },
        { "name": "isActive", "type": "bool" },
        { "name": "weight", "type": "uint256" },
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" }
      ]}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserInfo",
    "outputs": [
      { "internalType": "uint256", "name": "_lastClaimTime", "type": "uint256" },
      { "internalType": "uint256", "name": "_lifetimeClaimCount", "type": "uint256" },
      { "internalType": "bool", "name": "_canClaim", "type": "bool" },
      { "internalType": "uint256", "name": "_timeUntilNextClaim", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Receive functions
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "bytes", "name": "", "type": "bytes" }
    ],
    "name": "onERC721Received",
    "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

// TypeScript Enums
export enum RewardType {
  ERC20 = 0,
  ERC721 = 1,
  ERC1155 = 2
}

export enum DistributionMode {
  ALL_REWARDS = 0,
  RANDOM_SELECTION = 1,
  WEIGHTED_RANDOM = 2
}

// Helper labels
export const REWARD_TYPE_LABELS = {
  [RewardType.ERC20]: 'ERC20 Token',
  [RewardType.ERC721]: 'NFT (ERC721)',
  [RewardType.ERC1155]: 'Multi-Token (ERC1155)'
};

export const DISTRIBUTION_MODE_LABELS = {
  [DistributionMode.ALL_REWARDS]: 'All Active Rewards',
  [DistributionMode.RANDOM_SELECTION]: 'Random Selection',
  [DistributionMode.WEIGHTED_RANDOM]: 'Weighted Random'
};
