import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Plus, Send, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useInvoices, useCreateInvoice, useDeleteInvoice, useSendInvoice } from '@/hooks/useInvoices'
import { InvoiceForm } from './InvoiceForm'
import type { InvoiceStatus } from '@/types/api'

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-800 border-green-300',
  void: 'bg-gray-100 text-gray-400 border-gray-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Props {
  clientId: string
}

export function InvoiceList({ clientId }: Props) {
  const { data: invoices = [] } = useInvoices(clientId)
  const createInvoice = useCreateInvoice(clientId)
  const deleteInvoice = useDeleteInvoice(clientId)
  const sendInvoice = useSendInvoice(clientId)
  const [showForm, setShowForm] = useState(false)

  async function handleCreate(data: Parameters<typeof createInvoice.mutateAsync>[0]) {
    try {
      await createInvoice.mutateAsync(data)
      setShowForm(false)
      toast.success('Invoice created')
    } catch {
      toast.error('Failed to create invoice')
    }
  }

  async function handleDelete(invoiceId: string) {
    try {
      await deleteInvoice.mutateAsync(invoiceId)
    } catch {
      toast.error('Failed to delete invoice')
    }
  }

  async function handleSend(invoiceId: string) {
    try {
      await sendInvoice.mutateAsync(invoiceId)
      toast.success('Invoice sent via Stripe')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send invoice'
      toast.error(msg)
    }
  }

  return (
    <div className="mb-6 rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invoices</h2>
        {!showForm && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> New Invoice
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-md border bg-muted/20 p-3">
          <InvoiceForm
            onSubmit={handleCreate}
            isPending={createInvoice.isPending}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {invoices.length > 0 ? (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li key={inv.id} className="group rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={STATUS_STYLE[inv.status]}>
                  {inv.status}
                </Badge>
                <span className="font-medium">${inv.subtotal_usd.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">{formatDate(inv.created_at)}</span>
                {inv.due_date && (
                  <span className="text-muted-foreground text-xs">Due {formatDate(inv.due_date)}</span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {inv.stripe_invoice_url && (
                    <a
                      href={inv.stripe_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="View on Stripe"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {inv.status === 'draft' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleSend(inv.id)}
                        disabled={sendInvoice.isPending}
                        aria-label="Send via Stripe"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        disabled={deleteInvoice.isPending}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label="Delete invoice"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Line items */}
              {inv.line_items.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 pl-2 border-l border-muted">
                  {inv.line_items.map((li) => (
                    <li key={li.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>{li.description} × {li.quantity}</span>
                      <span>${li.amount_usd.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {inv.notes && (
                <p className="mt-1 text-xs text-muted-foreground italic">{inv.notes}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !showForm && <p className="text-xs text-muted-foreground italic">No invoices yet.</p>
      )}
    </div>
  )
}
