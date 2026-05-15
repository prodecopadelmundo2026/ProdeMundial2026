import type { Metadata } from 'next'
import { Archivo, Archivo_Black, JetBrains_Mono } from 'next/font/google'
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
  description: 'Predicí los resultados del Mundial 2026 y competí con tus amigos',
  openGraph: {
    title: 'Prode Mundial 2026',
    description: 'Predicí los resultados del Mundial 2026 y competí con tus amigos',
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
      </body>
    </html>
  )
}
