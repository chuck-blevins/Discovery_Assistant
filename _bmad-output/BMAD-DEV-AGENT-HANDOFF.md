# BMAD Dev Agent Handoff: Discovery App MVP Build

**Date:** February 17, 2026  
**To:** BMAD Dev Agent (Amelia)  
**From:** Chuck (Product Owner)  
**Time Estimate:** 4 weeks  
**Budget:** $0 (local Docker development)  

---

## Your Mission

Build a single-user AI-powered discovery consultant SaaS using Claude. The app helps startup founders validate business assumptions against real research data.

**Core Loop:**
```
1. Create client + describe their problem/solution
2. Upload research (interviews, surveys, notes)
3. Click "Analyze" → Claude extracts insights
4. Get confidence score + next-step recommendations
5. Download scripts + persona templates to continue discovery
```

**Success = MVP shipped in 4 weeks, works locally in Docker, ready for cloud deployment later.**

---

## Your Specification (Everything You Need)

**Read these in order:**

1. **START HERE:** [`04-developer-brief.md`](04-developer-brief.md)
   - 4-week sprint plan (weekly acceptance criteria)
   - Docker setup (copy-paste ready)
   - Quick start commands
   - MVP success criteria

2. **Feature Details:** [`02-feature-specification.md`](02-feature-specification.md)
   - All 13 features with acceptance criteria
   - User stories + wireframe descriptions
   - Priority + sprint assignments

3. **Architecture:** [`01-data-model-and-architecture.md`](01-data-model-and-architecture.md)
   - 10 database entities + SQL schemas
   - Tech stack rationale
   - Confidence scoring logic
   - Claude integration patterns

4. **Hosting & Infrastructure:** [`03-hosting-and-infrastructure.md`](03-hosting-and-infrastructure.md)
   - Docker Compose (development)
   - Environment variables
   - Troubleshooting guide

---

## Repository Structure You'll Create

```
discovery_app/
├── backend/
│   ├── main.py                      # FastAPI app entry
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                   # Backend container
│   ├── alembic/                     # Database migrations
│   │   └── versions/
│   │       ├── 001_init_users.py
│   │       ├── 002_init_clients.py
│   │       └── ...
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py             # /auth/* endpoints
│   │   │   ├── clients.py          # /clients/* endpoints
│   │   │   ├── projects.py         # /projects/* endpoints
│   │   │   └── analysis.py         # /analyze endpoints
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── client.py
│   │   │   ├── project.py
│   │   │   ├── analysis.py
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── claude.py           # Claude API integration
│   │   │   ├── analysis.py         # Analysis logic
│   │   │   └── storage.py          # File upload/download
│   │   └── prompts/
│   │       ├── problem_validation.py
│   │       ├── positioning.py
│   │       ├── persona.py
│   │       └── icp.py
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ClientDetailPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   ├── AnalysisPage.tsx
│   │   │   └── ArtifactsPage.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── ClientCard.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── DataUpload.tsx
│   │   │   ├── AnalysisResults.tsx
│   │   │   ├── ConfidenceMeter.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useClients.ts
│   │   │   └── useAnalysis.ts
│   │   └── api/
│   │       └── client.ts           # HTTP client
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile.dev
│
├── docker-compose.yml
├── .env.local                       # Your local secrets (DO NOT COMMIT)
└── README.md
```

---

## Stack Overview

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript + Tailwind CSS | Modern, responsive, great DX |
| Backend | FastAPI (Python 3.11) | Native Claude SDK, async, simple |
| Database | PostgreSQL 14+ | Relational, ACID, JSON fields |
| File Storage | MinIO (dev) / S3 (prod) | S3-compatible, free locally |
| AI | Claude 3.5 Sonnet via Anthropic API | Best cost/quality/latency balance |
| Deployment | Docker Compose (dev) | Zero-setup local development |

---

## Critical Non-Negotiables for MVP

✅ **Authentication:** JWT-based, 30-day remember-me, logout works  
✅ **Citations:** Every insight includes file + line number (critical for eval)  
✅ **Confidence:** 0-95% max (never 100%), staleness decay (-5%/month)  
✅ **Cost Tracking:** Show tokens + $ spent per analysis  
✅ **Audit Logging:** Every action logged (user, action, timestamp, details)  
✅ **4 Objectives:** Problem validation, positioning, persona, ICP — all distinct  
✅ **Artifacts:** Downloadable interview scripts, templates, summaries (.md format)  
✅ **Next Steps:** Auto-generated recommendations based on confidence + objective  
✅ **Docker:** Single `docker-compose up -d` starts everything  
✅ **Manual Editing:** Users export to .md, edit externally, re-import (no inline editor)  

---

## Weekly Milestones

### Week 1: Foundation
- [ ] FastAPI server runs locally
- [ ] PostgreSQL initialized
- [ ] User signup/login/logout works
- [ ] JWT sessions persist
- [ ] `/health` endpoint returns 200 OK
- [ ] Docker Compose works: `docker-compose up -d` starts all services

### Week 2: Core CRUD
- [ ] Create/read/edit/delete clients
- [ ] Create/read/edit/delete projects
- [ ] Dashboard shows clients + projects
- [ ] Click client → detail page
- [ ] Click project → detail page (with no data yet)

### Week 3: Data + Claude
- [ ] File upload (paste, .txt, .csv, .md, batch)
- [ ] MetaData capture (date, creator, purpose, type)
- [ ] Claude API integration (problem validation objective)
- [ ] Confidence scoring (frequency-based for problems)
- [ ] Analysis results stored + displayed
- [ ] Data gaps + contradictions detected

### Week 4: Discovery + Artifacts
- [ ] Positioning objective + analysis
- [ ] Persona objective + field completion tracking
- [ ] ICP objective + per-dimension scoring
- [ ] Next-step recommendations (auto-generated)
- [ ] Artifact generation (scripts, templates, summaries)
- [ ] Download as .md
- [ ] Full E2E workflow tested

---

## Key Files to Create (Backend)

**Core Models (SQLAlchemy):**
```python
# app/models/user.py
class User(Base):
    id: UUID
    email: str (unique)
    password_hash: str
    created_at: datetime
    
# app/models/client.py
class Client(Base):
    id: UUID
    user_id: UUID (FK → users)
    name: str
    market_type: str
    problem_statement: str
    solution_description: str
    market_notes: str
    status: str (active, archived)
    created_at: datetime
    
# app/models/project.py
class Project(Base):
    id: UUID
    client_id: UUID (FK → clients)
    name: str
    objective: str (problem | positioning | persona | icp)
    target_segments: str (JSON or text)
    status: str (in_progress, complete, paused)
    created_at: datetime
    
# app/models/analysis.py
class Analysis(Base):
    id: UUID
    project_id: UUID (FK → projects)
    objective: str
    confidence_score: int (0-95)
    summary: str
    raw_response: str (full Claude response)
    tokens_used: int
    cost_usd: float
    created_at: datetime
    
# app/models/insight.py
class Insight(Base):
    id: UUID
    analysis_id: UUID (FK → analyses)
    type: str (evidence, gap, contradiction, value_driver, etc.)
    text: str
    citation_file: str
    citation_line: int
    confidence: float (0-1)
    source_count: int (# sources mentioning)
```

**Key API Routes:**
```python
# app/api/auth.py
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
GET    /auth/validate

# app/api/clients.py
POST   /clients
GET    /clients
GET    /clients/{id}
PUT    /clients/{id}
PATCH  /clients/{id}

# app/api/projects.py
POST   /clients/{id}/projects
GET    /clients/{id}/projects
GET    /projects/{id}
PUT    /projects/{id}
PATCH  /projects/{id}

# app/api/analysis.py
POST   /projects/{id}/data-sources
GET    /projects/{id}/data-sources
GET    /data-sources/{id}/preview
DELETE /data-sources/{id}
POST   /projects/{id}/analyze
GET    /projects/{id}/analyses
GET    /analyses/{id}

# app/api/artifacts.py
GET    /projects/{id}/artifacts
GET    /artifacts/{id}/download
```

**Claude Integration (Key Function):**
```python
# app/services/claude.py
async def run_analysis(
    project: Project,
    objective: str,
    data_sources: List[DataSource]
) -> Analysis:
    """
    1. Aggregate data from all sources
    2. Call Claude with objective-specific prompt
    3. Parse response for insights
    4. Calculate confidence (objective-specific logic)
    5. Detect contradictions
    6. Identify data gaps
    7. Generate next-step recommendations
    8. Store in database
    """
```

---

## Environment Setup (Copy to .env.local)

```bash
# Database
DATABASE_URL=postgresql://postgres:password123@postgres:5432/discovery_app

# Claude API (sign up at https://console.anthropic.com)
CLAUDE_API_KEY=sk-ant-YOUR-KEY-HERE

# S3 / MinIO (local dev)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT_URL=http://minio:9000
S3_BUCKET_NAME=discovery-app

# Security
SECRET_KEY=YOUR-RANDOM-32-CHAR-STRING
ENVIRONMENT=development

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=DEBUG
```

---

## Testing Before You Ship

### Manual API Testing (Week 1-3)
```bash
# Access Swagger UI
http://localhost:8000/docs

# Test auth
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chuck@example.com","password":"password"}'

# Test client creation
curl -X POST http://localhost:8000/clients \
  -H "Authorization: Bearer YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Startup X","market_type":"SaaS","problem_statement":"..."}'
```

### Integration Testing (Week 4)
- Full user flow: Signup → Create client → Upload data → Analyze → Download artifacts
- Verify Claude API calls work
- Check confidence scores are reasonable
- Ensure citations are accurate

### Docker Testing
```bash
# Verify everything starts cleanly
docker-compose down -v
docker-compose up -d
# All 4 services should be healthy within 30s
docker-compose ps
```

---

## Debugging Checklist

If something breaks:

1. **Backend not starting?**
   ```bash
   docker-compose logs backend
   docker-compose restart backend
   ```

2. **Database errors?**
   ```bash
   docker-compose exec postgres psql -U postgres -d discovery_app
   # Check if tables exist: \dt
   ```

3. **Claude API failing?**
   - Check `CLAUDE_API_KEY` in `.env.local`
   - Verify API key is valid at https://console.anthropic.com
   - Check token usage on Anthropic dashboard

4. **File upload to MinIO failing?**
   ```bash
   docker-compose exec minio mc ls minio/discovery-app
   ```

---

## Hand-Off Checklist

All specifications complete:
- ✅ Feature Specification (13 features, all with acceptance criteria)
- ✅ Data Model & Architecture (10 entities, SQL schemas, confidence logic)
- ✅ Hosting & Infrastructure (Docker Compose, environment setup)
- ✅ Developer Brief (4-week sprint, copy-paste Dockerfiles, API examples)

You have:
- ✅ Full wireframe descriptions (reference `02-feature-specification.md`)
- ✅ API response examples (in `04-developer-brief.md`)
- ✅ Claude integration pseudocode (in `04-developer-brief.md`)
- ✅ Database schema (in `01-data-model-and-architecture.md`)
- ✅ Confidence scoring logic (in `01-data-model-and-architecture.md`)
- ✅ Copy-paste docker-compose.yml, Dockerfile, .env template

---

## Questions for You (Before You Start)

- Do you have a Claude API key? (Get one at https://console.anthropic.com, free to sign up)
- Is Docker Desktop installed on your machine?
- Should I create a full project skeleton (directory structure) or do you want to scaffold it yourself?

---

## Success Looks Like

When you're done:
```bash
# Clone repo
cd discovery_app

# Create .env.local with your Claude API key
echo "CLAUDE_API_KEY=sk-ant-..." > .env.local

# Start everything
docker-compose up -d

# After 30 seconds, all services healthy:
docker-compose ps
# All should say "running" or "healthy"

# Access the app
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs

# You can:
# - Sign up with email/password
# - Create a client
# - Create a project
# - Upload research
# - Click "Analyze" → Claude runs
# - Download interview scripts
```

---

## What's NOT in MVP (Phase 2+)

- Inline persona editor (users export/re-import instead)
- Multi-user collaboration
- Slack integration
- Advanced filtering/search
- PDF export (markdown only)
- Email notifications
- Mobile app
- Team billing

---

## Next Steps

1. **You:** Get Claude API key (https://console.anthropic.com)
2. **You:** Install Docker Desktop (if not done)
3. **You:** Create `.env.local` with `CLAUDE_API_KEY`
4. **Dev Agent:** Read `04-developer-brief.md` → start Week 1
5. **Dev Agent:** Build backend + database (Week 1)
6. **Dev Agent:** Build CRUD + dashboard (Week 2)
7. **Dev Agent:** Integrate Claude + analysis (Week 3)
8. **Dev Agent:** Complete all 4 objectives + artifacts (Week 4)
9. **You:** Test end-to-end
10. **You:** Ready to deploy to cloud (using `03-hosting-and-infrastructure.md`)

---

## Reference

All documents in `/implementation-artifacts/`:
- `01-data-model-and-architecture.md` — Full schema + tech decisions
- `02-feature-specification.md` — Feature details + wireframes
- `03-hosting-and-infrastructure.md` — Docker + cloud deployment
- `04-developer-brief.md` — This week's sprint plan

**Questions? Check the docs. Missing something? Ask before you start.**

---

**Ready to build. Let's ship this MVP in 4 weeks. 🚀**
