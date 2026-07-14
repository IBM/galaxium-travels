"""
log_analyser.py
===============
AI-powered log analysis engine.

What it does:
  1. Polls OpenSearch for ERROR/WARN logs that haven't been analysed yet
  2. Sends each log message to an LLM (configurable provider)
  3. Writes back structured fields: error_code, root_cause, hint
  4. Marks the record as analysed=true

Supported LLM providers (set LOG_ANALYSER_PROVIDER env var):
  - ollama   : Local model via Ollama (default, free)
  - openai   : OpenAI / Azure OpenAI
  - watsonx  : IBM watsonx.ai

Run:
  python log_analyser.py                   # analyse once
  python log_analyser.py --watch 30        # poll every 30 seconds
"""

import os
import sys
import json
import time
import logging
import argparse
import requests
import urllib3
from datetime import datetime, timezone

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  log_analyser - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("log_analyser.log"),
    ],
)
logger = logging.getLogger("log_analyser")

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------
OPENSEARCH_HOST     = os.getenv("OPENSEARCH_HOST",     "https://localhost:9200")
OPENSEARCH_USER     = os.getenv("OPENSEARCH_USER",     "admin")
OPENSEARCH_PASS     = os.getenv("OPENSEARCH_PASS",     "Galaxium2026Secure")
OPENSEARCH_INDEX    = os.getenv("OPENSEARCH_INDEX",    f"org-logs-{datetime.now(timezone.utc).strftime('%Y.%m.%d')}")
BATCH_SIZE          = int(os.getenv("ANALYSER_BATCH",  "50"))
LLM_PROVIDER        = os.getenv("LOG_ANALYSER_PROVIDER", "ollama")  # ollama | openai | watsonx

# Ollama (local, default)
OLLAMA_URL          = os.getenv("OLLAMA_URL",    "http://localhost:11434/api/generate")
OLLAMA_MODEL        = os.getenv("OLLAMA_MODEL",  "llama3")

# OpenAI / Azure OpenAI
OPENAI_API_KEY      = os.getenv("OPENAI_API_KEY",  "")
OPENAI_URL          = os.getenv("OPENAI_URL",      "https://api.openai.com/v1/chat/completions")
OPENAI_MODEL        = os.getenv("OPENAI_MODEL",    "gpt-4o-mini")

# IBM watsonx.ai
WATSONX_URL         = os.getenv("WATSONX_URL",        "")
WATSONX_API_KEY     = os.getenv("WATSONX_API_KEY",    "")
WATSONX_PROJECT_ID  = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_MODEL       = os.getenv("WATSONX_MODEL",      "ibm/granite-13b-instruct-v2")

# ---------------------------------------------------------------------------
# LLM prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert software reliability engineer.
Analyse the given log message and respond ONLY with a valid JSON object containing:
{
  "error_code":  "SHORT_UPPERCASE_IDENTIFIER",
  "root_cause":  "One sentence: why this error occurred.",
  "hint":        "Actionable step(s) to resolve or investigate the issue."
}
Do not include any text outside the JSON object."""


def build_user_prompt(service: str, severity: str, message: str) -> str:
    return f"Service: {service}\nSeverity: {severity}\nLog message: {message}"


# ---------------------------------------------------------------------------
# LLM providers
# ---------------------------------------------------------------------------

def call_ollama(service: str, severity: str, message: str) -> dict:
    prompt = f"{SYSTEM_PROMPT}\n\n{build_user_prompt(service, severity, message)}"
    response = requests.post(OLLAMA_URL, json={
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
    }, timeout=60)
    response.raise_for_status()
    return json.loads(response.json()["response"])


def call_openai(service: str, severity: str, message: str) -> dict:
    response = requests.post(OPENAI_URL, headers={
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }, json={
        "model": OPENAI_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system",  "content": SYSTEM_PROMPT},
            {"role": "user",    "content": build_user_prompt(service, severity, message)},
        ],
    }, timeout=60)
    response.raise_for_status()
    return json.loads(response.json()["choices"][0]["message"]["content"])


def call_watsonx(service: str, severity: str, message: str) -> dict:
    prompt = f"{SYSTEM_PROMPT}\n\n{build_user_prompt(service, severity, message)}\n\nJSON:"
    response = requests.post(
        f"{WATSONX_URL}/ml/v1/text/generation?version=2024-03-14",
        headers={
            "Authorization": f"Bearer {WATSONX_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model_id": WATSONX_MODEL,
            "project_id": WATSONX_PROJECT_ID,
            "input": prompt,
            "parameters": {"max_new_tokens": 300, "temperature": 0.2},
        },
        timeout=60,
    )
    response.raise_for_status()
    raw = response.json()["results"][0]["generated_text"]
    # Extract JSON object from response
    start = raw.find("{")
    end   = raw.rfind("}") + 1
    return json.loads(raw[start:end])


def analyse_log(service: str, severity: str, message: str) -> dict:
    """Route to the configured LLM provider."""
    try:
        if LLM_PROVIDER == "openai":
            return call_openai(service, severity, message)
        elif LLM_PROVIDER == "watsonx":
            return call_watsonx(service, severity, message)
        else:
            return call_ollama(service, severity, message)
    except Exception as exc:
        logger.warning(f"LLM call failed: {exc} — using fallback classification")
        return {
            "error_code": "ANALYSIS_UNAVAILABLE",
            "root_cause": "AI analysis could not be completed for this log entry.",
            "hint":       f"Check LLM provider '{LLM_PROVIDER}' connectivity. Raw message: {message[:200]}",
        }


# ---------------------------------------------------------------------------
# OpenSearch helpers
# ---------------------------------------------------------------------------
AUTH = (OPENSEARCH_USER, OPENSEARCH_PASS)


def fetch_unanalysed(batch_size: int = BATCH_SIZE) -> list:
    """Return up to batch_size ERROR/WARN records not yet analysed."""
    query = {
        "query": {
            "bool": {
                "must": [
                    {"terms": {"severityText.keyword": ["ERROR", "WARN", "FATAL"]}},
                    {"term":  {"analysed": False}},
                ],
            }
        },
        "size": batch_size,
    }
    r = requests.post(
        f"{OPENSEARCH_HOST}/{OPENSEARCH_INDEX}/_search",
        auth=AUTH, json=query, verify=False, timeout=30,
    )
    r.raise_for_status()
    return r.json().get("hits", {}).get("hits", [])


def write_analysis(index: str, doc_id: str, analysis: dict) -> None:
    """Write AI analysis fields back into the OpenSearch document."""
    update = {
        "doc": {
            **analysis,
            "analysed":    True,
            "analysed_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
    }
    r = requests.post(
        f"{OPENSEARCH_HOST}/{index}/_update/{doc_id}",
        auth=AUTH, json=update, verify=False, timeout=30,
    )
    r.raise_for_status()


# ---------------------------------------------------------------------------
# Main run loop
# ---------------------------------------------------------------------------

def run_once() -> int:
    """Fetch and analyse one batch. Returns count of analysed records."""
    logger.info("=" * 60)
    logger.info(f"Log Analyser started — provider: {LLM_PROVIDER.upper()}")

    try:
        hits = fetch_unanalysed()
    except Exception as exc:
        logger.error(f"Failed to query OpenSearch: {exc}")
        return 0

    logger.info(f"Found {len(hits)} unanalysed ERROR/WARN log(s)")

    analysed_count = 0
    for hit in hits:
        src      = hit.get("_source", {})
        doc_id   = hit["_id"]
        index    = hit["_index"]
        service  = src.get("serviceName", src.get("service", src.get("logger", "unknown")))
        severity = src.get("severityText", src.get("severity", "ERROR"))
        message  = src.get("body", src.get("message", src.get("raw_message", "")))

        logger.info(f"  Analysing [{severity}] {service}: {message[:80]}...")

        analysis = analyse_log(service, severity, message)
        logger.info(f"    error_code : {analysis.get('error_code')}")
        logger.info(f"    root_cause : {analysis.get('root_cause')}")
        logger.info(f"    hint       : {analysis.get('hint')}")

        try:
            write_analysis(index, doc_id, analysis)
            analysed_count += 1
        except Exception as exc:
            logger.error(f"    Failed to write back to OpenSearch: {exc}")

    logger.info(f"Done. Analysed {analysed_count}/{len(hits)} record(s).")
    logger.info("=" * 60)
    return analysed_count


def run_watch(interval_seconds: int) -> None:
    """Continuously poll OpenSearch every interval_seconds."""
    logger.info(f"Watch mode — polling every {interval_seconds}s. Ctrl+C to stop.")
    try:
        while True:
            run_once()
            logger.info(f"Sleeping {interval_seconds}s...")
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        logger.info("Log Analyser stopped by user.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Log Analyser")
    parser.add_argument(
        "--watch", type=int, metavar="SECONDS",
        help="Run continuously, polling every N seconds (e.g. --watch 30)"
    )
    args = parser.parse_args()

    if args.watch:
        run_watch(args.watch)
    else:
        count = run_once()
        sys.exit(0 if count >= 0 else 1)
