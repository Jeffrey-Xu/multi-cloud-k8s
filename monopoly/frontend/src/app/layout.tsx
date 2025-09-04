import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Monopoly Go - Multiplayer Game',
  description: 'Play Monopoly online with friends in real-time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
