'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { 
  metaMaskWallet, 
  rainbowWallet, 
  coinbaseWallet, 
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { base } from 'wagmi/chains';
import { farcasterWallet } from './farcasterWallet';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'feylon-temp-id';

// Clean v2 API - just pass wallets array to getDefaultConfig
export const config = getDefaultConfig({
  appName: 'Feylon',
  projectId,
  chains: [base],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        farcasterWallet,   // 🟣 Farcaster at the top!
        coinbaseWallet,
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  ssr: true,
});
