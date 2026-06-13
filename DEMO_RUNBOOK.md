# Bob Shell GitHub Actions Demo Runbook

This runbook covers the **PR Review Bot** demo for Bob Shell on GitHub Actions. The workflow automatically reviews pull requests using Bob Shell's AI capabilities.

## Overview

**What it does:** When a PR is opened (or updated), the `bob-review` workflow runs Bob Shell against the diff and posts a code review comment.

**What it doesn't do:** Bob does NOT implement changes, push commits, or open PRs. It only reviews.

**Tagline:** *"Bob doesn't only live in your IDE."*

---

## Prerequisites

### 1. Fork the Repository

1. Go to https://github.com/IBM/galaxium-travels
2. Click **Fork** in the top-right
3. Create the fork under your GitHub account
4. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/galaxium-travels.git
   cd galaxium-travels
   ```

### 2. Generate Bob Shell API Key

1. Go to https://bob.ibm.com/docs/ide/account/api-keys
2. Click **Create API Key**
3. Set **Scope** to **Inference**
4. Copy the key immediately (shown only once)
5. Store it securely

### 3. Add GitHub Secret

1. In your fork, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `BOBSHELL_API_KEY`
4. Value: Paste the API key from step 2
5. Click **Add secret**

### 4. Install Bob Shell Locally (for rehearsal)

**macOS/Linux:**
```bash
curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash
```

**Windows:**
```powershell
powershell -ep Bypass 'irm -Uri "https://bob.ibm.com/download/bobshell.ps1" | iex'
```

Verify installation:
```bash
bob --version
```

On first run, Bob will prompt for IBMid authentication (browser flow). For CI, we use API key authentication instead.

---

## Safety-Net Branches

Three pre-tested branches with intentional flaws for reliable demos. Each has been verified to produce a useful Bob review.

### Branch 1: `demo/missing-validation`

**What it does:** Adds a new user update endpoint without input validation.

**Intentional flaw:** Missing email format validation and name length checks.

**Expected Bob review:**
- Points out missing email validation
- Suggests adding name length constraints
- Notes potential security issue with unvalidated input

**How to demo:**
```bash
git checkout demo/missing-validation
git push origin demo/missing-validation
# Open PR via GitHub UI: base=main, compare=demo/missing-validation
```

**Files changed:**
- `booking_system_backend/services/user.py` (new `update_user()` function)
- `booking_system_backend/server.py` (new PUT `/users/{user_id}` endpoint)

---

### Branch 2: `demo/off-by-one`

**What it does:** Adds available seats calculation with an off-by-one error.

**Intentional flaw:** Uses `<` instead of `<=` when comparing booked vs capacity.

**Expected Bob review:**
- Identifies the comparison operator bug
- Explains the off-by-one scenario (capacity=10, booked=10 → shows 1 available)
- Suggests changing to `<=`

**How to demo:**
```bash
git checkout demo/off-by-one
git push origin demo/off-by-one
# Open PR via GitHub UI
```

**Files changed:**
- `booking_system_backend/services/flight.py` (new `get_available_seats()` function)

---

### Branch 3: `demo/missing-tests`

**What it does:** Adds a new booking cancellation feature without tests.

**Intentional flaw:** No test coverage despite surrounding files having comprehensive tests.

**Expected Bob review:**
- Notes the absence of tests for the new `cancel_booking()` function
- Points out that `test_services.py` exists and has patterns to follow
- Suggests adding at least a happy-path test

**How to demo:**
```bash
git checkout demo/missing-tests
git push origin demo/missing-tests
# Open PR via GitHub UI
```

**Files changed:**
- `booking_system_backend/services/booking.py` (new `cancel_booking()` function)
- `booking_system_backend/server.py` (new DELETE `/bookings/{booking_id}` endpoint)

---

## Demo Choreography

### Setup (Before the Talk)

1. Ensure all three safety-net branches are pushed to your fork
2. Verify `BOBSHELL_API_KEY` secret is set
3. Test one branch end-to-end:
   ```bash
   # Push a branch
   git push origin demo/missing-validation
   
   # Open PR via GitHub UI
   # Wait for workflow to complete
   # Verify Bob's review appears
   # Close PR (don't merge)
   ```
4. Close all test PRs so they're ready to be reopened live

### Live Demo Flow (5-7 minutes)

1. **Intro (30 seconds)**
   - "Bob Shell runs anywhere — not just in your IDE"
   - "Let me show you Bob reviewing PRs on GitHub Actions"

2. **Show the workflow (1 minute)**
   - Navigate to `.github/workflows/bob-review.yml` in the repo
   - Briefly explain: triggers on PR, runs Bob against the diff, posts review
   - Mention it reads `AGENTS.md` to understand repo patterns

3. **Open a PR (1 minute)**
   - Push one of the safety-net branches (or create a live change if confident)
   - Click "Compare & pull request"
   - Fill in title/description
   - Click "Create pull request"

4. **Watch the workflow (2 minutes)**
   - Navigate to **Actions** tab
   - Click the running workflow
   - Optionally expand "Run Bob Shell review" step to show logs
   - Wait for completion (usually 1-2 minutes)

5. **Show the review (2 minutes)**
   - Navigate back to the PR
   - Bob's review appears in the timeline as a "Commented" review
   - Walk through the findings
   - Highlight specificity (file:line references, concrete suggestions)

6. **Closing beat (30 seconds)**
   - "Bob just reviewed this code. I never opened my IDE."
   - "Same Bob, different venue — terminal, IDE, or CI."

---

## Troubleshooting

### Workflow doesn't trigger

**Symptom:** PR opened, but no workflow run appears in Actions tab.

**Fixes:**
- Check if PR is marked as draft (workflow skips drafts by default)
- Check if PR author is a bot (workflow skips bot PRs)
- Verify `.github/workflows/bob-review.yml` exists on the base branch

### Workflow fails with "Authentication failed"

**Symptom:** Workflow fails at "Run Bob Shell review" step with auth error.

**Fixes:**
- Verify `BOBSHELL_API_KEY` secret is set correctly
- Regenerate API key in Bob web portal if expired
- Check API key scope is set to **Inference**

### Bob's review is empty or generic

**Symptom:** Review posted, but content is "Looks good" or very brief.

**Fixes:**
- Check if the diff is too small (Bob may not find issues in trivial changes)
- Verify the intentional flaw is present in the branch
- Try a different safety-net branch

### Workflow times out

**Symptom:** Workflow runs for 10 minutes and gets cancelled.

**Fixes:**
- Check if Bob is stuck on a large diff (>500 lines)
- Reduce diff size by splitting the PR
- Check Bob Shell service status at https://bob.ibm.com/status

---

## Re-triggering a Review

If you need to re-run the workflow on the same PR:

**Option 1: Push an empty commit**
```bash
git commit --allow-empty -m "Trigger review"
git push
```

**Option 2: Close and reopen the PR**
- Click "Close pull request"
- Click "Reopen pull request"

**Option 3: Add a new commit**
```bash
# Make a trivial change
echo "# Trigger" >> README.md
git add README.md
git commit -m "Trigger review"
git push
```

---

## Disabling the Workflow Mid-Talk

If something goes wrong during the demo and you need to stop the workflow:

**Option 1: Cancel the running workflow**
1. Go to **Actions** tab
2. Click the running workflow
3. Click **Cancel workflow** (top-right)

**Option 2: Disable the workflow entirely**
1. Go to **Actions** tab
2. Click **bob-review** in the left sidebar
3. Click **⋯** (three dots) → **Disable workflow**

**Option 3: Delete the workflow file**
```bash
git rm .github/workflows/bob-review.yml
git commit -m "Disable Bob review workflow"
git push
```

---

## Creating Safety-Net Branches

If you need to create additional safety-net branches:

### Template: Missing Validation

```bash
git checkout -b demo/your-branch-name
# Edit booking_system_backend/services/user.py
# Add a function that accepts user input without validation
git add .
git commit -m "Add feature without validation"
git push origin demo/your-branch-name
```

### Template: Logic Bug

```bash
git checkout -b demo/logic-bug
# Edit booking_system_backend/services/flight.py
# Introduce an off-by-one error or wrong comparison
git add .
git commit -m "Add feature with logic bug"
git push origin demo/logic-bug
```

### Template: Missing Tests

```bash
git checkout -b demo/no-tests
# Edit booking_system_backend/services/booking.py
# Add a new function without adding tests
git add .
git commit -m "Add feature without tests"
git push origin demo/no-tests
```

**Always test the branch end-to-end before the demo:**
1. Push the branch
2. Open a PR
3. Wait for Bob's review
4. Verify the review is specific and useful
5. Close the PR (don't merge)
6. Document the expected review in this runbook

---

## Workflow File Reference

Location: `.github/workflows/bob-review.yml`

**Key sections:**

- **Trigger:** `pull_request` events (opened, synchronize, reopened)
- **Skip conditions:** Draft PRs and bot-authored PRs
- **Permissions:** `pull-requests: write`, `contents: read`
- **Timeout:** 10 minutes
- **Node version:** 22 (required for Bob Shell)
- **Bob prompt:** Instructs Bob to read `AGENTS.md`, review the diff, write findings to `/tmp/review.md`
- **Review posting:** Uses `gh pr review --comment` to post as a formal review comment

---

## Resources

- **Bob Shell docs:** https://bob.ibm.com/docs/shell
- **API key setup:** https://bob.ibm.com/docs/shell/getting-started/install-and-setup#api-key-authentication
- **API key creation:** https://bob.ibm.com/docs/ide/account/api-keys#api-key-types
- **GitHub CLI (`gh`) reference:** https://cli.github.com/manual/gh_pr_review
- **Repo:** https://github.com/IBM/galaxium-travels
- **AGENTS.md:** https://github.com/IBM/galaxium-travels/blob/main/AGENTS.md

---

## Quick Reference Card (Print This)

```
┌─────────────────────────────────────────────────────────────┐
│ Bob Shell PR Review Demo - Quick Reference                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Push safety-net branch:                                 │
│    git push origin demo/missing-validation                  │
│                                                             │
│ 2. Open PR via GitHub UI                                   │
│                                                             │
│ 3. Navigate to Actions tab → watch workflow                │
│                                                             │
│ 4. Return to PR → show Bob's review                        │
│                                                             │
│ 5. Closing: "Bob reviewed this. I never opened my IDE."    │
├─────────────────────────────────────────────────────────────┤
│ Emergency: Cancel workflow in Actions tab                  │
│ Re-trigger: git commit --allow-empty -m "Trigger" && push  │
└─────────────────────────────────────────────────────────────┘
```

---

## Post-Demo Cleanup

After the demo, clean up the fork:

```bash
# Delete safety-net branches
git push origin --delete demo/missing-validation
git push origin --delete demo/off-by-one
git push origin --delete demo/missing-tests

# Close any open PRs via GitHub UI

# Optionally: Delete the fork entirely
# Go to Settings → Danger Zone → Delete this repository
```

---

## Notes

- The workflow uses `gh pr review --comment` which posts a formal "Commented" review (shows in PR timeline, visually distinctive).
- Bob is explicitly told NOT to modify source files or run tests — it only reviews.
- The workflow skips draft PRs and bot PRs to avoid infinite loops.
- Bob reads `AGENTS.md` before reviewing to understand repo-specific patterns (e.g., service layer returns `Union[Model, ErrorResponse]`, not exceptions).
- Safety-net branches should be small (1-2 files, <100 lines changed) for fast reviews.
