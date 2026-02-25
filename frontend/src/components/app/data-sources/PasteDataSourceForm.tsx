import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePasteDataSource } from '@/hooks/useDataSources'

interface PasteDataSourceFormProps {
  projectId: string
}

export function PasteDataSourceForm({ projectId }: PasteDataSourceFormProps) {
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [collectedDate, setCollectedDate] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [purpose, setPurpose] = useState('')

  const pasteMutation = usePasteDataSource(projectId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rawText.trim()) return

    pasteMutation.mutate(
      {
        raw_text: rawText,
        file_name: fileName || undefined,
        collected_date: collectedDate || undefined,
        creator_name: creatorName || undefined,
        purpose: purpose || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Text pasted successfully.')
          setRawText('')
          setFileName('')
          setCollectedDate('')
          setCreatorName('')
          setPurpose('')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Paste failed.')
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <Label htmlFor="paste-raw-text">Text content</Label>
        <Textarea
          id="paste-raw-text"
          placeholder="Paste interview transcript, notes, or any research text here…"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={8}
          required
          aria-required="true"
          className="mt-1"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="paste-file-name">Name (optional)</Label>
          <Input
            id="paste-file-name"
            type="text"
            placeholder="e.g. Interview notes — John"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="paste-collected-date">Collected date</Label>
          <Input
            id="paste-collected-date"
            type="date"
            value={collectedDate}
            onChange={(e) => setCollectedDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="paste-creator-name">Creator</Label>
          <Input
            id="paste-creator-name"
            type="text"
            placeholder="Interview subject or author"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="paste-purpose">Purpose</Label>
          <Input
            id="paste-purpose"
            type="text"
            placeholder="e.g. customer interview"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="mt-4"
        disabled={!rawText.trim() || pasteMutation.isPending}
      >
        {pasteMutation.isPending ? 'Saving…' : 'Save Text'}
      </Button>
    </form>
  )
}
