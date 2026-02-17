# Discovery App: Data Model & Technical Architecture

**Date:** February 17, 2026  
**Phase:** Architecture & Technical Foundation (Pre-Implementation)  
**Audience:** Development team, stakeholders

---

## Executive Summary

This document defines the data model and technical architecture for the AI-powered discovery consultant tool. It provides the foundation for all feature specifications and implementation.

**Key architectural decisions:**
- **Frontend:** React/TypeScript (modern, responsive, local-first when possible)
- **Backend:** Python FastAPI (excellent Claude integration, async, data processing)
- **Database:** PostgreSQL (relational, audit trail-friendly, JSON flexibility)
- **File Storage:** S3-compatible object storage (transcripts, exports)
- **Claude Integration:** Streaming API calls with structured output parsing
- **Authentication:** Session-based (single user initially; extensible)

---

## Part 1: Data Model

### Core Entities

#### **1. User**
Minimal MVP: Single user account ("you")

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Notes:**
- For MVP: Only "you" (Chuck) as user
- Future: Extensible for multi-user, permissions, teams

---

#### **2. Client**
Represents a startup/company you're consulting

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  market_type TEXT, -- e.g., "SaaS", "Enterprise", "Marketplace"
  
  -- Initial context/assumptions
  assumed_problem TEXT,
  assumed_solution TEXT,
  assumed_market TEXT,
  initial_notes TEXT,
  
  status TEXT DEFAULT 'active', -- active, archived
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,
  
  UNIQUE(user_id, name)
);
```

**Archive Behavior:**
- Archiving a client does NOT delete related projects, data sources, or analyses
- Projects remain queryable and visible when viewing archived client detail
- UI provides toggle filter to show/hide archived clients (remembers user preference)

---

#### **3. Project**
A discovery effort within a client (problem validation, persona buildout, etc.)

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Project objective
  objective TEXT NOT NULL, -- enum: problem-validation | positioning | persona-buildout | icp-refinement
  
  -- Target personas/segments for this project
  target_segments TEXT[], -- e.g., ["RFP Provider Buyer", "MSP User"]
  
  -- Tracking
  status TEXT DEFAULT 'active', -- active, completed, archived
  confidence_score FLOAT DEFAULT 0.0, -- 0-95%
  confidence_last_updated TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,
  
  UNIQUE(client_id, name)
);
```

**Relationships:**
- 1 Client → Many Projects
- 1 Project → Many DataSources
- 1 Project → Many Analyses
- 1 Project → Many Personas/ICPs

---

#### **4. DataSource**
Raw research data: transcripts, surveys, notes, exports

```sql
CREATE TABLE data_sources (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- File metadata
  filename TEXT NOT NULL,
  content_type TEXT, -- text/plain, application/pdf, etc.
  
  -- Source metadata (required at upload)
  source_type TEXT NOT NULL, -- enum: interview | survey | analytics | notes | email | other
  collected_date DATE, -- When was this data collected?
  creator_name TEXT, -- Who collected/created this?
  purpose TEXT, -- "Interview Round 1", "Survey Response", etc.
  
  -- Upload metadata
  uploader_id UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  -- Content
  raw_text TEXT, -- Extracted/parsed text content
  
  -- Provenance tracking
  source_url TEXT, -- If from external system (GA, LogRocket, etc.)
  source_system TEXT, -- e.g., "Google Analytics", "Zoom", "Typeform"
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Relationships:**
- 1 Project → Many DataSources
- 1 DataSource → Many Insights (provenance link)

**File Parsing Strategy:**
- Text files (.txt, .md): Direct text extraction
- CSV files (.csv): Load as-is (tab/comma-delimited, store as raw text or JSON)
- PDF files (.pdf): Extract text using pdfplumber (text-only; no OCR for MVP)
- Error handling: User notified if format unsupported or parsing fails
- All parsed content stored in `raw_text` field for consistent processing

---

#### **5. Analysis**
A single analysis run (problem validation, positioning, etc.)

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- What was analyzed
  objective TEXT NOT NULL, -- enum: problem-validation | positioning | persona-buildout | icp-refinement
  analysed_data_source_ids UUID[], -- Which data sources included in this analysis?
  
  -- Claude conversation
  claude_prompt_version TEXT, -- Track which prompt version was used
  claude_model TEXT, -- claude-3-5-sonnet, etc.
  claude_tokens_used INT,
  claude_cost FLOAT,
  
  -- Results
  raw_claude_response TEXT, -- Full Claude output
  structured_output JSONB, -- Parsed/structured results
  confidence_score FLOAT, -- 0-95%
  
  -- Metadata
  status TEXT DEFAULT 'completed', -- queued, processing, completed, failed
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**Relationships:**
- 1 Project → Many Analyses
- 1 Analysis → Many Insights

---

#### **6. Insight**
A single extracted insight (extracted from analysis)

```sql
CREATE TABLE insights (
  id UUID PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES analyses(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- The insight
  insight_text TEXT NOT NULL, -- "Companies lose money if they can't track RFP milestones"
  insight_type TEXT NOT NULL, -- enum: problem | value-driver | persona-trait | icp-dimension | contradiction | gap
  
  -- Confidence & quality
  confidence_score FLOAT, -- 0-1.0
  is_contradiction BOOLEAN DEFAULT FALSE,
  contradicts_assumption TEXT, -- If contradiction, which assumption?
  
  -- Provenance
  source_data_ids UUID[], -- Which data_source IDs support this?
  source_citations JSONB, -- Array of {file, line_number, creator, quote}
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by_analysis_id UUID REFERENCES analyses(id),
  manually_validated BOOLEAN DEFAULT FALSE
);
```

**Relationships:**
- 1 Analysis → Many Insights
- Many DataSources → 1 Insight (via source_citations)

---

#### **7. Persona**
A persona profile for a given project/segment

```sql
CREATE TABLE personas (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- Persona identity
  segment_name TEXT NOT NULL, -- e.g., "RFP Provider Buyer"
  persona_name TEXT, -- e.g., "Sarah"
  persona_role TEXT, -- e.g., "Procurement Manager"
  
  -- Template fields (following standard persona template)
  goals TEXT,
  pain_points TEXT,
  decision_drivers TEXT,
  false_beliefs TEXT,
  job_to_be_done TEXT,
  usage_patterns TEXT,
  objections TEXT,
  success_metrics TEXT,
  
  -- Quality tracking
  field_completion_count INT, -- How many fields are populated? (0-9)
  field_completion_pct FLOAT, -- Percentage
  
  -- Confidence
  confidence_score FLOAT DEFAULT 0.0, -- 0-95%
  confidence_last_updated TIMESTAMP,
  last_data_update TIMESTAMP, -- When was this persona last refined?
  
  -- Supporting data
  source_insight_ids UUID[], -- Which insights support this persona?
  source_citations JSONB, -- Full citation trail
  
  -- Versioning
  version INT DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Relationships:**
- 1 Project → Many Personas
- 1 Persona → Many Insights

**Confidence Decay Logic:**
- Starts at calculated confidence (based on field completion + data quality)
- Max 95%
- If project is active and persona hasn't been updated in 30 days: decay -5% monthly
- Resets to original when new data arrives

---

#### **8. ICP (Ideal Customer Profile)**
ICP definition for a given project/segment

```sql
CREATE TABLE icps (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- ICP identity
  segment_name TEXT NOT NULL, -- e.g., "RFP Provider"
  profile_name TEXT, -- Friendly name
  
  -- ICP dimensions (populated based on data)
  company_size_min INT,
  company_size_max INT,
  industries TEXT[], -- Array
  geographies TEXT[], -- Array
  revenue_range TEXT,
  technology_stack TEXT,
  use_case_fit TEXT,
  buying_process TEXT,
  budget_range TEXT,
  maturity_level TEXT,
  
  -- Custom dimensions (user-defined)
  custom_dimensions JSONB, -- Key-value pairs for any custom ICP fields
  
  -- Quality tracking
  dimension_completeness JSONB, -- Which dimensions have data? {industry: true, size: true, ...}
  
  -- Confidence
  confidence_score FLOAT DEFAULT 0.0, -- 0-95%
  confidence_last_updated TIMESTAMP,
  last_data_update TIMESTAMP,
  
  -- Supporting data
  source_insight_ids UUID[],
  source_citations JSONB,
  
  -- Versioning
  version INT DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Relationships:**
- 1 Project → Many ICPs
- 1 ICP → Many Insights

**Confidence Decay Logic:**
- Same as Personas: max 95%, decay -5% monthly if inactive

---

#### **9. ArtifactExport**
Generated outputs (scripts, templates, PDFs, etc.)

```sql
CREATE TABLE artifact_exports (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  
  artifact_type TEXT NOT NULL, -- enum: interview-script | survey-template | persona-template | icp-draft | positioning-summary | problem-statement
  
  -- Content
  format TEXT NOT NULL, -- markdown, docx, pdf, json
  content TEXT, -- Actual artifact content (or S3 link for large files)
  
  -- Provenance
  generated_from_analysis_id UUID REFERENCES analyses(id),
  generated_at TIMESTAMP DEFAULT NOW(),
  
  -- User interaction
  downloaded_by_user BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  downloaded_at TIMESTAMP
);
```

**Relationships:**
- 1 Project → Many ArtifactExports

---

### 10. AuditLog
Complete action trail for compliance & debugging

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  
  action TEXT NOT NULL, -- enum: upload-data | run-analysis | download-artifact | create-project | export-client | etc
  entity_type TEXT, -- data_source, analysis, project, persona, etc.
  entity_id UUID,
  
  description TEXT,
  details JSONB, -- Any additional context
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Notes:**
- Every significant action logged for auditability
- Enables reconstruction of "how did we get here?"
- Supports evaluation and training

---

### Entity Diagram (Simplified)

```
User (1)
  ├── Client (Many)
  │     ├── Project (Many)
  │     │     ├── DataSource (Many) [Uploaded raw research]
  │     │     ├── Analysis (Many) [Claude analysis runs]
  │     │     │     └── Insight (Many)
  │     │     ├── Persona (Many) [Extracted personas]
  │     │     │     └── Links to Insights (provenance)
  │     │     ├── ICP (Many) [Extracted ICPs]
  │     │     │     └── Links to Insights (provenance)
  │     │     └── ArtifactExport (Many) [Generated outputs]
  │     │
  │     └── [Client-level export uses all Projects, Data, Analyses, Artifacts]
  │
  └── AuditLog (All actions)
```

---

## Part 2: Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - Dashboard, Client/Project setup, Data upload         │
│  - Confidence meters, Artifact downloads                │
│  - File management (paste, upload, batch)               │
└──────────┬──────────────────────────────────────────────┘
           │
           │ REST API / WebSocket
           ↓
┌─────────────────────────────────────────────────────────┐
│                 Backend (FastAPI/Python)                │
│                                                         │
│  - Authentication & session management                 │
│  - Data ingestion & parsing (text, PDF, CSV)           │
│  - Project/Persona/ICP management                      │
│  - Claude API orchestration                            │
│  - Analysis pipeline (prompt → Claude → structure)     │
│  - Confidence scoring & decay                          │
│  - Artifact generation (scripts, templates, PDFs)      │
│  - Audit logging                                       │
└───┬───────────┬──────────────┬──────────┬──────────────┘
    │           │              │          │
    ↓           ↓              ↓          ↓
 PostgreSQL   S3 Storage    Claude API  Email (future)
 (metadata)   (raw files)   (analysis)   (notifications)
```

### Technology Stack Recommendations

#### **Frontend**
- **Framework:** React 18 + TypeScript
- **State Management:** TanStack Query (data fetching) + Zustand (local state)
- **UI Components:** Headless UI / Shadcn (composable, accessible)
- **Styling:** Tailwind CSS (utility-first, responsive)
- **Forms:** React Hook Form + Zod (validation)
- **Charts/Meters:** Recharts or Victory (confidence visualization)
- **File Handling:** React Dropzone + Papaparse (CSV parsing)
- **API Client:** Axios or Fetch API with custom middleware

**Why:** Modern, component-based, excellent TypeScript support, great for rapid iteration

---

#### **Backend**
- **Framework:** FastAPI (Python 3.11+)
- **Async:** Native async/await, excellent for I/O operations
- **ORM:** SQLAlchemy 2.0 (type hints, async support)
- **Database Driver:** asyncpg (PostgreSQL, optimized)
- **PDF Parsing:** PyPDF2 or pdfplumber
- **Text Processing:** spaCy (optional, for future NLP enhancements)
- **Claude SDK:** anthropic (official SDK)
- **Task Queue:** Celery + Redis (async analysis jobs, optional for MVP)
- **Logging:** Structlog (structured logging for debugging)

**Why:** Fast startup, async-native, excellent type hints, easy Claude integration, Python's rich ecosystem for text processing

---

#### **Database**
- **Primary:** PostgreSQL 14+ (relational, audit-trail-friendly, JSON support)
- **Connection Pool:** pgbouncer or SQLAlchemy pool
- **Migrations:** Alembic (schema versioning)

**Why:** ACID compliance, excellent for relational data + audit trails, JSON support for flexible fields

---

#### **File Storage**
- **MVP:** Local filesystem or S3-compatible (AWS S3, MinIO)
- **Structure:** `/data/{client_id}/{project_id}/{data_source_id}/original.txt`

**Why:** Scalable, accessible, easy to backup, S3 compatible tools available

---

#### **Deployment**
- **Containerization:** Docker (reproducible environment)
- **Orchestration:** Render, Railway, or AWS ECS (managed, simple for MVP)
- **Environment:** Python 3.11, PostgreSQL 14, minimal dependencies

**Why:** Simple to deploy, scale, and iterate

---

### Claude API Integration Pattern

```
┌──────────────────┐
│  User uploads    │
│  research data   │
└────────┬─────────┘
         ↓
┌──────────────────────────────────────┐
│  Backend processes:                  │
│  1. Parse text                       │
│  2. Tag source metadata              │
│  3. Store in DB + S3                 │
└────────┬─────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Handle analysis request:            │
│  1. Construct Claude prompt          │
│  2. Include all project context      │
│  3. Include example personas/ICPs    │
│  4. Include all historical data      │
└────────┬─────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Call Claude API:                    │
│  - Use claude-3-5-sonnet            │
│  - Streaming for long responses     │
│  - Track tokens used & cost         │
└────────┬─────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Post-processing:                    │
│  1. Parse structured output          │
│  2. Extract & citation mapping       │
│  3. Calculate confidence (formula)   │
│  4. Store insights + provenance      │
└────────┬─────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Generate recommendations:           │
│  1. Identify gaps                    │
│  2. Suggest next discovery steps     │
│  3. Generate artifacts               │
│  4. Update confidence scores         │
└────────┬─────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Return to frontend:                 │
│  - Confidence score                  │
│  - Key insights                      │
│  - Downloadable artifacts            │
│  - Next step recommendations         │
└──────────────────────────────────────┘
```

---

### Confidence Scoring Implementation

**For Personas & ICPs:**

```python
def calculate_persona_confidence(persona: Persona, related_insights: List[Insight]):
    """
    Confidence = (Field Completion + Data Quality) / 2
    
    Field Completion: How many template fields are populated?
    Data Quality: AI eval of content quality (based on examples)
    """
    field_completion_score = persona.field_completion_count / 9 * 100
    
    # AI evaluation (run once per persona update)
    data_quality_score = evaluate_against_examples(persona, example_personas)
    
    base_confidence = (field_completion_score + data_quality_score) / 2
    
    # Cap at 95%, never 100%
    confidence = min(base_confidence, 95)
    
    # Apply staleness decay
    days_since_last_update = (now - persona.last_data_update).days
    months_inactive = days_since_last_update // 30
    staleness_penalty = months_inactive * 5  # -5% per month
    
    final_confidence = max(confidence - staleness_penalty, 0)
    return final_confidence
```

**For Problem Statements & Positioning:**

```python
def calculate_problem_confidence(analysis: Analysis, contradictions: List[Insight]):
    """
    Red/Yellow/Green scoring based on:
    - Frequency: How many sources mention problem?
    - Consistency: Do sources align?
    - Contradictions: Are there conflicting findings?
    """
    frequency_score = len(problems_mentioned) / total_sources
    consistency_score = assess_alignment(sources)
    contradiction_penalty = len(contradictions) * 0.1
    
    base_score = (frequency_score * 0.6 + consistency_score * 0.4) - contradiction_penalty
    
    # Map to Red/Yellow/Green
    if base_score >= 0.7:
        return "GREEN"  # Ready to act
    elif base_score >= 0.5:
        return "YELLOW"  # Emerging, validate further
    else:
        return "RED"  # Need more data
```

---

### Audit & Traceability

**Every action logged:**
- Upload: file, metadata, uploader, timestamp
- Analysis: prompt version, model, tokens, cost, results
- Artifact download: which artifact, when, by whom
- Manual edits: what changed, when, who approved

**Enables:**
- Reconstruction: "How did we get to this persona?"
- Evaluation: Review Claude outputs against ground truth
- Training: Use feedback to improve prompts
- Cost tracking: See per-project analysis costs

---

## Part 3: Development Priorities

### MVP (Weeks 1-4)

**Essential:**
1. ✅ User authentication (single user for MVP)
2. ✅ Client + Project CRUD
3. ✅ Data upload/paste + parsing
4. ✅ Claude integration for problem validation
5. ✅ Confidence scoring + display
6. ✅ Artifact generation (interview scripts, next-step recommendations)
7. ✅ Basic dashboard
8. ✅ Audit logging

**Not in MVP:**
- Persona/ICP editing UI (use external tools, re-import)
- Team collaboration
- Advanced visualizations
- Email notifications
- Multi-user permissions

---

### Phase 2 (Weeks 5-8)

**Nice to have:**
1. Inline persona/ICP editor
2. Persona/ICP confidence decay visualization
3. Batch PDF export
4. Slack integration (daily insights)
5. Cost tracking dashboard

---

## Next Steps

1. **Specification & Features** (flows from this architecture)
   - Feature specifications with acceptance criteria
   - User stories
   - API endpoint definitions

2. **Database Schema** (detailed SQL DDL)
   - Create migration scripts
   - Seed data for examples

3. **Implementation Roadmap**
   - Sprint breakdown
   - Development tasks
   - Testing strategy

---

**Ready to proceed with detailed Feature Specification?**
