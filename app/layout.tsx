import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Feylon | The Eye Sees All',
  description: 'Whisper a secret truth to the Eye',
  openGraph: {
    title: 'Feylon | The Eye Sees All',
    description: 'Whisper a secret truth to the Eye',
    images: ['https://feylon.xyz/feylon-frame.png'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://feylon.xyz/feylon-frame.png',
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
        {children}
      </body>
    </html>
  )
}
