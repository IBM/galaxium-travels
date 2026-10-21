---
name: trust-boundary-audit
description: Audits API request handling for client-controlled values, mass assignment, and missing business limits, against OWASP ASVS 4.0.
user-invocable: true
---

Audit only the files the prompt names. Work through these phases in order.

## Phase 1: Map the trust boundary
For each endpoint, list every request field a client controls and what the server does with it.

## Phase 2: Check the controls
Record PASS or FAIL for each control. For every FAIL, record the file and line.
- V5.1.2: The framework or code protects against mass parameter assignment.
- V5.1.3: All input is validated against an allow list of expected fields and values.
- V11.1.4: The application limits excessive business requests, such as one user holding too much inventory.
- V11.1.5: The application has business logic limits that protect against likely abuse, such as a client setting its own price.

## Phase 3: Report findings
For each FAIL, write:
- Rule: ASVS control
- Severity: Critical, High, Medium, or Low
- File and line
- Issue: one sentence
- Fix: one sentence

The app has no authentication yet. Don't report missing authentication or authorization; it is out of scope for this audit.

Save the findings to the file the prompt names, then stop.
