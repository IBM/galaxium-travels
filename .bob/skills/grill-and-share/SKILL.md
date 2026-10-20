---
name: grill-and-share
description: "Use when the user wants to stress-test and document a plan for demo purposes - asks at most 3 focused questions, then writes a Markdown plan, posts it to the originating GitHub issue if one exists (otherwise saves it to .bob/planning-artifacts/), and always creates a human-readable HTML version. Trigger phrases: grill and share, stress-test this plan, review and publish plan, grill my plan."
---

# Grill and Share

Run a focused planning review: ask a few sharp questions, reach a clear shared understanding, write the plan down, publish it, and always produce an HTML version.

**Step order matters for live demos:** Markdown first (fast), publish, then HTML last (slow).

## Step 1 — Gather the Input

Accept any of: a pasted plan, a GitHub issue number or URL, or a reference to an existing plan document.

If a GitHub issue number/URL was given, remember it as the target issue and fetch its body:

```bash
gh issue view <number> --json title,body --jq '"# " + .title + "\n\n" + .body'
```

Use the fetched content as the plan. If no input is provided at all, ask the user for one before continuing.

## Step 2 — Ask Up to 3 Questions

Identify the three most important gaps or risks. Ask them one at a time with `ask_followup_question`, waiting for each answer. Never exceed three.

- Give your recommended answer as the first suggestion.
- Keep questions decision-forcing, not open-ended.
- If the codebase can answer it, explore the codebase instead (this does not count toward the three).

Then summarise the updated understanding in 2–4 sentences and confirm the user is happy before proceeding.

## Step 3 — Markdown Document

Use `write_file` to save `.bob/planning-artifacts/<plan-slug>.md` (kebab-case slug of the plan title; the folder is created automatically). Never overwrite a user-provided plan file; write a new file instead.

Structure: title, summary, key decisions table (Decision | Choice | Rationale), open items (bullets), next steps (ordered list).

## Step 4 — Publish

1. **Find the issue.** Use the issue from Step 1 if there is one. Otherwise run `gh issue list --search "<plan title>" --limit 5`. If `gh` is missing, unauthenticated, or no issue clearly matches, treat it as "no issue".
2. **Issue available:** tell the user which issue (number and title) you are about to post to, and confirm with `ask_followup_question` (options: post to #N / post to a different issue / don't post). On confirmation:

   ```bash
   gh issue comment <number> --body-file .bob/planning-artifacts/<plan-slug>.md
   gh issue view <number> --json url --jq '.url'
   ```

   Show the issue link.
3. **No issue, or user declined:** the Markdown already lives in `.bob/planning-artifacts/`. Tell the user the path.

## Step 5 — HTML Planning Document (always)

Use `write_file` to create `.bob/planning-artifacts/<plan-slug>.html`, even if nothing was posted. Self-contained: inline CSS, no external assets, single column ≤760px, system font, no animations.

Sections: title, status badge ("Draft · Reviewed"), summary, key decisions table, open items, next steps. Tell the user the file path.

## Constraints

- Maximum 3 questions.
- Never post to GitHub without explicit user confirmation in Step 4.
- Always produce the HTML in Step 5.
- Keep the tone direct and decision-focused.
