# The Com'mon People — Interview Prep Report (prototype)

A working prototype of the £45 automated interview prep report concept: paste a job
description and CV, answer a handful of competency questions (by voice or text), and
generate a personalised report — previewed on screen and downloadable as a `.docx`.

This is deliberately built as a **standalone app**, not bolted onto the static
`the-common-people.com` site. Link out to it from the site (e.g. a "Get your
personalised interview prep report" button) once it's hosted somewhere with a URL.

## Run it locally

```bash
cd interview-prep-app
npm install
node server.js
```

Then open `http://localhost:3000`.

## What's real vs. what's a placeholder

This prototype is fully functional end to end — you can go through all three steps and
download a real `.docx` — but three pieces are intentionally stubbed out rather than
wired to paid APIs, so you can review the product before spending anything on it:

| Feature | Status | To go live |
|---|---|---|
| Intake form, CV upload/parsing (.pdf/.docx/.txt) | ✅ Working | — |
| Audio recording in the browser | ✅ Working | — |
| Speech-to-text transcription | ⚠️ Stubbed — falls back to typing | Add `OPENAI_API_KEY`, implement the Whisper call in `server.js` → `/api/transcribe` |
| Company research | ⚠️ Placeholder text | Add `ANTHROPIC_API_KEY`, call Claude with the web-search tool enabled in `lib/reportGenerator.js` → `companyResearch()` |
| STAR answer drafting | ⚠️ Naive rule-based split of the transcript | Replace `draftStarAnswer()` in `lib/reportGenerator.js` with a real model call — same idea, much better output |
| Gap analysis (JD vs CV) | ⚠️ Keyword overlap only | Replace `gapAnalysis()` with a real model call for genuine reasoning (e.g. recognising "Canva" as an adjacent skill to "Adobe") |
| Payment | ⚠️ Stubbed — `/api/checkout` returns a message, not a real session | Add `STRIPE_SECRET_KEY`, create a real Stripe Checkout session, gate `/api/report*` behind a confirmed payment |
| Docx export | ✅ Working | — |

Every stubbed spot is marked `AI UPGRADE POINT` in the code (`lib/reportGenerator.js`
and `server.js`) so they're easy to find.

## Why build it this way

The concept doc recommended a Phase 1 pilot before full automation. This prototype is
that pilot's engine: it proves the user journey (intake → answers → generated report →
download) and the Word-doc export end to end, without spending anything on API calls
until you're confident the flow itself is right. Swapping in real AI calls at the three
marked points is a focused, contained piece of work once you're ready.

## Next steps to go live

1. Decide on hosting (Vercel, Render, Railway or similar all work fine for this stack;
   no special infrastructure needed at this scale).
2. Buy/point a subdomain, e.g. `prep.thecommonpeople.co.uk`.
3. Add `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` as environment variables, then implement
   the three AI upgrade points above.
4. Add `STRIPE_SECRET_KEY`, create a real Checkout session in `/api/checkout`, and gate
   report generation behind a confirmed payment (webhook + short-lived access token is
   the standard pattern).
5. Add a privacy policy and consent step before audio recording starts (see the Legal,
   Data and Trust section of the concept document for what needs covering).
6. Link to it from the relevant Com'mon People guide pages.
