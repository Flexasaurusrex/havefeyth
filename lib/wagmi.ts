import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { createStorage } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Feylon',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'feylon-temp-id',
  chains: [base],
  ssr: true,
  // Explicit storage - persists wallet connection across sessions
  // Helps prevent users from easily switching wallets to game rewards
  storage: createStorage({ storage: typeof window !== 'undefined' ? localStorage : undefined }),
});
