# Discovery App: Feature Specification

**Date:** February 17, 2026  
**Phase:** MVP Feature Specification  
**Status:** Ready for Development  

---

## Executive Summary

This document defines all MVP features with detailed acceptance criteria, user stories, and wireframe descriptions. These features enable the core discovery workflow: client setup → project setup → data upload → analysis → recommendations → artifact download.

**MVP Timeline:** 4 weeks  
**Target User:** Single user (Chuck); extensible for teams later

---

## Feature Categories

1. **Authentication & Settings**
2. **Client Management**
3. **Project Management**
4. **Data Management**
5. **Analysis & Discovery**
6. **Confidence & Recommendations**
7. **Artifacts & Exports**
8. **Dashboard & Navigation**

---

## FEATURE 1: Authentication & Session Management

### Feature Description
Single-user authentication with email/password login. Session-based; no multi-user complexity for MVP.

### User Story
```
As a consultant (Chuck),
I want to login with email and password,
So that my data is protected and I can manage multiple projects over time.
```

### Acceptance Criteria

- [ ] User can sign up with valid email and password
- [ ] Email validation: RFC 5322 compliant (or practical subset)
- [ ] User can login with valid email/password
- [ ] Invalid credentials show error message
- [ ] Sessions persist for 30 days (remember me option)
- [ ] User can logout (clears session)
- [ ] Unauthorized access redirects to login
- [ ] Password constraints: 8+ characters, at least one number
- [ ] Forgot password flow sends reset email (future; skip for MVP)

### Wireframe Description

```
Login Page:
┌─────────────────────────┐
│  Discovery App          │
│                         │
│  Email:  [____________] │
│  Password: [__________] │
│  [ ] Remember me        │
│  [Login] [Sign Up]      │
│                         │
│  Forgot password?       │
└─────────────────────────┘

After login → Dashboard
```

### Technical Notes

- Use JWT tokens (stored in HTTP-only cookies)
- Backend: `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/validate`
- Frontend: Route guard on all protected pages
- Database: Users table with hashed passwords (bcrypt)

---

## FEATURE 2: Client Setup & Management

### Feature Description
Create, view, edit, and manage client companies. Capture initial problem/solution/market context.

### User Story
```
As a consultant,
I want to create a new client with problem, solution, and market context,
So that I can organize discovery efforts by company and track assumptions.
```

### Acceptance Criteria

**Create Client:**
- [ ] User can create new client with: name, market type, problem statement, solution description, market notes
- [ ] All fields required except notes
- [ ] Client name must be unique per user (no duplicates)
- [ ] Success message on creation
- [ ] Redirects to client detail view

**View Clients:** by default
- [ ] Each client card shows: name, market type, # projects, last updated
- [ ] Click client → Client detail view
- [ ] Archive filter toggle: Show/hide archived clients (remembers user preference)
- [ ] When viewing archived client's projects: show all related projects (projects are NOT deleted when client archived
- [ ] Archived clients hidden from default view (toggle available)

**Client Detail View:**
- [ ] Shows client name, market type, context fields
- [ ] Edit button → inline edit or modal edit
- [ ] Projects list (all projects for this client)
- [ ] Archive button (with confirmation)
- [ ] Delete button (with warning; irreversible)
- [ ] Export button (exports client + all projects as .zip)

**Edit Client:**
- [ ] User can edit any field (name, problem, solution, market, notes)
- [ ] Save/Cancel buttons
- [ ] Validation same as create
- [ ] Audit logged

### Wireframe Description

```
Create Client Modal:
┌──────────────────────────────────┐
│ Add New Client                   │
├──────────────────────────────────┤
│ Name: [Tech Startup X         ]  │
│                                  │
│ Market Type:                     │
│ ◯ SaaS  ◯ Enterprise ◯ Other    │
│                                  │
│ Problem Statement:               │
│ [Companies lose money if they    │
│  can't track RFP processes   ]   │
│                                  │
│ Solution:                        │
│ [Intelligence layer above       │
│  systems like ServiceNow      ]  │
│                                  │
│ Market Notes (optional):         │
│ [_____________________________]  │
│                                  │
│ [Create Client] [Cancel]         │
└──────────────────────────────────┘

Client Detail View:
┌──────────────────────────────────┐
│ Tech Startup X                   │
│ Market: SaaS  [Edit] [Archive]   │
├──────────────────────────────────┤
│ Problem: Companies lose money...│
│ Solution: Intelligence layer...  │
│ Notes: (optional)                │
├──────────────────────────────────┤
│ Projects (3):                    │
│ • Problem Validation (78%)       │
│ • Positioning Discovery (45%)    │
│ • Persona Buildout (23%)         │
│                                  │
│ [Add Project] [Export] [Delete]  │
└──────────────────────────────────┘
```

### Technical Notes

- Backend: `/clients` CRUD endpoints
- Database: Clients table with user_id foreign key
- Audit: Log all client actions
- Archive: Set status to "archived", hide from default view

---

## FEATURE 3: Project Setup & Management

### Feature Description
Create discovery projects within a client. Each project has a single objective (problem validation, positioning, persona, or ICP).

### User Story
```
As a consultant,
I want to create a project with a specific objective (e.g., problem validation),
So that I can focus my analysis and track progress separately for each discovery phase.
```

### Acceptance Criteria

**Create Project:**
- [ ] User selects client first
- [ ] Form shows: project name, objective (dropdown: problem-validation | positioning | persona-buildout | icp-refinement)
- [ ] For persona/ICP projects: optional field "target segments" (text input; e.g., "RFP Provider Buyer, MSP User")
- [ ] All fields required
- [ ] Success → Project detail view
 by default
- [ ] Each project shows: name, objective, confidence score, status, last updated
- [ ] Click project → Project detail view
- [ ] Archive filter toggle: Show/hide archived projects (per client, remembers preference)
- [ ] Archiving a project does NOT delete data sources or analysesence score, status, last updated
- [ ] Click project → Project detail view
- [ ] Archived projects hidden (toggle available)

**Project Detail View:**
- [ ] Project name, objective, target segments
- [ ] Confidence score (0-95%) with visual meter
- [ ] Current phase/step indicator
- [ ] Data sources uploaded (count, list)
- [ ] Latest analysis results summary
- [ ] "Upload Data" button
- [ ] Archive/Delete project buttons

**Edit Project:**
- [ ] Edit name, objective, target segments
- [ ] Rationale: Focus might shift during discovery

### Wireframe Description

```
Create Project Modal:
┌──────────────────────────────────┐
│ New Project for Tech Startup X   │
├──────────────────────────────────┤
│ Project Name:                    │
│ [Problem Validation Round 1  ]   │
│                                  │
│ Objective:                       │
│ [Dropdown: Problem Validation]   │
│     ↓ Positioning Discovery      │
│       Persona Buildout           │
│       ICP Refinement             │
│                                  │
│ Target Segments (optional):      │
│ [RFP Provider Buyer, MSP User]   │
│                                  │
│ [Create Project] [Cancel]        │
└──────────────────────────────────┘

Project Detail View:
┌──────────────────────────────────┐
│ Problem Validation Round 1       │
│ Objective: Problem Validation    │
│ Segments: RFP Provider Buyer     │
├──────────────────────────────────┤
│ Confidence: 📊 72%                │
│ Status: In Progress              │
│ Last Updated: Feb 17, 10:30 AM   │
├──────────────────────────────────┤
│ Data Sources: 5 uploaded         │
│ • interview-001.txt (Feb 17)     │
│ • interview-002.txt (Feb 17)     │
│ • survey-responses.csv (Feb 16)  │
│ • notes.md (Feb 15)              │
│ • analytics-export.csv (Feb 14)  │
│                                  │
│ [Upload More Data] [View Results]│
│                                  │
│ [Edit] [Archive] [Delete]        │
└──────────────────────────────────┘
```

### Technical Notes

- Backend: `/projects` CRUD within `/clients/{client_id}`
- Objective drives which Claude prompts are used
- Target segments informational (guides analysis)
- Confidence calculated after first analysis

---

## FEATURE 4: Data Import & Management

### Feature Description
Import research data via paste-as-you-go, direct paste, or file upload (batch). Tag with metadata (date, purpose, creator, source).

### User Story
```
As a consultant,
I want to paste interview transcripts, upload files, or paste survey responses,
So that the app can analyze them and update my insights continuously during discovery.
```

### Acceptance Criteria

**Paste-as-You-Go:**
- [ ] Text area on project page: paste transcript/notes/responses
- [ ] Auto-detect source type (interview, survey, notes) or user selects
- [ ] User provides metadata: collected date, creator name, purpose
- [ ] On submit → parsed and stored; immediately starts analysis
- [ ] Confirmation: "Data received. Analyzing..."

**Direct Upload (File):**
- [ ] Drag-and-drop zone: upload .md, .pdf, .txt, .csv files
- [ ] Single or batch upload
- [ ] File parser: extracts plain text from PDF if needed
- [ ] For each file: user provides metadata (date, creator, purpose)
- [ ] On submit → all files parsed and stored

**Batch Upload:**
- [ ] Upload multiple files at once
- [ ] Metadata form applies to all files OR per-file metadata
- [ ] Progress indicator shows parsing status

**View Uploaded Data:**
- [ ] Project detail shows list of all data sources
- [ ] Each source shows: filename, source type, collected date, creator, upload date, # lines
- [ ] Click source → Preview (first 500 characters)
- [ ] Delete source button (with warning)
- [ ] No re-analysis required; confidence doesn't reset

### Wireframe Description

```
Data Import UI (on Project Detail):
┌──────────────────────────────────┐
│ Upload Research Data             │
├──────────────────────────────────┤
│ [Drag & drop files here]          │
│      or [Select Files]            │
│                                  │
│ Paste Text (paste-as-you-go):    │
│ [Textarea.....................]  │
│ [..............................] │
│                                  │
│ Metadata:                        │
│ Date Collected: [Feb 17, 2026]   │
│ Creator:  [Chuck]                │
│ Purpose:  [Interview Round 1   ] │
│ Type:     [Interview ▼]          │
│                                  │
│ [Upload & Analyze] [Cancel]      │
│                                  │
│ ✓ Data sources: 5                │
│   • interview-001.txt (5.2 KB)   │
│   • interview-002.txt (4.8 KB)   │
│   • survey-responses.csv (2.1 KB)│
│   [Preview] [Delete]             │
└──────────────────────────────────┘
```

### Technical Notes

- Backend: `/projects/{id}/data-sources` endpoints
- File parsing: Use pdf2image (PDF) + pytesseract (OCR) OR pdfplumber (text extraction)
- Store raw text in DB + optionally in S3 for large files
- Metadata captured at upload (required fields)
- Audit logged: uploader, upload time, file info

---

## FEATURE 5: Analysis Execution

### Feature Description
Run Claude analysis on uploaded data, returning insights, confidence score, and next-step recommendations.

### User Story
```
As a consultant,
I want to click "Analyze" and have Claude extract insights from my research data,
So that I can see if my assumptions are validated and what to do next.
```

### Acceptance Criteria

**Analysis Trigger:**
- [ ] "Analyze Now" button on project detail
- [ ] OR auto-trigger after each data upload (configurable; default: manual for MVP)
- [ ] Button disabled if no data uploaded
- [ ] Loading indicator during analysis (Claude call)

**Analysis Results Display:**
- [ ] Confidence score (0-95%) with visual meter
- [ ] Color-coded: Red (<50%), Yellow (50-69%), Green (70%+)
- [ ] Summary findings (varies by objective):
  - Problem validation: "Problem is validated (80%). Evidence: 4/5 sources mention it."
  - Positioning: "Primary positioning angle: Efficiency (3 sources). Secondary: Cost (2 sources)."
  - Persona: "Profile 60% complete (6/9 fields). Strongest: Goals, Pain Points. Weakest: Success Metrics."
  - ICP: "8/12 dimensions populated. Strong signals on company size and industry."

**Contradictions:**
- [ ] If contradictions detected: highlight as separate section
- [ ] Example: "Contradiction: You assume problem X; data emphasizes Y (2 sources)"
- [ ] User can flag contradiction as important for next investigation

**Data Gaps:**
- [ ] "Missing Information" section
- [ ] Lists what's still unclear + recommended methodology to validate
- [ ] Example: "We need to understand decision drivers better. Recommend 3 more interviews with buyers."

**Cost Transparency:**
- [ ] Display used for this analysis: "Tokens: 2,145 | Cost: $0.03"
- [ ] Running total cost per project shown on dashboard

### Wireframe Description

```
Analysis Results View:
┌──────────────────────────────────┐
│ Analysis Results                 │
│ Updated: Feb 17, 11:30 AM        │
├──────────────────────────────────┤
│ Confidence: 🟢 78%                │
│ Ready to move forward             │
│                                  │
│ Findings:                        │
│ ├─ Problem is well-validated      │
│ │  Evidence: 4/5 sources mention  │
│ │  • Interview 1, line 42         │
│ │  • Interview 2, line 87         │
│ │  • Interview 3, line 15         │
│ │  • Survey response 5, Q3        │
│ │                                │
│ ├─ Secondary concern: Timeline    │
│ │  2 sources mention urgency      │
│ │                                │
│ └─ [View All Insights]            │
│                                  │
│ Contradictions: None detected    │
│                                  │
│ Information Gaps:                │
│ ├─ Decision drivers (unclear)    │
│ │  Recommend: 3 more interviews  │
│ └─ [View Recommended Next Steps]  │
│                                  │
│ Cost: Tokens: 2,145 | $0.03      │
│ [Re-analyze] [Download Report]   │
└──────────────────────────────────┘
```

### Technical Notes

- Backend: POST `/projects/{id}/analyze`
- Async job: Claude call, parsing, confidence calculation, insight extraction
- Results stored in Analysis + Insight tables
- Streaming for long-running analyses (show progress)
- Error handling: Claude failures logged; user notified

---

## FEATURE 6: Problem Validation Discovery

### Feature Description
Claude analyzes research data specifically for problem validation. Returns: Is the assumed problem real? What evidence supports it?

### Objectives Analysis

**Specific to Problem Validation:**
- Extract problem mentions from all sources
- Map to assumed problem: Strong match? Partial? Contradiction?
- Count sources mentioning problem (frequency)
- Assess consistency across sources
- Flag contradictions

**Confidence Scoring:**
```
Confidence = (Frequency + Consistency + Strength) / 3
Where:
- Frequency: # sources mentioning problem / total sources
- Consistency: Do sources align? (0-1 scale)
- Strength: Explicit vs. inferred (0-1 scale)
Max: 95%, never 100%
```

**Output Summary:**
```
"Problem Validation Results:

Your Assumed Problem: 'Companies lose money if they can't track RFP milestones'

Validation Status: STRONG (78% confidence)

Evidence:
- 4/5 interviews explicitly mention tracking challenges
- 2 sources mention financial impact
- 1 interviewed mentioned 'losing 3 hours/week manually tracking'

Confidence Score: 78% (High - ready to move forward)

Recommendations:
- Problem is validated. Ready to explore positioning.
- Optional: 1-2 more interviews with MSPs for secondary validation.
"
```

---

## FEATURE 7: Positioning Discovery

### Feature Description
Claude analyzes research data for value drivers and positioning angles. What resonates with customers?

**Specific to Positioning:**
- Extract customer priorities from data
- Identify value drivers mentioned (efficiency, cost, ease of use, risk reduction, etc.)
- Rank by frequency of mention
- Suggest alternative positioning angles
- Map to customer preferences

**Output Summary:**
```
"Positioning Discovery Results:

Your Assumed Value Prop: 'Reduces RFP tracking overhead'

Top Value Drivers Mentioned:
1. Time Savings / Efficiency (4 sources; 5 mentions)
2. Cost Reduction (2 sources; 3 mentions)
3. Risk Mitigation (1 source; 2 mentions)

Recommendation: Primary positioning on EFFICIENCY. Secondary positioning on COST.

Alternative Angles to Consider:
- Risk reduction (less mentioned but potential differentiator)
- Real-time visibility (emerging theme across 2 interviews)

Next Steps: Validate positioning angle with 3 MSP interviews using provided script.
"
```

---

## FEATURE 8: Persona Origination

### Feature Description
Claude extracts persona data from research, fills standard template fields, and scores completeness/confidence.

**Specific to Persona:**
- Target segment: User specifies (e.g., "RFP Provider Buyer", "MSP User")
- Standard template fields:
  1. Name / Title / Role
  2. Goals
  3. Pain Points
  4. Decision Drivers
  5. False Beliefs
  6. Job to Be Done
  7. Usage Patterns
  8. Objections
  9. Success Metrics

**Confidence Scoring:**
```
Field Completion: X/9 fields filled (visual progress bar)
Data Quality: AI eval against example personas
Combined: (Field Completion % + Quality Score) / 2
Max: 95%, never 100%
Staleness: -5% per month if no new data (project active)
```

**Output Summary:**
```
"Persona: RFP Provider Buyer - Sarah (Procurement Manager)

Field Completion: 6/9 (67%)

Goals:
- Streamline RFP process from intake to contract
- Reduce manual tracking and data entry
- Gain visibility into pipeline

Pain Points:
- Spending 3-4 hours/week manually updating tracking
- Errors in RFP status due to system fragmentation
- Lack of visibility into project financials

Decision Drivers:
- Time savings (mentioned 3x)
- Cost reduction (mentioned 1x)
- Team alignment (mentioned 2x)

False Beliefs:
- Believes they need deep customization (vs. out-of-box)

Job to Be Done:
- Track RFP lifecycle from creation to contract signing

[Usage Patterns, Objections, Success Metrics: Data insufficient]

Confidence: 62% (Emerging - need 2-3 more buyer interviews)

Incomplete Fields:
- Usage Patterns (data from 1 source only)
- Success Metrics (no data)
- Objections (only 1 mention)
"
```

**Persona Card Display:**
- Downloadable as .md or .docx
- User can export, edit externally, re-import
- Versioning tracked (v1, v2, v3)

---

## FEATURE 9: ICP Refinement

### Feature Description
Claude extracts company characteristics from research, builds ICP dimensions (company size, industry, revenue, etc.), and scores confidence.

**Specific to ICP:**
- Target segment: "RFP Provider" or "MSP"
- Standard ICP dimensions:
  1. Company Size (# employees)
  2. Industries / Verticals
  3. Geography
  4. Revenue Range
  5. Technology Stack
  6. Use Case Fit
  7. Buying Process
  8. Budget / Procurement
  9. Maturity Level
  10. Custom dimensions (user-defined)

**Confidence Scoring:**
```
Per-Dimension Confidence:
- Rich data (multiple sources, consistent) = High
- Emerging (2 sources, consistent) = Medium
- Minimal (1 source) = Low
- None = No data

Overall: Average of all dimension scores
Max: 95%, never 100%
Staleness: -5% per month if no new data
```

**Output Summary:**
```
"ICP: RFP Provider

Dimension Completeness: 7/10

Company Size:
High Confidence (3 sources): 50-500 employees
Typical annual revenue: $10M-$500M

Industries:
High Confidence: Professional Services, Technology, Insurance

Geography:
Medium Confidence: US/Europe
One mention of APAC

Technology Stack:
High Confidence: Uses ServiceNow, SAP, or Ariba
Considering cloud-based alternatives

Use Case Fit:
Strong (4 sources): RFP process automation
Fit score: 9/10

Buying Process:
Medium: Enterprise procurement + IT approval
Decision timeline: 3-4 months

Budget:
Emerging: $50K-$200K annual (2 sources)

[Maturity Level: insufficient data]

Overall Confidence: 72% (Ready to validate with prospects)

Recommended Next Steps:
- Validate revenue range with 2-3 more enterprise customers
- Clarify maturity level (startup vs. established)
"
```

**ICP Card Display:**
- Downloadable as .md or .docx
- User can export, edit externally, re-import
- Versioning tracked

---

## FEATURE 10: Next-Step Recommendations

### Feature Description
After analysis, Claude recommends what to do next. Prescriptive guidance on discovery methodology, interview scripts, or pivot signals.

**Output Examples:**

**Problem Validation (78% → Green):**
```
Status: Problem is validated. Ready to move forward.

Recommendations:
1. Primary: Start Positioning Discovery
   - Use provided positioning script
   - Interview 3 RFP Provider customers
   - Focus: What value matters most?

2. Optional: Validate with MSP segment
   - Interview 2 MSPs to confirm problem applies to both sides
   - Use provided [MSP interview script]

Timeline: 1-2 weeks of interviews if you focus on RFP Provider

Create new "Positioning Discovery" project? [Yes] [No]
```

**Positioning (45% → Yellow):**
```
Status: Positioning patterns emerging, but need confidence.

Recommendations:
1. Validate positioning angle
   - Use provided [Positioning validation script]
   - Interview 3 more customers (RFP Provider buyers)
   - Confirm: Efficiency vs. Cost as primary angle

2. Test alternative angles
   - One secondary theme emerged: "Real-time visibility"
   - Consider including in messaging?

3. Gather competitive data
   - How do alternatives position?
   - What gaps exist?

Timeline: 1 week

Timeline: 1 week. Ready to move forward? [No, refine more] [Yes, proceed to personas]
```

**Persona (55% → Yellow):**
```
Status: Persona emerging, but incomplete.

Missing Information:
- Usage Patterns (critical for understanding workflow)
- Success Metrics (needed to inform positioning)
- Detailed Objections (important for sales messaging)

Recommendations:
1. Conduct 2-3 more interviews with RFP Provider buyers
   - Use [Buyer Deep-Dive Interview Script]
   - Focus: How do they currently work? What's success?

2. Option: Run targeted survey (if bandwidth limited)
   - 15-question survey on workflow + success metrics
   - Provide [Survey Template - RFP Buyer]

Timeline: 1-2 weeks (3 interviews) or 3-4 days (survey)

Next? [Conduct interviews] [Run survey] [Build second persona] [Skip]
```

**Artifact Generation:**
- Claude generates scripts (markdown, can download as .docx)
- Templates pre-filled with specific guidance
- Each recommendation includes actionable next steps

---

## FEATURE 11: Artifact Generation & Download

### Feature Description
App generates downloadable artifacts based on analysis: interview scripts, survey templates, persona templates, ICP drafts, positioning summaries.

### Acceptance Criteria

**Generate Artifacts:**
- [ ] After analysis, automatically generate relevant artifacts based on objective
- [ ] Problem Validation → generate "Next Interview Script" + positioning discovery intro
- [ ] Positioning → generate positioning statement doc + validation script
- [ ] Persona → generate persona template (pre-filled) + "persona deep-dive interview script"
- [ ] ICP → generate ICP summary doc + validation script

**Download Formats:**
- [ ] Default: Markdown (.md)
- [ ] Options: .docx (Word), .txt, .pdf (future)
- [ ] One-click download button: "Download [artifact name].md"

**Artifact Metadata:**
- [ ] Each artifact includes: generated date, project name, confidence score, data sources used
- [ ] Example footer: "Generated from analysis of 5 data sources (interviews, surveys) on Feb 17, 2026. Confidence: 78%"

**Versioning:**
- [ ] Each artifact download tracked
- [ ] User can download same artifact multiple times (generates fresh from latest analysis)
- [ ] Archive old versions (optional future feature)

### Wireframe Description

```
Artifacts Section (on Project Detail):
┌──────────────────────────────────┐
│ Download Artifacts               │
├──────────────────────────────────┤
│ [Interview Script - Round 2]      │
│ Format: 📄 .md   📋 .docx  ❌ PDF │
│ [Download .md] [View] [Share]    │
│                                  │
│ [Positioning Statement]          │
│ Format: 📄 .md   📋 .docx  ❌ PDF │
│ [Download .md] [View] [Share]    │
│                                  │
│ [Persona Deep-Dive Script]       │
│ Format: 📄 .md   📋 .docx  ❌ PDF │
│ [Download .md] [View]            │
│                                  │
│ Generated: Feb 17, 11:30 AM      │
│ Sources: 5 data sources          │
│ Confidence basis: 78%             │
└──────────────────────────────────┘
```

---

## FEATURE 12: Dashboard & Navigation

### Feature Description
Main hub showing all clients, projects, confidence scores, and next-step flags. Overview of discovery progress.

### Acceptance Criteria

**Dashboard Layout:**
- [ ] Left navigation: Dashboard | Settings | Help
- [ ] Top bar: User name/avatar | Logout
- [ ] Main content: Clients overview

**Clients View:**
- [ ] All active clients displayed as cards or list
- [ ] Each card shows: client name, market type, # projects, last updated date
- [ ] Click card → Client detail view
- [ ] Search bar (filter clients by name)
- [ ] "Add Client" button (prominent)
- [ ] Archived clients tab (toggle visibility)

**Quick Stats (Optional MVP):**
- [ ] Total clients
- [ ] Active projects
- [ ] Projects by confidence level (Red | Yellow | Green)
- [ ] Recent activity (last analysis run, last data upload)

**Project Dashboard (Within Client View):**
- [ ] All projects for a client listed
- [ ] Each project shows:
  - Name
  - Objective badge (Problem, Positioning, Persona, ICP)
  - Confidence meter (🔴 <50%, 🟡 50-75%, 🟢 75%+)
  - Status badge (In Progress | Complete | Paused)
  - Last updated timestamp
  - "Next Step" flag (if applicable)
- [ ] Quick actions: View | Upload Data | Analyze

**Navigation:**
- [ ] Breadcrumb: Dashboard > Client > Project
- [ ] Always show current user (logout option)
- [ ] Mobile-responsive (future priority; desktop-first for MVP)

### Wireframe Description

```
Main Dashboard:
┌─────────────────────────────────────────┐
│ 🔷 Discovery App                        │
├─────────────────────────────────────────┤
│ Dashboard  Settings  Help  | Chuck ▼    │
├─────────────────────────────────────────┤
│                                         │
│ Quick Stats:                            │
│ 📊 3 Clients | 8 Projects              │
│ 🟢 3 Green (Ready) | 🟡 3 Yellow | 🔴 2 Red│
│                                         │
│ Your Clients:                           │
│ ┌───────────────────┐ ┌───────────────┐ │
│ │ Tech Startup X    │ │ Startup Y     │ │
│ │ SaaS              │ │ Marketplace   │ │
│ │ 3 projects        │ │ 2 projects    │ │
│ │ Updated: Feb 17   │ │ Updated: Feb16│ │
│ │ [View]            │ │ [View]        │ │
│ └───────────────────┘ └───────────────┘ │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ Startup Z                         │  │
│ │ Enterprise | 3 projects           │  │
│ │ Updated: Feb 10 | [View]          │  │
│ └───────────────────────────────────┘  │
│                                         │
│ [+ Add New Client]                      │
└─────────────────────────────────────────┘

Client Detail:
┌─────────────────────────────────────────┐
│ Dashboard > Tech Startup X              │
├─────────────────────────────────────────┤
│ Tech Startup X                          │
│ SaaS | Problem: Companies lose money... │
├─────────────────────────────────────────┤
│ Projects:                               │
│                                         │
│ 🔲 Problem Validation Round 1           │
│    Confidence: 🟢 78%  | Updated: Feb17│
│    ✓ Ready to move forward              │
│    [View] [Upload Data] [Analyze]       │
│                                         │
│ 🔲 Positioning Discovery                │
│    Confidence: 🟡 45%  | Updated: Feb17│
│    ⚠ Emerging - needs validation        │
│    [View] [Upload Data] [Analyze]       │
│                                         │
│ 🔲 Persona Buildout (RFP Buyer)         │
│    Confidence: 🔴 23%  | Updated: Feb16│
│    ⛔ Need more data                     │
│    [View] [Upload Data] [Analyze]       │
│                                         │
│ [+ New Project] [Export All] [Archive]  │
└─────────────────────────────────────────┘
```

---

## FEATURE 13: Audit Logging

### Feature Description
Every significant action logged for compliance, debugging, and evaluation. Enables reconstruction of "how did we get here?"

### Acceptance Criteria

- [ ] Log all actions: upload, analysis, download, edit, delete, archive
- [ ] Capture: user ID, action, entity type, entity ID, timestamp, details
- [ ] Accessible to user (optional audit trail view; skip for MVP)
- [ ] Stored securely
- [ ] Used for evaluation: Can replay analysis decisions

### Implementation Notes

- Automatic logging in backend middleware
- No UI needed for MVP (data stored for future audit trail view)
- Back-end only: Audit log table populated on every significant action

---

## Feature Priority & MVP Phasing

### MVP (Weeks 1-4) - CRITICAL PATH

```
Week 1:
 - Feature 1: Authentication (single user)
 - Feature 2: Client management (CRUD)
 - Feature 13: Audit logging (infrastructure)

Week 2:
 - Feature 3: Project management (CRUD)
 - Feature 4: Data import (paste, upload, batch)
 - Feature 12: Basic dashboard

Week 3:
 - Feature 5: Analysis execution (Claude integration)
 - Feature 6: Problem validation discovery
 - Feature 10: Next-step recommendations

Week 4:
 - Feature 7: Positioning discovery
 - Feature 8: Persona origination
 - Feature 9: ICP refinement
 - Feature 11: Artifact generation
 - Feature 12: Full dashboard
 - Testing & deployment
```

### Phase 2 (Weeks 5-8) - ENHANCEMENTS

- Inline persona/ICP editor
- Confidence decay visualization
- Batch PDF export
- Slack integration
- Advanced search/filtering

---

## Summary Table

| Feature | MVP | Sprint | Priority |
|---------|-----|--------|----------|
| 1. Authentication | ✅ | W1 | Critical |
| 2. Client Management | ✅ | W1 | Critical |
| 3. Project Management | ✅ | W2 | Critical |
| 4. Data Import | ✅ | W2 | Critical |
| 5. Analysis Execution | ✅ | W3 | Critical |
| 6. Problem Validation | ✅ | W3 | Critical |
| 7. Positioning Discovery | ✅ | W4 | High |
| 8. Persona Origination | ✅ | W4 | High |
| 9. ICP Refinement | ✅ | W4 | High |
| 10. Next-Step Recommendations | ✅ | W3 | High |
| 11. Artifact Download | ✅ | W4 | High |
| 12. Dashboard | ✅ | W2/W4 | High |
| 13. Audit Logging | ✅ | W1 | Medium |

---

**Ready for Database Schema & Implementation Roadmap?**
