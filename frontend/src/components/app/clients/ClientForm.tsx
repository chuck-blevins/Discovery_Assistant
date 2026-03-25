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
import type { BillingType, ClientResponse, EngagementStatus } from '@/types/api'

const MARKET_TYPE_OPTIONS = ['Enterprise', 'SMB', 'SaaS', 'Consumer', 'Marketplace', 'Other']
const ENGAGEMENT_STATUS_OPTIONS: { value: EngagementStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'short-term', label: 'Short-term' },
  { value: 'fixed-term', label: 'Fixed-term' },
]
const BILLING_TYPE_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'fixed_fee', label: 'Fixed Fee' },
  { value: 'milestone', label: 'Milestone' },
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
  billing_type: string
  contract_value: string
  hourly_rate: string
  agreed_hours: string
  contract_start_date: string
  contract_end_date: string
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
  billing_type: '',
  contract_value: '',
  hourly_rate: '',
  agreed_hours: '',
  contract_start_date: '',
  contract_end_date: '',
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
              billing_type: client.billing_type ?? '',
              contract_value: client.contract_value != null ? String(client.contract_value) : '',
              hourly_rate: client.hourly_rate != null ? String(client.hourly_rate) : '',
              agreed_hours: client.agreed_hours != null ? String(client.agreed_hours) : '',
              contract_start_date: client.contract_start_date ?? '',
              contract_end_date: client.contract_end_date ?? '',
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
      ...(form.billing_type ? { billing_type: form.billing_type as BillingType } : {}),
      ...(form.contract_value ? { contract_value: parseFloat(form.contract_value) } : {}),
      ...(form.hourly_rate ? { hourly_rate: parseFloat(form.hourly_rate) } : {}),
      ...(form.agreed_hours ? { agreed_hours: parseFloat(form.agreed_hours) } : {}),
      ...(form.contract_start_date ? { contract_start_date: form.contract_start_date } : {}),
      ...(form.contract_end_date ? { contract_end_date: form.contract_end_date } : {}),
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
                Company name <span aria-hidden="true" className="text-zinc-400">*</span>
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

            {/* Contract section */}
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contract Terms</p>
              <div className="space-y-3">
                {/* Billing Type */}
                <div className="space-y-1">
                  <Label htmlFor="client-billing-type">Billing Type</Label>
                  <Select
                    value={form.billing_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, billing_type: v }))}
                    disabled={isPending}
                  >
                    <SelectTrigger id="client-billing-type">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contract Value */}
                <div className="space-y-1">
                  <Label htmlFor="client-contract-value">Contract Value ($)</Label>
                  <Input
                    id="client-contract-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.contract_value}
                    onChange={(e) => setForm((f) => ({ ...f, contract_value: e.target.value }))}
                    placeholder="0.00"
                    disabled={isPending}
                  />
                </div>

                {/* Hourly Rate & Agreed Hours (only for hourly billing) */}
                {form.billing_type === 'hourly' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="client-hourly-rate">Hourly Rate ($)</Label>
                      <Input
                        id="client-hourly-rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.hourly_rate}
                        onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                        placeholder="0.00"
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="client-agreed-hours">Agreed Hours</Label>
                      <Input
                        id="client-agreed-hours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.agreed_hours}
                        onChange={(e) => setForm((f) => ({ ...f, agreed_hours: e.target.value }))}
                        placeholder="0"
                        disabled={isPending}
                      />
                    </div>
                  </div>
                )}

                {/* Contract Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="client-start-date">Start Date</Label>
                    <Input
                      id="client-start-date"
                      type="date"
                      value={form.contract_start_date}
                      onChange={(e) => setForm((f) => ({ ...f, contract_start_date: e.target.value }))}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="client-end-date">End Date</Label>
                    <Input
                      id="client-end-date"
                      type="date"
                      value={form.contract_end_date}
                      onChange={(e) => setForm((f) => ({ ...f, contract_end_date: e.target.value }))}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>
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
