# EvidencePilot V2 evidence methodology

EvidencePilot is an investigation aid, not a source of truth. It uses NVIDIA Nemotron through Nebius Token Factory to structure a bounded investigation, then uses Tavily to retrieve live web material.

```text
input → claim extraction → per-claim research plan → targeted Tavily search
      → optional follow-up for weak evidence → evidence comparison → cautious rewrite
```

## Bounded investigation

Each input produces no more than three claims. For each claim, Nemotron normalizes the claim, identifies its type, entities, time sensitivity, required evidence, and up to two targeted queries. EvidencePilot runs the second query only when the first search has fewer than two usable sources or contains only social/commentary/unknown source categories. `MAX_SEARCHES_PER_CLAIM` caps the budget at one or two searches (default two). There are no open-ended loops.

## Source handling

Only public HTTPS URLs can be presented to the model or UI. Duplicate URLs, local addresses, credential-bearing URLs, and malformed URLs are discarded. The system labels sources as primary, academic, established reporting, commentary, social media, or unknown as a retrieval aid—not as a universal credibility score. Search results are ordered by textual relevance first and source category second, so a directly relevant NASA result can precede a social-media description; the order does not establish truth. Available publication dates are preserved. Nemotron must describe the relevance, relationship, and limitations of each cited result. A supported verdict without a cited retrieved URL is downgraded to insufficient evidence.

## Evidence strength

Nemotron returns `strong`, `moderate`, `limited`, or `insufficient` evidence strength, alongside source relationships: supports, contradicts, context, or inconclusive. Strength is a qualitative summary of directness, relevance, corroboration, source category, and limitations; it is not a probability or fact-verification score.

## Evaluation

`evaluations/claims-v1.json` contains ten curated claims across science, history, technology, health, politics, statistics, time-sensitive, ambiguous, and insufficient-evidence scenarios. Each expected outcome is accompanied by an independently checked reference URL. Run `npm run evaluate:live` only after securely configuring provider keys. It prints actual verdicts, citation counts, and elapsed durations; it does not claim accuracy automatically or persist provider data.

## Known limitations

Search ranking can omit decisive material, source categories are fallible, text excerpts can lack context, and generated assessments can be wrong. Time-sensitive claims require especially careful review. Users must open and assess original sources before publishing conclusions.
