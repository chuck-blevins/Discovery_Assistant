import { describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import { useSidebarStore } from '@/stores/useSidebarStore'

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false })
  })

  it('has initial state of collapsed: false', () => {
    expect(useSidebarStore.getState().collapsed).toBe(false)
  })

  it('toggle() flips collapsed from false to true', () => {
    act(() => {
      useSidebarStore.getState().toggle()
    })
    expect(useSidebarStore.getState().collapsed).toBe(true)
  })

  it('toggle() flips collapsed back to false', () => {
    act(() => {
      useSidebarStore.getState().toggle()
      useSidebarStore.getState().toggle()
    })
    expect(useSidebarStore.getState().collapsed).toBe(false)
  })

  it('setCollapsed() sets a specific value', () => {
    act(() => {
      useSidebarStore.getState().setCollapsed(true)
    })
    expect(useSidebarStore.getState().collapsed).toBe(true)

    act(() => {
      useSidebarStore.getState().setCollapsed(false)
    })
    expect(useSidebarStore.getState().collapsed).toBe(false)
  })

  it('persist key is "discovery-sidebar" (via persist API)', () => {
    const config = useSidebarStore.persist.getOptions()
    expect(config.name).toBe('discovery-sidebar')
  })
})
