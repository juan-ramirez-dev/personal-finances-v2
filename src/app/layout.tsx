import type { Metadata } from 'next'
import { Bodoni_Moda, Inter } from 'next/font/google'
import './globals.css'

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-bodoni',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Finanzas',
  description: 'Cuánto tengo disponible y en qué se me va el dinero.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${bodoni.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
