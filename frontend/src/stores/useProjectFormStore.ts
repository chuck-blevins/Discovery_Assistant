import { create } from 'zustand'

import type { ProjectResponse } from '@/types/api'

interface ProjectFormStore {
  open: boolean
  project: ProjectResponse | null
  openCreate: () => void
  openEdit: (project: ProjectResponse) => void
  close: () => void
}

export const useProjectFormStore = create<ProjectFormStore>()((set) => ({
  open: false,
  project: null,
  openCreate: () => set({ open: true, project: null }),
  openEdit: (project) => set({ open: true, project }),
  close: () => set({ open: false, project: null }),
}))
