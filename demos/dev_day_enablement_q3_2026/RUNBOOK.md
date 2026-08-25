# Dev Day Demo Runbook — Q3 2026

Hand this file to Bob and say **"run the runbook"**. Bob will execute every automated step. Steps marked ⚠️ require manual action.

---

## Step 1 — Delete GitHub Issue Comment

Find and delete all comments on issue [#43](https://github.com/IBM/galaxium-travels/issues/43) in the `IBM/galaxium-travels` repo. There may be one or more left over from the previous demo run. Delete every comment found.

**How to do it:** Use the GitHub CLI to list all comments on the issue, then delete each one by ID:

```bash
# List all comment IDs on issue 43
gh api /repos/IBM/galaxium-travels/issues/43/comments --jq '.[].id'

# Delete each comment (repeat for every ID returned above)
gh api --method DELETE /repos/IBM/galaxium-travels/issues/comments/<id>
```

---

## Step 2 — Create Demo Branch

Always create a **new** branch from `main` — never reuse an existing one, even if it looks clean. A reused branch may contain a previous demo's committed implementation, which would spoil the live build.

The branch name must follow the convention `dev-day-demo-q3-2026-xx-NN` where `xx` is your two-letter initials and `NN` is a two-digit run counter starting at `01`. Increment the counter for each new demo run (e.g. `mj-01`, `mj-02`, `mj-03`).

```bash
# Replace xx-NN with your initials and next run number, e.g. mj-04
git checkout main
git pull origin main
git checkout -b dev-day-demo-q3-2026-xx-NN
git push -u origin dev-day-demo-q3-2026-xx-NN
```

> **If `git checkout -b` fails** with "branch already exists", you have the wrong counter — increment `NN` and try again. Do not force-reset or reuse the branch.

---

## Step 2b — Verify the Branch is Clean

Run these two checks immediately after creating the branch. Both must pass before continuing.

**Check 1 — none of the demo feature files exist in the committed code:**

```bash
git show HEAD:booking_system_backend/schemas.py | grep CancellationPreviewOut
```

Expected output: **nothing** (no match). If you see `CancellationPreviewOut`, the feature has been committed to `main` and must be reverted before proceeding.

**Check 2 — working tree is clean (no uncommitted modifications):**

```bash
git status --short
```

Expected output: at most `?? ISSUE-43-PLAN.md` (untracked planning doc is fine). Any `M` lines mean leftover working-tree changes from a previous session — discard them with:

```bash
git checkout -- .
```

> **If Check 1 fails:** the implementation was accidentally merged into `main`. Run `git log --oneline origin/main` to find the offending commit, then `git revert <sha> --no-edit && git push origin main` to undo it before re-running Step 2.

---

## Step 3 — Open Browser Tabs

Open Chrome with both tabs:

```bash
open -a "Google Chrome" "https://github.com/IBM/galaxium-travels" "http://localhost:5173"
```

---

## Step 4 — Start Galaxium Travels ⚠️ Manual

Bob cannot start a long-running foreground process. Do this yourself:

Open a new terminal tab and run:

```bash
./start.sh
```

Wait until the Vite dev server confirms it is listening on `http://localhost:5173`.

---

## Step 5 — Start Bob Shell ⚠️ Manual

Open another new terminal tab and run:

```bash
bob
```

---

## Done

When steps 4 and 5 are running, the demo environment is ready.
