import { type ReactNode } from 'react'
import { ClientSidebar } from './ClientSidebar'
import { TopBar } from './TopBar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip to main content link — sr-only until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-zinc-900 focus:text-zinc-50 focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      <ClientSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main
          id="main-content"
          className="flex-1 overflow-auto p-6"
          tabIndex={-1}
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
