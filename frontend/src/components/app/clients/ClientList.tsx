import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClients } from '@/hooks/useClients'
import { useClientFormStore } from '@/stores/useClientFormStore'
import { ClientForm } from './ClientForm'
import { ClientRow } from './ClientRow'

export function ClientList() {
  const [includeArchived, setIncludeArchived] = useState(false)

  // Shared form state — also writable by ClientSidebar via store
  const { open: formOpen, client: editingClient, openCreate, openEdit, close } = useClientFormStore()

  const { data: clients, isLoading, isError } = useClients(includeArchived)

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Your Clients</h1>
        <Button onClick={openCreate}>New Client</Button>
      </div>

      {/* Show archived toggle */}
      <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          className="rounded border-zinc-300 focus:ring-zinc-400"
        />
        Show archived
      </label>

      {/* Loading */}
      {isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Market Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Error */}
      {isError && (
        <p role="alert" className="text-sm text-zinc-500">
          Failed to load clients. Please try again.
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && clients && clients.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-zinc-500">
          <p>No clients yet.</p>
          <Button onClick={openCreate}>New Client</Button>
        </div>
      )}

      {/* Client table */}
      {!isLoading && !isError && clients && clients.length > 0 && (
        <Table aria-label="Client list">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Market Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <ClientRow key={client.id} client={client} onEdit={openEdit} />
            ))}
          </TableBody>
        </Table>
      )}

      <ClientForm
        open={formOpen}
        onOpenChange={(v) => { if (!v) close() }}
        client={editingClient ?? undefined}
      />
    </div>
  )
}
