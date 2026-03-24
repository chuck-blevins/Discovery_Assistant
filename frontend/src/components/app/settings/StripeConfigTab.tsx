import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { getStripeSettings, updateStripeSettings } from '@/api/settings'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { StripeSettingsResponse } from '@/types/api'

export function StripeConfigTab() {
  const qc = useQueryClient()
  const [secretKeyInput, setSecretKeyInput] = useState('')
  const [editingSecret, setEditingSecret] = useState(false)
  const [webhookSecretInput, setWebhookSecretInput] = useState('')
  const [editingWebhook, setEditingWebhook] = useState(false)
  const [portalUrlInput, setPortalUrlInput] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)

  const { data: settings, isLoading } = useQuery<StripeSettingsResponse>({
    queryKey: ['settings', 'stripe'],
    queryFn: getStripeSettings,
  })

  const syncedRef = useRef(false)
  useEffect(() => {
    if (!settings || syncedRef.current) return
    syncedRef.current = true
    if (settings.customer_portal_url) setPortalUrlInput(settings.customer_portal_url)
  }, [settings])

  const mutation = useMutation({
    mutationFn: () =>
      updateStripeSettings({
        secret_key: secretKeyInput || undefined,
        webhook_secret: webhookSecretInput || undefined,
        customer_portal_url: portalUrlInput || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'stripe'] })
      setSecretKeyInput('')
      setEditingSecret(false)
      setWebhookSecretInput('')
      setEditingWebhook(false)
      toast.success('Stripe settings saved')
    },
    onError: () => toast.error('Failed to save Stripe settings'),
  })

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        Your Stripe key is stored securely per account and never shared. Required to send invoices.
      </div>

      {/* Secret Key */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Stripe secret key
        </label>
        {settings?.secret_key_is_set && !editingSecret ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
              {settings.secret_key_masked ?? 'sk_…****'}
            </span>
            <button
              onClick={() => setEditingSecret(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative w-96">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretKeyInput}
                onChange={(e) => setSecretKeyInput(e.target.value)}
                placeholder="sk_live_…"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 pr-10 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    aria-label={showSecret ? 'Hide' : 'Show'}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{showSecret ? 'Hide' : 'Show'}</TooltipContent>
              </Tooltip>
            </div>
            {settings?.secret_key_is_set && (
              <button
                onClick={() => { setEditingSecret(false); setSecretKeyInput('') }}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Webhook Secret */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Stripe webhook signing secret
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Found in your Stripe Dashboard → Webhooks. Point Stripe to{' '}
          <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
            https://your-domain/webhooks/stripe
          </code>
        </p>
        {settings?.webhook_secret_is_set && !editingWebhook ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">whsec_…****</span>
            <button
              onClick={() => setEditingWebhook(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative w-96">
              <input
                type={showWebhook ? 'text' : 'password'}
                value={webhookSecretInput}
                onChange={(e) => setWebhookSecretInput(e.target.value)}
                placeholder="whsec_…"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 pr-10 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowWebhook((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    aria-label={showWebhook ? 'Hide' : 'Show'}
                  >
                    {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{showWebhook ? 'Hide' : 'Show'}</TooltipContent>
              </Tooltip>
            </div>
            {settings?.webhook_secret_is_set && (
              <button
                onClick={() => { setEditingWebhook(false); setWebhookSecretInput('') }}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Customer Portal URL */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Customer portal URL <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Your Stripe customer portal link. When set, a "Customer Portal" link appears in the sidebar.
        </p>
        <input
          type="url"
          value={portalUrlInput}
          onChange={(e) => setPortalUrlInput(e.target.value)}
          placeholder="https://billing.stripe.com/p/login/…"
          className="w-96 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || (!secretKeyInput && !webhookSecretInput && portalUrlInput === (settings?.customer_portal_url ?? ''))}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
