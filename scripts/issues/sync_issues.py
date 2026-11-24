#!/usr/bin/env python3
"""Make the GitHub issue list match issues/manifest.json.

The issues are the exercise backlog for demos. Their titles, bodies, labels and
open/closed state live in issues/ and are applied to GitHub by this script, so
the list can be put back to a known "resting state" after any demo.

    python3 scripts/issues/sync_issues.py check              # offline: validate manifest and bodies
    python3 scripts/issues/sync_issues.py plan               # dry run: print what would change
    python3 scripts/issues/sync_issues.py apply              # make the changes
    python3 scripts/issues/sync_issues.py apply --comments   # also delete comments on managed open issues

At rest a managed open issue has the manifest's title, body and labels, and no
assignee, milestone, blocked-by link or (with --comments) comment. Issues the
manifest marks closed are closed with a short comment and otherwise left alone.
Issues that are not in the manifest are reported and never touched.

`plan` reads through `gh`; if `gh` cannot reach the repo it falls back to the
public API without a login. `apply` always needs `gh` with write access.
"""
import fnmatch
import json
import pathlib
import re
import subprocess
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
ISSUES_DIR = ROOT / "issues"
MANIFEST = ISSUES_DIR / "manifest.json"
SECTIONS = ["Gap", "Scope", "Touches", "Size", "Acceptance criteria", "Verify"]
VERDICTS = {"ready", "needs-info", "needs-human"}


def load():
    return json.loads(MANIFEST.read_text())


def body_text(entry):
    return (ISSUES_DIR / entry["body"]).read_text().strip() + "\n"


def label(entry):
    return f"#{entry['number']}" if entry.get("number") else f"new:{entry['key']}"


# ---------------------------------------------------------------- check

def touched_paths(body):
    """Yield (path, is_new) for each bullet of the Touches section."""
    m = re.search(r"^### Touches\n(.*?)(?=^### |\Z)", body, re.S | re.M)
    for line in (m.group(1) if m else "").splitlines():
        hit = re.match(r"\s*- `([^`]+)`(.*)", line)
        if hit:
            yield hit.group(1), "(new)" in hit.group(2)


def check(manifest):
    errors = []
    known = set(manifest["labels"])
    seen = set()
    for e in manifest["issues"]:
        name = label(e)
        ident = e.get("number") or e["key"]
        if ident in seen:
            errors.append(f"{name}: listed twice")
        seen.add(ident)
        if e["state"] == "closed":
            if not e.get("number"):
                errors.append(f"{name}: a closed entry needs a number")
            continue
        for l in e["labels"]:
            if l not in known:
                errors.append(f"{name}: label '{l}' is not defined in the manifest")
        for prefix in ("size/", "area/"):
            if sum(l.startswith(prefix) for l in e["labels"]) != 1:
                errors.append(f"{name}: needs exactly one {prefix}* label")
        if e.get("expected_verdict") not in VERDICTS:
            errors.append(f"{name}: expected_verdict must be one of {sorted(VERDICTS)}")
        path = ISSUES_DIR / e["body"]
        if not path.exists():
            errors.append(f"{name}: body file {e['body']} is missing")
            continue
        body = path.read_text()
        for s in SECTIONS:
            if f"### {s}\n" not in body:
                errors.append(f"{name}: body has no '### {s}' section")
        paths = list(touched_paths(body))
        if not paths:
            errors.append(f"{name}: Touches lists no files")
        for p, is_new in paths:
            exists = (ROOT / p).exists()
            if not is_new and not exists:
                errors.append(f"{name}: Touches names {p}, which does not exist")
            if is_new and exists:
                errors.append(f"{name}: Touches marks {p} as new, but it exists")
    return errors


# ---------------------------------------------------------------- GitHub access

class GitHub:
    def __init__(self, repo, allow_anonymous):
        self.repo = repo
        self.anonymous = False
        try:
            self._gh("api", f"repos/{repo}", "--jq", ".id")
        except (subprocess.CalledProcessError, FileNotFoundError) as err:
            if not allow_anonymous:
                reason = getattr(err, "stderr", "") or str(err)
                sys.exit(f"gh cannot reach {repo}: {reason.strip()}")
            self.anonymous = True
            print(f"note: gh cannot reach {repo}; reading through the public API without a login\n")

    def _gh(self, *args, stdin=None):
        return subprocess.run(["gh", *args], check=True, capture_output=True, text=True, input=stdin).stdout

    def get(self, path):
        """GET a list endpoint, following pages."""
        if not self.anonymous:
            pages = json.loads(self._gh("api", "--paginate", "--slurp", f"repos/{self.repo}/{path}"))
            return [x for page in pages for x in page]
        out, page = [], 1
        sep = "&" if "?" in path else "?"
        while True:
            url = f"https://api.github.com/repos/{self.repo}/{path}{sep}per_page=100&page={page}"
            req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "issue-sync"})
            chunk = json.load(urllib.request.urlopen(req))
            out += chunk
            if len(chunk) < 100:
                return out
            page += 1

    def send(self, method, path, payload=None):
        args = ["api", "-X", method, f"repos/{self.repo}/{path}"]
        if payload is None:
            return self._gh(*args)
        return self._gh(*args, "--input", "-", stdin=json.dumps(payload))


# ---------------------------------------------------------------- plan and apply

def build_plan(manifest, gh, with_comments):
    """Return (steps, notes). A step is (description, callable)."""
    steps, notes = [], []
    live = {i["number"]: i for i in gh.get("issues?state=all") if "pull_request" not in i}

    existing = {l["name"] for l in gh.get("labels")}
    for name, spec in manifest["labels"].items():
        if name not in existing:
            steps.append((f"create label '{name}'", lambda n=name, s=spec: gh.send(
                "POST", "labels", {"name": n, "color": s["color"], "description": s["description"]})))

    for m in gh.get("milestones?state=all"):
        if any(fnmatch.fnmatch(m["title"], pat) for pat in manifest["demo_milestones"]):
            steps.append((f"delete milestone '{m['title']}'",
                          lambda num=m["number"]: gh.send("DELETE", f"milestones/{num}")))

    for e in manifest["issues"]:
        n = e.get("number")
        if n is None:
            steps.append((f"create issue '{e['title']}' {sorted(e['labels'])}", lambda e=e: create(gh, e)))
            continue
        cur = live.get(n)
        if cur is None:
            notes.append(f"#{n} is in the manifest but not on GitHub")
            continue

        if e["state"] == "closed":
            if cur["state"] == "open":
                steps.append((f"#{n} close as {e['state_reason']}: {cur['title']}", lambda e=e: close(gh, e)))
            continue

        patch, changes = {}, []
        if cur["state"] != "open":
            patch["state"] = "open"
            changes.append("reopen")
        if cur["title"] != e["title"]:
            patch["title"] = e["title"]
            changes.append("title")
        if (cur["body"] or "").strip() != body_text(e).strip():
            patch["body"] = body_text(e)
            changes.append("body")
        have = sorted(l["name"] for l in cur["labels"])
        if have != sorted(e["labels"]):
            patch["labels"] = e["labels"]
            add, rm = sorted(set(e["labels"]) - set(have)), sorted(set(have) - set(e["labels"]))
            changes.append(f"labels +{add} -{rm}")
        if cur["assignees"]:
            patch["assignees"] = []
            changes.append("clear assignees")
        if cur.get("milestone"):
            patch["milestone"] = None
            changes.append(f"clear milestone '{cur['milestone']['title']}'")
        if patch:
            steps.append((f"#{n} " + ", ".join(changes), lambda n=n, p=patch: gh.send("PATCH", f"issues/{n}", p)))

        if (cur.get("issue_dependencies_summary") or {}).get("blocked_by"):
            for b in gh.get(f"issues/{n}/dependencies/blocked_by"):
                steps.append((f"#{n} remove blocked-by #{b['number']}", lambda n=n, bid=b["id"]: gh.send(
                    "DELETE", f"issues/{n}/dependencies/blocked_by/{bid}")))

        if cur["comments"]:
            if with_comments:
                for c in gh.get(f"issues/{n}/comments"):
                    steps.append((f"#{n} delete comment by {c['user']['login']} ({c['created_at'][:10]})",
                                  lambda cid=c["id"]: gh.send("DELETE", f"issues/comments/{cid}")))
            else:
                notes.append(f"#{n} has {cur['comments']} comment(s); add --comments to delete them")

    managed = {e["number"] for e in manifest["issues"] if e.get("number")}
    for n, cur in sorted(live.items()):
        if cur["state"] == "open" and n not in managed:
            why = manifest["unmanaged"].get(str(n), "not in the manifest")
            notes.append(f"#{n} left alone ({why}): {cur['title']}")
    return steps, notes


def create(gh, entry):
    out = json.loads(gh.send("POST", "issues", {
        "title": entry["title"], "body": body_text(entry), "labels": entry["labels"]}))
    manifest = load()
    for e in manifest["issues"]:
        if e.get("key") == entry["key"]:
            e["number"] = out["number"]
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"       created #{out['number']} and recorded it in the manifest")


def close(gh, entry):
    n = entry["number"]
    if entry.get("close_comment"):
        gh.send("POST", f"issues/{n}/comments", {"body": entry["close_comment"]})
    gh.send("PATCH", f"issues/{n}", {"state": "closed", "state_reason": entry["state_reason"],
                                     "assignees": [], "milestone": None})


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd not in ("check", "plan", "apply"):
        print(__doc__)
        sys.exit(1)
    manifest = load()
    errors = check(manifest)
    for err in errors:
        print("ERROR  " + err)
    if errors:
        sys.exit(f"\n{len(errors)} problem(s) in issues/. Nothing was sent to GitHub.")
    if cmd == "check":
        opened = sum(e["state"] == "open" for e in manifest["issues"])
        print(f"OK: {opened} open and {len(manifest['issues']) - opened} closed issues, all Touches paths resolve.")
        return

    apply = cmd == "apply"
    gh = GitHub(manifest["repo"], allow_anonymous=not apply)
    steps, notes = build_plan(manifest, gh, "--comments" in sys.argv)
    for note in notes:
        print("note   " + note)
    if not apply:
        for desc, _ in steps:
            print("would  " + desc)
        print(f"\n{len(steps)} change(s). Run with 'apply' to make them.")
        return
    # Each step is one request, so print it as it runs rather than all up front.
    failed = 0
    for i, (desc, fn) in enumerate(steps, 1):
        print(f"[{i}/{len(steps)}] {desc}", flush=True)
        try:
            fn()
        except subprocess.CalledProcessError as err:
            failed += 1
            print(f"       FAILED: {err.stderr.strip()}")
    print(f"Done: {len(steps) - failed} applied, {failed} failed.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
