import type { Metadata } from 'next'
import { Archivo, Archivo_Black, JetBrains_Mono } from 'next/font/google'
import { WhatsAppSupportButton } from '@/components/WhatsAppSupportButton'
import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['500', '600', '700', '800', '900'],
})
const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  variable: '--font-archivo-black',
  weight: '400',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['500', '700'],
})

export const metadata: Metadata = {
  title: 'Prode Mundial 2026',
  description: 'Prode Mundial 2026',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Prode Mundial 2026',
    description: 'Prode Mundial 2026',
    locale: 'es_AR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`h-full ${archivo.variable} ${archivoBlack.variable} ${mono.variable}`}
    >
      <body className="h-full bg-bg text-text font-sans antialiased">
        {children}
        <ScrollToTopButton />
        <WhatsAppSupportButton />
      </body>
    </html>
  )
}
