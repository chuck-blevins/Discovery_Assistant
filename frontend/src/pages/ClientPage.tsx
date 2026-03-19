import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ProjectTable } from '@/components/app/projects/ProjectTable'
import { useClient, useClientNotes, useCreateNote, useDeleteNote } from '@/hooks/useClients'

const ENGAGEMENT_LABELS: Record<string, string> = {
  lead: 'Lead',
  coaching: 'Coaching',
  hourly: 'Hourly',
  'short-term': 'Short-term',
  'fixed-term': 'Fixed-term',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { clientJustCreated, clientName } = (location.state ?? {}) as { clientJustCreated?: boolean; clientName?: string }
  const { data: client, isLoading, isError } = useClient(clientId)
  const { data: notes = [] } = useClientNotes(clientId)
  const createNote = useCreateNote(clientId ?? '')
  const deleteNote = useDeleteNote(clientId ?? '')

  const [noteText, setNoteText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (clientJustCreated && clientName) {
      toast.success(`"${clientName}" created successfully!`, { duration: 3000, closeButton: true })
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [clientJustCreated, clientName, navigate, location.pathname])

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    try {
      await createNote.mutateAsync(noteText.trim())
      setNoteText('')
    } catch {
      toast.error('Failed to save note')
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await deleteNote.mutateAsync(noteId)
    } catch {
      toast.error('Failed to delete note')
    }
  }

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

  const hasContactInfo = client.contact_name || client.contact_email || client.contact_phone || client.website

  return (
    <>
      {/* Client Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <Badge
            variant="outline"
            className={client.status === 'archived' ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-green-100 text-green-800 border-green-300'}
          >
            {client.status === 'archived' ? 'Archived' : 'Active'}
          </Badge>
          {client.engagement_status && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {ENGAGEMENT_LABELS[client.engagement_status] ?? client.engagement_status}
            </Badge>
          )}
        </div>
        {client.market_type && (
          <p className="text-muted-foreground">{client.market_type}</p>
        )}
      </div>

      {/* Client Info Card */}
      <div className="mb-6 rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Client Info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Date Added</dt>
            <dd className="font-medium">{formatDate(client.created_at)}</dd>
          </div>
          {client.engagement_status && (
            <div>
              <dt className="text-muted-foreground">Engagement</dt>
              <dd className="font-medium">{ENGAGEMENT_LABELS[client.engagement_status] ?? client.engagement_status}</dd>
            </div>
          )}
          {client.contact_name && (
            <div>
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">{client.contact_name}</dd>
            </div>
          )}
          {client.contact_email && (
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">
                <a href={`mailto:${client.contact_email}`} className="text-blue-600 hover:underline">
                  {client.contact_email}
                </a>
              </dd>
            </div>
          )}
          {client.contact_phone && (
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{client.contact_phone}</dd>
            </div>
          )}
          {client.website && (
            <div>
              <dt className="text-muted-foreground">Website</dt>
              <dd className="font-medium">
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {client.website.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </div>
          )}
          {client.description && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="font-medium">{client.description}</dd>
            </div>
          )}
          {!hasContactInfo && !client.description && (
            <div className="sm:col-span-2 text-muted-foreground italic text-xs">
              No contact info — edit the client to add details.
            </div>
          )}
        </dl>
      </div>

      {/* Notes Section */}
      <div className="mb-6 rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Engagement Notes</h2>

        {/* Add note form */}
        <form onSubmit={handleAddNote} className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note about this engagement…"
            rows={3}
            disabled={createNote.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleAddNote(e as unknown as React.FormEvent)
              }
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={createNote.isPending || !noteText.trim()}>
              {createNote.isPending ? 'Saving…' : 'Add Note'}
            </Button>
          </div>
        </form>

        {/* Notes list */}
        {notes.length > 0 ? (
          <ul className="space-y-2 pt-1">
            {notes.map((note) => (
              <li key={note.id} className="group flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="whitespace-pre-wrap break-words">{note.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  disabled={deleteNote.isPending}
                  className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">No notes yet.</p>
        )}
      </div>

      <ProjectTable clientId={client.id} clientName={client.name} />
    </>
  )
}
