# Bob Shell GitHub Actions Demo - Setup Instructions

This document guides you through setting up the Bob Shell PR review bot demo on your fork of IBM/galaxium-travels.

## What's Been Prepared

✅ **Workflow file**: `.github/workflows/bob-review.yml` - Automatically reviews PRs using Bob Shell
✅ **Demo runbook**: `DEMO_RUNBOOK.md` - Complete demo choreography and troubleshooting guide
✅ **Safety-net branches**: Three pre-tested branches with intentional flaws (locally created, need to be pushed to your fork)

## What You Need to Do

### Step 1: Fork the Repository

1. Go to https://github.com/IBM/galaxium-travels
2. Click **Fork** in the top-right corner
3. Create the fork under your GitHub account
4. Note your fork URL: `https://github.com/YOUR_USERNAME/galaxium-travels`

### Step 2: Generate Bob Shell API Key

1. Go to https://bob.ibm.com/docs/ide/account/api-keys
2. Click **Create API Key**
3. Set **Name**: `GitHub Actions Demo`
4. Set **Scope**: **Inference** (required for Bob Shell)
5. Click **Create**
6. **IMPORTANT**: Copy the API key immediately - it's shown only once
7. Store it securely (you'll need it in the next step)

### Step 3: Add GitHub Secret

1. Go to your fork: `https://github.com/YOUR_USERNAME/galaxium-travels`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `BOBSHELL_API_KEY`
5. Value: Paste the API key from Step 2
6. Click **Add secret**

### Step 4: Push Workflow and Safety-Net Branches

From your local clone of this repository:

```bash
# Add your fork as a remote (replace YOUR_USERNAME)
git remote add fork https://github.com/YOUR_USERNAME/galaxium-travels.git

# Push the workflow file and runbook
git push fork main

# Push the three safety-net branches
git push fork demo/missing-validation
git push fork demo/off-by-one
git push fork demo/missing-tests
```

### Step 5: Test the Workflow (Pre-Demo)

**IMPORTANT**: Test at least one branch end-to-end before the live demo.

1. Go to your fork on GitHub
2. Click **Pull requests** → **New pull request**
3. Set base: `main`, compare: `demo/missing-validation`
4. Click **Create pull request**
5. Fill in title: "Test: Add user update endpoint"
6. Click **Create pull request**
7. Navigate to **Actions** tab
8. Wait for the `bob-review` workflow to complete (1-2 minutes)
9. Return to the PR - Bob's review should appear as a comment
10. Verify the review mentions:
    - Missing email validation
    - Missing name length checks
    - Security concerns with unvalidated input
11. Close the PR (don't merge) - it's ready to be reopened live

### Step 6: Rehearse the Demo

Follow the choreography in `DEMO_RUNBOOK.md`:

1. Practice opening a PR from one of the safety-net branches
2. Navigate to the Actions tab while the workflow runs
3. Practice showing Bob's review when it appears
4. Time yourself - aim for 5-7 minutes total

**Pro tip**: Have the Actions tab open in a separate browser tab before you start, so you can quickly switch to it.

## Safety-Net Branches Overview

### Branch 1: `demo/missing-validation`
- **What**: User update endpoint without input validation
- **Flaw**: No email format validation, no name length checks
- **Expected review**: Bob points out missing validation and security concerns
- **Files**: `services/user.py`, `server.py`

### Branch 2: `demo/off-by-one`
- **What**: Available seats calculation
- **Flaw**: Uses `<` instead of `<=` (off-by-one error)
- **Expected review**: Bob identifies the comparison bug and explains the scenario
- **Files**: `services/flight.py`

### Branch 3: `demo/missing-tests`
- **What**: Booking count endpoint
- **Flaw**: New function without test coverage
- **Expected review**: Bob notes missing tests and points to existing test patterns
- **Files**: `services/booking.py`, `server.py`

## Quick Pre-Demo Checklist

- [ ] Fork created and accessible
- [ ] `BOBSHELL_API_KEY` secret added to fork
- [ ] Workflow file pushed to fork (`main` branch)
- [ ] All three safety-net branches pushed to fork
- [ ] At least one branch tested end-to-end
- [ ] Bob's review verified to be specific and useful
- [ ] Test PR closed (ready to reopen live)
- [ ] Demo choreography rehearsed
- [ ] Actions tab bookmarked for quick access

## Emergency Contacts

- **Bob Shell docs**: https://bob.ibm.com/docs/shell
- **Workflow file**: `.github/workflows/bob-review.yml`
- **Full runbook**: `DEMO_RUNBOOK.md`

## Troubleshooting

### "Workflow doesn't appear in Actions tab"
- Verify `.github/workflows/bob-review.yml` exists on the `main` branch of your fork
- Check if the PR is marked as draft (workflow skips drafts)

### "Authentication failed" error
- Verify `BOBSHELL_API_KEY` secret is set correctly
- Check API key scope is **Inference** (not Chat or other scopes)
- Regenerate the key if needed

### "Bob's review is too generic"
- Verify you're using one of the safety-net branches (not a random change)
- Check the intentional flaw is present in the branch
- Try a different safety-net branch

## Post-Demo Cleanup

After the demo, you can:

1. Delete the safety-net branches:
   ```bash
   git push fork --delete demo/missing-validation
   git push fork --delete demo/off-by-one
   git push fork --delete demo/missing-tests
   ```

2. Close any open PRs via GitHub UI

3. Optionally delete the fork entirely:
   - Go to fork Settings → Danger Zone → Delete this repository

---

**Ready to go?** Follow the steps above, test one branch, and you're set for the live demo! 🚀
