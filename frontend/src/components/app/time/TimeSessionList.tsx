import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTimeSessions, useCreateTimeSession, useDeleteTimeSession } from '@/hooks/useTimeSessions'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface Props {
  clientId: string
}

export function TimeSessionList({ clientId }: Props) {
  const { data: sessions = [] } = useTimeSessions(clientId)
  const createSession = useCreateTimeSession(clientId)
  const deleteSession = useDeleteTimeSession(clientId)

  const [date, setDate] = useState('')
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !hours) return
    const h = parseFloat(hours)
    if (isNaN(h) || h <= 0) return
    try {
      await createSession.mutateAsync({ session_date: date, hours: h, description: description.trim() || undefined })
      setDate('')
      setHours('')
      setDescription('')
    } catch {
      toast.error('Failed to log session')
    }
  }

  async function handleDelete(sessionId: string) {
    try {
      await deleteSession.mutateAsync(sessionId)
    } catch {
      toast.error('Failed to delete session')
    }
  }

  const totalHours = sessions.reduce((sum, s) => sum + s.hours, 0)

  return (
    <div className="mb-6 rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Time Sessions</h2>
        {sessions.length > 0 && (
          <span className="text-xs text-muted-foreground">{totalHours.toFixed(1)} hrs total</span>
        )}
      </div>

      {/* Add session form */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[auto_auto_1fr_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Hours</label>
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="1.5"
            required
            className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was covered…"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" size="sm" disabled={createSession.isPending} className="self-end">
          {createSession.isPending ? 'Saving…' : 'Log'}
        </Button>
      </form>

      {/* Sessions list */}
      {sessions.length > 0 ? (
        <ul className="space-y-1 pt-1">
          {sessions.map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="shrink-0 font-medium tabular-nums">{s.hours.toFixed(1)}h</span>
              <span className="shrink-0 text-muted-foreground">{formatDate(s.session_date)}</span>
              <span className="flex-1 min-w-0 truncate text-muted-foreground">{s.description ?? ''}</span>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deleteSession.isPending}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                aria-label="Delete session"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic">No sessions logged yet.</p>
      )}
    </div>
  )
}
