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

Create a fresh branch from `main` and push it. The branch name must follow the convention `dev-day-demo-q3-2026-xx` where `xx` is replaced with today's two-letter initials or a short identifier (e.g. `mj`). If a branch with those initials already exists, append a numeric suffix: `-02`, `-03`, etc.

First, commit any uncommitted changes on the current branch so nothing is lost (they can be discarded later):

```bash
git add -A
git commit -m "wip: save uncommitted changes before demo reset"
```

Then create the new demo branch from `main` and switch to it:

```bash
git fetch origin main
git checkout main
git pull origin main
git checkout -b dev-day-demo-q3-2026-xx
git push -u origin dev-day-demo-q3-2026-xx
```

You are now on a clean branch. The old branch with the WIP commit can be deleted later once the demo is done.

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
