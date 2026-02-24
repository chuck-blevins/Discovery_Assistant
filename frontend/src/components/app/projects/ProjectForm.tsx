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
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import type { ProjectResponse } from '@/types/api'

const OBJECTIVE_OPTIONS = [
  { value: 'problem-validation', label: 'Problem Validation' },
  { value: 'positioning', label: 'Positioning' },
  { value: 'persona-buildout', label: 'Persona Build-out' },
  { value: 'icp-refinement', label: 'ICP Refinement' },
] as const

interface FormState {
  name: string
  objective: string
  targetSegments: string
}

const emptyForm: FormState = { name: '', objective: '', targetSegments: '' }

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  project?: ProjectResponse
}

export function ProjectForm({ open, onOpenChange, clientId, project }: ProjectFormProps) {
  const isEdit = Boolean(project)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [nameError, setNameError] = useState<string | null>(null)

  const createMutation = useCreateProject(clientId)
  const updateMutation = useUpdateProject(clientId)
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      setForm(
        project
          ? {
              name: project.name,
              objective: project.objective,
              targetSegments: project.target_segments.join(', '),
            }
          : emptyForm
      )
      setNameError(null)
    }
  }, [open, project])

  function handleClose(v: boolean) {
    if (!v) {
      setForm(emptyForm)
      setNameError(null)
    }
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameError(null)

    if (!form.name.trim()) {
      setNameError('Name is required')
      return
    }
    if (!form.objective) {
      setNameError('Objective is required')
      return
    }

    const segments = form.targetSegments
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      name: form.name.trim(),
      objective: form.objective as ProjectResponse['objective'],
      target_segments: segments,
    }

    try {
      if (isEdit && project) {
        await updateMutation.mutateAsync({ id: project.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      handleClose(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setNameError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Sprint 1 Discovery"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {nameError && (
              <p className="text-sm text-destructive" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="project-objective">Objective</Label>
            <Select
              value={form.objective}
              onValueChange={(v) => setForm((f) => ({ ...f, objective: v }))}
            >
              <SelectTrigger id="project-objective">
                <SelectValue placeholder="Select an objective" />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIVE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="project-segments">Target Segments</Label>
            <Input
              id="project-segments"
              placeholder="e.g. SaaS founders, Mid-market CTOs"
              value={form.targetSegments}
              onChange={(e) => setForm((f) => ({ ...f, targetSegments: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated, optional
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
