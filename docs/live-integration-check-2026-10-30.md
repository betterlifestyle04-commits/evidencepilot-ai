# EvidencePilot public production integration checks — October 30, 2026

These checks were run **once each** against the publicly deployed application at https://evidencepilot-ai-flame.vercel.app/. They submitted the factual test statement "The Apollo 11 Moon landing occurred in July 1969." through the same public `/api/analyze` endpoint used by website visitors.

The test runner used GitHub Actions. It did not receive, log, or require Nebius/Tavily API keys: keys remained configured only on the server. Temporary CI test code was removed from the submission branch after collecting the results. The normal permanent CI suite does not send provider-backed requests.

## Observed results

| Observation | Quick Check | Deep Investigation |
| --- | ---: | ---: |
| HTTP result | 200 | 200 |
| Mode returned by API | `quick` | `deep` |
| Analyzed claims | 1 | 1 |
| Cited HTTPS source links | 4 | 2 |
| Logical Nemotron workflow calls reported by app | 3 | 4 |
| Tavily search calls reported by app | 1 | 1 |
| End-to-end client elapsed time (this single request) | 11.4 s | 20.8 s |
| GitHub test result | 98/98 passed | 98/98 passed |

- [Quick Check CI run and its timestamped logs](https://github.com/betterlifestyle04-commits/evidencepilot-ai/actions/runs/40979325615)
- [Deep Investigation CI run and its timestamped logs](https://github.com/betterlifestyle04-commits/evidencepilot-ai/actions/runs/40979465794)

## What these checks establish

- The public HTTPS deployment accepted actual POSTs using both analysis modes.
- A non-empty structured report containing real HTTPS source links was returned for both cases.
- The production service reported Nemotron workflow stages and at least one Tavily search per mode.
- The temporary end-to-end tests, along with the repository's deterministic suite, passed in CI.

## What they do **not** establish

- No independent assessment of the model's **factual verdict** or retrieval precision was performed by these CI probes.
- The reports' source links were structurally checked as HTTPS URLs, not manually opened and checked for relevance, completeness, or authenticity.
- One response time per mode is **not** a latency benchmark or service-level objective.
- Model-call counts are application-reported logical workflow counts; provider format fallbacks may add network calls.
- Browser interactions (manual review, JSON export/import, desktop/mobile appearance) were not exercised by these HTTP-level tests.
- Results for other topics, scripts, languages, time-sensitive statements, or future deployments remain unverified.

Before final submission, record the website working in a real browser and independently review at least one underlying source, as described in [the demo runbook](demo-runbook.md). Never present these two probes as a universal accuracy certification.
