export const queryKeys = {
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
    notes: (id: string) => ['clients', id, 'notes'] as const,
  },
  projects: {
    all: (clientId: string) => ['clients', clientId, 'projects'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  analyses: {
    byProject: (projectId: string) => ['projects', projectId, 'analyses'] as const,
    detail: (analysisId: string) => ['analyses', analysisId] as const,
  },
  dataSources: {
    byProject: (projectId: string) => ['projects', projectId, 'data-sources'] as const,
    preview: (dataSourceId: string) => ['data-sources', dataSourceId, 'preview'] as const,
  },
  persona: {
    byProject: (projectId: string) => ['projects', projectId, 'persona'] as const,
  },
  icp: {
    byProject: (projectId: string) => ['projects', projectId, 'icp'] as const,
  },
  onboarding: {
    byProject: (projectId: string) => ['projects', projectId, 'onboarding'] as const,
  },
}
