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
import { Textarea } from '@/components/ui/textarea'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import type { ProjectCreate, ProjectResponse } from '@/types/api'

const OBJECTIVE_OPTIONS = [
  { value: 'onboarding', label: 'Onboarding', description: "Discover the client's needs and shape the engagement" },
  { value: 'problem-validation', label: 'Problem Validation', description: "Validate the client's assumed market problem" },
  { value: 'positioning', label: 'Positioning', description: 'Surface value drivers and positioning angles' },
  { value: 'persona-buildout', label: 'Persona Build-out', description: "Build a buyer persona from research" },
  { value: 'icp-refinement', label: 'ICP Refinement', description: 'Refine the Ideal Customer Profile' },
] as const

interface FormState {
  name: string
  objective: string
  targetSegments: string
  assumedProblem: string
}

const emptyForm: FormState = { name: '', objective: '', targetSegments: '', assumedProblem: '' }

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
  const [objectiveError, setObjectiveError] = useState<string | null>(null)
  const [assumedProblemError, setAssumedProblemError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

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
              assumedProblem: project.assumed_problem ?? '',
            }
          : emptyForm
      )
      setNameError(null)
      setObjectiveError(null)
      setAssumedProblemError(null)
      setFormError(null)
    }
  }, [open, project])

  function handleClose(v: boolean) {
    if (!v) {
      setForm(emptyForm)
      setNameError(null)
      setObjectiveError(null)
      setAssumedProblemError(null)
      setFormError(null)
    }
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameError(null)
    setObjectiveError(null)
    setAssumedProblemError(null)
    setFormError(null)

    let hasError = false
    if (!form.name.trim()) {
      setNameError('Name is required')
      hasError = true
    }
    if (!form.objective) {
      setObjectiveError('Objective is required')
      hasError = true
    }
    const isProblemValidation = form.objective === 'problem-validation'
    if (isProblemValidation && !form.assumedProblem.trim()) {
      setAssumedProblemError('Assumed problem is required for Problem Validation')
      hasError = true
    }
    if (hasError) return

    const segments = form.targetSegments
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload: ProjectCreate = {
      name: form.name.trim(),
      objective: form.objective as ProjectResponse['objective'],
      target_segments: segments,
    }
    if (isProblemValidation) {
      payload.assumed_problem = form.assumedProblem.trim()
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
      // 409 duplicate name errors are name-specific; other errors are form-level
      if (msg.toLowerCase().includes('name')) {
        setNameError(msg)
      } else {
        setFormError(msg)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

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
                    <div>
                      <div>{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {objectiveError && (
              <p className="text-sm text-destructive" role="alert">
                {objectiveError}
              </p>
            )}
          </div>

          {form.objective === 'problem-validation' && (
            <div className="space-y-1">
              <Label htmlFor="project-assumed-problem">Assumed Problem</Label>
              <Textarea
                id="project-assumed-problem"
                placeholder="e.g. Teams lose 3+ hours a week tracking RFP status"
                value={form.assumedProblem}
                onChange={(e) => setForm((f) => ({ ...f, assumedProblem: e.target.value }))}
                rows={3}
              />
              {assumedProblemError && (
                <p className="text-sm text-destructive" role="alert">
                  {assumedProblemError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Required for Problem Validation — the hypothesis this project will test.
              </p>
            </div>
          )}

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
