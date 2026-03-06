import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { getLLMSettings, updateLLMSettings } from '@/api/settings'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Recommended)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
]

type ApiKeyMode = 'display' | 'editing'

export function LLMConfigTab({ isSetup = false }: { isSetup?: boolean }) {
  const qc = useQueryClient()
  const [apiKeyMode, setApiKeyMode] = useState<ApiKeyMode>('display')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [timeout, setTimeout] = useState<number | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'llm'],
    queryFn: getLLMSettings,
    onSuccess: (data) => {
      if (selectedModel === null) setSelectedModel(data.model)
      if (timeout === null) setTimeout(data.timeout_seconds)
      if (!data.api_key_is_set) setApiKeyMode('editing')
    },
  })

  const mutation = useMutation({
    mutationFn: () =>
      updateLLMSettings({
        model: selectedModel ?? undefined,
        timeout_seconds: timeout ?? undefined,
        api_key: apiKeyInput || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'llm'] })
      setApiKeyMode('display')
      setApiKeyInput('')
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
  }

  const effectiveModel = selectedModel ?? settings?.model ?? 'claude-sonnet-4-6'
  const effectiveTimeout = timeout ?? settings?.timeout_seconds ?? 180

  return (
    <div className="space-y-6">
      {isSetup && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          Welcome! Enter your Anthropic API key below to get started. You can adjust other settings at any time.
        </div>
      )}

      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Claude model
        </label>
        <Select value={effectiveModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Request timeout (seconds)
        </label>
        <input
          type="number"
          min={10}
          max={600}
          value={effectiveTimeout}
          onChange={(e) => setTimeout(Number(e.target.value))}
          className="w-32 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Anthropic API key
        </label>
        {apiKeyMode === 'display' && settings?.api_key_is_set ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
              {settings.api_key_masked}
            </span>
            <button
              onClick={() => { setApiKeyMode('editing'); setApiKeyInput('') }}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative w-96">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={settings?.api_key_is_set ? 'Enter new key to replace' : 'sk-ant-api03-…'}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 pr-10 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    aria-label={showKey ? 'Hide password' : 'Show password'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{showKey ? 'Hide password' : 'Show password'}</TooltipContent>
              </Tooltip>
            </div>
            {settings?.api_key_is_set && (
              <button
                onClick={() => { setApiKeyMode('display'); setApiKeyInput('') }}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Saving…' : isSetup ? 'Save & Continue' : 'Save'}
      </button>
    </div>
  )
}