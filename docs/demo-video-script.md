# EvidencePilot — final YouTube demonstration recording script

**Submission:** [Nebius × NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/rules) — Best Apps and Agents.  
**Video duration target:** **2:35–2:45**, strictly **under 3:00**.  
**Required publishing:** Upload to **YouTube**, set **Visibility: Public**, paste the public watch URL into the Devpost entry **before October 30, 2026, 18:00 Oslo time**.  
**Important:** Judges must see **actual functioning desktop-browser footage**, not a mockup, animated recreation, static presentation, or an invented AI answer.

## Prepare the actual screen recording

1. Visit https://evidencepilot-ai-flame.vercel.app/ in a clean desktop browser. Hide notifications, personal tabs, passwords, console logs and browser extensions you do not want public.
2. Test the full UI first. Use **Quick Check** with: `Apollo 11 landed humans on the Moon in July 1969.` Then open an actually retrieved source and confirm it discusses the claim. Do not promise the model will return any specific verdict or URL.
3. Use **Deep Investigation** with the same claim or another simple factual claim, after respecting the public demo rate limit (three analyses/minute/IP). Confirm the finished report actually appears.
4. Inspect the Evidence Coverage Board, cited URLs, Source Review Desk, Human Editorial Desk and the export/reopen JSON flow. For a reopened report, leave its **Saved Snapshot** warning visible.
5. Record on your Windows PC using **Snipping Tool screen recording**, **OBS Studio**, or another local screen recorder. Record at 1080p if available. Keep the browser zoom legible (100–125%).
6. Record working Quick and Deep runs separately, then trim and join clips so the edited final video stays under three minutes. **If an operation is accelerated, caption it `Real analysis — waiting time trimmed`**. Do not invent responses, citations, timestamps or test results.
7. Add spoken narration or readable English captions. No copyrighted music, third-party stock footage, or unlicensed logos. Include the name **NVIDIA Nemotron 3 Super**, **Nebius Token Factory**, and **Tavily** clearly in audio or captions.
8. Review the uploaded **public** YouTube link while signed out or in an incognito browser. **Unlisted/private is not the required Public visibility**.

## Storyboard and narration (example; edit to match what the footage actually shows)

| Timeline | Required real footage | Suggested narration |
| --- | --- | --- |
| 0:00–0:15 | Live homepage, logo and input | “AI can answer confidently even when the evidence is weak. EvidencePilot helps writers and researchers investigate factual claims before they publish.” |
| 0:15–0:40 | Paste Apollo 11 statement; click Quick Check; cut to the **actual** completed report | “I enter a claim and start a Quick Check. NVIDIA Nemotron 3 Super, running through Nebius Token Factory, extracts checkable statements and examines results retrieved with Tavily.” |
| 0:40–1:06 | Show verdict, explanation, HTTPS citation URLs; **open a real retrieved source** | “Instead of inventing citations, EvidencePilot maps the AI's source references back to live search results. Every verdict is tied to its retrieved evidence, and users are warned to verify the original pages.” |
| 1:06–1:32 | Show Deep Investigation mode and a **real** completed Deep report | “Deep Investigation adds a bounded research plan and can search again when the first retrieval is weak. It shows the reasoning trail and uncertainty rather than a made-up confidence percentage.” |
| 1:32–1:58 | Evidence Coverage Board, source-review checkbox and an editable source note | “The evidence workspace lets me see what was assessed, inspect limitations, and record which original sources I personally reviewed.” |
| 1:58–2:23 | Human Editorial Desk, edit wording, export JSON | “I can choose editorial decisions, improve the draft myself and export a structured record. My edits are not falsely presented as model-verified.” |
| 2:23–2:40 | Reopen a saved report with visible warning; briefly show public GitHub MIT and README | “I can reopen a local report without new AI calls. The full MIT-licensed Next.js app is open source, and the public demo requires no account. EvidencePilot is research assistance, not a truth machine.” |

**Do not force a 2:40 runtime if the genuine footage needs longer.** Cut pauses/animations; prioritize live model interaction, concrete sources and a clear model-and-infrastructure explanation. A 2:20 credible demonstration beats a 2:59 slideshow.

### On-screen text for the final frame

**EvidencePilot** · Evidence before certainty  
**NVIDIA Nemotron 3 Super** on **Nebius Token Factory** · **Tavily Search**  
https://evidencepilot-ai-flame.vercel.app/  
https://github.com/betterlifestyle04-commits/evidencepilot-ai  
*AI-assisted research; review cited primary sources.*

## Suggested YouTube metadata

**Video title:** EvidencePilot | NVIDIA Nemotron on Nebius Token Factory | AI Evidence Investigations

**Description:**  
“EvidencePilot is an open-source, evidence-first research assistant built for the 2026 Nebius × NVIDIA Global AI Hackathon — Best Apps and Agents track. Watch a real Quick Check and Deep Investigation using NVIDIA Nemotron 3 Super on Nebius Token Factory, Tavily live research, provenance-linked citations and human editorial review. Results require independent checking; this is not a factual accuracy benchmark.

Live app: https://evidencepilot-ai-flame.vercel.app/  
Open-source GitHub: https://github.com/betterlifestyle04-commits/evidencepilot-ai”

**YouTube upload checklist:** title entered; actual footage included; public visibility; link tested signed out; duration under three minutes; no sensitive data visible; link pasted in Devpost; submission marked finalized.

## If you have little time

Record a single clean screen capture of a real Quick Check, opening an actual retrieved URL, showing the Human Editorial Desk, and the GitHub README. Explain Nebius Token Factory / NVIDIA Nemotron aloud. This is more useful than missing the deadline while editing a perfect video.

**Never upload a generated presenter-only video as a substitute for real working application footage.**
