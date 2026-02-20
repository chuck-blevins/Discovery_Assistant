import { create } from 'zustand'
import { useEffect } from 'react'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

interface BreakpointStore {
  breakpoint: Breakpoint
  setBreakpoint: (bp: Breakpoint) => void
}

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia('(min-width: 1024px)').matches) return 'desktop'
  if (window.matchMedia('(min-width: 768px)').matches) return 'tablet'
  return 'mobile'
}

export const useBreakpointStore = create<BreakpointStore>()((set) => ({
  breakpoint: 'desktop',
  setBreakpoint: (bp) => set({ breakpoint: bp }),
}))

export function useBreakpointSync() {
  const setBreakpoint = useBreakpointStore((s) => s.setBreakpoint)

  useEffect(() => {
    setBreakpoint(getBreakpoint())

    const desktopMq = window.matchMedia('(min-width: 1024px)')
    const tabletMq = window.matchMedia('(min-width: 768px)')

    const handler = () => setBreakpoint(getBreakpoint())

    desktopMq.addEventListener('change', handler)
    tabletMq.addEventListener('change', handler)

    return () => {
      desktopMq.removeEventListener('change', handler)
      tabletMq.removeEventListener('change', handler)
    }
  }, [setBreakpoint])
}
