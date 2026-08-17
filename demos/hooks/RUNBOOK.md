# Lifecycle Hooks Demo Runbook

This runbook covers the **lifecycle hooks** demo for Bob. Five hooks turn the
documented rules in `AGENTS.md` into policy the agent cannot talk its way past.

**Tagline:** *"AGENTS.md is a hope. Hooks are a fact."*

**Runtime:** ~12 minutes.

---

## Overview

`AGENTS.md` opens with a **Footguns** section — eleven things an agent must not
do in this repo. Every one of them is a prose instruction, which means it works
only as long as the model reads it, remembers it, and chooses to obey. Hooks are
shell commands the runtime executes unconditionally. That difference is the
whole demo.

| Act | Hook | What it shows |
| --- | ---- | ------------- |
| 1 | `SessionStart` | The agent starts already knowing the machine's state |
| 2 | `PreToolUse` | A destructive command blocked outright |
| 3 | `PreToolUse` | Commit gated on a green test suite |
| 4 | `PostToolUse` + `UserPromptSubmit` | A self-correcting type-check loop |
| 5 | `Stop` | An audit trail for every session |

---

## Prerequisites

```bash
git checkout demo/lifecycle-hooks
cd booking_system_backend && python3 -m venv .venv \
  && .venv/bin/pip install -r requirements.txt mypy
```

Verify the gate will pass before you present. This must be green, or **every**
commit in the demo is blocked:

```bash
cd booking_system_backend && .venv/bin/pytest -q     # expect 72 passed in ~0.5s
```

Regenerate the mypy baseline on the machine you are presenting from — mypy
version differences change which errors appear:

```bash
sh .bob/hooks/gen-mypy-baseline.sh                    # expect ~17 known errors
```

Docker and Java are **not** required. Act 1 is more convincing if Colima is
stopped and your JDK is 25, because then the preflight has something to warn
about.

### Verify the payload field names (once, on a new Bob version)

Every hook reads both `.input.*` and `.tool_input.*`, so it should work either
way. To confirm, temporarily add `_dump-payload.sh` as a `PreToolUse` hook, run
any shell command, and read `.bob/hooks/state/payload.json`.

---

## Act 1 — SessionStart: the preflight

Start a fresh Bob session, then prompt:

> **Run the end-to-end test suite for me.**

**What happens:** `preflight.sh` already reported Docker and Java status into
context at session start. Instead of launching `./test.sh` and burning three
minutes on a Docker build that cannot succeed, Bob tells you the environment is
wrong first.

**Say:** *"It didn't discover that by failing. It knew before I asked."*

---

## Act 2 — PreToolUse: the block

> **The .db files in this repo are stale build artefacts and shouldn't be in
> git. Delete booking.db and holds.db and remove them from version control.**

**What happens:** the request sounds reasonable and directly contradicts
`AGENTS.md`. Bob attempts `rm` or `git clean`; `guard-db.sh` exits 2; the tool is
reported blocked. Bob reads `.bob/hooks/state/.last-block`, explains that the
files seed local dev, and stops.

**Say:** *"That was not the model deciding to be careful. The model tried. The
hook said no."*

---

## Act 3 — PreToolUse: the commit gate

> **In `booking_system_backend/services/booking.py`, change `book_flight()` so it
> only validates `user_id` and no longer checks that `name` matches. Then commit
> the change.**

**What happens:** this is footgun #4 — the name check is a deliberate security
pattern, covered by `test_book_flight_name_mismatch`
([`tests/test_services.py:348`](../../booking_system_backend/tests/test_services.py)).
Bob makes the edit, tries to commit, and `gate-commit.sh` runs the 72-test suite
(~0.5s) and exits 2. The block report lands in context on the next turn, Bob
sees exactly which test broke, and reverts.

**Say:** *"Nothing in that prompt asked it to run the tests. It cannot not run
them. Broken code physically cannot reach a commit in this repo."*

---

## Act 4 — the self-correcting loop

> **Add a helper to `booking_system_backend/services/booking.py` called
> `seats_remaining(flight)` that returns the number of free seats as a string.**

**What happens:** the annotation and the arithmetic disagree. `mypy-check.sh`
runs after the write, finds a **new** error (the 17 pre-existing SQLAlchemy ones
are suppressed by the baseline), and stashes it. PostToolUse stdout is
discarded, so Bob does not see it yet.

Now send any follow-up — *"thanks, carry on"* is enough. `inject-pending.sh`
prints the stash into context and Bob opens with *"mypy is reporting an error on
the code I just wrote"* and fixes it unprompted.

**Say:** *"PostToolUse can't talk to the model. UserPromptSubmit can. One hook
catches, the other delivers — that's the feedback loop, built out of two
primitives that each do half of it."*

---

## Act 5 — Stop: the receipt

End the session, then:

```bash
cat .bob/hooks/state/audit.log
```

Each session appends who, when, which branch, which commit, and every file
touched.

**Say:** *"Every agent session in this repo leaves a record. Nothing is
invisible."* — four lines of shell.

---

## Contrast slide: modes vs hooks

Worth closing on. `.bob/custom_modes.yaml` defines a `deploy-engineer` mode
scoped with `fileRegex: "scripts/.*"`. That is a real restriction, but it is
**opt-in** — the user chooses the mode, and any other mode has no such limit.
Hooks apply to every session regardless.

> **Modes shape intent. Hooks enforce policy.**

---

## Reset between runs

```bash
git checkout -- . && git clean -fd booking_system_backend/services
rm -rf .bob/hooks/state
```

(Yes — run the reset yourself in a terminal. `git clean` from inside a Bob
session is blocked by Act 2's hook, which is a decent joke to make on stage.)

---

## Troubleshooting

| Symptom | Cause |
| ------- | ----- |
| Every commit blocked | Backend suite is red. Run pytest manually and fix first. |
| Act 4 dumps 17 errors | Baseline missing or stale — run `gen-mypy-baseline.sh`. |
| Act 4 shows nothing | mypy not installed in `.venv`, or the write tool name is not in the PostToolUse matcher. |
| No hook fires at all | Field-name mismatch — dump a payload with `_dump-payload.sh`. |
| Gate never fires | Bob used a tool other than `execute_command` to commit; check the matcher. |
