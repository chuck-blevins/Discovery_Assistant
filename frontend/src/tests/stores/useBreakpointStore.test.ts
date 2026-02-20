import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { useBreakpointStore } from '@/stores/useBreakpointStore'

function mockMatchMedia(minWidth: string, matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: query === minWidth ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('useBreakpointStore', () => {
  beforeEach(() => {
    useBreakpointStore.setState({ breakpoint: 'desktop' })
  })

  it('setBreakpoint() updates breakpoint to mobile', () => {
    act(() => {
      useBreakpointStore.getState().setBreakpoint('mobile')
    })
    expect(useBreakpointStore.getState().breakpoint).toBe('mobile')
  })

  it('setBreakpoint() updates breakpoint to tablet', () => {
    act(() => {
      useBreakpointStore.getState().setBreakpoint('tablet')
    })
    expect(useBreakpointStore.getState().breakpoint).toBe('tablet')
  })

  it('setBreakpoint() updates breakpoint to desktop', () => {
    act(() => {
      useBreakpointStore.getState().setBreakpoint('desktop')
    })
    expect(useBreakpointStore.getState().breakpoint).toBe('desktop')
  })

  it('detects desktop when (min-width: 1024px) matches', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia('(min-width: 1024px)', true),
    })
    act(() => {
      useBreakpointStore.getState().setBreakpoint('desktop')
    })
    expect(useBreakpointStore.getState().breakpoint).toBe('desktop')
  })

  it('detects tablet when only (min-width: 768px) matches', () => {
    act(() => {
      useBreakpointStore.getState().setBreakpoint('tablet')
    })
    expect(useBreakpointStore.getState().breakpoint).toBe('tablet')
  })
})
