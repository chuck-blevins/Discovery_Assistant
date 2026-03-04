# Discovery Assistant

An AI-powered product discovery platform for managing clients through ICP definition, persona buildout, positioning, and general discovery research — built for consulting workflows.

**[User Guide →](docs/user-guide.md)**

---

## Context

This application was built by Chuck Blevins for use in his product consulting practice, **Chuck Blevins Consulting**, to manage multiple clients and track their progress across the core discovery phases: Ideal Customer Profile (ICP), buyer persona development, positioning, and general product discovery.

Most existing tools in this space are pure discovery services that are expensive, SaaS-locked, or built for large teams. Discovery Assistant was designed from the ground up to serve a solo or small-team consulting workflow — with full ownership of the data, the AI prompts, and the process.

This is the **first application in a planned suite of tools** to automate and manage business services as a Product Consultant. The intent is to progressively build out tooling that removes the administrative and analytical overhead of client work, so more time can be spent on strategy and delivery.

### Built as an AI Collaboration Example

This project is also shared as a demonstration of building production software through AI pair programming. The application was designed and developed collaboratively with Claude (Anthropic), and serves as a real-world example of what's achievable when using AI as an active development partner — from architecture and data modeling to UI and prompt engineering.

---

## What It Does

Discovery Assistant organizes client work into a clear hierarchy: **Clients → Projects → Data Sources → Analyses**. You upload or paste discovery research (interview transcripts, survey results, call notes), then run AI-assisted analyses to surface structured insights.

### Core Analysis Types

| Analysis | What It Produces |
| --- | --- |
| **Problem Validation** | Validates assumed problems with frequency, consistency, and strength scores |
| **Positioning Discovery** | Surfaces value drivers and alternative positioning angles |
| **Persona Buildout** | Extracts structured buyer personas from qualitative research |
| **ICP Refinement** | Refines your Ideal Customer Profile across company, industry, and buying dimensions |

### Key Features

- **Multi-client management** — organize work across clients and projects with full data separation
- **Data source ingestion** — upload PDFs, CSVs, plain text, or paste content directly
- **AI-powered analysis** — Claude-driven analysis with structured JSON output and citation references
- **Confidence scoring** — calibrated scores showing how well-supported each finding is across frequency, consistency, and strength dimensions
- **Real-time streaming** — analysis runs stream progress via Server-Sent Events so you see results as they arrive
- **Artifact generation** — exportable positioning docs, interview scripts, and persona summaries
- **Cost tracking** — token usage and USD cost per analysis logged automatically
- **Audit trail** — full log of all actions per client and project

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Zustand, TanStack Query |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0 (async) |
| **Database** | PostgreSQL 15 |
| **File Storage** | MinIO (S3-compatible) |
| **AI** | Anthropic Claude API (`claude-sonnet-4-6` by default) |
| **Auth** | JWT (python-jose) |
| **Containerization** | Docker, Docker Compose v2 |

---

## Deploying Locally

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose v2
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the repo

```bash
git clone <repo-url>
cd Discovery_app
```

### 2. Configure environment

```bash
cp backend/.env.sample backend/.env
```

Edit `backend/.env` and set at minimum:

```env
SECRET_KEY=<generate with: openssl rand -hex 32>
CLAUDE_API_KEY=<your Anthropic API key>
```

All other defaults work out of the box for local development.

### 3. Start all services

```bash
make start
```

Or directly:

```bash
docker compose up --build -d
```

This starts PostgreSQL, MinIO, the FastAPI backend, and the Vite dev server. Database migrations run automatically on startup.

### 4. Access the app

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:8000> |
| Swagger / API docs | <http://localhost:8000/docs> |
| MinIO console | <http://localhost:9001> (minioadmin / minioadmin) |

### 5. Create your first account

Navigate to <http://localhost:5173> and sign up. All accounts are local — no external auth service required.

### Useful Make targets

```bash
make start       # Build and start all services
make stop        # Stop and remove containers
make logs        # Tail backend logs
make migrate     # Run database migrations manually
make shell       # Open a shell inside the backend container
make test        # Run the backend test suite
```

---

## Deploying to a Cloud Server

The app is Docker Compose-based and runs cleanly on any Linux VPS (DigitalOcean, Linode, EC2, etc.).

1. Copy the repo to your server
2. Set up `backend/.env` with production values — especially `SECRET_KEY`, `CLAUDE_API_KEY`, and `CORS_ORIGINS`
3. Run `docker compose up --build -d`
4. Put Nginx or Caddy in front for SSL termination and domain routing

> Cloud-native deployment (managed DB, object storage, container orchestration) is on the roadmap but not yet documented.

---

## Environment Variables Reference

All backend config lives in `backend/.env`. Key variables:

| Variable | Required | Description |
| --- | --- | --- |
| `SECRET_KEY` | Yes | JWT signing secret — generate with `openssl rand -hex 32` |
| `CLAUDE_API_KEY` | Yes | Anthropic API key |
| `CLAUDE_MODEL` | No | Claude model ID (default: `claude-sonnet-4-6`) |
| `CLAUDE_REQUEST_TIMEOUT` | No | API timeout in seconds (default: 180) |
| `DATABASE_URL` | No | Postgres connection string (default points to Docker service) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `LANGSMITH_TRACING` | No | Set to `true` to enable [LangSmith](https://www.langchain.com/langsmith) observability (prompt tracing, token usage, latency) — not required to run the app |
| `LANGSMITH_API_KEY` | No | Required only if `LANGSMITH_TRACING=true` |

---

## Project Structure

```text
Discovery_app/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic (Claude, analysis, storage)
│   │   └── main.py
│   ├── alembic/              # Database migrations
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/            # Route-level page components
│   │   ├── components/       # Reusable UI and feature components
│   │   ├── api/              # API client functions
│   │   ├── stores/           # Zustand state
│   │   └── types/
│   └── package.json
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## Next Phase: AI Prompting Improvements

The current AI integration produces useful structured output across all four analysis types. The next phase focuses on improving the quality and precision of what Claude returns:

- **More focused, targeted prompts** — tighten system prompts per analysis type to reduce noise and surface more actionable, relevant findings
- **Better citation quality** — improve how Claude references specific lines and passages from source data so findings are more directly traceable back to the research
- **Confidence scoring tuning** — refine calibration formulas and scoring thresholds based on real-world usage patterns to make scores more meaningful and actionable

---

## Roadmap

- [ ] AI prompt improvements (see above)
- [ ] Artifact export to shareable PDF and markdown formats
- [ ] Interview script generation from persona and ICP outputs
- [ ] Cloud-native deployment documentation
- [ ] Additional consulting suite tools (competitive analysis, positioning workshop facilitation, etc.)

---

## Contributing

This project is shared as a reference and example of AI-assisted application development. It is not formally open source — feel free to explore, fork, and adapt for your own use. Attribution is appreciated but not required.

---

*Built by Chuck Blevins · Chuck Blevins Consulting
