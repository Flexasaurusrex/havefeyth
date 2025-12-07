'use client';

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { 
  metaMaskWallet, 
  rainbowWallet, 
  coinbaseWallet, 
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'feylon-temp-id';

// Create a custom Farcaster wallet for RainbowKit
const farcasterWallet = () => ({
  id: 'farcaster',
  name: 'Farcaster',
  iconUrl: 'https://warpcast.com/favicon.ico',
  iconBackground: '#855DCD',
  createConnector: () => farcasterMiniApp(),
});

// Combine all wallets including Farcaster
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        farcasterWallet,  // Farcaster wallet at the top!
        coinbaseWallet,
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'Feylon',
    projectId,
  }
);

export const config = createConfig({
  chains: [base],
  connectors,
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});
