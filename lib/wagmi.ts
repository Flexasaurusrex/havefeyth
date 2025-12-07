import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Feylon',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'feylon-temp-id',
  chains: [base],
  ssr: true,
});
