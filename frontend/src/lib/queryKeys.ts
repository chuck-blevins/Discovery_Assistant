export const queryKeys = {
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  projects: {
    all: (clientId: string) => ['clients', clientId, 'projects'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  analyses: {
    byProject: (projectId: string) => ['projects', projectId, 'analyses'] as const,
  },
  dataSources: {
    byProject: (projectId: string) => ['projects', projectId, 'data-sources'] as const,
    preview: (dataSourceId: string) => ['data-sources', dataSourceId, 'preview'] as const,
  },
}
