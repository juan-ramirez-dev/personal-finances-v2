import type { Metadata } from 'next'
import { Bodoni_Moda, Geist } from 'next/font/google'
import './globals.css'

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-bodoni',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'Lucka',
  description: 'Tu dinero, en orden y solo para tus ojos.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${bodoni.variable} ${geist.variable}`}>
      <body>{children}</body>
    </html>
  )
}
