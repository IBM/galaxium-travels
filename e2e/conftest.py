"""
End-to-end test harness for the full Galaxium stack.

By default this brings up a self-contained docker-compose stack (Postgres +
Python backend + Java hold service), waits for it to be healthy, runs the
tests against the *public* REST API the frontend uses, then tears it down.

Useful environment variables:
  E2E_BASE_URL=http://host:port   Run against an already-running backend instead
                                  of managing compose (great for a quick smoke).
  E2E_KEEP_STACK=1                Leave the compose stack up after the run (for
                                  debugging). Default tears it down with volumes.
  E2E_RUN_SLOW=1                  Include the ~90s auto-expiry test.
"""

import os
import subprocess
import sys
import time

import httpx
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
COMPOSE_FILE = os.path.join(HERE, "docker-compose.e2e.yml")
PROJECT = "galaxium_e2e"

BACKEND_URL = "http://localhost:18001"
JAVA_HEALTH_URL = "http://localhost:18082/api/v1/health"


def _compose(*args):
    return ["docker", "compose", "-p", PROJECT, "-f", COMPOSE_FILE, *args]


def _wait_for(url, timeout, predicate=None):
    """Poll an HTTP endpoint until predicate(response) is true or we time out."""
    predicate = predicate or (lambda r: r.status_code == 200)
    deadline = time.time() + timeout
    last = "no response yet"
    while time.time() < deadline:
        try:
            r = httpx.get(url, timeout=3)
            if predicate(r):
                return
            last = f"HTTP {r.status_code}"
        except Exception as e:  # connection refused while still starting, etc.
            last = repr(e)
        time.sleep(2)
    raise RuntimeError(f"Timed out after {timeout}s waiting for {url} (last: {last})")


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("E2E_BASE_URL", BACKEND_URL).rstrip("/")


@pytest.fixture(scope="session", autouse=True)
def stack(base_url):
    """Bring the whole stack up for the session (unless E2E_BASE_URL is set)."""
    if "E2E_BASE_URL" in os.environ:
        print(f"\n[e2e] using existing backend at {base_url}", file=sys.stderr)
        _wait_for(f"{base_url}/", timeout=60)
        yield base_url
        return

    print("\n[e2e] building & starting stack (first build can take a few min)...", file=sys.stderr)
    subprocess.run(_compose("up", "-d", "--build"), check=True)
    try:
        _wait_for(f"{base_url}/", timeout=300)          # Python backend
        _wait_for(JAVA_HEALTH_URL, timeout=180)         # Java hold service
        print("[e2e] stack is up", file=sys.stderr)
        yield base_url
    finally:
        if os.environ.get("E2E_KEEP_STACK") == "1":
            print("[e2e] E2E_KEEP_STACK=1 — leaving stack running", file=sys.stderr)
        else:
            print("[e2e] tearing down stack", file=sys.stderr)
            subprocess.run(_compose("down", "-v"), check=False)


@pytest.fixture(scope="session")
def client(stack, base_url):
    with httpx.Client(base_url=base_url, timeout=30) as c:
        yield c


@pytest.fixture(scope="session")
def traveler(client):
    """A freshly registered user, so traveler_id/name are known and unambiguous.

    book_flight() verifies user_id *and* name match, so confirming a hold needs a
    real (id, name) pair — registering one avoids depending on seeded users.
    """
    email = f"e2e+{int(time.time())}@galaxium.test"
    r = client.post("/register", json={"name": "E2E Tester", "email": email})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user_id" in data, f"unexpected register response: {data}"
    return {"user_id": data["user_id"], "name": data["name"], "email": email}
