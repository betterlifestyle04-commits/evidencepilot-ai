# EvidencePilot — final Devpost submission checklist (October 30, 2026)

Official rules: https://nebiusglobalaihackathon.devpost.com/rules  
Official overview: https://nebiusglobalaihackathon.devpost.com/  
Deadline: **Friday, October 30, 2026 at 10:00 a.m. PDT = 18:00 Europe/Oslo.**

**DO NOT CONFUSE A SAVED DRAFT WITH A SUBMISSION.** Devpost's October 27 email confirmed an unfinished draft initially named “Untitled.” No later successful-submission confirmation was found in the connected mailbox during the October 30 review. Check Devpost itself before considering it submitted.

**Existing submission editor from the original draft email:**  
https://devpost.com/submit-to/30790-nebius-x-nvidia-global-ai-hackathon/manage/submissions/1268203/edit

## Verifiable requirement inventory

| Official requirement | EvidencePilot status | Action |
| --- | --- | --- |
| Uses Nebius Token Factory / AI Cloud at runtime + an NVIDIA open model | Implemented: Nemotron 3 Super over Token Factory; Quick/Deep live API tests were successful October 30 | Show the **actual** live results in the video. API health alone is not live-provider proof |
| Fits an allowed track | Best Apps and Agents | **Select this track** in Devpost |
| Public functioning application | https://evidencepilot-ai-flame.vercel.app/ | Reopen it signed-out, try an actual claim and a cited source |
| Project description in English | Prepared: [Devpost submission pack](devpost-submission.md) | Paste and review wording; do not overclaim AI factual correctness |
| Public GitHub source + setup instructions | https://github.com/betterlifestyle04-commits/evidencepilot-ai; public `main`, README and `.env.example` | Paste the repository URL |
| Detectable OSI open-source license | `LICENSE` at repository root; GitHub API recognizes **MIT** | Ensure license is visible on GitHub (confirmed in repo API October 30) |
| Public YouTube demo **less than 3:00** | **NOT VERIFIED / USER ACTION REQUIRED** | **Record genuine browser footage**, upload to YouTube with **Public** visibility, paste working watch URL |
| Explain NVIDIA model and Nebius | Prepared in README and Devpost pack | Say **NVIDIA Nemotron 3 Super on Nebius Token Factory** in video and prose |
| Tool feedback | Drafted: [Feedback response](submission-feedback.md) | Check against **your real experience**, paste into Devpost |
| Explain major updates made after Aug 26 if project pre-existed | Documented below | Paste if applicable, without claiming undocumented earlier history |
| English video and testing instructions | Drafted: video script and this page | Use English narration or captions |
| Free, unrestricted judging access | Public demo no account; live server-side provider keys and shared rate limiting | Keep deployment, API credits and Upstash rate limiter functional until **Dec 23, 2026** (end of published judging window); judges could be rate limited during bursts |
| Complete Devpost submission | **Not verified** | Save fields, review preview, press final **Submit** control and verify confirmed submission status before deadline |

**Important:** A running webpage/health endpoint is not equivalent to an independently verified factual answer, a functioning video, or an accepted Devpost entry. Do not mark any as proven without inspecting that exact item.

## Devpost text/field mapping

**Project name:** EvidencePilot  
**Tagline:** Evidence before certainty: traceable AI claim investigations and human-led fact review.  
**Track/category:** Best Apps and Agents  
**Public demo:** https://evidencepilot-ai-flame.vercel.app/  
**Repository:** https://github.com/betterlifestyle04-commits/evidencepilot-ai  
**License:** MIT  
**Built with:** NVIDIA Nemotron 3 Super 120B A12B; Nebius Token Factory; Tavily Search; Next.js 15; React 19; TypeScript; Vercel; Upstash Redis.  
**What it does / how built / challenges / accomplishments / learned / future work:** Copy relevant sections from [docs/devpost-submission.md](devpost-submission.md).  
**Feedback:** [docs/submission-feedback.md](submission-feedback.md) (review first).  
**Video URL:** **USER MUST PROVIDE REAL PUBLIC YOUTUBE URL.** Never substitute a Vercel link, GitHub link, imaginary YouTube URL, or slides-only video.

**Description opening (pasteable):**

> EvidencePilot is an open-source, no-signup evidence investigation workspace for writers, educators, and researchers who need to check facts before publishing. It uses NVIDIA Nemotron 3 Super through Nebius Token Factory to extract checkable claims, plan deeper research when needed, assess retrieved evidence and suggest cautious wording. Tavily provides live web-search results; citations shown in the report are mapped to actual returned URLs. Quick Check reduces calls, while Deep Investigation performs a bounded extra reasoning-and-research workflow. Users can inspect source relationships, record human source-review notes, revise their drafts, export and reopen structured reports, and compare saved investigations locally. EvidencePilot explicitly discloses incomplete evidence and never claims its AI verdicts are independent proof.

**How NVIDIA/Nebius are essential:** `lib/providers.ts` connects to `https://api.tokenfactory.nebius.com/v1/chat/completions` with the NVIDIA `nvidia/nemotron-3-super-120b-a12b` model; runtime calls are made server-side for extraction, plans (Deep mode), per-claim assessment and cautious rewriting where safe. Tavily supplies real retrieval. `lib/analyze.ts` orchestrates bounded workflows; `lib/evidence.ts` validates citation relationships. Do **not** say the app is hosted on Nebius AI Cloud: it is hosted on Vercel and uses Nebius Token Factory inference.

**What changed during the submission period:** The app and working evidence workflow were developed/extended during the 2026 hackathon period, including Quick/Deep model calls, Tavily live retrieval, strict provenance validation, conservative insufficient-evidence downgrades, explicit partial-result handling, shared request rate limits, local report export/import and comparison, human editorial/source-review tools, and accessibility/workflow protections. See commit history and GitHub pull requests #21–#30 for documented late-October improvements. **Only describe an earlier pre-existing project if there actually was one.**

## Last-mile user actions, in order

1. **Record/upload the public YouTube video first** using [docs/demo-video-script.md](demo-video-script.md) and copy its watch URL. The video must show the real application working and name Nemotron/Nebius.
2. Open the **existing draft editor** above; name the project `EvidencePilot` (the October 27 draft email said “Untitled”).
3. Select **Best Apps and Agents**; fill the text fields from the Devpost pack; insert both actual URLs (app and GitHub); fill all required `Built With` fields.
4. Insert **your actual public YouTube URL**; add optional real screenshots or a thumbnail if Devpost allows/requests them.
5. Read the separate [feedback draft](submission-feedback.md) and enter accurate Nebius, NVIDIA and Tavily feedback. Say explicitly that **Nebius AI Cloud was not used**, if the form asks.
6. Review declarations about original work, eligibility and permitted media. Never submit private API keys or someone else's copyrighted material.
7. Click the final **Submit** control (not “Save Draft”), check for a confirmed entry on the hackathon page or a confirmation message, and copy the final public Devpost project URL.
8. Keep https://evidencepilot-ai-flame.vercel.app/ and external credentials/credits operational and free for judges through the **published December 23 judging window**; do not run unnecessary live evaluation loops that consume your credit budget.

## Optional competition upside

Under the official [Rules](https://nebiusglobalaihackathon.devpost.com/rules), functional **Tavily runtime calls** make a qualifying project eligible for the **Best Use of Tavily** bonus prize ($3,000). The sponsor also lists **Most Valuable Feedback** bonus awards. Keep both plainly described; do not claim a prize or guaranteed selection. City Winner requires attending an eligible physical Builders & Brews event; simply living in a city does not qualify.

## No invented results

- Live Nebius/Tavily integration has been checked for one example in both modes, not universally benchmarked.
- EvidencePilot validates link provenance and relationship consistency, **not** whether web pages or AI verdicts are factually correct.
- Public demo success, YouTube visibility and final Devpost submission status must each be checked separately.
- Avoid “proves”, “100% accurate”, “fully autonomous fact-checker”, or “validated all real-world sources” in the pitch.

Last source-check: October 30, 2026. Official requirements may be reflected differently in individual Devpost fields; complete any additional mandatory fields visible in your actual editor.
