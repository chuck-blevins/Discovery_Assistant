import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPrompts, updatePrompt, resetPrompt } from '@/api/settings'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ANALYSIS_TYPES = [
  { value: 'problem_validation', label: 'Problem Validation' },
  { value: 'positioning', label: 'Positioning' },
  { value: 'persona_buildout', label: 'Persona Build-out' },
  { value: 'icp_refinement', label: 'ICP Refinement' },
  { value: 'recommendations', label: 'Recommendations' },
]

export function PromptsTab() {
  const qc = useQueryClient()
  const [selectedType, setSelectedType] = useState('problem_validation')
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null)

  const { data: prompts, isLoading } = useQuery({
    queryKey: ['settings', 'prompts'],
    queryFn: getPrompts,
  })

  const current = prompts?.find((p) => p.analysis_type === selectedType)
  const savedPrompt = current?.system_prompt ?? ''
  const displayPrompt = editedPrompt ?? savedPrompt
  const isDirty = editedPrompt !== null && editedPrompt !== savedPrompt

  function handleTypeChange(type: string) {
    setEditedPrompt(null)
    setSelectedType(type)
  }

  const saveMutation = useMutation({
    mutationFn: () => updatePrompt(selectedType, { system_prompt: displayPrompt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'prompts'] })
      setEditedPrompt(null)
      toast.success('Prompt saved')
    },
    onError: () => toast.error('Failed to save prompt'),
  })

  const resetMutation = useMutation({
    mutationFn: () => resetPrompt(selectedType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'prompts'] })
      setEditedPrompt(null)
      toast.success('Prompt reset to default')
    },
    onError: () => toast.error('Failed to reset prompt'),
  })

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Analysis type
        </label>
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANALYSIS_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          System prompt
        </label>
        <textarea
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          rows={22}
          disabled={isLoading}
          value={displayPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          {resetMutation.isPending ? 'Resetting…' : 'Reset to Default'}
        </button>
        {isDirty && (
          <button
            onClick={() => setEditedPrompt(null)}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Discard changes
          </button>
        )}
      </div>
    </div>
  )
}