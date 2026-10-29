# EvidencePilot V2 evidence methodology

EvidencePilot is an investigation aid, not a source of truth. It uses NVIDIA Nemotron through Nebius Token Factory to structure a bounded investigation, then uses Tavily to retrieve live web material.

```text
input → claim extraction → per-claim research plan → targeted Tavily search
      → optional follow-up for weak evidence → evidence comparison → cautious rewrite
```

## Bounded investigation

Each input produces no more than three claims. For each claim, Nemotron normalizes the claim, identifies its type, entities, time sensitivity, required evidence, and up to two targeted queries. EvidencePilot runs the second query only when the first search has fewer than two usable sources or contains only social/commentary/unknown source categories. `MAX_SEARCHES_PER_CLAIM` caps the budget at one or two searches (default two). There are no open-ended loops.

Within one report, identical normalized Tavily queries are coalesced so they consume one search rather than duplicate API usage. The additive `investigation` response field reports elapsed duration, unique searches, follow-up searches, and claims with partial retrieval; it contains no input text, keys, or provider response bodies.

## Source handling

Only public HTTPS URLs can be presented to the model or UI. Duplicate URLs, local addresses, credential-bearing URLs, and malformed URLs are discarded. The system labels sources as primary, academic, established reporting, commentary, social media, or unknown as a retrieval aid—not as a universal credibility score. Search results are ordered using a documented heuristic that combines direct claim-term overlap with source category. Primary documents, academic papers, and established reporting receive a bounded preference only when the title or excerpt is topically relevant; unrelated institutional pages receive no trust boost. This is a prioritization heuristic, never proof of accuracy. Tests cover a Mars claim where NASA must rank ahead of repetitive social media, and the reverse case where an unrelated government document must not outrank a directly relevant source. Available publication dates are preserved. Nemotron must describe the relevance, relationship, and limitations of each cited result. A supported verdict without a cited retrieved URL is downgraded to insufficient evidence.

## Evidence strength

Nemotron returns `strong`, `moderate`, `limited`, or `insufficient` evidence strength, alongside source relationships: supports, contradicts, context, or inconclusive. Strength is a qualitative summary of directness, relevance, corroboration, source category, and limitations; it is not a probability or fact-verification score.

## Evaluation

`evaluations/claims-v1.json` contains ten curated claims across science, history, technology, health, politics, statistics, time-sensitive, ambiguous, and insufficient-evidence scenarios. Each expected outcome is accompanied by an independently checked reference URL. Run `npm run evaluate:live` only after securely configuring provider keys. It prints actual verdicts, citation counts, and elapsed durations; it does not claim accuracy automatically or persist provider data.

## Known limitations

Search ranking can omit decisive material, source categories are fallible, text excerpts can lack context, and generated assessments can be wrong. Time-sensitive claims require especially careful review. Users must open and assess original sources before publishing conclusions.


## Source category and URL hardening (October 2026)

Source categories are assigned using explicitly matched publisher domains and registrable-domain boundaries, never keywords found in titles or excerpts. Thus a page describing itself as "official documentation" cannot gain primary-source priority by that phrase alone. The primary/academic/reporting categories remain fallible source-discovery heuristics, not independent verification or approval of the article's content.

Deduplication retains query parameters used to identify distinct documents and videos, such as `?id=` and `?v=`, while discarding known tracking-only parameters such as `utm_*` and `fbclid` for comparison. Original source URLs are preserved for display. Non-HTTPS URLs, host IP literals, local domain suffixes, URLs containing credentials, oversized source URLs and invalid result entries are rejected before inclusion in AI evidence catalogs.


## Claim fidelity and verdict consistency (October 29, 2026)

Deep Investigation research plans can suggest an alternate normalization of a claim, and models can paraphrase the claim in their assessment response. Neither is allowed to silently replace the extracted claim: searches are ranked for the original extracted wording, the assessment receives that exact wording, and the report keeps it even if a plan, assessment or provider fallback proposes different text. Planner-suggested wording remains visible as contextual metadata, not as the statement being verified.

When deterministic evidence safeguards reduce a model's decisive assessment to `insufficient_evidence` (missing valid citations or incompatible source relationships), the original potentially confident explanation is replaced with a neutral safeguard explanation rather than being displayed alongside the downgraded verdict. Source citations remain available for human inspection. This does not independently validate model claims or guarantee search relevance.
