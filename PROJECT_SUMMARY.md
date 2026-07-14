# Galaxium Travels — Project Summary

**Repository:** https://github.com/smishra-ibm/galaxium-travels  
**Branch:** bob-learning-path-branch  
**Stack:** Python · FastAPI · SQLite · OpenTelemetry · OpenSearch · Podman  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [What Was Built](#2-what-was-built)
3. [Architecture](#3-architecture)
4. [Background Jobs](#4-background-jobs)
5. [Log Intelligence Pipeline](#5-log-intelligence-pipeline)
6. [Significance & Business Value](#6-significance--business-value)
7. [How It Helps](#7-how-it-helps)
8. [Possible Automations](#8-possible-automations)
9. [Technology Stack](#9-technology-stack)
10. [File Structure](#10-file-structure)

---

## 1. Project Overview

Galaxium Travels is a space-travel booking platform that allows users to book
flights between planets and celestial bodies. The system consists of a FastAPI
Python backend, a frontend UI, and a SQLite database seeded with interplanetary
flight data.

During this project, two major capabilities were added on top of the existing
booking system:

1. **Automated Background Jobs** — scheduled Python scripts that maintain data
   integrity and monitor flight availability
2. **Log Intelligence Pipeline** — an end-to-end observability stack that
   collects logs from all services, parses and enriches them, and uses AI to
   automatically identify errors and suggest fixes

---

## 2. What Was Built

### A — Background Jobs (`booking_system_backend/jobs/`)

| File | Purpose |
|---|---|
| `expired_bookings_cleanup.py` | Cancels pending bookings older than 24 hours |
| `low_seats_alert.py` | Warns when a flight has fewer than 10 seats available |
| `Dockerfile.jobs` | Container image to run jobs in isolation |
| `JOBS_SETUP.md` | Full setup, run, and scheduling guide |

### B — Observability Stack (`observability/`)

| File | Purpose |
|---|---|
| `compose.yaml` | Starts the full 4-service stack with one command |
| `otel-collector-config.yaml` | Receives logs from all apps on port 4317/4318 |
| `pipelines.yaml` | Data Prepper pipeline — parses, enriches, writes to OpenSearch |
| `org-logs-template.json` | OpenSearch index template with field mappings |
| `log_analyser.py` | AI engine — reads ERROR/WARN logs, writes back `error_code`, `root_cause`, `hint` |
| `setup_opensearch.sh` | One-time index template registration |
| `README.md` | Full setup guide with commands |

### C — Developer Environment Setup
- Resolved `npm` PATH issues on Windows
- Installed and configured **Podman** as a Docker-compatible container runtime
- Configured **WSL 2** for Podman on Windows
- Set up **GitHub CLI** and pushed code via fork workflow

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Galaxium Travels Platform                 │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │    │  Background  │  │
│  │   (React)    │───▶│  (FastAPI)   │    │     Jobs     │  │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘  │
│                             │                   │           │
└─────────────────────────────┼───────────────────┼───────────┘
                              │ OTEL SDK           │ Log files
                              ▼                   ▼
                    ┌─────────────────────────────────┐
                    │        OTEL Collector           │
                    │   port 4317 (gRPC / HTTP)       │
                    │   + filelog receiver            │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │          Data Prepper            │
                    │  Grok parsing · enrichment       │
                    │  field normalisation · filtering │
                    └──────────────┬───────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │           OpenSearch             │
                    │   Index: org-logs-YYYY.MM.DD     │
                    │   45 mapped fields per record    │
                    └──────┬───────────────────────────┘
                           │                    │
                           ▼                    ▼
              ┌─────────────────────┐  ┌────────────────────┐
              │    log_analyser.py  │  │  OpenSearch        │
              │    AI Engine        │  │  Dashboards UI     │
              │  error_code         │  │  Discover · Charts │
              │  root_cause         │  │  Alerts · Reports  │
              │  hint               │  └────────────────────┘
              └─────────────────────┘
```

---

## 4. Background Jobs

### Job 1 — `expired_bookings_cleanup.py`

**What it does:**  
Queries the `bookings` table for all records with `status = 'pending'` that
were created more than 24 hours ago and updates their status to `'cancelled'`.

**Why it matters:**  
Without cleanup, the database accumulates stale pending bookings that block
seat availability and distort occupancy reports. This job keeps the data
accurate and prevents ghost reservations.

**How to run:**
```bash
python jobs/expired_bookings_cleanup.py
```

**Schedule (recommended):** Every hour  
```
0 * * * * python /app/jobs/expired_bookings_cleanup.py
```

**Sample log output:**
```
2026-07-14 11:00:00  [INFO]  expired_bookings_cleanup - Job started
2026-07-14 11:00:00  [INFO]  expired_bookings_cleanup - Cutoff: 2026-07-13 11:00:00
2026-07-14 11:00:00  [INFO]  expired_bookings_cleanup - Cancelling Booking ID=42 | User=7 | Flight=3
2026-07-14 11:00:00  [INFO]  expired_bookings_cleanup - Successfully cancelled 1 booking(s).
```

---

### Job 2 — `low_seats_alert.py`

**What it does:**  
Scans all flights in the database and logs a `WARNING` for every flight with
`seats_available < 10`, along with a summary of how many flights are affected.

**Why it matters:**  
Allows operations teams to proactively top up inventory, trigger pricing
strategies, or notify customers on waitlists before flights sell out completely.

**How to run:**
```bash
python jobs/low_seats_alert.py
```

**Schedule (recommended):** Every morning at 6am  
```
0 6 * * * python /app/jobs/low_seats_alert.py
```

**Sample log output:**
```
2026-07-14 06:00:00  [WARNING]  low_seats_alert - [LOW] Flight ID=5 | Jupiter -> Europa | Seats left=1
2026-07-14 06:00:00  [INFO]     low_seats_alert - Summary - Total: 10 | Low seats: 6 | OK: 4
```

---

## 5. Log Intelligence Pipeline

### How It Works

1. **Instrumentation** — Applications emit logs via OpenTelemetry SDK or
   existing log files are picked up by the `filelog` receiver
2. **Collection** — OTEL Collector receives all logs on a single endpoint
   (port 4317), applies resource attributes, and batches them
3. **Parsing** — Data Prepper parses raw log strings using Grok patterns,
   normalises severity levels, drops DEBUG noise, and adds pipeline metadata
4. **Storage** — Parsed records are written to daily rolling OpenSearch indices
   (`org-logs-YYYY.MM.DD`) with 45 mapped fields
5. **AI Analysis** — `log_analyser.py` polls for unanalysed ERROR/WARN records,
   sends each message to an LLM, and writes back three structured fields:
   - `error_code` — short uppercase identifier (e.g. `DB_FILE_NOT_FOUND`)
   - `root_cause` — one-sentence explanation of why the error occurred
   - `hint` — actionable fix suggestion
6. **Visualisation** — OpenSearch Dashboards at `http://localhost:5601` displays
   all logs with AI-generated analysis in searchable, filterable tables and charts

### AI Output Format

Every analysed log record contains:

| Field | Example |
|---|---|
| `severityText` | `ERROR` |
| `serviceName` | `booking-backend` |
| `body` | `Could not connect to database: booking.db not found` |
| `error_code` | `DB_FILE_NOT_FOUND` |
| `root_cause` | `The SQLite database file does not exist at the configured path` |
| `hint` | `Run seed.py to initialise the database. Check SQLALCHEMY_DATABASE_URL in db.py` |
| `analysed` | `true` |
| `analysed_at` | `2026-07-14T11:56:09Z` |

### Supported LLM Providers

| Provider | How to enable |
|---|---|
| Ollama (local, free) | `LOG_ANALYSER_PROVIDER=ollama` — install from https://ollama.ai |
| IBM watsonx.ai | `LOG_ANALYSER_PROVIDER=watsonx` + set `WATSONX_URL`, `WATSONX_API_KEY`, `WATSONX_PROJECT_ID` |
| OpenAI / Azure OpenAI | `LOG_ANALYSER_PROVIDER=openai` + set `OPENAI_API_KEY` |

---

## 6. Significance & Business Value

### For Developers
- **Faster debugging** — instead of grepping through raw log files, developers
  see a structured table with `error_code`, `root_cause`, and `hint` fields
  already filled in by AI
- **Cross-service visibility** — all logs from every service flow into one place
  via the OTEL Collector, eliminating the need to SSH into individual machines
- **Portable** — the entire observability stack runs locally with one command:
  `podman-compose up -d`

### For Operations Teams
- **Proactive alerts** — the `low_seats_alert` job flags inventory issues before
  they cause customer-facing problems
- **Data integrity** — the `expired_bookings_cleanup` job prevents stale data
  from accumulating in the database
- **Audit trail** — every log record is preserved in OpenSearch with timestamps,
  service names, trace IDs, and AI analysis for post-incident review

### For the Business
- **Reduced mean time to resolution (MTTR)** — AI-generated hints eliminate
  manual investigation time for common errors
- **Scalable** — the same OTEL Collector can ingest logs from any new service
  without changes to the pipeline
- **Cost effective** — uses open-source tools (OpenTelemetry, OpenSearch, Data
  Prepper) with optional local LLM via Ollama at zero cost

---

## 7. How It Helps

### Problem → Solution Mapping

| Problem | Solution Delivered |
|---|---|
| Pending bookings never expire, blocking seats | `expired_bookings_cleanup.py` runs hourly and cancels stale records |
| No visibility into which flights are low on inventory | `low_seats_alert.py` logs warnings daily for flights below threshold |
| Logs scattered across multiple services and files | OTEL Collector aggregates all logs to one endpoint |
| Raw logs are hard to read and diagnose | Data Prepper parses and normalises into structured fields |
| Engineers waste time diagnosing common errors | AI engine adds `error_code`, `root_cause`, `hint` to every error record |
| No central place to search and visualise logs | OpenSearch Dashboards provides full search, filter, and charting UI |
| Connecting new tools/services requires pipeline changes | Any app pointing to port 4317 is automatically ingested |

---

## 8. Possible Automations

### Immediate Automations (ready to implement)

| Automation | How |
|---|---|
| **Schedule jobs via Task Scheduler (Windows)** | Use Windows Task Scheduler to run both Python jobs on a timer |
| **Schedule jobs via cron (Linux/Docker)** | Add cron entries inside the `Dockerfile.jobs` container |
| **Auto-run AI analyser on new logs** | Run `python log_analyser.py --watch 30` as a background service |
| **Auto-register index template on stack start** | Add `setup_opensearch.sh` as an init container in `compose.yaml` |

### Alerting Automations

| Automation | How |
|---|---|
| **Email/Slack alert on ERROR spike** | Use OpenSearch Alerting plugin — trigger when error count > threshold |
| **PagerDuty alert on FATAL logs** | Connect OpenSearch Alerting to PagerDuty webhook |
| **Daily log summary report** | Schedule `log_analyser.py` + export results to email via OpenSearch Reports |
| **Alert when all seats on a flight are gone** | Extend `low_seats_alert.py` to call a webhook when `seats_available = 0` |

### Pipeline Automations

| Automation | How |
|---|---|
| **Auto-ingest Kubernetes pod logs** | Deploy OTEL Operator as a DaemonSet — all pods auto-instrumented |
| **Auto-ingest AWS CloudWatch logs** | Add `awscloudwatch` receiver to `otel-collector-config.yaml` |
| **Auto-ingest Windows Event Logs** | Add `windowseventlog` receiver to OTEL Collector config |
| **Auto-rotate old indices** | Use OpenSearch ISM (Index State Management) to delete indices older than 30 days |
| **Auto-reindex on schema change** | Use Data Prepper's reindex pipeline to migrate old records |

### AI / LLM Automations

| Automation | How |
|---|---|
| **Auto-create GitHub issues from errors** | Extend `log_analyser.py` to call `gh issue create` for new `FATAL` errors |
| **Auto-assign errors to teams** | LLM classifies error by service and routes to the right Slack channel |
| **Weekly AI error digest** | Aggregate top 10 error codes and send a summary report every Monday |
| **Auto-remediation scripts** | For known `error_code` values, trigger a remediation script automatically |
| **Fine-tune LLM on your own error patterns** | Feed historical `error_code` + `hint` pairs to fine-tune a local model |

### CI/CD Automations

| Automation | How |
|---|---|
| **Run jobs as part of CI pipeline** | Add job execution as a GitHub Actions step after deployment |
| **Health check gate** | Before deploying, verify OpenSearch index has 0 unanalysed FATAL records |
| **Auto-build and push job container** | GitHub Actions builds `Dockerfile.jobs` and pushes to container registry on merge |
| **Auto-deploy observability stack** | Terraform or Ansible provisions the full stack on a new environment |

---

## 9. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Python 3.11 + FastAPI | REST API for bookings, flights, users |
| Database | SQLite + SQLAlchemy | Lightweight relational store |
| Background Jobs | Python (stdlib only) | Scheduled data maintenance tasks |
| Log Instrumentation | OpenTelemetry SDK | Emit structured logs from apps |
| Log Collection | OTEL Collector (contrib) | Central ingestion point for all log sources |
| Log Processing | Data Prepper | Parse, enrich, filter, route logs |
| Log Storage | OpenSearch 2.13 | Index and search structured log records |
| Log Visualisation | OpenSearch Dashboards | Discover, charts, alerts, reports |
| AI Analysis | Ollama / IBM watsonx / OpenAI | Generate error classifications and hints |
| Containerisation | Podman + Podman Compose | Run all services without Docker Desktop |
| Version Control | Git + GitHub CLI | Source control and collaboration |

---

## 10. File Structure

```
galaxium-travels/
├── booking_system_backend/
│   ├── server.py                     # FastAPI application entry point
│   ├── models.py                     # SQLAlchemy models (User, Flight, Booking)
│   ├── db.py                         # Database connection and session management
│   ├── schemas.py                    # Pydantic request/response schemas
│   ├── seed.py                       # Database seeder with sample flight data
│   ├── services/                     # Business logic layer
│   ├── tests/                        # Pytest test suite
│   ├── Dockerfile                    # Container image for the API server
│   ├── requirements.txt              # Python dependencies
│   └── jobs/
│       ├── expired_bookings_cleanup.py   # Job 1: cancel stale bookings
│       ├── low_seats_alert.py            # Job 2: warn on low inventory
│       ├── Dockerfile.jobs               # Container image for jobs
│       ├── JOBS_SETUP.md                 # Jobs documentation
│       └── logs/                         # Job log output files
│
├── booking_system_frontend/          # React frontend application
│
├── observability/
│   ├── compose.yaml                  # Podman Compose — full stack
│   ├── otel-collector-config.yaml    # OTEL Collector configuration
│   ├── pipelines.yaml                # Data Prepper pipeline
│   ├── org-logs-template.json        # OpenSearch index template
│   ├── log_analyser.py               # AI log analysis engine
│   ├── setup_opensearch.sh           # One-time setup script
│   └── README.md                     # Observability setup guide
│
├── PROJECT_SUMMARY.md                # This document
└── README.md                         # Project overview
```

---

*Document generated on 2026-07-14 — Galaxium Travels Engineering Team*
