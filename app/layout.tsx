import type { Metadata } from 'next'
import { Playfair_Display, Crimson_Text } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const crimson = Crimson_Text({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-crimson',
})

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
      <body className={`${playfair.variable} ${crimson.variable}`}>{children}</body>
    </html>
  )
}

