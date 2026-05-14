import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Prode Mundial 2026',
  description: 'Predicí los resultados del Mundial 2026 y competí con tus amigos',
  openGraph: {
    title: 'Prode Mundial 2026',
    description: 'Predicí los resultados del Mundial 2026 y competí con tus amigos',
    locale: 'es_AR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        {children}
      </body>
    </html>
  )
}
