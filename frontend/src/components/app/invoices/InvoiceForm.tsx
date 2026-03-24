import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getStripeCatalog } from '@/api/settings'
import type { InvoiceLineItemCreate } from '@/types/api'

interface LineItemDraft {
  description: string
  quantity: string
  unit_price_usd: string
}

interface Props {
  onSubmit: (data: { due_date?: string; notes?: string; line_items: InvoiceLineItemCreate[] }) => void
  isPending: boolean
  onCancel: () => void
}

function emptyLine(): LineItemDraft {
  return { description: '', quantity: '1', unit_price_usd: '' }
}

export function InvoiceForm({ onSubmit, isPending, onCancel }: Props) {
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItemDraft[]>([emptyLine()])
  const [catalogOpen, setCatalogOpen] = useState<number | null>(null)

  const { data: catalog = [] } = useQuery({
    queryKey: ['settings', 'stripe', 'catalog'],
    queryFn: getStripeCatalog,
    staleTime: 5 * 60 * 1000,
    retry: false, // don't retry if Stripe key not configured
  })

  function updateLine(index: number, field: keyof LineItemDraft, value: string) {
    setLines((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  function applyFromCatalog(lineIndex: number, productName: string, unitAmountCents: number | null) {
    setLines((prev) => prev.map((l, i) =>
      i === lineIndex
        ? { ...l, description: productName, unit_price_usd: unitAmountCents != null ? (unitAmountCents / 100).toFixed(2) : l.unit_price_usd }
        : l
    ))
    setCatalogOpen(null)
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validLines = lines.filter((l) => l.description.trim() && l.unit_price_usd)
    if (validLines.length === 0) return
    onSubmit({
      due_date: dueDate || undefined,
      notes: notes.trim() || undefined,
      line_items: validLines.map((l) => ({
        description: l.description.trim(),
        quantity: parseFloat(l.quantity) || 1,
        unit_price_usd: parseFloat(l.unit_price_usd),
      })),
    })
  }

  const subtotal = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 1
    const price = parseFloat(l.unit_price_usd) || 0
    return sum + qty * price
  }, 0)

  const hasCatalog = catalog.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Line items */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items</p>
        {lines.map((line, i) => (
          <div key={i} className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <div className="relative">
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(i, 'description', e.target.value)}
                  placeholder="Description"
                  required
                  className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {hasCatalog && (
                  <button
                    type="button"
                    onClick={() => setCatalogOpen(catalogOpen === i ? null : i)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    aria-label="Pick from catalog"
                    title="Pick from Stripe catalog"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={line.quantity}
                onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                placeholder="Qty"
                className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.unit_price_usd}
                onChange={(e) => updateLine(i, 'unit_price_usd', e.target.value)}
                placeholder="$0.00"
                required
                className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {lines.length > 1 && (
                <button type="button" onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Catalog dropdown for this line */}
            {catalogOpen === i && (
              <div className="ml-0 rounded-md border bg-popover shadow-md text-sm max-h-48 overflow-y-auto">
                {catalog.map((product) => (
                  <div key={product.id}>
                    {product.prices.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => applyFromCatalog(i, product.name, null)}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted flex justify-between"
                      >
                        <span>{product.name}</span>
                        <span className="text-muted-foreground text-xs">no price</span>
                      </button>
                    ) : (
                      product.prices.map((price) => (
                        <button
                          key={price.id}
                          type="button"
                          onClick={() => applyFromCatalog(i, product.name, price.unit_amount)}
                          className="w-full text-left px-3 py-1.5 hover:bg-muted flex justify-between gap-4"
                        >
                          <span>{product.name}{price.nickname ? ` — ${price.nickname}` : ''}</span>
                          <span className="text-muted-foreground text-xs shrink-0">
                            {price.unit_amount != null
                              ? `$${(price.unit_amount / 100).toFixed(2)}`
                              : 'custom'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
          <Plus className="h-3 w-3" /> Add line
        </button>
        {subtotal > 0 && (
          <p className="text-sm font-medium text-right">Total: ${subtotal.toFixed(2)}</p>
        )}
      </div>

      {/* Due date */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Due date (optional)</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Notes (optional — appears on invoice)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment terms, thank you note…"
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  )
}
