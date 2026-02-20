import { useEffect, useState } from 'react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateClient, useUpdateClient } from '@/hooks/useClients'
import type { ClientResponse } from '@/types/api'

const MARKET_TYPE_OPTIONS = ['Enterprise', 'SMB', 'SaaS', 'Consumer', 'Marketplace', 'Other']

interface ClientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: ClientResponse
}

interface FormState {
  name: string
  market_type: string
}

const emptyForm: FormState = { name: '', market_type: '' }

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const isEdit = Boolean(client)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [nameError, setNameError] = useState<string | null>(null)

  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const isPending = createMutation.isPending || updateMutation.isPending

  // Sync form state when client prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setForm(
        client
          ? { name: client.name, market_type: client.market_type ?? '' }
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
      ...(form.market_type ? { market_type: form.market_type } : {}),
    }

    try {
      if (isEdit && client) {
        await updateMutation.mutateAsync({ id: client.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      handleClose(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg === 'A client with that name already exists') {
        setNameError(msg)
      } else {
        setNameError(msg)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent aria-describedby={undefined}>
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
