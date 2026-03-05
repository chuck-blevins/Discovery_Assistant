import { useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectTable } from '@/components/app/projects/ProjectTable'
import { useClient } from '@/hooks/useClients'

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { clientJustCreated, clientName } = (location.state ?? {}) as { clientJustCreated?: boolean; clientName?: string }
  const { data: client, isLoading, isError } = useClient(clientId)

  useEffect(() => {
    if (clientJustCreated && clientName) {
      toast.success(`"${clientName}" created successfully!`, { duration: 3000, closeButton: true })
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [clientJustCreated, clientName, navigate, location.pathname])

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
          <Badge
            variant="outline"
            className={client.status === 'archived' ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-green-100 text-green-800 border-green-300'}
          >
            {client.status === 'archived' ? 'Archived' : 'Active'}
          </Badge>
        </div>
        {client.market_type && (
          <p className="text-muted-foreground">{client.market_type}</p>
        )}
      </div>
      <ProjectTable clientId={client.id} />
    </>
  )
}
