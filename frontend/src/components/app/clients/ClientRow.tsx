import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import type { ClientResponse } from '@/types/api'
import { ClientActions } from './ClientActions'

interface ClientRowProps {
  client: ClientResponse
  onEdit: (client: ClientResponse) => void
}

export function ClientRow({ client, onEdit }: ClientRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{client.name}</TableCell>
      <TableCell>{client.market_type ?? '—'}</TableCell>
      <TableCell>
        {client.status === 'archived' ? (
          <Badge variant="outline" className="text-zinc-500 border-zinc-300">
            Archived
          </Badge>
        ) : null}
      </TableCell>
      <TableCell>{new Date(client.updated_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <ClientActions client={client} onEdit={() => onEdit(client)} />
      </TableCell>
    </TableRow>
  )
}
