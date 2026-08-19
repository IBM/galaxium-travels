---
name: grill-and-share
description: "Use when the user wants to stress-test and document a plan for demo purposes - asks up to 3 focused questions, then produces a Markdown summary, optionally posts it to the originating GitHub issue as a comment, and finally generates the HTML planning document. Trigger phrases: grill and share, stress-test this plan, review and publish plan, grill my plan."
---

# Grill and Share

You are running a focused planning review. The goal is: ask a few sharp questions, reach a clear shared understanding, then produce polished HTML and Markdown planning documents and (if a GitHub issue is available) post them as a comment.

**Step order matters for live demos:** produce the Markdown first (fast), confirm and post to GitHub, then generate the HTML artifact last (slow).



## Step 1 — Gather the Input

Check what the user has provided. Accept any of the following as input:

- A pasted plan or description in the conversation
- A GitHub issue number or URL (e.g. `#42` or `https://github.com/owner/repo/issues/42`)
- A reference to an existing plan document

If a GitHub issue number/URL was given, fetch its body now:

```bash
gh issue view <number> --json title,body --jq '"# " + .title + "\n\n" + .body'
```

Use the fetched content as the plan to review. If no input is provided at all, ask the user for one before continuing.

## Step 2 — Ask Up to 3 Questions

Identify the **three most important gaps or risks** in the plan. Ask them **one at a time** using `ask_followup_question`, waiting for each answer before continuing. Do not exceed three questions total.

For each question:
- Provide your recommended answer as the first suggestion
- Keep it tight and decision-forcing — no open-ended "tell me more" questions
- If the answer can be determined by exploring the codebase, do that instead of asking

After all questions are answered, summarise the updated understanding in one short paragraph (2–4 sentences). Show it to the user and confirm they are happy before proceeding.


## Step 3 — Markdown Document

Use `write_file` to save a Markdown version on the project root:

Where `<plan-slug>` is a kebab-case slug of the plan title (e.g. `checkout-flow-plan.md`).

If the user provided a markdown file, don't overwrite it. Create a new version with a scripted title in the same location.

Structure the Markdown with: title, summary, key decisions table (Decision | Choice | Rationale), open items (bullet list), next steps (ordered list).


## Step 4 — Confirm Before Posting

Tell the user the Markdown file path. Ask:

> "Are you happy with this? I can post it as a comment to the GitHub issue if you have one."

Use `ask_followup_question` with options:
- "Yes — post to GitHub issue #N" (fill in the issue number if already known)
- "Yes — post to GitHub, let me give you the issue number"
- "No — keep the documents but don't post"

If the user declines, skip to Step 5.


## Step 5 — Post to GitHub Issue

If the user confirmed in Step 4, post the Markdown content as a comment on the issue:

```bash
gh issue comment <number> --body-file <path-to-markdown-file>
```

If the issue number is not yet known, prompt for it first. After posting, confirm with the issue URL:

```bash
gh issue view <number> --json url --jq '.url'
```

Tell the user the comment was posted and show the issue link.


## Step 6 — HTML Planning Document

Use `create_html_artifact` to produce a self-contained HTML one-pager. Structure it as:

- **Title** — the plan name
- **Status badge** — e.g. "Draft · Reviewed"
- **Summary** — the 2–4 sentence synthesis from Step 2
- **Key Decisions** — a table with columns: Decision | Choice | Rationale (one row per question answered)
- **Open Items** — any risks or follow-ups surfaced during the review (bullet list)
- **Next Steps** — ordered list of concrete actions

Follow the standard artifact design rules (single column, ≤760 px, system font, no animations, no external assets).



## Constraints

- Maximum **3 questions** in Step 2 — no more, even if there are more gaps.
- Never post to GitHub without explicit user confirmation in Step 4.
- If `gh` is not installed or not authenticated, skip Step 5 and tell the user why.
- Always produce the HTML artifact in Step 6, even if the user declined to post to GitHub.
- Keep the tone direct and decision-focused — this is a demo tool, not a deep-dive research session.
