const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, convertInchesToTwip
} = require("docx");

const NAVY = "1F3864";
const ACCENT = "2E74B5";
const GREY = "595959";

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    border: { bottom: { color: NAVY, space: 4, style: BorderStyle.SINGLE, size: 8 } },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 30 })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, bold: true, color: ACCENT, size: 24 })],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 21, italics: opts.italics || false, bold: opts.bold || false })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 21 })],
  });
}
function note(text) {
  return new Paragraph({
    spacing: { after: 200 },
    shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
    children: [new TextRun({ text, italics: true, size: 20, color: GREY })],
  });
}
function tableCell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 3000, type: WidthType.DXA },
    shading: opts.header ? { type: ShadingType.CLEAR, fill: NAVY } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, bold: !!opts.header, color: opts.header ? "FFFFFF" : "000000" })],
    })],
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.18) } } } }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 } } },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "The Com'mon People", bold: true, size: 40, color: NAVY })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "AI Interview Prep Reports — Product Concept", bold: true, size: 26, color: ACCENT })] }),
      new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: "Prepared for Neil Copping  |  21 July 2026", size: 20, color: GREY, italics: true })] }),

      h1("1. The Idea, in One Line"),
      p("A jobseeker pastes in a job spec, uploads their CV, and records themselves answering a short set of tailored competency questions. Within minutes they get back a personalised interview prep report — company research, a tailored opening pitch, an honest gap analysis against the job, STAR-structured answers built from their own words, and questions to ask the interviewer — for a one-off £45, no subscription, no sign-up required beyond payment."),
      note("This document is the report you're reading, generalised into a product: the manual process just proved out is the spec for the automated one."),

      h1("2. Why This, Why Now, Why You"),
      bullet("The Com'mon People already publishes free interview-prep content and has an engaged audience through the Loudspeaker newsletter — people who trust the advice and are already primed for a paid, deeper version of it."),
      bullet("You've just proven the process works end to end: research, pitch, gap analysis, STAR answers, questions to ask. It's repeatable and produces something genuinely tailored, not generic."),
      bullet("There's a real gap in the market: AI mock-interview subscriptions are impersonal and ongoing; human coaching is excellent but expensive and requires booking a slot. Nothing sits in between as a one-off, deeply personalised, affordable deliverable."),

      h1("3. Market and Pricing Benchmark"),
      p("A quick scan of comparable services to sanity-check £45:"),
      new Table({
        width: { size: 9600, type: WidthType.DXA },
        columnWidths: [3000, 3600, 3000],
        rows: [
          new TableRow({ children: [tableCell("Category", { header: true, width: 3000 }), tableCell("Examples", { header: true, width: 3600 }), tableCell("Typical price", { header: true, width: 3000 })] }),
          new TableRow({ children: [tableCell("AI mock-interview subscriptions", { width: 3000 }), tableCell("OphyAI, Yoodli, Big Interview, Final Round AI", { width: 3600 }), tableCell("$9–150 per month, ongoing", { width: 3000 })] }),
          new TableRow({ children: [tableCell("Human interview coaching, one session", { width: 3000 }), tableCell("Graduate Coach, Your Interview Coach, Alice Stapleton", { width: 3600 }), tableCell("£45–£250 per hour; most £125–£250", { width: 3000 })] }),
          new TableRow({ children: [tableCell("Free / basic ATS CV checkers", { width: 3000 }), tableCell("TopCV, LiveCareer, JobSpace AI", { width: 3600 }), tableCell("Free", { width: 3000 })] }),
          new TableRow({ children: [tableCell("Paid CV review, one-off", { width: 3000 }), tableCell("My CV Check, mid-market CV writers", { width: 3600 }), tableCell("£4.99–£249", { width: 3000 })] }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 160 } }),
      p("£45 sits below almost all human coaching and well above free AI checkers — but unlike a subscription, it buys one finished, tailored deliverable rather than a tool you have to keep working yourself. Positioning: cheaper than a coach, smarter than a generic subscription, done in one sitting."),

      h1("4. Target Customer"),
      bullet("Mid-to-senior professionals with a real interview booked in the next one to three weeks, who want to walk in prepared but don't want to spend £150–250+ on a coaching session."),
      bullet("Existing Com'mon People and Loudspeaker newsletter subscribers — warm, already trust the brand's advice."),
      bullet("Potential B2B channel: recruiters (Tate and others) offering it as a value-add to candidates they've placed into interview, either gifted or sold at a bulk rate."),

      h1("5. Product and User Journey"),
      bullet("1. Land on a Com'mon People page — “Get your personalised interview prep report” — and pay £45 via Stripe Checkout."),
      bullet("2. Fill in a short intake form: paste or upload the job description, upload a CV, add company name and interview date."),
      bullet("3. Record verbal answers to five to eight competency questions, tailored to the job spec, via the browser microphone (two to three minutes each)."),
      bullet("4. Behind the scenes: transcribe the audio, research the company, compare the CV against the job spec, and draft STAR answers from the transcript, an opening pitch, and questions to ask."),
      bullet("5. Deliver the finished report by email as a Word document and a web page, within roughly ten to fifteen minutes, with links back to the relevant Com'mon People articles for anyone who wants to go deeper."),
      bullet("6. Optional upsell: a 20-minute live review call with you, layered on top of the report."),

      h1("6. What's in the Report"),
      p("Mirrors the structure just built for you: a company snapshot and researched values, a tailored opening pitch, weaknesses against the job description with practical solutions, competency-based questions with STAR answers drawn from the candidate's own verbal input, and a set of questions to ask the interviewer."),

      h1("7. Pricing and Packaging"),
      bullet("Standard: £45 one-off report, as scoped above."),
      bullet("Coaching add-on: £29 for a 20-minute live call with you, built around the candidate's own finished report, offered as an opt-in upsell after the report is generated — not bundled into the base fee. Total order value if taken: £74."),
      bullet("Why an add-on and not bundled in: the report's margin only works because it costs pennies to generate. A 20-30 minute call is real time, worth £60-165/hour at comparable coaching rates — giving it away inside £45 either loses money or silently caps volume. As a priced add-on, only people who actively want the extra layer pay for it, and it becomes its own healthy revenue line rather than an unpriced cost centre."),
      bullet("Capacity: since this is your time, not a server, availability needs a hard limit — e.g. a fixed set of weekly evening slots (built as a simple slot-booking flow in the prototype: Monday-Thursday, 18:00-20:00 UK time, 20-minute slots, 14 days ahead). Booking should be gated behind confirmed payment for the add-on once Stripe is wired up."),
      bullet("Possible B2B channel: recruiters buy credits in bulk to offer placed candidates as a value-add, or refer candidates in exchange for a revenue share."),

      h1("8. Tech Architecture"),
      p("The Com'mon People site today is a static HTML site with no backend, database or payment processing built in. Rather than bolt this onto it directly, the cleanest approach is a small, separate web app that the static site links out to:"),
      bullet("Frontend: a lightweight web app for the intake form, microphone recording, payment and report viewer — no need for full user accounts at this stage, an email-plus-Stripe-receipt flow is enough to start."),
      bullet("Payments: Stripe Checkout — handles cards, receipts and, later, subscriptions or bundles with minimal build effort."),
      bullet("CV handling: parse uploaded PDF or Word files to extract text."),
      bullet("Speech: browser microphone recording, uploaded and transcribed via a speech-to-text API."),
      bullet("Report generation: an AI model call that combines the CV, job description, transcript and researched company facts into the report content, then renders it into a downloadable Word document and a web page using the same structure as this document."),
      bullet("Storage: CVs, audio and transcripts stored securely and encrypted, with a clear retention and deletion policy."),
      bullet("Hosting: a standard, low-cost cloud host is more than enough at low volume — no need to over-build before there's demand."),

      h1("9. Unit Economics"),
      p("Rough marginal cost per report, based on current API pricing:"),
      new Table({
        width: { size: 9600, type: WidthType.DXA },
        columnWidths: [4800, 4800],
        rows: [
          new TableRow({ children: [tableCell("Cost item", { header: true, width: 4800 }), tableCell("Estimated cost", { header: true, width: 4800 })] }),
          new TableRow({ children: [tableCell("Transcription (~15 minutes of audio)", { width: 4800 }), tableCell("≈ £0.07", { width: 4800 })] }),
          new TableRow({ children: [tableCell("AI report generation (research, pitch, gaps, STAR answers)", { width: 4800 }), tableCell("≈ £0.50–£1.20", { width: 4800 })] }),
          new TableRow({ children: [tableCell("Stripe payment processing (≈1.5% + 20p on £45)", { width: 4800 }), tableCell("≈ £0.88", { width: 4800 })] }),
          new TableRow({ children: [tableCell("Hosting and infrastructure (allocated)", { width: 4800 }), tableCell("≈ £0.50–£1.00", { width: 4800 })] }),
          new TableRow({ children: [tableCell("Total marginal cost per report", { width: 4800, header: false }), tableCell("≈ £2–£3.50", { width: 4800 })] }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 160 } }),
      p("That leaves roughly £41–43 of gross margin per report — well over 90%. The real cost of this idea is the one-off build effort and ongoing quality control, not the per-report AI spend."),
      p("The £29 coaching add-on works differently: near-zero marginal cost to run (a booking record, not an API call), but bounded by your calendar rather than by money. Treat it as a time-for-money line, not a scalable software margin — the cap on how many you can sell each week is your available evening slots, not server capacity."),

      h1("10. Content and Marketing Integration"),
      bullet("Add a call-to-action to every relevant free article on the site — “how to prepare for an interview,” “the STAR technique,” “questions to ask in an interview” — linking through to the paid report."),
      bullet("Promote through the Loudspeaker newsletter, ideally with a real case study or testimonial — this report is effectively the pilot case study."),
      bullet("Keep the general advice free, as now, and reserve true personalisation — built from someone's actual job spec, CV and voice — as the paid layer. Consistent with the site's existing ethos of sharing best practice openly."),

      h1("11. Legal, Data and Trust"),
      bullet("Short answer to \"do we need a security system and GDPR statement\": yes to both, and it's not optional once real people's CVs, voice recordings and contact details are flowing through this. CVs and booking details count as personal data under UK GDPR the moment a real user submits one, prototype or not."),
      bullet("A published privacy notice is required by law (UK GDPR Article 13) — it must say what's collected, why, the lawful basis, how long it's kept, who it's shared with (Anthropic, OpenAI and Stripe once wired up, all acting as processors), and how someone can ask for their data to be deleted. A first draft of this is provided alongside this document, ready to publish as a page on the site."),
      bullet("Explicit consent required before recording audio, with an option to delete the recording once transcribed — the app should show this consent line before the first recording, not bury it in a policy nobody reads."),
      bullet("Security basics for this scale of app: secrets only ever in environment variables (never in code or GitHub), file upload size/type limits enforced server-side, the CV/JD/audio files already deleted immediately after processing (already true in the prototype), booking data kept in a location that isn't publicly web-accessible, and HTTPS end-to-end (already covered by the Cloudflare + Render setup)."),
      bullet("Important limitation to flag now: the prototype's booking data is stored in a plain file on the server's disk. On Render's free tier this storage does not persist across restarts or redeploys — bookings could be silently lost. Before taking real bookings, this needs either Render's paid persistent disk or (better) a proper database."),
      bullet("Include a clear disclaimer that the report is preparation guidance, not a guarantee of interview success, and that AI-generated content should be reviewed by the candidate before use."),
      bullet("Decide a fair quality/refund policy up front — a free regeneration or partial refund option protects trust in the Com'mon People brand if a report disappoints."),

      h1("12. MVP Scope and Roadmap"),
      bullet("Phase 1 — pilot: a lighter, partly human-assisted version (using this exact manual process) for five to ten real users, to validate demand and quality before investing in full automation."),
      bullet("Phase 2 — automate: self-serve checkout, real-time transcription and report generation, delivered without manual intervention."),
      bullet("Phase 3 — expand: the premium live-review tier, a recruiter/B2B channel, a cached company-research library for frequently-interviewed-for employers, and potentially a live follow-up question simulator."),

      h1("13. Risks and Mitigations"),
      bullet("Quality and accuracy: AI-generated reports can be generic or get facts wrong when public information is thin (as happened with parts of the Driver Require research here). Mitigate with clear sourcing and caveats in the report, and a light human QA pass during the pilot phase."),
      bullet("Reputational risk: as a recruiter-facing brand, a poor-quality report could damage trust. Mitigate by piloting with a small group and gathering feedback before wider promotion."),
      bullet("Competitive risk: cheap or free AI tools are proliferating. Differentiate on genuine personalisation — real company research plus the candidate's actual CV, job spec and voice — and on the Com'mon People brand and community trust."),
      bullet("Cost risk: covered by the strong margins calculated above, even allowing for price rises in underlying AI APIs."),

      h1("14. Next Steps to Start Building"),
      bullet("Confirm the Phase 1 pilot approach — lightweight and partly human-assisted, five to ten real users, before committing to a full automated build."),
      bullet("Decide who builds it and how — you, a developer, or a no-code/low-code starting point — and confirm a rough budget and timeline."),
      bullet("Finalise the exact set of verbal competency questions and the report template, reusing the structure already built in this document."),
      bullet("Set up the Stripe payment page and the intake form."),
      bullet("Run the pilot with a handful of Com'mon People subscribers, at a discounted or free rate, to gather real testimonials before public launch."),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("The_Commmon_People_Interview_Prep_Product_Concept.docx", buffer);
  console.log("done");
});
