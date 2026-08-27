# Dependency Audit — Galaxium Travels

*Audit scope: `booking_system_backend/requirements.txt` · `booking_system_frontend/package.json` (+ `package-lock.json`) · `booking_system_inventory_hold_service/pom.xml`*

---

## 1. Per-Manifest Findings

### 1.1 Python Backend — `booking_system_backend/requirements.txt`

No lock file exists (`pip freeze`, `pip-tools` constraints file, `Pipfile.lock`, or `pyproject.toml`). All versions are completely unpinned. `pip install -r requirements.txt` will resolve the latest available version of every package at install time.

| Package | Declared Version | Pinning Status | Finding |
|---|---|---|---|
| `fastapi` | _(none)_ | **Unpinned** | Core web framework. No upper or lower bound. A breaking minor release (e.g. FastAPI's route-generation or dependency-injection changes) will silently enter the next install. |
| `fastmcp` | _(none)_ | **Unpinned** | MCP protocol adapter. Package is pre-1.0 (frequent breaking changes in the 0.x / early 1.x lifecycle). Unpinned on a fast-moving package is the highest-risk combination in this manifest. |
| `uvicorn` | _(none)_ | **Unpinned** | ASGI server. Workers, signal handling, and lifespan protocol have changed across minor versions. |
| `sqlalchemy` | _(none)_ | **Unpinned** | ORM. SQLAlchemy 2.x introduced breaking API changes from 1.x (e.g. `Session.execute` return types, `declarative_base` import path). An install across a major boundary silently breaks the application. The codebase already uses the deprecated `sqlalchemy.ext.declarative` import path, suggesting it was written against 1.x semantics. |
| `pydantic[email]` | _(none)_ | **Unpinned** | Pydantic 2.x introduced breaking changes from 1.x (`.from_orm()` removed, `Config` class renamed, field validator API changed). The codebase uses Pydantic v2 conventions (`model_validate`), so resolving to Pydantic v1 would silently break all schema conversions. |
| `python-dotenv` | _(none)_ | **Unpinned** | No `.env` file exists for the backend (only for the frontend). Package is installed but its risk here is low; pinning is still absent. |
| `pytest` | _(none)_ | **Unpinned** | Test framework. Should be in a separate `requirements-dev.txt`; it is currently included in the same file as production dependencies, meaning it will be installed in production container builds (see section 3). |
| `pytest-asyncio` | _(none)_ | **Unpinned** | Test-only dependency mixed into the production manifest. `asyncio_mode` configuration and fixture scoping have changed across minor versions. |
| `pytest-cov` | _(none)_ | **Unpinned** | Test-only dependency mixed into the production manifest. |
| `httpx` | _(none)_ | **Unpinned** | Used as the ASGI test transport for `TestClient`. Test-only dependency mixed into the production manifest. |

**Lock file status:** None. No `pip freeze` output, no `pip-tools` `.in`/`.txt` pair, no `Pipfile.lock`, no `pyproject.toml` with pinned dependencies. Every `pip install` resolves fresh.

---

### 1.2 TypeScript Frontend — `booking_system_frontend/package.json`

`package-lock.json` (lockfileVersion 3) is present. Resolved versions below are taken directly from the lock file.

#### Production Dependencies

| Package | Declared Range | Pinning Status | Resolved (lock) | Finding |
|---|---|---|---|---|
| `axios` | `^1.13.2` | Caret range | `1.13.2` | Caret allows any `1.x.x >= 1.13.2`. Axios 2.x (if released) would not be auto-resolved, but any `1.x` patch or minor is unrestricted. |
| `clsx` | `^2.1.1` | Caret range | _(transitive — not a direct lock entry)_ | Utility library; low churn risk. |
| `date-fns` | `^4.1.0` | Caret range | _(transitive — not a direct lock entry)_ | Major version 4 is the current series; caret confines to `4.x`. |
| `framer-motion` | `^12.26.1` | Caret range | `12.26.1` | Framer Motion 12.x is an active fast-moving major. Caret allows any `12.x.x >= 12.26.1`. |
| `lucide-react` | `^0.562.0` | Caret range | _(transitive — not a direct lock entry)_ | Package is pre-1.0 (`0.x`). **For pre-1.0 packages, caret (`^0.x.y`) only allows `0.x.z >= y` — it does not cross minor boundaries.** This is safer than it appears, but the package is explicitly pre-stable. |
| `react` | `^19.2.0` | Caret range | `19.2.3` | Declared `^19.2.0`, resolved to `19.2.3` — the lock file records a version above the declared lower bound, confirming the range resolved a newer patch. React 19 is the current major. |
| `react-dom` | `^19.2.0` | Caret range | `19.2.3` | Same pattern as `react`; resolved above declared lower bound. `react` and `react-dom` versions must always match exactly; the lock file currently satisfies this. |
| `react-hot-toast` | `^2.6.0` | Caret range | _(transitive — not a direct lock entry)_ | Stable library; low churn risk. |
| `react-router-dom` | `^7.12.0` | Caret range | `7.12.0` | React Router v7 (formerly Remix) is the current major. Caret allows any `7.x.x >= 7.12.0`. The lock file records the minimum declared version exactly. |

#### Development Dependencies

| Package | Declared Range | Pinning Status | Resolved (lock) | Finding |
|---|---|---|---|---|
| `@eslint/js` | `^9.39.1` | Caret range | _(transitive)_ | ESLint 9 uses flat config. Caret allows any `9.x`. |
| `@types/node` | `^24.10.1` | Caret range | _(transitive)_ | `@types/node` 24.x targets Node 24 APIs. This is the most recent major of `@types/node` at time of authoring. |
| `@types/react` | `^19.2.5` | Caret range | _(transitive)_ | Must track `react` exactly. Caret range creates a drift risk if `react` resolves above `19.2.x` and `@types/react` does not. |
| `@types/react-dom` | `^19.2.3` | Caret range | _(transitive)_ | Same version-tracking requirement as `@types/react`. |
| `@vitejs/plugin-react` | `^5.1.1` | Caret range | _(transitive)_ | Vite plugin. Must be compatible with the resolved `vite` version (see below). |
| `autoprefixer` | `^10.4.23` | Caret range | _(transitive)_ | PostCSS plugin; low churn risk. |
| `eslint` | `^9.39.1` | Caret range | _(transitive)_ | Must match `@eslint/js` major. Caret keeps both within `9.x`. |
| `eslint-plugin-react-hooks` | `^7.0.1` | Caret range | _(transitive)_ | Plugin for Rules of Hooks. |
| `eslint-plugin-react-refresh` | `^0.4.24` | Caret range | _(transitive)_ | Pre-1.0 package; caret restricts to `0.4.x`. |
| `globals` | `^16.5.0` | Caret range | _(transitive)_ | Peer of ESLint. |
| `postcss` | `^8.5.6` | Caret range | _(transitive)_ | PostCSS 8 is stable. |
| `tailwindcss` | `^3.4.19` | Caret range | _(transitive)_ | Tailwind v3; v4 is available with breaking changes. Caret confines to `3.x`. |
| `typescript` | `~5.9.3` | **Tilde range** | `5.9.3` | Only range in the manifest using tilde, which restricts to `5.9.x` only (patch updates). This is the tightest constraint in the manifest and appropriate for a compiler. Lock file confirms exact match. |
| `typescript-eslint` | `^8.46.4` | Caret range | _(transitive)_ | Must be compatible with `typescript` and `eslint` majors. |
| `vite` | `^7.2.4` | Caret range | `7.3.1` | Declared `^7.2.4`, resolved to `7.3.1` — lock file records a version above the declared lower bound, showing that a minor update was resolved at install time. Vite 7.x is current. |

**Lock file status:** `package-lock.json` present (lockfileVersion 3). The lock file pins all transitive dependencies to exact resolved versions. `npm ci` will reproduce the exact install; `npm install` may update within declared ranges. Two packages (`react` at `19.2.3`, `vite` at `7.3.1`) are already resolved above their declared lower bounds, meaning a fresh `npm install` without the lock file would resolve different versions than those in the lock.

---

### 1.3 Java Inventory Hold Service — `booking_system_inventory_hold_service/pom.xml`

Maven does not have a lock file equivalent in the same sense as npm or pip-tools. The POM uses the Spring Boot BOM for version management.

| Artifact | Declared Version | Pinning Status | Finding |
|---|---|---|---|
| `spring-boot-starter-parent` (BOM) | `3.3.0` | **Exact** | Parent POM pinned to a specific release. This is the BOM that manages all transitive Spring Boot versions. `3.3.0` is not the latest Spring Boot 3.x release; `3.3.x` patch releases exist. |
| `spring-boot-starter-web` | _(none — BOM-managed)_ | BOM-inherited | Version controlled by parent BOM `3.3.0`. No explicit override. |
| `spring-boot-starter-data-jpa` | _(none — BOM-managed)_ | BOM-inherited | Version controlled by parent BOM `3.3.0`. |
| `com.h2database:h2` | _(none — BOM-managed)_ | BOM-inherited | Version controlled by parent BOM `3.3.0`. H2 is declared with `scope=runtime` (correct for dev), but the comment acknowledges it should be replaced with a real datasource in production. No production datasource dependency or profile exists. |
| `spring-boot-starter-validation` | _(none — BOM-managed)_ | BOM-inherited | Version controlled by parent BOM `3.3.0`. |
| `spring-boot-starter-actuator` | _(none — BOM-managed)_ | BOM-inherited | Version controlled by parent BOM `3.3.0`. |
| `spring-boot-starter-test` | _(none — BOM-managed)_ | BOM-inherited (test scope) | Version controlled by parent BOM `3.3.0`. Correctly scoped to `test`. |
| `spring-cloud.version` property | `2023.0.1` | **Exact** (unused) | Declared as a property but referenced by no BOM import or dependency. Dead configuration. |
| `spring-boot-maven-plugin` | _(none — inherited from parent)_ | BOM-inherited | Plugin version managed by the Spring Boot parent. |

**Lock file status:** Maven does not produce a lock file by default. The `mvn dependency:tree` / `mvn dependency:resolve` output is not committed. No Maven wrapper (`mvnw` / `.mvn/wrapper/maven-wrapper.properties`) is present in the repository, meaning the Maven version used to build is also uncontrolled.

---

## 2. Cross-Cutting Findings

### 2.1 — Backend has no lock file and no dependency isolation mechanism

`requirements.txt` lists 10 packages with no versions. There is no `pip freeze` output, `pip-tools` constraints file (`requirements.in` → `requirements.txt`), `Pipfile.lock`, or `pyproject.toml`. Every install — CI, Docker image build, developer setup — resolves the latest available versions independently. Two developers installing the same `requirements.txt` on different days may resolve different package versions, and there is no way to reproduce a known-good build.

### 2.2 — Test and production dependencies are co-mingled in the backend manifest

`pytest`, `pytest-asyncio`, `pytest-cov`, and `httpx` are listed in the same `requirements.txt` as the production runtime packages. The `Dockerfile` runs `pip install -r requirements.txt`, so the production container image installs the test framework. This unnecessarily increases image size and attack surface.

### 2.3 — No vulnerability scanning tooling configured for any service

No security scanning configuration exists anywhere in the repository:

| Tool | Config file | Status |
|---|---|---|
| `pip-audit` | `pyproject.toml` / CI step | ❌ Not present |
| `safety` | CI step | ❌ Not present |
| `npm audit` | CI step / `.npmrc` | ❌ No CI exists |
| `dependabot` | `.github/dependabot.yml` | ❌ Not present |
| `renovate` | `renovate.json` | ❌ Not present |
| `snyk` | `.snyk` | ❌ Not present |
| `OWASP dependency-check` (Maven) | `pom.xml` plugin | ❌ Not present |
| GitHub Actions (any) | `.github/workflows/` | ❌ Directory does not exist |

There is no automated mechanism to detect known CVEs in any of the three dependency trees.

### 2.4 — No CI pipeline to enforce reproducible installs

`.github/workflows/` does not exist. There is no CI job running `pip install`, `npm ci`, or `mvn verify`. Without `npm ci` (which requires the lock file and fails if it is out of date), the lock file provides no enforcement guarantee — a developer running `npm install` can silently update resolved versions and commit an updated lock file with drift.

### 2.5 — Frontend lock file records versions above declared lower bounds

`react` is declared as `^19.2.0` but resolved to `19.2.3`. `vite` is declared as `^7.2.4` but resolved to `7.3.1`. This means:

- If the lock file is deleted and `npm install` re-run, the resolved versions may differ again.
- If `package.json` is used without the lock file (e.g. in a Docker build that runs `npm install` instead of `npm ci`), the installed versions are unpredictable.
- The declared lower bound in `package.json` no longer accurately represents the minimum tested version.

### 2.6 — `react` and `react-dom` versions are independently rangeable

Both `react` and `react-dom` are declared as `^19.2.0`. They must always resolve to the same version. The lock file currently resolves both to `19.2.3`, which is correct. However, because they are declared as independent caret ranges, a future `npm update` could theoretically resolve them to different versions if patch releases are staggered, causing a peer-dependency mismatch.

### 2.7 — `@types/react` and `@types/react-dom` version ranges may drift from `react` and `react-dom`

`react: ^19.2.0` resolves to `19.2.3`. `@types/react: ^19.2.5` resolves to a `19.x` patch. These are currently aligned but there is no mechanism to enforce that `@types/react` and `react` remain on the same minor version as they evolve independently.

### 2.8 — Spring Boot parent `3.3.0` is not the latest `3.3.x` patch release

`spring-boot-starter-parent 3.3.0` was the initial `3.3.x` release. The `3.3.x` series has received subsequent patch releases that include dependency updates and CVE fixes. Because the service has no source code, no build is occurring, but when the service is built the parent version will determine which Hibernate, Spring Security, and other transitive dependency versions are used.

### 2.9 — Maven wrapper absent; Maven version is uncontrolled

No `mvnw` / `.mvn/wrapper/maven-wrapper.properties` exists in the `booking_system_inventory_hold_service/` directory. Any developer or CI system must have Maven pre-installed, and the version used may differ across environments, affecting dependency resolution behaviour and plugin compatibility.

### 2.10 — H2 in-memory database has no production datasource replacement

`pom.xml` line 45 notes: *"swap datasource in prod profile"*. No production Maven profile (`<profiles>`) is defined in the POM. No PostgreSQL, MySQL, or other RDBMS driver dependency is present even in a commented-out or optional form. The service would start in production using H2, losing all hold data on restart.

### 2.11 — `spring-cloud.version` property is declared but unused

Property `spring-cloud.version=2023.0.1` appears in `<properties>` (line 33) but is referenced by no `<dependencyManagement>` BOM import and no `<dependency>`. It is dead configuration that creates a false impression that Spring Cloud is included in the dependency tree.

---

## 3. Findings Requiring Attention Before Production Deployment

The following findings, taken from sections 1 and 2, represent the minimum set that must be resolved before the application could be considered production-safe from a dependency management standpoint.

| Priority | Finding | Rationale |
|---|---|---|
| **1** | Backend `requirements.txt` is entirely unpinned with no lock file | Every production deployment resolves fresh versions. A breaking release of `fastapi`, `sqlalchemy`, or `pydantic` (all of which have had major breaking changes) can silently enter the next build. There is no way to reproduce a known-good install. |
| **2** | Test dependencies (`pytest`, `pytest-asyncio`, `pytest-cov`, `httpx`) installed into the production container | The production Docker image installs the test framework. These packages increase image size, widen the CVE surface, and are not needed at runtime. |
| **3** | No vulnerability scanning for any service | Known CVEs in `fastapi`, `axios`, `spring-boot`, or any transitive dependency will go undetected indefinitely. There is no automated signal that a dependency has a published security advisory. |
| **4** | `fastmcp` is unpinned and pre-stable | The MCP adapter is the least mature dependency in the backend stack. Unpinned pre-stable packages are the highest-risk dependency configuration: breaking changes are common between `0.x` and early `1.x` releases, and there is no floor version to prevent a breaking release from entering the next install. |
| **5** | `npm install` used instead of `npm ci` (no enforcement) | Without a CI pipeline enforcing `npm ci`, the `package-lock.json` provides no reproducibility guarantee. Developers and Docker builds can drift from the locked versions. |
| **6** | H2 in-memory database with no production datasource in the Java service POM | The POM acknowledges H2 should be replaced for production but provides no mechanism (profile, optional dependency, or documented swap procedure) to do so. Deploying as-is means all hold records are lost on any container restart. |
| **7** | Spring Boot parent pinned to `3.3.0` (not latest `3.3.x`) | The `3.3.x` patch series contains dependency updates that address CVEs in transitive dependencies managed by the BOM. Deploying on the initial `3.3.0` release means those fixes are absent. |
| **8** | Maven wrapper absent | Without `mvnw`, the Maven version used to build the Java service is uncontrolled. Different Maven versions can produce different dependency resolution outcomes and may not support features used by the `spring-boot-maven-plugin`. |

---

*Audit generated from direct manifest file analysis — no speculative findings. No version upgrade recommendations are included.*
