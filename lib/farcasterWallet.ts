'use client';

import type { Wallet } from '@rainbow-me/rainbowkit';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Custom Farcaster wallet for RainbowKit
// This makes Farcaster appear as an option in the wallet picker
export const farcasterWallet = (): Wallet => ({
  id: 'farcaster',
  name: 'Farcaster',
  iconUrl: 'https://warpcast.com/og-logo.png',
  iconBackground: '#855DCD',
  // Don't hide - let users see and try to connect
  // The connector will handle if they're not in Farcaster context
  createConnector: () => farcasterMiniApp(),
});
