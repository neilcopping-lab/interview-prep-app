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
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: ACCENT, size: 24 })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22 })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 21, italics: opts.italics || false })],
  });
}

function starLine(label, text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 21, color: ACCENT }),
      new TextRun({ text, size: 21 }),
    ],
  });
}

function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 100 },
    children: [
      opts.bold ? new TextRun({ text: opts.bold, bold: true, size: 21 }) : new TextRun({ text: "", size: 21 }),
      new TextRun({ text, size: 21 }),
    ],
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
      children: [new TextRun({
        text, size: 20, bold: !!opts.header || !!opts.boldText,
        color: opts.header ? "FFFFFF" : "000000",
      })],
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
    properties: { page: { size: { width: 11906, height: 16838 } } }, // A4
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: "Interview Preparation", bold: true, size: 40, color: NAVY })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: "Marketing Manager (Maternity Cover) — Driver Require", bold: true, size: 26, color: ACCENT })],
      }),
      new Paragraph({
        spacing: { after: 400 },
        children: [new TextRun({ text: "Prepared for Neil Copping  |  21 July 2026", size: 20, color: GREY, italics: true })],
      }),

      // ---------------- COMPANY RESEARCH ----------------
      h1("1. Company Research"),
      h2("Snapshot"),
      bullet("Founded in 2000 by Steve Prince, with its first office in Stevenage, Hertfordshire — a specialist driver recruitment agency, now trading for around 25 years."),
      bullet("Sold to EPIC Private Equity in 2007; Kieran Smith became CEO and grew the business to four branches."),
      bullet("2015: management buyout backed by Chrysalis VCT. Kieran Smith remained CEO; Gwynne Lewis became Operations Director."),
      bullet("2025: Gwynne Lewis appointed CEO after Kieran Smith stepped away from the business due to illness. He passed away in October 2025 — worth being sensitive to this if leadership history comes up in conversation."),
      bullet("Now operates from six to seven branches (Stevenage, St Albans, Dartford, Andover, Northampton, Tamworth, Norwich, Nuneaton, Bromsgrove) covering the South East and Midlands, plus a head office in Stevenage."),
      bullet("Scale: around 140 clients, 570 active drivers, 62,500 shifts driven last year, roughly 30% annual growth since 2009, and 14 million miles driven by its drivers every year."),
      bullet("First UK driving agency to hold three gold-standard quality marks: REC Audited, Logistics UK Driver Agency Excellence, and FCSA Supply Chain Partner."),
      bullet("Recognition: The Recruiter's FAST 50 (UK's fastest-growing recruitment companies) for two consecutive years, and winner of 'Best Recruitment Agency Marketing Team' at the 2022 Recruiter Awards."),
      bullet("Active across LinkedIn, Facebook, Instagram, X and TikTok — social presence and paid social sit squarely inside the remit of this role."),

      h2("Values and character"),
      p("The company describes its philosophy as being built on excellence and integrity: “we never promise what we can't deliver and we'll take the right road over the easy one every time.” It positions itself as a specialist, single-sector player (“we only do driving”) rather than a generalist agency, and leans heavily on long-tenured client relationships and driver welfare as differentiators. It has also taken a thought-leadership stance in the sector, publishing a report on the UK driver shortage crisis (2021) and ongoing commentary on driver supply issues."),

      h2("Competitors and USP"),
      p("The driver recruitment space includes much larger generalist players — Driver Hire (100+ franchise offices nationally), The Best Connection (80+ branches) and ADR Network (25+ years, national hubs) — alongside smaller regional specialists like H&G Recruitment and Barr Personnel. Against that field, Driver Require's USP is being a genuine specialist rather than a generalist with a driving desk: “we only do driving,” a team with real driving and logistics backgrounds, three gold-standard quality accreditations no competitor has matched, and a retention story (50% of drivers stay 12+ months) that's unusually strong for the sector. Worth referencing this directly — it shows you've placed them in their market, not just read their homepage."),

      h2("On valuation"),
      note("Driver Require is privately held, and no public turnover, profit or valuation figure is available through open search. What's known: it was bought out from EPIC Private Equity in a 2015 MBO backed by Chrysalis VCT, has grown at roughly 30% a year since 2009, and has scaled from one office to seven branches and a 40+ person team. If you want exact financials, the filed accounts would sit on Companies House, but nothing further is retrievable from public web sources."),

      // ---------------- OPENING PITCH ----------------
      h1("2. Opening Pitch — The Pitch Sandwich"),
      p("For “tell me about yourself” / “walk me through your CV.” Built using the Pitch Sandwich framework from your own Interview Prep Pack guide: three layers — Connect, Fit, Values — not a chronological CV recap."),

      h3("Bread 1 — Connect (10–15 seconds, the human bit)"),
      new Paragraph({
        spacing: { after: 200 },
        shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
        children: [new TextRun({
          text: "“A bit about me — I'm Neil, based in Hitchin, just down the road from Stevenage, and outside work I write and produce music and run Unhinged Music, a not-for-profit label supporting young people facing discrimination and mental health challenges.”",
          italics: true, size: 21,
        })],
      }),

      h3("Filling — Fit (skills and proof, matched to the JD)"),
      new Paragraph({
        spacing: { after: 200 },
        shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
        children: [new TextRun({
          text: "“Professionally, I've spent nearly nine years in recruitment, most recently as Senior Managing Consultant at Tate, focused on candidate attraction, sourcing campaigns and employer branding — the exact discipline that sits at the heart of this role, just usually seen from the client side rather than in-house. Most relevant here, I delivered £400k in new business and 63% year-on-year revenue growth at LAW Creative, and 77% year-on-year growth running the marketing function at Awards International, on top of nearly a decade managing food and beverage marketing across 72 Premier Inn hotels nationally.”",
          italics: true, size: 21,
        })],
      }),

      h3("Bread 2 — Values (two values, what they look like in how you work)"),
      new Paragraph({
        spacing: { after: 200 },
        shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
        children: [new TextRun({
          text: "“In how I work, I value people first and integrity, which means you'll get someone who builds attraction campaigns around what actually matters to the person on the other end, not just the brief — and who says what they'll do and does what they say, with candidates, clients and agency partners alike. I'm free to start in August, so the timing works for the handover you need.”",
          italics: true, size: 21,
        })],
      }),
      note("Those two values aren't picked at random — “we never promise what we can't deliver” is Driver Require's own stated philosophy. Echoing it back, backed by evidence, is exactly the “wow test” your guide talks about: specifics beat platitudes."),

      // ---------------- WEAKNESSES ----------------
      h1("3. Weaknesses Against the Job Description — the Cake + Cherry Method"),
      p("For “what's your weakness?” or any probing on gaps. Following your own framework: reframe “weakness” as “where do I need to develop to do this job better,” pick genuinely JD-relevant development areas, and add a cherry on top — a proactive, already-underway solution. Honesty plus initiative beats a dressed-up non-answer every time."),

      new Table({
        width: { size: 9600, type: WidthType.DXA },
        columnWidths: [3000, 6600],
        rows: [
          new TableRow({ children: [tableCell("Development area (the cake)", { header: true, width: 3000 }), tableCell("The cherry on top", { header: true, width: 6600 })] }),
          new TableRow({ children: [
            tableCell("Hands-on TikTok and Meta paid social — currently at briefing/oversight level, not execution", { width: 3000 }),
            tableCell("Commit to a short TikTok Ads Manager and Meta Blueprint course in the first few weeks; co-deliver early campaigns with the Social Media Manager the role already line-manages; point to a track record of fast, self-taught upskilling (built the LinkedIn and Facebook livestream sourcing strategy at Tate from nothing).", { width: 6600 }),
          ] }),
          new TableRow({ children: [
            tableCell("Video editing / content production — limited and self-taught", { width: 3000 }),
            tableCell("Use accessible tools (CapCut, Canva Video) for quick turnaround; lean on the digital agency partner named in the job description for heavier production; enrol on a short editing course in month one.", { width: 6600 }),
          ] }),
          new TableRow({ children: [
            tableCell("Adobe Suite — not currently an Adobe user, Canva-based instead", { width: 3000 }),
            tableCell("Raise it proactively rather than let it surface as a surprise; note the directly transferable design skill from Canva; pick up Adobe Express and Photoshop basics quickly.", { width: 6600 }),
          ] }),
          new TableRow({ children: [
            tableCell("Tenders and bid submissions — not directly evidenced", { width: 3000 }),
            tableCell("Reframe via the £400k new-business pitch work at LAW Creative and senior leadership presentations at Whitbread as proof of persuasive, commercial writing; offer to shadow the Executive Leadership Team on the first live tender to learn the format fast.", { width: 6600 }),
          ] }),
          new TableRow({ children: [
            tableCell("No direct transport, logistics or B2B services sector experience", { width: 3000 }),
            tableCell("Acknowledge it honestly, then draw the parallel to running marketing and recruitment support across 72 Premier Inn sites nationally — comparable multi-branch, on-the-ground complexity to a driver recruitment business run across branches.", { width: 6600 }),
          ] }),
          new TableRow({ children: [
            tableCell("Agency/recruitment-side marketing rather than sole ownership of an in-house function at this scale", { width: 3000 }),
            tableCell("Point to full end-to-end ownership of the Awards International marketing function — P&L-linked, cross-team, reporting to the top of the business — as evidence of running a function, not just executing to a brief.", { width: 6600 }),
          ] }),
        ],
      }),
      note("For the spoken answer, pick just one. The strongest lead is Adobe/TikTok-Meta paid social — it's real, it's specific to the JD, and the cherry (proactive courses, leaning on the Social Media Manager and digital agency) is already in motion. Template: “This question comes up a lot, so I applied it to this role. One development area for me is [X]. What I've already done is [Y], and if I progress I'll [Z] so I'm fully up to speed quickly.”"),

      // ---------------- COMPETENCY QUESTIONS ----------------
      h1("4. Competency-Based Questions and STAR Answers"),
      p("Likely questions about who you are and how you behave at work, with draft answers structured as Situation, Task, Action, Result — the STAR Stories framework from your guide. Two upgrades to keep in mind when you deliver these out loud: own it (say “I,” not “we” — the panel is hiring you, not your old team) and remember the Action is the money shot, so don't rabbit-hole in the Situation. You don't need all eleven ready word-for-word — two or three versatile stories, built around the competencies the JD leans on hardest (leadership, problem-solving, pressure, stakeholder influence), can flex to answer several different questions."),

      h2("4.1  Influencing a senior stakeholder who disagreed with you"),
      h3("Q: Tell me about a time you had to influence a senior stakeholder who didn't initially agree with your recommendation."),
      starLine("Situation", "On joining Tate's Hitchin branch from Awards International, you noticed the office had an email system in place but wasn't using it at all — the team either didn't believe in it or hadn't been trained. Your manager, Emma, was clear: it wasn't right for the business, which grew through direct, door-knocking new business."),
      starLine("Task", "Change that view and demonstrate the value of email marketing without any data to back it up yet."),
      starLine("Action", "Rather than argue the point, you started small: a monthly newsletter, written and designed yourself, sent to the existing database via DocMail and shared across social channels, with open and engagement tracking built in from day one."),
      starLine("Result", "Engagement data showed genuine interest and surfaced a targeted pipeline of warm contacts to follow up. The newsletter became an annual staple, and the results won Emma over — leading to automated email campaigns being rolled out first across Hitchin and Stevenage, then the whole Home Counties region as offices merged, driving more inbound enquiries and stronger client retention. When the initiative was later dropped, revenue noticeably dipped — a clear after-the-fact proof of the value it had delivered."),

      h2("4.2  A campaign or project that didn't go to plan"),
      h3("Q: Describe a time a campaign or project didn't go to plan — what happened, and what did you do?"),
      starLine("Situation", "You pushed to launch a live webinar at Tate on the value of Employee Value Proposition, as a lead-generation activity, and got senior sign-off to host it yourself."),
      starLine("Task", "Deliver the webinar with the authority and command of subject matter needed to represent the brand well."),
      starLine("Action", "The delivery fell flat — you weren't fluent enough in the subject to present naturally rather than read from the content. Rather than push on, you raised it openly with the leadership team, looked at alternatives, and pivoted to bringing in an external, credible speaker to host it, while your team focused on driving subscribers through the database and LinkedIn."),
      starLine("Result", "The webinar, delivered by the outsourced speaker, performed far better than your own delivery would have, generating around 30 potential new client leads for consultants to follow up and nurture."),

      h2("4.3  A difficult relationship with an external agency or supplier"),
      h3("Q: Tell me about a time you managed a difficult relationship with an external agency or supplier."),
      starLine("Situation", "At Awards International, you worked with a content and creative agency in Serbia that was owned by the company's CEO. The agency lacked understanding of the market and product, output quality was inconsistent, and the relationship was complicated by the CEO's close personal involvement."),
      starLine("Task", "Improve output quality and the working relationship, in a situation too politically sensitive to simply change supplier."),
      starLine("Action", "You travelled to Serbia to spend time with the agency lead and wider team, then brought them over to the UK to experience one of the actual award events first-hand — including a social element to build a genuine connection — so they understood the audience and product directly rather than from a brief. You showed them direct quality comparisons against competitor content. Through those conversations you diagnosed the root cause: the agency was being closely managed by the CEO and deferred heavily to him, which explained inconsistent direction. You adjusted your own approach accordingly, securing the CEO's alignment before briefing the agency so there were no conflicting instructions."),
      starLine("Result", "The relationship and the quality of output improved significantly. Open, honest conversation on both sides removed the pressure and potential for conflict once you each understood where the other was coming from. The agency remained in place and continued working with the business."),

      h2("4.4  Tough feedback and how you responded"),
      h3("Q: Describe a time you received tough feedback and how you responded."),
      starLine("Situation", "As Marketing Manager at Awards International, you were tasked with writing content — a piece you invested significant time and research into. The ideas were strong, but the quality of the writing itself wasn't, and you were told plainly that content was part of the job."),
      starLine("Task", "Improve content output despite writing not being a personal strength, without simply avoiding the responsibility."),
      starLine("Action", "You restructured the process rather than trying to force it: working with the team to generate ideas, turning them into detailed content briefs, then handing execution to people better placed to deliver — a PR and communications colleague (Sarah), and a strong writer within the Serbia team — while you focused on the strategy, ideas and content planning you were genuinely good at."),
      starLine("Result", "Content quality improved tenfold. The Serbia-based writer's ability was recognised further and they went on to start writing a book, an initiative driven more by the CEO than by you, but a sign of the capability the new process had surfaced."),

      h2("4.5  A fast decision with incomplete information"),
      h3("Q: Tell me about a time you had to make a decision quickly with incomplete information."),
      starLine("Situation", "While door-knocking in Welwyn Garden City to coach a consultant, you were unexpectedly called in by the Head of Recruitment and HR at a large corporation, who gave you five minutes on the spot: “Pitch your business to me.”"),
      starLine("Task", "Decide instantly whether to lead the pitch yourself or hand it to the consultant, then deliver something compelling with zero preparation."),
      starLine("Action", "You chose to step up and pitch yourself to set the standard. You opened with a traditional consultative pitch — and were stopped a minute in: “I don't care about that, that's what every recruiter tells me. Tell me why I should consider you.” You pivoted on the spot to a personal, authentic pitch about yourself, your approach and your track record on inclusive client service, backed with real examples."),
      starLine("Result", "You landed a stronger, differentiated pitch and learned a lasting lesson about what clients actually value — the person and relationship, not generic consultative language. You brought that learning back to the team, running an internal session on writing and rehearsing personal pitches, which gave consultants more confidence and a genuinely different approach to networking and cold pitching."),

      h2("4.6  Leading a team through change"),
      h3("Q: Tell me about a time you led a team through a period of change or uncertainty."),
      starLine("Situation", "Promoted to Senior Managing Consultant in 2023, you took on responsibility for coaching and developing a small team of consultants spread across two offices, Hertfordshire and Nottingham."),
      starLine("Task", "Build a consistent standard of coaching, performance management and culture across a dispersed team."),
      starLine("Action", "Put in place consistent coaching rhythms, shared reporting through Bullhorn, and regular communication across both sites to keep the team aligned despite the distance."),
      starLine("Result", "The team continued to perform strongly, with Tate ranked in the company's top 7 consultants nationally sustained through the period."),
      note("This one would benefit from your own colour — a specific moment of uncertainty the team navigated together would make it land harder."),

      h2("4.7  Building something from scratch"),
      h3("Q: Describe a time you had to build something from limited resources."),
      starLine("Situation", "On joining Tate, you needed to build a new client desk from a standing start, with no inherited business or pipeline."),
      starLine("Task", "Generate new business and build a candidate pipeline and brand presence from zero."),
      starLine("Action", "Ran multi-channel sourcing and resourcing campaigns — direct sourcing, social media, networking and events — to build both the client base and candidate pool simultaneously."),
      starLine("Result", "Named Newcomer of the Year in your first year, and went on to rank consistently in Tate's top 7 consultants nationally, delivering average annual billings of £140,000 to £165,000."),

      h2("4.8  Managing competing priorities"),
      h3("Q: Give an example of managing multiple competing priorities at once."),
      starLine("Situation", "Running a full 360 client desk at Tate while also leading a team across two offices and sitting on Tate's EDI strategy team."),
      starLine("Task", "Balance personal billing responsibility, people leadership and a wider strategic contribution at the same time."),
      starLine("Action", "Protected time for each strand deliberately — structured weekly planning, delegating candidate management tasks to the team while retaining ownership of key client relationships, and ring-fencing time for EDI strategy work rather than letting it slip."),
      starLine("Result", "Sustained a top-7 national ranking while also delivering on team leadership and strategic EDI input."),
      note("A specific week or moment where these priorities genuinely clashed would sharpen this answer."),

      h2("4.9  Championing inclusion in the workplace"),
      h3("Q: Tell me about a time you championed diversity or inclusion at work."),
      starLine("Situation", "As a member of Tate's EDI strategy team, you had visibility of gaps in how inclusive recruitment practice was actually being applied for clients and candidates."),
      starLine("Task", "Help shape and embed more inclusive practices across the business."),
      starLine("Action", "Fed insight from day-to-day client work into the EDI strategy team's recommendations, and separately founded The People First Collective, a network focused on inclusive leadership, extending the same thinking beyond Tate."),
      starLine("Result", "Inclusive practice became more embedded in client-facing recruitment, and The People First Collective is now an established, ongoing external network."),

      h2("4.10  Learning a new skill quickly"),
      h3("Q: Tell me about a time you had to quickly learn a new skill or tool to do your job well."),
      starLine("Situation", "Needed to lead social media sourcing at Tate, including live formats like Facebook livestreams and webinars, without formal training in it."),
      starLine("Task", "Build genuine capability in a format you hadn't used before, fast enough to make it a reliable sourcing channel."),
      starLine("Action", "Taught yourself the format, iterated based on what drove engagement, and embedded it as a standing part of the branch's sourcing strategy rather than a one-off experiment."),
      starLine("Result", "Became the person who spearheaded the team's social sourcing strategy, contributing to a sustained top-7 national ranking."),

      h2("4.11  Proudest achievement"),
      h3("Q: What's your proudest achievement, and why?"),
      p("Worth blending two threads rather than picking one: the commercial track record — Newcomer of the Year, a sustained top-7 national ranking, and promotion to Senior Managing Consultant in 2023 — alongside the things built outside the day job that say more about who you are: founding The Com'mon People, a free resource centre and monthly newsletter for job seekers and recruiters, and running Unhinged Music, a not-for-profit label supporting young people facing discrimination and mental health challenges. Together they show both delivery and values-led leadership, which is a strong note to land on for a business that talks a lot about integrity and doing right by people."),

      // ---------------- QUESTIONS TO ASK ----------------
      h1("5. Your Questions — Finish on a High"),
      p("No questions at the end signals low interest, even when it isn't true. Your guide calls for at least one from each of four types — mapped here to what you actually want to know."),

      h2("Type 1 — About the company"),
      bullet("The business has grown from one office in Stevenage in 2000 to seven branches today — what's driven that growth, and where do you see the next phase coming from?"),
      bullet("Gwynne stepped into the CEO role this year, following Kieran Smith's departure — how has that transition shaped priorities for the business, and for marketing specifically?"),
      bullet("What's working well in the current marketing strategy, and where do you feel it's falling short?"),

      h2("Type 2 — About the job"),
      bullet("Given this is a defined 14–18 month contract, what would you want this role to have delivered or changed by the time it hands back?"),
      bullet("Is the biggest pressure right now candidate attraction in a tight driver market, brand visibility against competitors, or something else entirely?"),
      bullet("What CRM, ATS and analytics platforms does the team use day to day, and how embedded is the digital agency partner in delivery versus strategy?"),
      bullet("How is effort currently split between candidate attraction, client-facing brand building and internal engagement, and how would you want that balance to shift?"),

      h2("Type 3 — About the interviewers"),
      bullet("What drew you to Driver Require, and what's kept you here?"),
      bullet("What does great performance in this role look like to you, six months in?"),
      bullet("Where do you feel the business is most exposed competitively from a marketing perspective?"),

      h2("Type 4 — About you, in this role"),
      bullet("What does a strong handover look like at the end of the contract, and how involved would I be in shaping that transition?"),
      bullet("Based on our conversation so far, is there anything you'd like me to clarify about my fit for this role?"),
      note("That last one is a deliberate closer, straight from your own guide — it invites them to raise any doubt while you're still in the room to answer it, rather than letting it sit unspoken."),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Neil_Copping_Interview_Prep_Driver_Require.docx", buffer);
  console.log("done");
});
