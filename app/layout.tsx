import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChordVault - Your personal guitar chord sheet library',
  description: 'A beautiful library for managing and viewing guitar chord sheets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

