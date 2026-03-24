# TODOS

## High Priority

### E2E tests for AI intake wizard
**What:** Set up Playwright and write 2 E2E tests: (1) full AI intake flow (Step 1 → Step 2 → Step 3 → ClientPage), (2) skip-AI path.

**Why:** Unit tests can't catch the multi-step state machine + sequential API calls. The intake wizard is the first thing a user encounters — a broken wizard means the whole tool never gets used.

**Pros:** Catches real integration failures, validates the user journey end-to-end including navigation state.

**Cons:** Playwright setup ~30min. Two test files to maintain. Requires a running backend.

**Context:** The ClientIntakeWizard feature was built on the `redesign` branch. The unit tests cover individual steps and API call paths, but the full flow (wizard state machine + sequential client+project creation + navigation) needs an E2E test. See `frontend/src/tests/components/clients/ClientIntakeWizard.test.tsx` for unit test coverage — E2E should complement, not duplicate.

**Depends on:** AI intake wizard feature shipping (redesign branch merged to main).

---

## Medium Priority

### ICP seeding from intake hypothesis (deferred from v1)
**What:** When the intake wizard generates ICP hypothesis tags, optionally seed the ICP model with them.

**Why:** Currently the tags are displayed in Step 2 for context but not stored. Seeding them would give the `icp-refinement` analysis flow a starting point.

**Context:** Deferred because the `Icp` model has named dimensional columns (`company_size`, `industries`, `geography`, etc.) that don't map cleanly to free-form hypothesis strings. Options: (a) map hypothesis strings to specific ICP dimensions via AI parsing, (b) store raw strings in `Icp.custom` JSONB column. Neither was clean enough for v1.

**Depends on:** AI intake wizard feature.

---

## Backlog

### API key error handling in analyses route
**What:** Add Claude API key pre-check to the existing analyses streaming route (same check added to intake route in this PR).

**Why:** First-time users who haven't configured their Claude key get a confusing 401/500 error instead of "Add your API key in Settings > LLM Config."

**Context:** The intake route adds this check as part of the AI intake wizard PR. The existing analyses route (`/projects/{project_id}/analyze/stream`) has the same gap. Fix is 5 lines at the top of the route handler.

**Note:** This was proposed as a fix-in-PR item but deferred if the analyses route fix scope expanded.
