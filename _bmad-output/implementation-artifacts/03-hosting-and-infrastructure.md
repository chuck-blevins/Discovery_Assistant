# Hosting & Infrastructure Requirements

**Date:** February 17, 2026  
**Purpose:** Hosting provider selection and infrastructure planning  
**Status:** Ready for hosting evaluation  

---

## Executive Summary

Discovery App is a lightweight SaaS application with moderate compute needs (Claude API calls are remote). **For development: Free local Docker setup** (FastAPI + PostgreSQL + MinIO in containers). **For production (later): Cloud hosting** (Render, Railway, or AWS). This doc covers both phases.

**Development Phase (NOW - FREE):** Docker Compose locally  
**Production Phase (Phase 2+):** Render, Railway, or AWS ECS

---

## DEVELOPMENT PHASE (FREE - LOCAL DOCKER)

### Overview

Run everything locally in Docker containers using Docker Compose. Zero cost, full control, same architecture as production.

```
┌─────────────────────────────────────────────────────┐
│              YOUR MACHINE (macOS)                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Docker Desktop (installed once - free)    │   │
│  │                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │  FastAPI     │  │ PostgreSQL   │       │   │
│  │  │  Container   │  │ Container    │       │   │
│  │  │              │  │              │       │   │
│  │  │ Port 8000    │  │ Port 5432    │       │   │
│  │  └──────────────┘  └──────────────┘       │   │
│  │                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │   MinIO      │  │   React Dev  │       │   │
│  │  │ (S3-compat)  │  │   Server     │       │   │
│  │  │              │  │              │       │   │
│  │  │ Port 9000    │  │ Port 3000    │       │   │
│  │  └──────────────┘  └──────────────┘       │   │
│  │                                            │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  docker-compose.yml (one file controls all)       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### What You'll Need

1. **Docker Desktop** (~2 GB disk, free)
   - macOS: Download from docker.com
   - Includes Docker Engine + Docker Compose

2. **Git repository** with code structure:
   ```
   discovery_app/
   ├── backend/                 (FastAPI app)
   ├── frontend/                (React app)
   ├── docker-compose.yml       (one file runs everything)
   ├── Dockerfile.backend       (backend image)
   ├── Dockerfile.frontend      (frontend image - optional)
   └── .env.local               (local secrets)
   ```

3. **Claude API key** (from Anthropic - free to get, pay-per-call)

### Local Development Setup

**Step 1: Install Docker Desktop**
```bash
# macOS: Download from https://www.docker.com/products/docker-desktop
# Or via Homebrew:
brew install --cask docker
```

**Step 2: Create docker-compose.yml**
```yaml
version: '3.8'

services:
  # PostgreSQL Database
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

  # MinIO (S3-compatible file storage)
  minio:
    image: minio/minio:latest
    container_name: discovery_minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"  # MinIO console
    volumes:
      - minio_data:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: discovery_backend
    environment:
      # Database
      DATABASE_URL: postgresql://postgres:password123@postgres:5432/discovery_app
      
      # Claude API
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}  # From .env.local
      
      # MinIO / S3
      AWS_REGION: us-east-1
      AWS_ACCESS_KEY_ID: minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin
      S3_ENDPOINT_URL: http://minio:9000
      S3_BUCKET_NAME: discovery-app
      
      # Security
      SECRET_KEY: dev-secret-key-change-in-production
      ENVIRONMENT: development
      CORS_ORIGINS: http://localhost:3000,http://localhost:5173
      
      # Logging
      LOG_LEVEL: DEBUG
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app  # Hot reload: changes apply immediately
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  # React Frontend (Development Server)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: discovery_frontend
    environment:
      VITE_API_URL: http://localhost:8000
      VITE_ENVIRONMENT: development
    ports:
      - "3000:3000"
      - "5173:5173"  # Vite default port
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

**Step 3: Create .env.local (in project root)**
```bash
# .env.local - DO NOT COMMIT TO GIT
CLAUDE_API_KEY=sk-ant-your-actual-key-here
ENVIRONMENT=development
```

**Step 4: Run everything**
```bash
# Start all containers (backend, DB, file storage, frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v
```

### Local Access URLs

```
Frontend (React):        http://localhost:3000
Backend API:             http://localhost:8000
API Docs (Swagger):      http://localhost:8000/docs
MinIO Console (uploads): http://localhost:9001
PostgreSQL:              localhost:5432
```

### Database Management (Local)

**Run migrations:**
```bash
# Inside backend container
docker-compose exec backend alembic upgrade head
```

**Access database via psql:**
```bash
# Connect to PostgreSQL container
docker-compose exec postgres psql -U postgres -d discovery_app

# Useful commands:
\dt              # List all tables
\d users         # Describe 'users' table
SELECT * FROM users;  # Query
```

**Reset database (fresh start):**
```bash
docker-compose down -v  # Remove all data
docker-compose up -d    # Restart with clean DB
docker-compose exec backend alembic upgrade head
```

### Local File Storage (MinIO)

MinIO is a local S3-compatible service. Use it exactly like AWS S3, but it's free and running locally.

**Access MinIO console:**
```
URL: http://localhost:9001
Username: minioadmin
Password: minioadmin
```

**Create bucket (one time):**
```bash
# Use MinIO console OR via CLI:
docker-compose exec minio \
  mc mb minio/discovery-app
```

Your backend code treats MinIO identically to S3:
```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://minio:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    region_name='us-east-1'
)

# Upload file
s3.upload_file('file.txt', 'discovery-app', 'uploads/file.txt')

# Download file
s3.download_file('discovery-app', 'uploads/file.txt', 'local_file.txt')
```

### Development Workflow

**Typical day:**
```bash
# Morning: Start everything
docker-compose up -d

# Code: Edit files (hot reload active)
# - Backend changes auto-reload (uvicorn --reload)
# - Frontend changes auto-reload (Vite HMR)

# Test: Access via browser + API
# - Frontend: http://localhost:3000
# - API: http://localhost:8000/docs

# Debugging: View logs
docker-compose logs -f backend   # See backend errors
docker-compose logs -f frontend  # See frontend errors

# Evening: Stop containers
docker-compose down  # Data persists (stays in volumes/)
```

### Troubleshooting Local Setup

**Container won't start:**
```bash
# View error logs
docker-compose logs backend

# Rebuild container (if Dockerfile changed)
docker-compose up -d --build
```

**Port already in use:**
```bash
# Change docker-compose.yml port (first number):
ports:
  - "8001:8000"  # Use 8001 instead of 8000
```

**Database connection fails:**
```bash
# Ensure postgres is healthy:
docker-compose ps  # View status

# Restart postgres:
docker-compose restart postgres
```

**Need to clear everything and start fresh:**
```bash
docker-compose down -v  # Remove all containers + data
docker-compose up -d    # Fresh start
```

---

## DEVELOPMENT COST

**LOCAL DEVELOPMENT: $0/month**

All services free:
- Docker Desktop: Free
- PostgreSQL: Free (open-source)
- MinIO: Free (open-source)
- FastAPI: Free (open-source)
- React: Free (open-source)
- Claude API: Only pay for actual calls (~$0-5/month during testing)

**Total: $0 (plus Claude API usage)**

---

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + TypeScript + Tailwind CSS | Deployed as static site (Vercel, Netlify, or bundled) |
| Backend | FastAPI (Python 3.11+) + SQLAlchemy ORM | Async-native; Claude SDK native Python support |
| Database | PostgreSQL 14+ | Relational; supports JSON fields for flexibility |
| File Storage | S3-compatible (AWS S3, MinIO, or local mount) | For uploaded research data |
| Task Queue | Celery + Redis (Phase 2+) | For long-running analysis jobs |
| Deployment | Docker (containerized) | Single container for MVP |
| Secrets | Environment variables (.env) | Managed by hosting provider |

---

## Compute Requirements

### MVP (Single User, 8-12 Hours Daily Usage)

**Backend Container:**
- CPU: 0.5-1 vCPU (shared CPU sufficient)
- RAM: 512 MB - 1 GB
- Disk: Stateless (no persistent storage needed on instance)
- Bandwidth: ~100 MB/month (analysis results + metadata)

**Database (PostgreSQL):**
- Storage: 10-50 GB (generous for MVP)
  - User data: ~1 MB
  - Clients: ~100 KB
  - Projects: ~500 KB
  - Data sources: 10-100 MB (stored text from uploads)
  - Analysis results: 5-50 MB (growing over time)
  - Audit logs: 1-10 MB
- Connections: 5-10 concurrent connections
- Compute: Small instance (512 MB - 1 GB RAM)

**File Storage (S3-compatible):**
- Storage: 1-10 GB initially
  - Uploaded research files: ~500 KB per client project
  - Estimated: 10-20 clients × 5-10 projects each = 500 MB - 2 GB
  - Growth: ~100 MB/month as you add clients
- Requests/month: ~1,000-5,000 PUT/GET operations
- Cost: ~$0.50-$5/month (minimal)

**Frontend:**
- Static hosting (CDN): 10-50 MB (bundled React app)
- Bandwidth: 1-10 GB/month (usage-dependent)
- Cost: Free - $20/month depending on bandwidth

---

## Hosting Option Comparison

### Option A: Render (RECOMMENDED for MVP)

**Why:** Simplest, integrated, free tier available, perfect for single-developer projects.

**Setup:**
- Backend: Node via Docker or Python Web Service
  - Starter tier: $7-12/month (0.5 vCPU, 512 MB RAM)
  - Up to 750 free tier hours/month (eligible if new account + credit card)
- Database: PostgreSQL
  - Starter tier: $7/month (512 MB RAM, 10 GB storage)
- Frontend: Static Site
  - Free tier (or $5/month pro)
- File Storage: AWS S3 (separate, ~$1-5/month)
- Total cost: **$15-22/month** (after free tier)

**Pros:**
- One-click deployment from GitHub
- Built-in PostgreSQL hosting
- Environment variables UI
- Simple secrets management
- No credit card required for free tier

**Cons:**
- Limited to Render's regions (less control)
- Slightly pricier than alternatives at scale

**Connection String Example:**
```
DATABASE_URL=postgresql://user:password@db.render.com:5432/discovery_app_db
```

---

### Option B: Railway

**Why:** Developer-friendly, pay-as-you-go, good for side projects.

**Setup:**
- Backend: Docker container
  - Usage-based: ~$5-15/month (0.5-1 vCPU, 1 GB RAM)
- Database: PostgreSQL
  - Usage-based: ~$3-10/month
- File Storage: AWS S3 (separate, ~$1-5/month)
- Total cost: **$10-30/month**

**Pros:**
- Generous free tier ($5/month credit)
- GitHub integration
- Real-time logs
- Simple deployment

**Cons:**
- Usage-based pricing (costs less predictable)
- Smaller community than Render

**Connection String:**
```
DATABASE_URL=postgresql://postgres:password@service.railway.internal:5432/discovery_app
```

---

### Option C: AWS ECS + RDS + S3 (SCALE LATER)

**Why:** Most control, scales to millions of users, but complex for MVP.

**Setup:**
- Backend: ECS Fargate
  - CPU: 0.25 vCPU (burstable)
  - Memory: 512 MB
  - Cost: ~$5-10/month
- Database: AWS RDS PostgreSQL
  - db.t3.micro (eligible for free tier first 12 months): $0
  - Then: ~$10-20/month
- File Storage: S3
  - ~$1-5/month (minimal)
- Frontend: CloudFront + S3
  - ~$5-20/month (depends on bandwidth)
- ALB (Application Load Balancer): ~$15/month
- Total cost: **$30-55/month** (or $15-25 with free tier)

**Pros:**
- Maximum control & scalability
- Free tier (first 12 months for RDS, Lambda, etc.)
- Excellent for production
- Global regions available

**Cons:**
- Significant setup complexity
- More moving parts to manage
- Overkill for MVP (use later if user base grows)

**Connection String:**
```
DATABASE_URL=postgresql://postgres:password@discovery-app.xxxxxx.us-east-1.rds.amazonaws.com:5432/discovery_db
```

---

### Option D: Heroku (NOT RECOMMENDED - ECO PLAN DISCONTINUED)

**Status:** Heroku's free tier and Eco plan (cheap option) have been retired. Paid plans start at $50/month for production. **Not cost-effective for MVP.**

---

## Recommended Choice: RENDER (MVP Phase)

**Rationale:**
1. Lowest barrier to entry
2. Simplest deployment (GitHub integration)
3. Built-in PostgreSQL (no separate service)
4. Affordable ($15-20/month all-in)
5. Easy to migrate to AWS later if needed

**Render Setup Checklist:**

```
☐ Create Render account (render.com)
☐ Connect GitHub repository
☐ Create PostgreSQL database (Render)
☐ Deploy FastAPI backend as Web Service
  - Build command: pip install -r requirements.txt
  - Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
  - Environment variables:
    - DATABASE_URL (from PostgreSQL service)
    - CLAUDE_API_KEY (from Anthropic)
    - AWS_REGION=us-east-1 (if using S3)
    - AWS_ACCESS_KEY_ID (if using S3)
    - AWS_SECRET_ACCESS_KEY (if using S3)
    - ENVIRONMENT=production
    - SECRET_KEY (Django/FastAPI session key)

☐ Deploy React frontend to Vercel or Netlify
  - OR bundle and serve from backend (easier)
  
☐ Configure S3 bucket (AWS)
  - Create S3 bucket: discovery-app-data-{user-id}
  - Set region: us-east-1 (cheapest)
  - Create IAM user with S3 access only
  - Generate access key + secret key
  - Add to backend environment variables

☐ Test end-to-end
  - Health check: GET https://backend.onrender.com/health
  - Auth: POST /auth/login
  - Upload: POST /projects/{id}/data-sources
  - Analyze: POST /projects/{id}/analyze
```

---

## Claude API Integration Costs

Discovery App makes Claude API calls for analysis. This is the primary **variable cost**.

### Claude 3.5 Sonnet Pricing (Current)

Per call costs (roughly):
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

**Typical Discovery App Analysis Call:**
- Input tokens: ~2,000 tokens (prompt + research data + context)
- Output tokens: ~1,500 tokens (analysis results)
- Cost per call: ~$0.01-0.03

**Usage Patterns:**

**Conservative (Chuck's expected usage):**
- Projects per client: 4 (problem, positioning, persona, ICP)
- Clients: 5-10
- Analyses per project: 3-5 (iterative as data added)
- Total analyses/month: 60-200
- Claude cost/month: **$0.60-$6.00**

**Moderate (Scaling to 20 users):**
- Analyses/day: 50-100
- Claude cost/month: **$15-30**

**Heavy (Scaling to 100+ users):**
- Analyses/day: 500+
- Claude cost/month: **$150-300**

**Note:** For MVP, Claude costs are negligible. At scale (10+ concurrent users), Claude becomes the dominant cost.

---

## Architecture Diagram: Hosting Layout

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                   (React SPA - Static HTML/JS)              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
         ┌───────────────┴────────────────┐
         │                                │
    ┌────▼────┐                    ┌─────▼──────┐
    │ Redirect │                    │  Frontend  │
    │ Service  │                    │  (Render   │
    │(Render)  │                    │   Static)  │
    └────┬─────┘                    └────────────┘
         │
    ┌────▼─────────────────────────────────────┐
    │   RENDER (or Railway / AWS ECS)          │
    │  ┌────────────────────────────────────┐  │
    │  │  FastAPI Backend Container         │  │
    │  │  (Python 3.11, FastAPI, SQLAlchemy)│ │
    │  │                                    │  │
    │  │  - Authentication                  │  │
    │  │  - Client/Project CRUD             │  │
    │  │  - Data import                     │  │
    │  │  - Claude API calls                │  │
    │  │  - Analysis execution              │  │
    │  │  - Audit logging                   │  │
    │  │                                    │  │
    │  │  Runs on: 0.5-1 vCPU, 512MB-1GB   │  │
    │  └────────────────────────────────────┘  │
    └────┬──────────────────────────────────────┘
         │ TCP/5432
    ┌────▼──────────────────────┐
    │   PostgreSQL Database      │
    │   (RDS / Render managed)   │
    │                            │
    │   - Users                  │
    │   - Clients                │
    │   - Projects               │
    │   - Data Sources           │
    │   - Analyses               │
    │   - Insights               │
    │   - Personas               │
    │   - ICPs                   │
    │   - Audit Logs             │
    │                            │
    │   Storage: 10-50 GB        │
    │   RAM: 512MB-1GB           │
    └────────────────────────────┘

    ┌────────────────────────────┐
    │   AWS S3 (or MinIO)        │
    │   File Storage             │
    │                            │
    │   - Research uploads       │
    │   - Generated artifacts    │
    │   - Exported personas/ICPs │
    │                            │
    │   Storage: 1-10 GB         │
    │   Cost: ~$1-5/month        │
    └────────────────────────────┘

    ┌────────────────────────────┐
    │   Anthropic Claude API     │
    │   (External service)       │
    │                            │
    │   - Calls: 60-200/month    │
    │   - Cost: $1-6/month       │
    └────────────────────────────┘
```

---

## Hosting Configuration Checklist

### Pre-Deployment (Choose Hosting)

- [ ] Select hosting provider (Render, Railway, or AWS)
- [ ] Create account & link GitHub
- [ ] Determine region (us-east-1 for default)
- [ ] Plan budget ($15-50/month for MVP)

### Backend Service Configuration

**Environment Variables (required):**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/discovery_app

# Claude API
CLAUDE_API_KEY=sk-ant-...

# AWS S3 (or MinIO)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxxx
S3_BUCKET_NAME=discovery-app-data

# Security
SECRET_KEY=generate-random-32-char-string
ENVIRONMENT=production
CORS_ORIGINS=https://yourfrontend.com

# Anthropic API (if needed)
ANTHROPIC_API_URL=https://api.anthropic.com
```

**Build Command:**
```bash
pip install -r requirements.txt
alembic upgrade head  # Run database migrations
```

**Start Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Health Check:**
```
GET /health → 200 OK
```

### Database Configuration

- **Engine:** PostgreSQL 14+
- **Host:** Managed by Render/Railway/AWS
- **Port:** 5432
- **Initial setup:** Run Alembic migrations on first deployment
- **Backups:** Enable automated backups (daily)

### File Storage Configuration

**Option 1: AWS S3**
- Create S3 bucket (e.g., `discovery-app-data-{user-id}`)
- Create IAM user with S3-only permissions
- Add access key + secret to environment variables
- Bucket structure: `/data/{client_id}/{project_id}/{data_source_id}/`
- Cost: ~$0.50-5/month

**Option 2: MinIO (self-hosted)**
- Deploy MinIO on same infrastructure (more complex)
- Use local storage if single-server MVP
- Recommended: Start with AWS S3

### Frontend Deployment

**Option 1: Separate Hosting (Recommended)**
```
Deploy React app to Vercel, Netlify, or AWS CloudFront
- Build: npm run build
- Output directory: dist/ or build/
- Environment: Backend API URL
```

**Option 2: Backend-served (Simpler)**
```
Build React → Copy dist/ to backend/public/
Served by FastAPI: app.mount("/", StaticFiles(...))
```

---

## Cost Estimation (Monthly)

### MVP Phase (Single User)

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| Backend | Render Web Service | $7-12 | Shared CPU, 512MB RAM |
| Database | Render PostgreSQL | $7 | 512MB, 10GB storage |
| Frontend | Vercel Static | Free-5 | Next.js or React |
| File Storage | AWS S3 | $1-5 | 1-10 GB, minimal requests |
| Claude API | Anthropic | $1-6 | 60-200 analyses/month |
| **Total** | | **$16-28/month** | After free tier credits |

### Scale to 10 Concurrent Users (Phase 2)

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| Backend | Render Web Service | $20-40 | Dedicated CPU, 1-2 GB RAM |
| Database | Render PostgreSQL | $20-50 | 2GB RAM, 50GB storage |
| Frontend | Vercel | $20-50 | Higher bandwidth |
| File Storage | AWS S3 | $10-20 | 10-50 GB, more requests |
| Claude API | Anthropic | $15-30 | 500-1000 analyses/month |
| Caching (Redis) | Render or AWS | $5-15 | Task queue (Phase 2) |
| **Total** | | **$90-205/month** | Production-grade |

### Scale to 100+ Users (Phase 3)

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| Backend | AWS ECS / Kubernetes | $100-300 | Auto-scale 5-20 instances |
| Database | AWS RDS PostgreSQL | $50-200 | 8GB+ RAM, replication |
| Frontend | CloudFront | $50-200 | Global CDN |
| File Storage | AWS S3 | $50-200 | 100+ GB, high throughput |
| Claude API | Anthropic | $200-1000 | 10K+ analyses/month |
| Other (queue, cache) | Redis, monitoring | $50-100 | Infrastructure |
| **Total** | | **$500-2000/month** | Enterprise-grade |

---

## Migration Path (Hosting Upgrade)

### Phase 1-2: Render (MVP to 10 users)
```
Render → Simple, integrated, cost-effective
Perfect for: Single developer, quick iteration
When to upgrade: User base grows or database exceeds 50GB
```

### Phase 2-3: AWS (10-100 users)
```
AWS ECS → Maximum control, scales to millions
Perfect for: Growing product, teams, advanced features
Migration: Export Render PostgreSQL dump → AWS RDS
Effort: 2-4 weeks (re-architecture, testing)
```

### Optional: Kubernetes (100+ users)
```
EKS or managed K8s → When you need global distribution
Not needed for MVP
```

---

## Security Checklist

- [ ] HTTPS only (handled by Render/Railway/AWS)
- [ ] Secrets in environment variables (not in code)
- [ ] PostgreSQL with strong passwords
- [ ] S3 bucket with restricted IAM policy (backend only)
- [ ] Claude API key rotated periodically
- [ ] Audit logging enabled (for compliance)
- [ ] Database backups automated
- [ ] Rate limiting on API endpoints
- [ ] CORS configured (frontend domain only)
- [ ] Input validation on all endpoints

---

## Deployment Checklist (First Deploy)

1. **Prepare repository:**
   ```
   ☐ Dockerfile (Python 3.11, FastAPI)
   ☐ requirements.txt (dependencies)
   ☐ .env.example (template, no secrets)
   ☐ Alembic migrations (database schema)
   ☐ README with deployment instructions
   ```

2. **Create hosting accounts:**
   ```
   ☐ Render account (render.com)
   ☐ AWS account (for S3 + IAM)
   ☐ Anthropic account (Claude API key)
   ```

3. **Configure services:**
   ```
   ☐ PostgreSQL instance on Render
   ☐ FastAPI backend service on Render
   ☐ S3 bucket + IAM user on AWS
   ☐ Environment variables in Render dashboard
   ☐ Database migrations run (alembic upgrade head)
   ```

4. **Deploy frontend:**
   ```
   ☐ Build React app locally
   ☐ Deploy to Vercel/Netlify OR bundle with backend
   ☐ Configure API endpoint (backend URL)
   ```

5. **Test end-to-end:**
   ```
   ☐ Health check: Backend responds
   ☐ Login: Create user, login works
   ☐ Client creation: Can create client
   ☐ Data upload: Can upload and parse files
   ☐ Analysis: Claude API call succeeds
   ☐ Download: Can download artifacts
   ```

6. **Post-deployment:**
   ```
   ☐ Monitor logs (Render dashboard)
   ☐ Set up error alerts (Sentry, Rollbar)
   ☐ Enable database backups
   ☐ Document deployment process
   ```

---

## Summary for BMAD Agent Brief

**What to tell your developer / BMAD agent:**

> **DEVELOPMENT (NOW):** Free local Docker
> ```
> docker-compose up -d
> 
> Environment: localhost
> - Frontend:     http://localhost:3000
> - Backend API:  http://localhost:8000
> - Database:     localhost:5432
> - File storage: MinIO @ localhost:9001
> 
> Cost: $0/month (all open-source)
> Time to setup: 30 minutes (install Docker, run docker-compose)
> ```
>
> **PRODUCTION (LATER):** Cloud + CDN
> ```
> Frontend:  Cloudflare Pages
> Backend:   Render Web Service
> Database:  Render PostgreSQL
> Storage:   AWS S3
> CDN:       Cloudflare Worker (caching)
> 
> Cost: $16-30/month
> Time to migrate: 2-4 hours (one-time)
> ```
>
> **Tech Stack (Same for Both):**
> - Backend: FastAPI, SQLAlchemy, Pydantic (Python 3.11)
> - Frontend: React 18, TypeScript, Tailwind CSS
> - Database: PostgreSQL 14+
> - File storage: MinIO (dev) / AWS S3 (prod)
> - Deployment: Docker Compose (dev) / Render + Cloudflare (prod)
>
> **Environment Variables (Both Environments):**
> ```
> DATABASE_URL=postgresql://...
> CLAUDE_API_KEY=sk-ant-...
> AWS_ACCESS_KEY_ID=...
> AWS_SECRET_ACCESS_KEY=...
> S3_BUCKET_NAME=discovery-app
> S3_ENDPOINT_URL=http://minio:9000 (dev) or https://s3.amazonaws.com (prod)
> SECRET_KEY=generate-random-32-char-string
> ENVIRONMENT=development or production
> ```
>
> **Docker Files Needed:**
> - `docker-compose.yml` (controls all services)
> - `backend/Dockerfile` (FastAPI container)
> - `frontend/Dockerfile.dev` (React dev server - optional)
> - `.env.local` (local secrets - DO NOT COMMIT)
>
> **First run:** `docker-compose up -d` → everything starts  
> **Hot reload:** Code changes auto-reload (backend + frontend)  
> **Debugging:** `docker-compose logs -f backend`  
> **Deploy to prod:** git push → Render auto-deploys"

---

## Quick Start for Developer

**Hand this to your builder:**

1. **Install Docker Desktop** (free)
   ```bash
   # macOS
   brew install --cask docker
   ```

2. **Clone repo, create docker-compose.yml** (see section above)

3. **Create .env.local:**
   ```bash
   CLAUDE_API_KEY=sk-ant-your-key
   ```

4. **Run it:**
   ```bash
   docker-compose up -d
   ```

5. **Access:**
   - Frontend: http://localhost:3000
   - API docs: http://localhost:8000/docs
   - Database: localhost:5432

6. **When done:**
   ```bash
   docker-compose down
   ```

**Zero setup beyond Docker Desktop installation. Everything runs in containers.**

---

**Development environment: READY FOR BUILDER** ✓
