import { create } from 'zustand'

import type { ClientResponse } from '@/types/api'

interface ClientFormStore {
  open: boolean
  client: ClientResponse | null
  openCreate: () => void
  openEdit: (client: ClientResponse) => void
  close: () => void
}

export const useClientFormStore = create<ClientFormStore>()((set) => ({
  open: false,
  client: null,
  openCreate: () => set({ open: true, client: null }),
  openEdit: (client) => set({ open: true, client }),
  close: () => set({ open: false, client: null }),
}))
