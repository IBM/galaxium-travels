# Issue backlog

The GitHub issues of this repo are a fixed set of exercises for demos. This folder is their source of truth, and `scripts/issues/sync_issues.py` makes GitHub match it.

```bash
python3 scripts/issues/sync_issues.py check              # offline: validate the manifest and the bodies
python3 scripts/issues/sync_issues.py plan               # dry run against GitHub
python3 scripts/issues/sync_issues.py apply              # make the changes
python3 scripts/issues/sync_issues.py apply --comments   # also delete comments on managed open issues
```

## Files

- `manifest.json`: every managed issue with its number, title, labels, state and body file. A new issue has `"number": null`; `apply` creates it and writes the number back.
- `bodies/`: one markdown file per open issue.
- `snapshot/2026-11-24/issues.json`: all issues as they were before the cleanup, with comments, labels, assignees, milestones and blocked-by links. Use it to restore an old body.

## Resting state

Between demos, a managed open issue has:

- the title, body and labels from the manifest,
- no assignee, no milestone, no blocked-by link,
- no comments, once `apply --comments` has run.

Demos create that state live (sprint milestones, triage comments, `agent:*` labels). Running `apply --comments` afterwards removes it again. Issues that are not in the manifest are listed by `plan` and never changed.

## Labels

| Group | Values | Meaning |
|---|---|---|
| Size | `size/S`, `size/M`, `size/L`, `size/XL` | S: one service, about 5 files. M: one or two services, no schema or contract change. L: schema change or a change to how Python and Java talk. XL: an epic to split first. |
| Area | `area/frontend`, `area/fullstack`, `area/cross-service` | Frontend only; frontend and Python; anything that touches the Java hold service. |
| Flags | `touches-schema`, `demo-pinned` | The issue agent treats `touches-schema` as "needs a human". `demo-pinned` marks issues a runbook depends on. |

## Body format

Every body has these sections, and `check` enforces them: **Gap**, **Scope**, **Touches**, **Size**, **Acceptance criteria**, **Verify**.

`Touches` is a list of file paths in backticks. A file the issue creates is marked `(new)`. `check` fails when a listed file does not exist, or when a file marked new already does. Run it after any change that moves or renames files.

## Manifest fields for maintainers

- `expected_verdict`: what the issue agent's triage should return (`ready`, `needs-info`, `needs-human`). These are the author's expectation and have not been tested against the agent.
- `trap`: a deliberate difficulty in the issue, for example an outdated dependency pin. This file is in a public repo, so an agent that reads `issues/` can see it.
- `pinned_by`: the runbook or people depending on the issue. Keep its number and its subject.

## Rules

- Never renumber or recreate an issue. Runbooks link to issue numbers. Edit the body file and run `apply`.
- To retire an issue, set it to `closed` with a `close_comment`. Closing can be undone.
- After `apply`, take a new baseline for any demo reset script that stores issue state (for example `reset_ch5.py mark`), or it will restore the old labels.
