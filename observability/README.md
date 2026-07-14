# Log Intelligence Stack — Observability Setup

This folder contains the full configuration to run an AI-powered log analysis
pipeline for the Galaxium Travels platform. It connects to any application or
tool in the organisation and produces structured error reports with hints.

---

## Architecture

```
Your Apps / Tools
      │
      ▼  (port 4317 gRPC / 4318 HTTP)
 OTEL Collector          ← receives logs from ALL sources
      │
      ▼  (port 21890)
  Data Prepper           ← parses, enriches, drops noise
      │
      ▼  (HTTPS 9200)
   OpenSearch            ← stores structured log records
      │
      ├─▶  log_analyser.py   ← AI: adds error_code, root_cause, hint
      │
      ▼  (port 5601)
OpenSearch Dashboards    ← visualise errors and AI-generated hints
```

---

## Files

| File | Purpose |
|---|---|
| `compose.yaml` | Starts the full stack with Podman Compose |
| `otel-collector-config.yaml` | OTEL Collector receivers, processors, exporters |
| `pipelines.yaml` | Data Prepper pipeline — parse, enrich, write to OpenSearch |
| `org-logs-template.json` | OpenSearch index template with field mappings |
| `setup_opensearch.sh` | One-time script to register the index template |
| `log_analyser.py` | AI engine — reads errors, calls LLM, writes back hints |

---

## Quick Start

### Prerequisites
- Podman + Podman Compose installed
- Python 3.11+ (for the AI analyser)
- (Optional) Ollama running locally for the LLM

### 1. Start the stack

```powershell
cd galaxium-travels/observability
podman compose up -d
```

Wait ~30 seconds for OpenSearch to be healthy, then check:

```powershell
podman ps
```

### 2. Register the OpenSearch index template (run once)

```powershell
bash setup_opensearch.sh
```

On Windows PowerShell:
```powershell
$h = "http://localhost:9200"; $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:Admin@1234!"))
Invoke-RestMethod -Uri "$h/_index_template/org-logs" -Method PUT -Headers @{Authorization="Basic $auth"} -ContentType "application/json" -InFile "org-logs-template.json"
```

### 3. Point your applications to the Collector

Add this to any Python app (e.g. `booking_system_backend`):

```python
pip install opentelemetry-sdk opentelemetry-exporter-otlp

from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
exporter = OTLPLogExporter(endpoint="http://localhost:4317", insecure=True)
```

Or simply run the background jobs — their log files are auto-collected via the
`filelog` receiver mounted in `compose.yaml`.

### 4. Run the AI analyser

Install dependencies:
```powershell
pip install requests
```

Run once:
```powershell
python log_analyser.py
```

Run continuously (every 30 seconds):
```powershell
python log_analyser.py --watch 30
```

### 5. Open the Dashboard

Go to **http://localhost:5601**
- Username: `admin`
- Password: `Galaxium2026Secure`

Create an index pattern `org-logs-*` (Management → Index Patterns) then build
dashboards using the fields below.

---

## Output Fields (per log record in OpenSearch)

| Field | Example | Description |
|---|---|---|
| `timestamp` | `2026-07-13T19:14:01Z` | When the log was emitted |
| `severity` | `ERROR` | Log level |
| `service` | `booking-backend` | Source application |
| `message` | `Could not open booking.db` | Parsed log message |
| `error_code` | `DB_FILE_NOT_FOUND` | Short AI-assigned identifier |
| `root_cause` | `Database file path is incorrect` | AI root cause |
| `hint` | `Run seed.py to create booking.db first` | AI fix suggestion |
| `trace_id` | `abc123` | OTEL trace correlation ID |
| `analysed` | `true` | Whether AI has processed this record |
| `analysed_at` | `2026-07-13T19:15:00Z` | When AI processed it |

---

## LLM Provider Configuration

Set the `LOG_ANALYSER_PROVIDER` environment variable to switch providers:

| Provider | Env Var | Notes |
|---|---|---|
| Ollama (default) | `LOG_ANALYSER_PROVIDER=ollama` | Free, runs locally. Install from https://ollama.ai |
| OpenAI | `LOG_ANALYSER_PROVIDER=openai` | Requires `OPENAI_API_KEY` |
| IBM watsonx.ai | `LOG_ANALYSER_PROVIDER=watsonx` | Requires `WATSONX_URL`, `WATSONX_API_KEY`, `WATSONX_PROJECT_ID` |

Example (watsonx):
```powershell
$env:LOG_ANALYSER_PROVIDER = "watsonx"
$env:WATSONX_URL            = "https://us-south.ml.cloud.ibm.com"
$env:WATSONX_API_KEY        = "your-api-key"
$env:WATSONX_PROJECT_ID     = "your-project-id"
python log_analyser.py --watch 60
```

---

## Connecting Other Org Tools

| Tool | How |
|---|---|
| Any log file on disk | Already configured — add path to `filelog.include` in `otel-collector-config.yaml` |
| Java / Spring Boot | Add OTEL Java agent: `-javaagent:opentelemetry-javaagent.jar` |
| Node.js apps | `npm install @opentelemetry/sdk-node` |
| Kubernetes | Deploy OTEL Operator via Helm |
| AWS CloudWatch | Add `awscloudwatch` receiver to `otel-collector-config.yaml` |

---

## Stop the Stack

```powershell
podman compose down          # stop containers (keeps data)
podman compose down -v       # stop and delete all data
```
