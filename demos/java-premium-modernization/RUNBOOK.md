# Demo — Bob Premium Package for Java (modernization)

This demo turns the **Inventory Hold Service** into a deliberately dated
enterprise Java application so you can showcase the modernization workflows in
the [Bob Premium Package for Java](https://bob.ibm.com/blog/pp_for_java_announcement):
JDK upgrades, unit-test generation, CVE remediation, and JSP/Struts → SPA UI
modernization.

The `main` branch keeps the *modern* hold service (Java 17, Spring Boot 3.4,
Jakarta, Lombok, `java.time`). This demo lives on the **`demo/java-premium-legacy`**
branch, where the same service has been rewritten to look like a codebase that
has been stuck a decade behind. Each demo drives Bob to modernize the legacy
code "back toward" what `main` already proves is correct — so you always have a
known-good target and the e2e suite to check regressions against.

## What was made legacy

| Aspect | `main` (modern) | `demo/java-premium-legacy` |
| --- | --- | --- |
| Java | 17 | **1.8** |
| Spring Boot | 3.4.1 | **2.7.18** |
| Packaging | executable jar | **war** (`SpringBootServletInitializer`) |
| Persistence namespace | `jakarta.persistence` | **`javax.persistence`** |
| Validation namespace | `jakarta.validation` | **`javax.validation`** |
| Dates | `java.time.Instant` | **`java.util.Date` / `Calendar`** |
| Boilerplate | Lombok `@Data`/`@Builder` | **hand-written getters/setters/ctors** |
| DI | constructor injection | **field `@Autowired`** |
| HTTP client | `java.net.http.HttpClient` | **`HttpURLConnection`** |
| Optionals | `Optional<T>` returns | **nullable returns + null checks** |
| Hibernate dialect | `hibernate-community-dialects` | **hand-rolled `util.SQLiteDialect`** |
| Admin UI | (none — React frontend only) | **server-rendered JSP "Agent Console"** |

## Deliberately vulnerable dependencies (for the CVE demo)

Pinned in `pom.xml`, with a "do not bump, CAB-1147" comment to mimic real
change-control inertia:

- `commons-text` **1.9** — Text4Shell (CVE-2022-42889). Actually reachable:
  `HoldService`/`QuoteService` build audit messages with
  `StringSubstitutor.replace(...)`.
- `jackson-databind` **2.13.0** (via `jackson-bom` override) — pre-2.13.4.x
  deserialization CVEs.
- `sqlite-jdbc` **3.36.0.3** — CVE-2023-32697.

## Latent bug (for the test-generation demo)

`HoldService.generateHoldId()` (and the twin in `QuoteService`) derives the next
ID from `repository.count() + 1`. Under concurrency, or after any row is deleted,
this produces **duplicate IDs** → primary-key collision. Generated tests that
cover the ID logic surface it. This behaviour is identical on `main`, so it is a
genuine pre-existing bug, not something introduced only for the demo.

## The four demo scenarios

### 1. Unit-test generation (lowest effort, start here)
There is **no `src/test` directory**. Ask Bob to generate a JUnit + Mockito
suite for `HoldService` (state machine: HELD → CONFIRMED / RELEASED / EXPIRED /
CONFIRMATION_FAILED, expiry checks, mocked `PythonBackendClient`). Add JaCoCo to
show coverage climbing from 0%. Bonus beat: a test that pins down the
`count() + 1` ID bug.

### 2. JDK / framework upgrade
Ask Bob to take the service from Java 8 / Spring Boot 2.7 up to 17 (or 21) /
Spring Boot 3.4: `javax.*` → `jakarta.*`, `Date`/`Calendar` → `java.time`,
re-introduce Lombok, drop the hand-rolled dialect for
`hibernate-community-dialects`. The end state should match `main`. Prove no
regression with the e2e suite (below).

### 3. CVE remediation
Run dependency scanning (e.g. OWASP dependency-check / an SBOM tool). Bob should
find Text4Shell et al., bump the pinned versions, and confirm the `StringSubstitutor`
usage is still correct. Pairs naturally with scenario 2.

### 4. JSP → SPA UI modernization
The **Agent Console** at `/console` (`web/AgentConsoleController` +
`src/main/webapp/WEB-INF/jsp/console/*.jsp`) is a `<font>`-tag, table-layout
server-rendered admin UI for browsing quotes/holds/audit events and releasing
holds. Ask Bob to convert it to a REST + React implementation — the modern React
19 frontend in `booking_system_frontend/` is right there as the "after" style
reference.

## Verifying no regressions

The black-box e2e suite exercises the real Python ↔ Java hold lifecycle and is
framework-agnostic, so it passes against both the legacy and modernized service:

```bash
./test.sh            # or: e2e/run-native.sh
```

`run-native.sh` auto-builds the war and boots the service with short hold timers.
Requires a JDK (8–21) and Maven on PATH.

## Reset

```bash
git checkout main                    # modern service
git checkout demo/java-premium-legacy # legacy demo starting point
```

Run a demo on a throwaway branch off `demo/java-premium-legacy` so you can reset
by deleting it.

<!-- Made with Bob -->
