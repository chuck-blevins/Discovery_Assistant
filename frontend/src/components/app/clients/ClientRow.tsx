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
          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
            Archived
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Active
          </Badge>
        )}
      </TableCell>
      <TableCell>{new Date(client.updated_at).toLocaleDateString()}</TableCell>
      <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <ClientActions client={client} onEdit={() => onEdit(client)} />
      </TableCell>
    </TableRow>
  )
}
