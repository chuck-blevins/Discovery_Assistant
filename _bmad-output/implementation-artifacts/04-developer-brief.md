# Discovery App: Developer Brief & Build Specification

**Date:** February 17, 2026  
**Prepared for:** BMAD Dev Agent (Amelia)  
**Phase:** MVP Implementation (4 weeks)  
**Status:** Ready to build  

---

## Quick Summary

Build an AI-powered discovery consultant SaaS tool for Chuck. Single-user MVP that helps startup founders validate business assumptions against real research data using Claude.

**Core Loop:**
1. Create client + project
2. Upload research (interviews, surveys, notes)
3. Click "Analyze" → Claude extracts insights
4. Get confidence score + next-step recommendations
5. Download artifacts (scripts, persona templates, etc.)

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python 3.11+) + SQLAlchemy ORM
- **Database:** PostgreSQL 14+
- **File Storage:** MinIO (local dev) / AWS S3 (production)
- **Deployment:** Docker Compose (development)

**Timeline:** 4 weeks  
**Cost:** $0 during development (Docker locally)

---

## References

All full specifications are in:
- [Feature Specification](02-feature-specification.md) — All 13 features with acceptance criteria
- [Data Model & Architecture](01-data-model-and-architecture.md) — Database schema, 10 entities, relationships
- [Hosting & Infrastructure](03-hosting-and-infrastructure.md) — Docker Compose, environment setup

**This document:** Quick reference for build priorities and critical paths

---

## Build Priorities (4-Week Sprint)

### Week 1: Foundation & Authentication

**Acceptance Criteria:**
- ✅ Backend health check: `GET /health` → 200 OK
- ✅ Docker Compose fully functional (`docker-compose up -d` works)
- ✅ PostgreSQL initialized with all tables
- ✅ MinIO bucket created
- ✅ User signup: `POST /auth/signup`
- ✅ User login: `POST /auth/login` → JWT token
- ✅ Session persistence (30-day remember-me)
- ✅ Login/logout UI functional
- ✅ Dashboard shell (authenticated redirect)

**Database Migrations (Alembic):**
```
- users table
- audit_log table (infrastructure)
```

**API Endpoints (Backend):**
- `POST /auth/signup` — Create user
- `POST /auth/login` — Login with JWT
- `POST /auth/logout` — Clear session
- `GET /auth/validate` — Check token validity
- `GET /health` — Health check (no auth required)

**Frontend Pages:**
- Login page
- Signup page
- Protected route guard
- Dashboard redirect

### Week 2: Client & Project Management

**Acceptance Criteria:**
- ✅ Create client: `POST /clients` (name, market, problem, solution, notes)
- ✅ List clients: `GET /clients` (card/list view)
- ✅ View client details: `GET /clients/{id}`
- ✅ Edit client: `PUT /clients/{id}`
- ✅ Archive client: `PATCH /clients/{id}` (status = archived)
- ✅ Create project: `POST /clients/{id}/projects` (name, objective, target_segments)
- ✅ List projects: `GET /clients/{id}/projects`
- ✅ View project details: `GET /projects/{id}`
- ✅ Edit project: `PUT /projects/{id}`
- ✅ Dashboard shows clients + projects with confidence scores
- ✅ Click client → client detail view with projects list
- ✅ Click project → project detail view

**Database Migrations:**
```
- clients table
- projects table
- relationships + foreign keys
```

**API Endpoints:**
- `POST /clients` — Create client
- `GET /clients` — List all clients
- `GET /clients/{id}` — Get client + projects
- `PUT /clients/{id}` — Edit client
- `PATCH /clients/{id}` — Archive/delete
- `POST /clients/{id}/projects` — Create project
- `GET /clients/{id}/projects` — List projects
- `GET /projects/{id}` — Get project details
- `PUT /projects/{id}` — Edit project
- `PATCH /projects/{id}` — Archive/delete

**Frontend Pages:**
- Dashboard (all clients, cards)
- Create client modal
- Client detail page
- Create project modal
- Project detail page (basic)

### Week 3: Data Import & Analysis Core

**Acceptance Criteria:**
- ✅ Upload data: `POST /projects/{id}/data-sources` (paste, file, batch)
- ✅ Parse data: Extract text from .md, .txt, .csv, .pdf
- ✅ Store metadata: date, creator, purpose, source type
- ✅ List data sources: `GET /projects/{id}/data-sources`
- ✅ Trigger analysis: `POST /projects/{id}/analyze`
- ✅ Claude API calls work (problem validation)
- ✅ Confidence score calculated (0-95%)
- ✅ Analysis results stored in DB
- ✅ Display results on UI: Confidence + summary findings
- ✅ Show cost per analysis (tokens used)
- ✅ Contradictions detected (if applicable)
- ✅ Data gaps identified (unclear fields)

**Database Migrations:**
```
- data_sources table
- analyses table
- insights table
- confidence scoring logic
- audit trail
```

**API Endpoints:**
- `POST /projects/{id}/data-sources` — Upload data
- `GET /projects/{id}/data-sources` — List uploads
- `GET /data-sources/{id}/preview` — Preview file content
- `DELETE /data-sources/{id}` — Delete source
- `POST /projects/{id}/analyze` — Run analysis
- `GET /projects/{id}/analyses` — List all analyses for project
- `GET /analyses/{id}` — Get analysis results + insights

**Claude Integration (Backend):**
```python
# Key function signature:
# Uses claude-3-5-sonnet (model configurable via env var CLAUDE_MODEL)
def analyze_project(
    project_id: str,
    objective: str,  # problem | positioning | persona | icp
    data_sources: List[DataSource],
    existing_insights: List[Insight]
) -> Analysis:
    """
    Returns: Analysis with confidence score, insights, gaps, contradictions
    Model version: Configurable, allows updates without code changes
    """
```

**Frontend Pages:**
- Data import UI (with drag-and-drop)
- Data sources list (with preview + delete)
- Analysis results page (confidence meter, findings, gaps)
- Cost transparency (tokens, $ per call)

### Week 4: Discovery Discovery Objectives & Artifacts

**Acceptance Criteria:**

**Problem Validation:**
- ✅ Confidence calculated from problem mention frequency
- ✅ Evidence extracted with file + line citations
- ✅ Summary: "Problem validated / emerging / needs data"

**Positioning Discovery:**
- ✅ Value drivers identified + ranked by frequency
- ✅ Alternative positioning angles suggested
- ✅ Recommendations for next interviews

**Persona Origination:**
- ✅ Template fields populated (9 fields)
- ✅ Field completion % tracked
- ✅ Persona downloadable as .md/.docx
- ✅ Confidence based on field completion + quality

**ICP Refinement:**
- ✅ 10 dimensions populated (size, industry, revenue, etc.)
- ✅ Per-dimension confidence scores
- ✅ ICP downloadable as .md/.docx
- ✅ Recommendations for validation

**Next-Step Recommendations:**
- ✅ Auto-generated based on objective + confidence
- ✅ Includes interview scripts
- ✅ Includes survey templates
- ✅ Action-oriented (what to do next)

**Artifact Generation:**
- ✅ Generate interview scripts (markdown, downloadable)
- ✅ Generate survey templates (pre-filled)
- ✅ Generate persona templates (from analysis)
- ✅ Generate ICP summary (from analysis)
- ✅ Download as .md (default), option for .docx (future)
- ✅ Metadata on artifacts (date, confidence, sources)

**Frontend Pages:**
- Analysis results rewrite (4 objective-specific views)
- Next-step recommendations section
- Download artifacts UI
- Confidence meter (red/yellow/green)

**Claude Integration (Backend — Week 4 specific):**
```python
def analyze_problem_validation(data_sources, assumed_problem) -> Analysis:
    """Frequency-based confidence scoring"""

def analyze_positioning(data_sources, assumed_positioning) -> Analysis:
    """Extract value drivers, alternative angles"""

def analyze_persona(data_sources, template_fields, segment_name) -> Analysis:
    """Field completion + quality confidence"""

def analyze_icp(data_sources, segment_name) -> Analysis:
    """Per-dimension confidence scoring"""

def generate_next_steps(analysis, objective) -> NextSteps:
    """Action-oriented recommendations + scripts"""

def generate_artifacts(analysis, analysis_type) -> List[Artifact]:
    """Interview scripts, templates, summaries"""
```

---

## Critical Path Items (Must-Have for MVP)

### Database Schema
```sql
-- Core tables (see 01-data-model-and-architecture.md for full schema)
users
clients
projects
data_sources
analyses
insights
personas
icps
audit_logs
artifacts

-- Key relationships:
- users.id → clients.user_id
- clients.id → projects.client_id
- projects.id → data_sources.project_id
- projects.id → analyses.project_id
- analyses.id → insights.analysis_id (1:many)
```

### API Response Schema (Key Examples)

**Analysis Result:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "objective": "problem-validation",
  "confidence_score": 78,
  "confidence_level": "high",  // red | yellow | green
  "summary": "Problem is validated across 4/5 sources",
  "insights": [
    {
      "id": "uuid",
      "type": "evidence",
      "text": "Problem mentioned explicitly",
      "citation": "interview-001.txt:line 42",
      "confidence": 0.95,
      "source_count": 4
    }
  ],
  "contradictions": [],
  "data_gaps": [
    "Decision drivers (unclear from 1 source)"
  ],
  "tokens_used": 2145,
  "cost_usd": 0.03,
  "created_at": "2026-02-17T10:30:00Z"
}
```

**Next-Step Recommendation:**
```json
{
  "status": "ready",  // red | yellow | green
  "recommendation": "Problem is validated. Ready to explore positioning.",
  "next_steps": [
    {
      "priority": "primary",
      "action": "Start Positioning Discovery",
      "methodology": "Interview 3 RFP Provider customers",
      "provided_script": "positioning-interview-script.md",
      "estimated_days": 7
    }
  ],
  "can_create_next_project": true,
  "suggested_next_objective": "positioning"
}
```

### Critical Claude Integration (Backend Pseudocode)

```python
# Backend/prompts/problem_validation.py
SYSTEM_PROMPT = """
You are analyzing research data for problem validation.
Extract all mentions of the assumed problem.
Assess consistency across sources.
Return confidence score 0-95% (never 100%).
"""

# Backend/prompts/positioning.py
SYSTEM_PROMPT = """
You are analyzing research data for positioning discovery.
Identify value drivers mentioned by customers.
Rank by frequency of mention.
Suggest alternative positioning angles.
"""

# Backend/services/analysis.py
def run_analysis(project, data_sources, objective):
    # 1. Gather data + context
    research_text = aggregate_data_sources(data_sources)
    existing_insights = get_existing_insights(project)
    
    # 2. Call Claude with objective-specific prompt
    prompt = get_prompt_for_objective(objective)
    response = claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[
            {"role": "user", "content": f"{prompt}\n\n{research_text}"}
        ]
    )
    
    # 3. Parse response, extract insights + confidence
    insights = parse_insights(response.content, research_text)
    contradictions = detect_contradictions(insights, existing_insights)
    gaps = identify_data_gaps(insights, objective)
    confidence = calculate_confidence(objective, insights, gaps)
    
    # 4. Store in DB
    analysis = Analysis(
        project_id=project.id,
        objective=objective,
        confidence_score=confidence,
        raw_response=response.content,
        tokens_used=response.usage.input_tokens + response.usage.output_tokens
    )
    save_analysis(analysis)
    
    # 5. Generate recommendations
    next_steps = generate_next_steps(analysis)
    
    return {
        "analysis": analysis,
        "insights": insights,
        "contradictions": contradictions,
        "gaps": gaps,
        "next_steps": next_steps
    }
```

---

## Docker Setup (Copy-Paste Ready)

**File: docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: discovery_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: discovery_app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: discovery_minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: discovery_backend
    environment:
      DATABASE_URL: postgresql://postgres:password123@postgres:5432/discovery_app
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
      AWS_REGION: us-east-1
      AWS_ACCESS_KEY_ID: minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin
      S3_ENDPOINT_URL: http://minio:9000
      S3_BUCKET_NAME: discovery-app
      SECRET_KEY: dev-secret-key-change-in-production
      ENVIRONMENT: development
      CORS_ORIGINS: http://localhost:3000,http://localhost:5173
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: discovery_frontend
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
    depends_on:
      - backend

volumes:
  postgres_data:
  minio_data:
```

**File: .env.local**
```bash
CLAUDE_API_KEY=sk-ant-YOUR-KEY-HERE
```

**File: backend/Dockerfile**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Run migrations & start app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**File: frontend/Dockerfile.dev**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000 5173

CMD ["npm", "run", "dev"]
```

---

## Quick Start for Developer

```bash
# 1. Install Docker Desktop (if not already done)
brew install --cask docker

# 2. Create docker-compose.yml, .env.local, Dockerfiles (^ above)

# 3. Start everything
docker-compose up -d

# 4. Initialize database
docker-compose exec backend alembic upgrade head

# 5. Create MinIO bucket
docker-compose exec minio mc mb minio/discovery-app

# 6. Access
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
# MinIO: http://localhost:9001 (user/pass: minioadmin)
```

---

## Testing Strategy (Phased)

### Week 1-2: Manual API Testing
- Use `/docs` (Swagger UI at `http://localhost:8000/docs`)
- Test all CRUD endpoints manually
- Postman collection (optional)

### Week 3-4: Integration Testing
- Test Claude API integration (verify prompts work)
- Test analysis pipeline (data → Claude → storage)
- Test artifact generation

### Final: E2E Testing
- Full workflow: login → create client → upload data → analyze → download

---

## Environment Variables (Summary)

```
# Database
DATABASE_URL=postgresql://postgres:password123@postgres:5432/discovery_app

CLAUDE_MODEL=claude-3-5-sonnet-20241022  # Configurable; allows model updates
# Claude API
CLAUDE_API_KEY=sk-ant-xxx

# S3 / MinIO
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT_URL=http://minio:9000  (dev) or https://s3.amazonaws.com (prod)
S3_BUCKET_NAME=discovery-app

# Security
SECRET_KEY=generate-random-32-char-string
ENVIRONMENT=development

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=DEBUG
```

---

## Success Criteria (MVP Complete)

✅ User can sign up, login, logout  
✅ User can create clients + projects  
✅ User can upload research data (paste, file, batch)  
✅ Claude integrates: sends data, gets analysis results  
✅ Confidence scores calculated (4 objectives)  
✅ Next-step recommendations generated  
✅ Artifacts downloadable (.md + metadata)  
✅ Dashboard shows all clients + projects with confidence  
✅ All data cited (file + line number)  
✅ Audit logging enabled  
✅ Docker Compose works (zero manual setup)  
✅ Works on macOS (tested locally)  

---

## Reference Documents

- **Features:** [02-feature-specification.md](02-feature-specification.md)
- **Architecture:** [01-data-model-and-architecture.md](01-data-model-and-architecture.md)
- **Hosting:** [03-hosting-and-infrastructure.md](03-hosting-and-infrastructure.md)

---

**Ready to build. Questions?**
