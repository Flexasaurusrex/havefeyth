import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Feylon | The Eye Sees All',
  description: 'Whisper a secret truth to the Eye',
  openGraph: {
    title: 'Feylon | The Eye Sees All',
    description: 'Whisper a secret truth to the Eye',
    images: ['https://feylon.xyz/feylon-frame.png'],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: "https://feylon.xyz/feylon-frame.png",
      button: {
        title: "👁️ Whisper a Secret",
        action: {
          type: "launch_miniapp",
          name: "Feylon",
          url: "https://feylon.xyz",
          splashImageUrl: "https://feylon.xyz/feylon-frame.png",
          splashBackgroundColor: "#000000"
        }
      }
    })
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
              window.farcasterSDK = sdk;
            `
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
