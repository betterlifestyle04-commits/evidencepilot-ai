# EvidencePilot — demo and submission runbook

## Before recording (no provider charges)

Run `npm ci`, `npm test`, `npm run lint`, and `npm run build` before release. Then run:

```bash
npm run smoke:demo
```

This calls only the public `/api/health` endpoint; it makes no Nebius or Tavily requests. A `ready` response confirms configured variables are present, **not** that the providers work.

## Two optional real-provider smoke checks

```bash
npm run smoke:demo -- --live
```

These are **exactly two sequential requests** (Quick Check of a false Mars claim, then Deep Investigation of a true Apollo 11 claim). This consumes credits and counts toward the public 3/min/IP rate limit. There is no automatic retry; a client timeout does not mean server-side work has stopped. Use `--url=https://deployment.example.com` to check a different public deployment.

The script reports real HTTP status, verdict, cited-source count, partial analysis state, duration, and request ID. `responseShapeValid` means the report is structurally usable; it **does not** mean the verdict is factually correct. Reference verdicts are expectations, not certificates. Examine the original links if they disagree.

## Three-minute presentation outline

| Recording time | What to demonstrate |
| --- | --- |
| 0:00–0:25 | Explain why unsupported claims need transparent evidence review |
| 0:25–0:55 | Enter a checkable factual statement and run Quick Check |
| 0:55–1:35 | Show the real Deep Investigation workflow and limitations |
| 1:35–2:05 | Open the Investigation Brief and Evidence Coverage Board, inspect an original source |
| 2:05–2:35 | Mark a source reviewed, add a note, and edit a publication draft |
| 2:35–2:50 | Export a JSON report and reopen it locally without more API calls |
| 2:50–3:00 | Explain Nebius Nemotron, Tavily, citation safeguards, and remaining limitations |

Live investigations may outlast the recording slot. You may show a **real previously saved report**, clearly labeled as an imported snapshot. Never present prerecorded or fictional results as live output.

## Submission checklist

Confirm the public Vercel URL opens, configuration-only health check responds, both analysis modes have been tested with real API calls, cited URLs open, saved report export/import works, and no environment secrets appear on screen. Save the production commit SHA and the GitHub Actions run link. Disclose any live-provider failure or unresolved evidence-quality issue rather than hiding it.
