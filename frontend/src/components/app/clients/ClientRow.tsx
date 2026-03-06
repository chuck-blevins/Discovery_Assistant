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
          className="text-foreground hover:text-muted-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          {client.name}
        </Link>
      </TableCell>
      <TableCell>{client.market_type ?? '—'}</TableCell>
      <TableCell>
        {client.status === 'archived' ? (
          <Badge variant="secondary" className="border-border">
            Archived
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
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
