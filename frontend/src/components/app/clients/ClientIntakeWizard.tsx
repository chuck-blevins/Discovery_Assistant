/**
 * ClientIntakeWizard — 3-step AI-powered client onboarding wizard.
 *
 * Step 1: Client Basics (name, context, win definition)
 * Step 2: AI Scope Draft (engagement summary, ICP hypothesis, discovery questions)
 * Step 3: Review & Confirm (POST /clients → POST /projects → navigate)
 *
 * State machine:
 *   Step 1 → [Generate] → Step 2 (loading → success/error)
 *   Step 1 → [Skip AI] → Step 3 (empty draft)
 *   Step 2 → [Confirm] → Step 3
 *   Step 2 → [Continue without AI draft] → Step 3 (on error)
 *   Step 3 → [Confirm] → navigate to /{clientId}
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { intakeScope } from '@/api/clients'
import { createClient } from '@/api/clients'
import { createProject } from '@/api/projects'
import type { IntakeScopeResponse } from '@/api/clients'
import type { EngagementStatus } from '@/types/api'

const VALID_ENGAGEMENT_STATUSES = new Set<EngagementStatus>([
  'lead', 'coaching', 'short-term', 'fixed-term', 'hourly',
])

interface ClientIntakeWizardProps {
  open: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3

export function ClientIntakeWizard({ open, onClose }: ClientIntakeWizardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Step 1 form fields
  const [name, setName] = useState('')
  const [context, setContext] = useState('')
  const [winDefinition, setWinDefinition] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [website, setWebsite] = useState('')

  // Wizard state
  const [step, setStep] = useState<Step>(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // AI draft (Step 2 outputs, editable before Step 3)
  const [aiDraft, setAiDraft] = useState<IntakeScopeResponse | null>(null)
  const [engagementSummary, setEngagementSummary] = useState('')
  const [discoveryQuestions, setDiscoveryQuestions] = useState('')
  const [suggestedType, setSuggestedType] = useState('')

  // Step 3 confirm state
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)

  function resetState() {
    setName('')
    setContext('')
    setWinDefinition('')
    setContactName('')
    setContactEmail('')
    setContactPhone('')
    setWebsite('')
    setStep(1)
    setIsGenerating(false)
    setGenerateError(null)
    setAiDraft(null)
    setEngagementSummary('')
    setDiscoveryQuestions('')
    setSuggestedType('')
    setIsConfirming(false)
    setConfirmError(null)
    setCreatedClientId(null)
  }

  function handleClose() {
    resetState()
    onClose()
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const result = await intakeScope({
        company_name: name,
        context,
        win_definition: winDefinition,
      })
      setAiDraft(result)
      setEngagementSummary(result.engagement_summary)
      setDiscoveryQuestions(result.discovery_questions.join('\n'))
      setSuggestedType(result.suggested_engagement_type)
      setStep(2)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed'
      const isApiKeyError =
        msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('llm config')
      setGenerateError(
        isApiKeyError
          ? 'Claude API key is not configured. Add it in Settings > LLM Config.'
          : msg
      )
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSkipAI() {
    setAiDraft(null)
    setEngagementSummary('')
    setDiscoveryQuestions('')
    setSuggestedType('')
    setStep(3)
  }

  async function handleConfirm() {
    setIsConfirming(true)
    setConfirmError(null)

    try {
      // Create client
      let clientId = createdClientId
      if (!clientId) {
        const client = await createClient({
          name,
          description: engagementSummary || undefined,
          initial_notes: winDefinition || undefined,
          engagement_status: VALID_ENGAGEMENT_STATUSES.has(suggestedType as EngagementStatus)
            ? (suggestedType as EngagementStatus)
            : undefined,
          contact_name: contactName.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          website: website.trim() || undefined,
        })
        clientId = client.id
        setCreatedClientId(clientId)
        queryClient.invalidateQueries({ queryKey: ['clients'] })
      }

      // Create initial discovery project
      await createProject(clientId, {
        name: 'Discovery',
        objective: 'onboarding',
        assumed_problem: discoveryQuestions || undefined,
      })

      queryClient.invalidateQueries({ queryKey: ['clients'] })
      handleClose()
      navigate(`/${clientId}`, { state: { clientJustCreated: true, clientName: name } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create client'
      setConfirmError(msg)
    } finally {
      setIsConfirming(false)
    }
  }

  const isProjectRetry = createdClientId !== null && confirmError !== null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Add Client with AI'}
            {step === 2 && 'AI Scope Draft'}
            {step === 3 && 'Review & Confirm'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1 — Client Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter some context and let AI generate a scope hypothesis for your engagement.
            </p>

            <div className="space-y-1">
              <Label htmlFor="intake-name">Company name *</Label>
              <Input
                id="intake-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="intake-context">
                What does this client do? What&apos;s the context?
              </Label>
              <Textarea
                id="intake-context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="B2B SaaS company selling to enterprise HR teams, ~50 employees, Series A. They've built a platform for employee onboarding but are struggling with activation..."
                rows={4}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="intake-win">What does a win look like? (optional)</Label>
              <Input
                id="intake-win"
                value={winDefinition}
                onChange={(e) => setWinDefinition(e.target.value)}
                placeholder="Clear ICP and messaging for enterprise sales motion"
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Info (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="intake-contact-name">Contact name</Label>
                  <Input
                    id="intake-contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="intake-contact-email">Contact email</Label>
                  <Input
                    id="intake-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jane@acme.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="intake-contact-phone">Phone</Label>
                  <Input
                    id="intake-contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="intake-website">Website</Label>
                  <Input
                    id="intake-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://acme.com"
                  />
                </div>
              </div>
            </div>

            {generateError && (
              <p role="alert" className="text-sm text-destructive rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
                {generateError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={!name.trim() || isGenerating}
              >
                {isGenerating ? 'Generating scope…' : 'Generate scope →'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSkipAI}
                disabled={!name.trim()}
              >
                Skip AI →
              </Button>
              <Button variant="ghost" onClick={handleClose} className="ml-auto">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — AI Draft */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground italic">
              Treat this as a starting draft, not a deliverable. Edit freely.
            </p>

            <div className="space-y-1">
              <Label htmlFor="intake-summary">Engagement summary</Label>
              <Textarea
                id="intake-summary"
                value={engagementSummary}
                onChange={(e) => setEngagementSummary(e.target.value)}
                rows={4}
              />
            </div>

            {aiDraft && aiDraft.icp_hypothesis.length > 0 && (
              <div className="space-y-2">
                <Label>ICP hypothesis</Label>
                <div className="flex flex-wrap gap-2">
                  {aiDraft.icp_hypothesis.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Displayed for context — not stored until ICP refinement.</p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="intake-questions">Discovery questions</Label>
              <Textarea
                id="intake-questions"
                value={discoveryQuestions}
                onChange={(e) => setDiscoveryQuestions(e.target.value)}
                rows={5}
                placeholder="One question per line"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={() => setStep(3)}>
                Confirm →
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Review & Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted px-4 py-3 space-y-2 text-sm">
              <div>
                <span className="font-medium">Client: </span>
                {name}
              </div>
              {engagementSummary && (
                <div>
                  <span className="font-medium">Scope: </span>
                  {engagementSummary}
                </div>
              )}
              {discoveryQuestions && (
                <div>
                  <span className="font-medium">Discovery questions: </span>
                  <span className="text-muted-foreground">{discoveryQuestions.split('\n').filter(Boolean).length} question(s)</span>
                </div>
              )}
              <div>
                <span className="font-medium">Project: </span>
                Discovery (onboarding)
              </div>
            </div>

            {confirmError && (
              <div role="alert" className="text-sm text-destructive rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
                <p>{confirmError}</p>
                {isProjectRetry && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Client was created. You can retry creating the project.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming
                  ? isProjectRetry ? 'Retrying project…' : 'Creating…'
                  : isProjectRetry ? 'Retry project creation' : 'Confirm & Create'}
              </Button>
              {!isProjectRetry && (
                <Button variant="outline" onClick={() => setStep(aiDraft ? 2 : 1)}>
                  Back
                </Button>
              )}
              <Button variant="ghost" onClick={handleClose} className="ml-auto">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
