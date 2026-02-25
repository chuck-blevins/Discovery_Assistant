import { Link } from 'react-router-dom'

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
      <TableCell className="font-medium">
        <Link
          to={`/${client.id}`}
          className="text-zinc-900 hover:text-zinc-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 rounded"
        >
          {client.name}
        </Link>
      </TableCell>
      <TableCell>{client.market_type ?? '—'}</TableCell>
      <TableCell>
        {client.status === 'archived' ? (
          <Badge variant="outline" className="text-zinc-500 border-zinc-300">
            Archived
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal text-zinc-600">
            Active
          </Badge>
        )}
      </TableCell>
      <TableCell>{new Date(client.updated_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <ClientActions client={client} onEdit={() => onEdit(client)} />
      </TableCell>
    </TableRow>
  )
}
