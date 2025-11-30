import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Feylon | The Eye Sees All',
  description: 'Whisper a secret truth to the Eye',
  openGraph: {
    title: 'Feylon | The Eye Sees All',
    description: 'Whisper a secret truth to the Eye',
    images: ['https://feylon.xyz/feylonloop.gif'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://feylon.xyz/feylonloop.gif',
    'fc:frame:button:1': '👁️ Whisper a Secret',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://feylon.xyz',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
