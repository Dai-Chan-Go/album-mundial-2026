import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Álbum Mundial FIFA 2026',
  description: 'Seguimiento compartido del álbum Panini FIFA World Cup 2026',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}