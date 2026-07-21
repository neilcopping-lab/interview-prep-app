/**
 * Report generation logic for the Com'mon People Interview Prep Report.
 *
 * LIVE MODE (when ANTHROPIC_API_KEY is set): company research, gap analysis,
 * the pitch's "Fit" summary and STAR answer drafting all run through Claude.
 * Company research uses the web search tool so it's grounded in current,
 * real information rather than the model's training data.
 *
 * FALLBACK MODE (no key, or a call fails for any reason — rate limit,
 * network blip, etc.): every function below drops back to the original
 * rule-based prototype logic instead of throwing. A paying customer should
 * never see a broken report because of a transient API error; they should,
 * at worst, see a slightly less polished one. Each fallback result is
 * tagged internally so it's obvious in testing which path ran.
 */

const { hasAnthropic, claudeText, claudeJSON, generateCoverImage } = require("./aiClients");

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","to","in","on","for","with","as","is","are",
  "be","by","at","this","that","from","will","you","your","we","our","us","it","its",
  "or","not","have","has","had","who","what","when","where","why","how","their","they",
  "them","i","re","also","any","all","across","into","using","use","strong","good",
  "role","job","team","work","working","experience","skills","ability","able",
]);

function topKeywords(text, n = 20) {
  const counts = {};
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

// ---------------------------------------------------------------------
// Personalised cover art. Uses OpenAI's image API (not Claude — Anthropic
// doesn't do image generation) to create an abstract, on-brand piece
// themed around the candidate and the role, not a literal attempt at
// depicting the real company (that would risk looking inaccurate, or
// bumping into their real logo/trademark). The candidate's name and the
// company name are rendered as real, crisp text on top afterwards (in
// docxExport.js and public/app.js) rather than asking the image model to
// render text itself, since AI-generated text in images is often garbled
// — not something a paying customer should see on their cover.
// Returns { base64 } or null (missing key, content policy block, error —
// the report should never break because the cover image didn't render).
// ---------------------------------------------------------------------

async function coverArt({ companyName, jobDescription }) {
  const theme = topKeywords(jobDescription, 8).slice(0, 4).join(", ");
  const prompt =
    `An elegant, abstract editorial cover illustration for a premium personalised career document. ` +
    `Modern minimalist geometric composition — sweeping shapes, subtle gradients and confident forward-` +
    `leaning motion, evoking ambition, growth and quiet confidence. Colour palette: deep navy (#161F29), ` +
    `warm mustard gold (#E0B03C), sky blue (#5AA9C2), with a touch of burnt orange (#D2691E). Loosely ` +
    `thematic to a career in: ${theme || "professional services"}. Absolutely no text, letters, numbers, ` +
    `logos, real company branding, recognisable buildings, or human faces — pure abstract/conceptual art, ` +
    `high-end magazine-cover quality.`;

  const buffer = await generateCoverImage(prompt);
  if (!buffer) return null;
  return { base64: buffer.toString("base64") };
}

// ---------------------------------------------------------------------
// Gap analysis
// ---------------------------------------------------------------------

function gapAnalysisHeuristic(jobDescription, cvText) {
  const jdWords = topKeywords(jobDescription, 25);
  const cvWords = new Set(topKeywords(cvText, 60));
  const matched = jdWords.filter((w) => cvWords.has(w));
  const gaps = jdWords.filter((w) => !cvWords.has(w)).slice(0, 6);
  return {
    matchedStrengths: matched,
    developmentAreas: gaps.map((area) => ({
      area,
      cherry: "[AI UPGRADE POINT: a proactive, credible solution for this gap would be drafted here]",
    })),
  };
}

async function gapAnalysis(jobDescription, cvText) {
  if (!hasAnthropic()) return gapAnalysisHeuristic(jobDescription, cvText);

  const result = await claudeJSON(
    `You're helping a candidate prepare for a job interview using the "Cake + Cherry" method: ` +
    `identify genuine gaps between their CV and the job description, then suggest a proactive, ` +
    `credible way to address each one (a course, a way to reframe adjacent experience, etc.) — ` +
    `never invent experience they don't have.\n\n` +
    `JOB DESCRIPTION:\n${jobDescription}\n\nCV:\n${cvText}\n\n` +
    `Return JSON in exactly this shape:\n` +
    `{"matchedStrengths": ["short phrase", ...up to 8], ` +
    `"developmentAreas": [{"area": "short phrase naming the gap", "cherry": "one or two sentence proactive solution, in second person (\\"you\\")"}] up to 5}`,
    { maxTokens: 1200 }
  );

  if (!result || !Array.isArray(result.matchedStrengths) || !Array.isArray(result.developmentAreas)) {
    return gapAnalysisHeuristic(jobDescription, cvText);
  }
  return result;
}

// ---------------------------------------------------------------------
// Shared engine for every web-search-grounded, bullet-point research
// section (company overview, employee sentiment, social media, market
// intelligence, recent news, role challenges). Each returns the same
// shape: { headline, bullets, sources } — a one-line framing sentence,
// a set of specific bullet points, and the real URLs Claude cited. This
// is what actually gets rendered as bullets (not dense paragraphs) in
// both the web preview and the .docx export.
// ---------------------------------------------------------------------

function researchFallback(description) {
  return {
    headline: `[AI UPGRADE POINT] ${description} Wire ANTHROPIC_API_KEY with web search enabled to populate this automatically.`,
    bullets: [],
    sources: [],
  };
}

async function researchSection({ companyName, prompt, maxTokens = 900, minBullets = 5, maxBullets = 8, fallbackDescription }) {
  if (!companyName || !companyName.trim()) return researchFallback(fallbackDescription);
  if (!hasAnthropic()) return researchFallback(fallbackDescription);

  const result = await claudeJSON(
    `${prompt}\n\nReturn JSON in exactly this shape: {"headline": "one sentence framing what this section ` +
    `covers", "bullets": ["specific point 1", "specific point 2", ...]}. Write ${minBullets}-${maxBullets} ` +
    `bullets. Each bullet should be a genuinely specific, concrete sentence — names, numbers, dates, real ` +
    `detail — never vague filler like "they seem to value teamwork". If you genuinely can't find reliable ` +
    `information for a bullet, leave it out rather than guessing or padding.`,
    { webSearch: true, maxTokens }
  );

  if (!result || !Array.isArray(result.bullets) || result.bullets.length === 0) {
    return researchFallback(fallbackDescription);
  }
  return {
    headline: result.headline || "",
    bullets: result.bullets,
    sources: result.sources || [],
  };
}

// ---------------------------------------------------------------------
// Company overview — deliberately broad and detailed. This is the
// section a candidate uses to prove they've actually done their
// homework, so it asks for real depth rather than a thin paragraph.
// ---------------------------------------------------------------------

async function companyResearch(companyName) {
  return researchSection({
    companyName,
    fallbackDescription: `A detailed company overview for "${companyName}" would appear here.`,
    minBullets: 8,
    maxBullets: 10,
    maxTokens: 1100,
    prompt:
      `Research the company "${companyName}" in real depth for someone about to interview there — search ` +
      `the web for current information. Cover, as separate bullets: (1) what they do and who they serve, ` +
      `specifically; (2) their size and structure (employee count, offices/locations, ownership — public, ` +
      `private, PE-backed, part of a group); (3) their main products or services; (4) their stated values ` +
      `or culture, and how that actually shows up (not just marketing copy); (5) who leads them (CEO/MD ` +
      `and any other named leadership worth knowing); (6) their recent trajectory — growth, funding, ` +
      `contraction, notable wins or setbacks; (7) how they compare to their nearest competitors and what ` +
      `their actual USP is. Never invent facts about a real company — if something genuinely isn't ` +
      `findable, leave that bullet out rather than guessing.`,
  });
}

// ---------------------------------------------------------------------
// Employee sentiment — Glassdoor / Google / Indeed style review themes.
// ---------------------------------------------------------------------

async function employeeSentiment(companyName) {
  return researchSection({
    companyName,
    fallbackDescription: `A summary of what employees say about working at "${companyName}" (Glassdoor, Google, Indeed reviews) would appear here.`,
    prompt:
      `Search the web for what current and former employees say about working at "${companyName}" — ` +
      `Glassdoor, Google reviews, Indeed, and any other genuine employee review sources you can find. ` +
      `Cover: the overall rating if one is available (e.g. "3.9/5 on Glassdoor from ~200 reviews"), the ` +
      `most recurring praise, the most recurring criticism, and anything specific worth probing gently in ` +
      `the interview (e.g. a theme around management, pay, or workload). Be balanced — don't sand off real ` +
      `criticism, and don't exaggerate a handful of angry reviews into a pattern either.`,
  });
}

// ---------------------------------------------------------------------
// Social media presence + recent activity.
// ---------------------------------------------------------------------

async function socialMedia(companyName) {
  return researchSection({
    companyName,
    fallbackDescription: `A rundown of "${companyName}"'s social media presence and recent activity would appear here.`,
    prompt:
      `Search the web for "${companyName}"'s social media presence — LinkedIn, Instagram, X/Twitter, ` +
      `TikTok, Facebook, whichever they're actually active on. Cover: which platforms they're genuinely ` +
      `active on and roughly how (follower counts if findable), what tone/personality comes through in ` +
      `their posts, and specific recent posts, campaigns or announcements worth knowing about — name them ` +
      `specifically (a launch, an award, a hiring push, a rebrand, anything concrete a candidate could ` +
      `naturally reference to show they've actually looked). Also list the actual profile URLs you find.`,
  });
}

// ---------------------------------------------------------------------
// Market & sector intelligence.
// ---------------------------------------------------------------------

async function marketIntelligence(companyName, jobDescription) {
  return researchSection({
    companyName,
    fallbackDescription: `A briefing on market and sector trends relevant to "${companyName}" and this role would appear here.`,
    maxTokens: 1000,
    prompt:
      `Search the web for current market and sector trends relevant to "${companyName}" and the role ` +
      `described below. Cover things like: economic pressure on the sector, regulatory change, ` +
      `technology shift, consumer/customer behaviour change, competitive dynamics — whatever is genuinely ` +
      `relevant right now — and how that context might shape what this interviewer actually cares about. ` +
      `The goal is for the candidate to be able to speak to "what's happening in the market" with real, ` +
      `specific substance instead of generic statements.\n\nJOB DESCRIPTION:\n${jobDescription || "(not provided)"}`,
  });
}

// ---------------------------------------------------------------------
// Recent news & press mentions.
// ---------------------------------------------------------------------

async function recentNews(companyName) {
  return researchSection({
    companyName,
    fallbackDescription: `A summary of recent news and press coverage of "${companyName}" would appear here.`,
    prompt:
      `Search the web for recent news and press coverage of "${companyName}" — roughly the last 6-12 ` +
      `months. Cover what's actually happened: funding, leadership changes, launches, awards, ` +
      `restructuring, controversies, whatever is genuinely there. Each bullet should be one specific, ` +
      `dated news item (name the date, people, or figures involved) rather than a vague summary sentence. ` +
      `If there's genuinely little recent press coverage of this company, say so plainly in a single ` +
      `bullet rather than inventing news.`,
  });
}

// ---------------------------------------------------------------------
// Challenges the candidate may be facing in this specific role — sector
// pressures like labour/skills shortages, budget constraints, etc.
// ---------------------------------------------------------------------

async function roleChallenges(companyName, jobDescription) {
  return researchSection({
    companyName,
    fallbackDescription: `Likely challenges facing this role at "${companyName}" (sector pressures, skills/labour shortages, etc.) would appear here.`,
    maxTokens: 1000,
    prompt:
      `Search the web for the real, current challenges someone would likely face in the role described ` +
      `below, at "${companyName}". Think about: sector-wide labour or skills shortages relevant to this ` +
      `role, budget or economic pressure on this function, technology or tooling changes creating extra ` +
      `demands, regulatory or compliance pressure, talent retention/competition for this type of role, or ` +
      `anything specific to this company (e.g. recent restructuring, rapid growth strain, a known industry ` +
      `problem). The goal is for the candidate to walk in already thinking like someone who'll be doing ` +
      `the job, and to be able to ask a sharp, informed question about it. Be realistic, not alarmist — ` +
      `and don't invent a challenge that isn't genuinely grounded in something you found.\n\n` +
      `JOB DESCRIPTION:\n${jobDescription || "(not provided)"}`,
  });
}

// ---------------------------------------------------------------------
// Opening pitch — Pitch Sandwich
// ---------------------------------------------------------------------

function pitchFillingFallback(jobDescription) {
  const jdWords = topKeywords(jobDescription, 8).slice(0, 4).join(", ");
  return `Professionally, [AI UPGRADE POINT: summarise the candidate's most relevant experience from their CV, `
    + `weighted toward what the job description emphasises most — this JD leans heavily on: ${jdWords || "[keywords]"}].`;
}

async function pitchSandwich({ candidateName, connectDetail, cvText, jobDescription, values }) {
  const bread1 = `A bit about me — I'm ${candidateName || "[name]"}${connectDetail ? `, ${connectDetail}` : " — [add a personal detail here, e.g. where you're based or an outside interest]"}.`;
  const bread2 = `In how I work, I value ${values && values.length ? values.join(" and ") : "[value 1] and [value 2]"}, `
    + `which means you'll get someone who [add what that looks like in behaviour].`;

  let filling = pitchFillingFallback(jobDescription);
  if (hasAnthropic() && cvText && jobDescription) {
    const result = await claudeText(
      `Write the "Filling" layer of a Pitch Sandwich (the "tell me about yourself" answer framework: ` +
      `Connect / Fit / Values). This layer covers top-line skills and proof, matched to the job description. ` +
      `Write 2-3 sentences, first person, starting with "Professionally, ...". Use only real experience from ` +
      `the CV below — never invent achievements. Weight it toward what this specific job description asks for.\n\n` +
      `JOB DESCRIPTION:\n${jobDescription}\n\nCV:\n${cvText}`,
      { maxTokens: 300 }
    );
    if (result && result.text) filling = result.text;
  }

  return { bread1, filling, bread2 };
}

// ---------------------------------------------------------------------
// STAR answers
// ---------------------------------------------------------------------

function draftStarAnswerHeuristic(question, transcript, basedOn) {
  const sentences = transcript.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunk = Math.max(1, Math.ceil(sentences.length / 4));
  const parts = [
    sentences.slice(0, chunk).join(" "),
    sentences.slice(chunk, chunk * 2).join(" "),
    sentences.slice(chunk * 2, chunk * 3).join(" "),
    sentences.slice(chunk * 3).join(" "),
  ];
  return {
    question,
    basedOn: basedOn || "",
    situation: parts[0] || "[AI UPGRADE POINT would restructure this from the transcript]",
    task: parts[1] || "",
    action: parts[2] || "",
    result: parts[3] || "",
    note: "Prototype split — a real model call (AI UPGRADE POINT) would rewrite this cleanly into S/T/A/R rather than chopping the transcript into quarters.",
  };
}

async function draftStarAnswer(question, transcript, basedOn) {
  if (!transcript || !transcript.trim()) {
    return { question, basedOn: basedOn || "", situation: "[No answer recorded yet]", task: "", action: "", result: "" };
  }
  if (!hasAnthropic()) return draftStarAnswerHeuristic(question, transcript, basedOn);

  const result = await claudeJSON(
    `Rewrite this rambling spoken interview answer into a clean STAR structure (Situation, Task, Action, ` +
    `Result). Use only what's actually said — don't invent details, numbers or outcomes that aren't there. ` +
    `Tidy up filler words and false starts, but keep it in the candidate's own voice and first person ("I"). ` +
    `If a part (e.g. Result) genuinely isn't covered in the transcript, say so honestly rather than making ` +
    `something up.\n\nQUESTION: ${question}\n\nTRANSCRIPT: ${transcript}\n\n` +
    `Return JSON: {"situation": "...", "task": "...", "action": "...", "result": "..."}`
  );

  if (!result) return draftStarAnswerHeuristic(question, transcript, basedOn);
  return {
    question,
    basedOn: basedOn || "",
    situation: result.situation || "—",
    task: result.task || "—",
    action: result.action || "—",
    result: result.result || "—",
  };
}

// ---------------------------------------------------------------------
// Questions to ask them — templated, no AI needed (already JD-personalised
// via the company name; see lib/questionBank.js for the AI-matched
// competency questions asked earlier in the flow).
// ---------------------------------------------------------------------

function questionsToAsk(companyName) {
  const name = companyName || "the company";
  return {
    "Type 1 — About the company": [
      `What's driven ${name}'s growth, and where do you see the next phase coming from?`,
      `What's working well in the current strategy for this function, and where do you feel it's falling short?`,
    ],
    "Type 2 — About the job": [
      `What would you want this role to have delivered in the first 90 days?`,
      `What tools and systems does the team use day to day?`,
    ],
    "Type 3 — About the interviewers": [
      `What drew you to ${name}, and what's kept you here?`,
      `What's the biggest challenge you personally face in your role right now?`,
    ],
    "Type 4 — About you, in this role": [
      `Based on our conversation so far, is there anything you'd like me to clarify about my fit for this role?`,
    ],
  };
}

// Matched to the guide's "Framework 04 — STAR Stories": predict likely
// questions from the job spec, then prepare 2–3 versatile stories that
// cover most scenarios, told in four parts.
const STAR_GUIDE = {
  intro: "\"Tell me about a time when…\" — predict likely questions from the job spec, then prepare 2–3 versatile stories that cover most scenarios. Tell each one in four parts.",
  steps: [
    { letter: "S", label: "Situation", explanation: "The context. Set the scene briefly — a sentence or two, not the whole backstory." },
    { letter: "T", label: "Task", explanation: "What you were specifically responsible for delivering. Not the team's goal — yours." },
    { letter: "A", label: "Action", explanation: "What you did — the actual steps. This is the part that gets scored, so don't rush it." },
    { letter: "R", label: "Result", explanation: "Measurable outcomes. Numbers if you can — even a rough estimate beats no number at all." },
  ],
  tips: [
    "Own it: say \"I,\" not \"we\" — the team did things, but the panel is hiring you. Make your specific actions visible.",
    "Action is the money: don't rabbit-hole in the Situation — walk them through your process clearly, the \"A\" is what they're scoring.",
    "Pro move: build your 2–3 stories around the most-cited competencies in the JD (leadership, problem-solving, conflict, delivering under pressure). One good story can answer three different questions.",
  ],
};

// Shown alongside the sample competency questions (both in the app and
// in the report) so it's clear these are illustrative, not a prediction
// of exactly what will be asked on the day.
const QUESTIONS_FOOTNOTE = "These are a sample of the type of competency-based questions this role is likely to attract, based on the job description — not a guaranteed or exhaustive list of what you'll actually be asked. Use them to build 2–3 versatile STAR stories (see above) that can flex to cover whatever comes up.";

// A rough "how much of the JD does this CV genuinely cover" score, used
// for the skills-match visual. Deliberately simple (matched vs. matched+
// gaps) rather than weighted — it's a supporting visual, not the report's
// main analysis, which is the actual bullet-by-bullet Cake + Cherry text.
function skillsMatchScore(gaps) {
  const matched = (gaps.matchedStrengths || []).length;
  const gapCount = (gaps.developmentAreas || []).length;
  const total = matched + gapCount;
  const percent = total > 0 ? Math.round((matched / total) * 100) : null;
  return { matched, gaps: gapCount, total, percent };
}

// ---------------------------------------------------------------------
// Collect every real citation gathered across the research sections into
// one de-duped, ordered list — used to render a single consolidated
// "Sources & References" section at the end of the report (in addition
// to the inline links shown under each section), so a candidate — or
// Neil, spot-checking a report — can see everything the AI actually
// drew on in one place.
// ---------------------------------------------------------------------
function collectAllSources(sectionsInOrder) {
  const seen = new Set();
  const all = [];
  sectionsInOrder.forEach(({ label, section }) => {
    (section && section.sources ? section.sources : []).forEach((s) => {
      if (s.url && !seen.has(s.url)) {
        seen.add(s.url);
        all.push({ url: s.url, title: s.title || s.url, section: label });
      }
    });
  });
  return all;
}

// ---------------------------------------------------------------------
// Assemble the report. A report involves up to 9 Claude calls (5 of them
// web-search-grounded) plus one OpenAI image call. These all get fired
// together in one Promise.all — claudeText/claudeJSON (lib/aiClients.js)
// now enforce their own concurrency cap (2 in flight at a time, extra
// calls queue) and a longer 4-attempt backoff on 429/529s, so the actual
// load on the Anthropic API stays low regardless of how many calls this
// function kicks off "at once". That's a more reliable fix than manually
// staggering waves here, which still let bursts of 3-4 through at once.
// ---------------------------------------------------------------------

async function generateReport(input) {
  const {
    candidateName, companyName, connectDetail, values,
    jobDescription, cvText, answers,
  } = input;

  const [research, sentiment, social, market, news, challenges, gaps, pitch, starAnswers, cover] = await Promise.all([
    companyResearch(companyName),
    employeeSentiment(companyName),
    socialMedia(companyName),
    marketIntelligence(companyName, jobDescription),
    recentNews(companyName),
    roleChallenges(companyName, jobDescription),
    gapAnalysis(jobDescription, cvText),
    pitchSandwich({ candidateName, connectDetail, cvText, jobDescription, values }),
    Promise.all((answers || []).map((a) => draftStarAnswer(a.question, a.transcript, a.basedOn))),
    coverArt({ companyName, jobDescription }),
  ]);

  const questions = questionsToAsk(companyName);

  // hasAnthropic() only proves a key is SET, not that it's actually working
  // — a bad/expired/rate-limited key still passes that check, every call
  // silently falls back, and the UI would keep claiming "(AI-powered)"
  // while quietly serving placeholder text. Check whether at least one
  // web-search section that only succeeds with a real, working key
  // actually returned real content, so the status line tells the truth.
  const researchSections = [
    { label: "Company overview", section: research },
    { label: "Employee sentiment", section: sentiment },
    { label: "Social media presence", section: social },
    { label: "Market & sector intelligence", section: market },
    { label: "Recent news & press", section: news },
    { label: "Role challenges", section: challenges },
  ];
  const aiActuallyWorked = hasAnthropic() && researchSections.some((s) => Array.isArray(s.section.bullets) && s.section.bullets.length > 0);
  const allSources = collectAllSources(researchSections);

  return {
    candidateName,
    companyName,
    generatedAt: new Date().toISOString(),
    aiPowered: aiActuallyWorked,
    aiKeyPresent: hasAnthropic(),
    cover,
    research,
    employeeSentiment: sentiment,
    socialMedia: social,
    marketIntelligence: market,
    recentNews: news,
    roleChallenges: challenges,
    pitch,
    gapAnalysis: gaps,
    skillsMatch: skillsMatchScore(gaps),
    starGuide: STAR_GUIDE,
    starAnswers,
    questionsFootnote: QUESTIONS_FOOTNOTE,
    questionsToAsk: questions,
    allSources,
  };
}

module.exports = { generateReport, topKeywords, gapAnalysisHeuristic, STAR_GUIDE, QUESTIONS_FOOTNOTE };
