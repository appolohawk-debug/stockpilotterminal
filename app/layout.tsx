import type { Metadata } from 'next'
import './globals.css'
import { MarketHeader } from '@/components/shared/MarketHeader'
import { Providers } from '@/components/shared/Providers'

export const metadata: Metadata = {
  title: 'StockPilot NSE Terminal',
  description: 'Personal Indian stock portfolio dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <MarketHeader />
            <main className="flex-1 px-4 py-6 max-w-screen-2xl mx-auto w-full">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
