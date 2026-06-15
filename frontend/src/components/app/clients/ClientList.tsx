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
import { ClientIntakeWizard } from './ClientIntakeWizard'

export function ClientList() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Shared form state — also writable by ClientSidebar via store
  const { open: formOpen, client: editingClient, openCreate, openEdit, close } = useClientFormStore()

  function openWizard() {
    close() // close ClientForm if it happens to be open
    setWizardOpen(true)
  }

  const { data: clients, isLoading, isError } = useClients(includeArchived)

  const filteredClients = search.trim()
    ? (clients ?? []).filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : clients

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Clients</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCreate}>New Client</Button>
          <Button onClick={openWizard}>Add with AI</Button>
        </div>
      </div>

      {/* Search + archived toggle */}
      <div className="flex items-center gap-4">
        <input
          type="search"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-48 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          aria-label="Search clients"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-zinc-300 focus:ring-zinc-400"
          />
          Show archived
        </label>
      </div>

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
        <p role="alert" className="text-sm text-muted-foreground">
          Failed to load clients. Please try again.
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredClients && filteredClients.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground">
          <p>No clients yet.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openCreate}>New Client</Button>
            <Button onClick={openWizard}>Add with AI</Button>
          </div>
        </div>
      )}

      {/* Client table */}
      {!isLoading && !isError && filteredClients && filteredClients.length > 0 && (
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
            {filteredClients.map((client) => (
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

      <ClientIntakeWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </div>
  )
}
