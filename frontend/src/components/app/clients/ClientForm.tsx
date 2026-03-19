import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateClient, useUpdateClient } from '@/hooks/useClients'
import type { ClientResponse, EngagementStatus } from '@/types/api'

const MARKET_TYPE_OPTIONS = ['Enterprise', 'SMB', 'SaaS', 'Consumer', 'Marketplace', 'Other']
const ENGAGEMENT_STATUS_OPTIONS: { value: EngagementStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'short-term', label: 'Short-term' },
  { value: 'fixed-term', label: 'Fixed-term' },
]

interface ClientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: ClientResponse
}

interface FormState {
  name: string
  description: string
  market_type: string
  contact_name: string
  contact_email: string
  contact_phone: string
  website: string
  engagement_status: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
  market_type: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  engagement_status: '',
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const navigate = useNavigate()
  const isEdit = Boolean(client)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [nameError, setNameError] = useState<string | null>(null)

  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              name: client.name,
              description: client.description ?? '',
              market_type: client.market_type ?? '',
              contact_name: client.contact_name ?? '',
              contact_email: client.contact_email ?? '',
              contact_phone: client.contact_phone ?? '',
              website: client.website ?? '',
              engagement_status: client.engagement_status ?? '',
            }
          : emptyForm
      )
      setNameError(null)
    }
  }, [open, client])

  function reset() {
    setForm(emptyForm)
    setNameError(null)
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameError(null)

    if (!form.name.trim()) {
      setNameError('Name is required')
      return
    }

    const payload = {
      name: form.name.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.market_type ? { market_type: form.market_type } : {}),
      ...(form.contact_name.trim() ? { contact_name: form.contact_name.trim() } : {}),
      ...(form.contact_email.trim() ? { contact_email: form.contact_email.trim() } : {}),
      ...(form.contact_phone.trim() ? { contact_phone: form.contact_phone.trim() } : {}),
      ...(form.website.trim() ? { website: form.website.trim() } : {}),
      ...(form.engagement_status ? { engagement_status: form.engagement_status as EngagementStatus } : {}),
    }

    try {
      if (isEdit && client) {
        await updateMutation.mutateAsync({ id: client.id, data: payload })
        handleClose(false)
      } else {
        const created = await createMutation.mutateAsync(payload)
        handleClose(false)
        navigate(`/${created.id}`, { state: { clientJustCreated: true, clientName: created.name } })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setNameError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'New Client'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="client-name">
                Name <span aria-hidden="true" className="text-zinc-400">*</span>
              </Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Acme Corp"
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'client-name-error' : undefined}
                disabled={isPending}
              />
              {nameError && (
                <p id="client-name-error" role="alert" className="text-sm text-zinc-500">
                  {nameError}
                </p>
              )}
            </div>

            {/* Contact Name */}
            <div className="space-y-1">
              <Label htmlFor="client-contact-name">Contact Name</Label>
              <Input
                id="client-contact-name"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                placeholder="Jane Smith"
                disabled={isPending}
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-1">
              <Label htmlFor="client-contact-email">Contact Email</Label>
              <Input
                id="client-contact-email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                placeholder="jane@acme.com"
                disabled={isPending}
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1">
              <Label htmlFor="client-contact-phone">Contact Phone</Label>
              <Input
                id="client-contact-phone"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                disabled={isPending}
              />
            </div>

            {/* Website */}
            <div className="space-y-1">
              <Label htmlFor="client-website">Company Website</Label>
              <Input
                id="client-website"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://acme.com"
                disabled={isPending}
              />
            </div>

            {/* Engagement Status */}
            <div className="space-y-1">
              <Label htmlFor="client-engagement-status">Engagement Status</Label>
              <Select
                value={form.engagement_status}
                onValueChange={(v) => setForm((f) => ({ ...f, engagement_status: v }))}
                disabled={isPending}
              >
                <SelectTrigger id="client-engagement-status">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="client-description">Description</Label>
              <Textarea
                id="client-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the client…"
                rows={3}
                disabled={isPending}
              />
            </div>

            {/* Market Type */}
            <div className="space-y-1">
              <Label htmlFor="client-market-type">Market Type</Label>
              <Select
                value={form.market_type}
                onValueChange={(v) => setForm((f) => ({ ...f, market_type: v }))}
                disabled={isPending}
              >
                <SelectTrigger id="client-market-type">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {MARKET_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
