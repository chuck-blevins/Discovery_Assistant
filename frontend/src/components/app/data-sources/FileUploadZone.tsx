import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUploadFiles } from '@/hooks/useDataSources'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.csv', '.txt', '.md'])

interface FileUploadZoneProps {
  projectId: string
}

export function FileUploadZone({ projectId }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Use a counter to correctly handle dragLeave firing on child elements
  const [dragCounter, setDragCounter] = useState(0)
  const isDragOver = dragCounter > 0
  const [files, setFiles] = useState<File[]>([])
  const [collectedDate, setCollectedDate] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)

  const uploadMutation = useUploadFiles(projectId)

  function validateAndSetFiles(incoming: File[]) {
    const wrongType = incoming.find((f) => {
      const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase()
      return !ALLOWED_EXTENSIONS.has(ext)
    })
    if (wrongType) {
      setFileError(
        `"${wrongType.name}" is not a supported file type. Only PDF, CSV, TXT, and MD files are accepted.`
      )
      return
    }
    const oversized = incoming.find((f) => f.size > MAX_BYTES)
    if (oversized) {
      setFileError(`"${oversized.name}" exceeds the 10 MB maximum file size.`)
      return
    }
    setFileError(null)
    setFiles(incoming)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    const dropped = Array.from(e.dataTransfer.files)
    validateAndSetFiles(dropped)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    validateAndSetFiles(selected)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0) return

    uploadMutation.mutate(
      {
        files,
        metadata: {
          collected_date: collectedDate || undefined,
          creator_name: creatorName || undefined,
          purpose: purpose || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${files.length} file${files.length !== 1 ? 's' : ''} uploaded.`)
          setFiles([])
          setCollectedDate('')
          setCreatorName('')
          setPurpose('')
          if (inputRef.current) inputRef.current.value = ''
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Upload failed.')
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div
        role="region"
        aria-label="File drop zone"
        onDragEnter={(e) => { e.preventDefault(); setDragCounter((c) => c + 1) }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragCounter((c) => Math.max(0, c - 1))}
        onDrop={(e) => { e.preventDefault(); setDragCounter(0); handleDrop(e) }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        tabIndex={0}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
        }`}
      >
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, CSV, TXT, MD — max 10 MB per file</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.txt,.md"
          multiple
          className="sr-only"
          aria-label="Upload files"
          onChange={handleFileChange}
        />
      </div>

      {fileError && (
        <p role="alert" className="text-sm text-destructive mt-2">{fileError}</p>
      )}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className="text-xs text-muted-foreground">
              {f.name} ({(f.size / 1024).toFixed(1)} KB)
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="upload-collected-date">Collected date</Label>
          <Input
            id="upload-collected-date"
            type="date"
            value={collectedDate}
            onChange={(e) => setCollectedDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="upload-creator-name">Creator</Label>
          <Input
            id="upload-creator-name"
            type="text"
            placeholder="Interview subject or author"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="upload-purpose">Purpose</Label>
          <Input
            id="upload-purpose"
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
        disabled={files.length === 0 || uploadMutation.isPending}
      >
        {uploadMutation.isPending ? 'Uploading…' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
      </Button>
    </form>
  )
}
