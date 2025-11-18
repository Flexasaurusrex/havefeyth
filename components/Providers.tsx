'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { base } from 'viem/chains';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'placeholder-app-id';
  
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <div className="min-h-screen flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-4">
              <h1 className="text-2xl font-bold">Configuration Required</h1>
              <p className="text-gray-400">
                Please set up your environment variables in Vercel:
              </p>
              <ul className="text-left text-sm space-y-2 bg-white/5 p-4 rounded">
                <li>✓ NEXT_PUBLIC_PRIVY_APP_ID</li>
                <li>✓ NEXT_PUBLIC_SUPABASE_URL</li>
                <li>✓ NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                <li>✓ NEXT_PUBLIC_CONTRACT_ADDRESS</li>
                <li>✓ NEXT_PUBLIC_ADMIN_ADDRESS</li>
              </ul>
              <p className="text-sm text-gray-500">
                After adding environment variables, redeploy your app.
              </p>
            </div>
          </div>
        </WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['wallet', 'twitter', 'farcaster'],
        appearance: {
          theme: 'dark',
          accentColor: '#000000',
          logo: '/logo.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
