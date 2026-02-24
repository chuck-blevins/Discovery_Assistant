import { useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectTable } from '@/components/app/projects/ProjectTable'
import { useClient } from '@/hooks/useClients'

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { data: client, isLoading, isError } = useClient(clientId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !client) {
    return <p role="alert">Client not found.</p>
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.status === 'archived' && <Badge variant="outline">Archived</Badge>}
        </div>
        {client.market_type && (
          <p className="text-muted-foreground">{client.market_type}</p>
        )}
      </div>
      <ProjectTable clientId={client.id} />
    </>
  )
}
