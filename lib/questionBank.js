/**
 * Competency question selection.
 *
 * LIVE MODE (ANTHROPIC_API_KEY set): Claude reads the actual job description
 * and writes 5 bespoke competency questions in the interviewer's own
 * language — grounded in what this specific role actually asks for, not
 * picked from a fixed list.
 *
 * FALLBACK MODE (no key, or the call fails): drops back to matching the
 * best 5 questions from a fixed 16-question bank by keyword overlap. Still
 * genuinely JD-responsive (a driver-recruitment JD and a finance JD get
 * different questions), just coarser than a real bespoke write-up.
 */

const { hasAnthropic, claudeJSON } = require("./aiClients");

const QUESTION_BANK = [
  {
    question: "Tell me about a time you had to influence a senior stakeholder who didn't initially agree with you.",
    tags: ["stakeholder", "senior", "influence", "persuade", "buy-in", "director", "leadership", "ceo", "board"],
  },
  {
    question: "Describe a time a campaign or project didn't go to plan — what happened, and what did you do?",
    tags: ["campaign", "project", "delivery", "deadline", "launch", "marketing", "strategy"],
  },
  {
    question: "Tell me about a time you managed a difficult relationship with an external agency or supplier.",
    tags: ["agency", "supplier", "vendor", "partner", "external", "procurement", "contractor"],
  },
  {
    question: "Describe a time you received tough feedback and how you responded.",
    tags: ["feedback", "performance", "development", "review", "coaching", "improve"],
  },
  {
    question: "Tell me about a time you had to make a decision quickly with incomplete information.",
    tags: ["fast-paced", "pressure", "deadline", "decision", "ambiguity", "urgent", "fast paced"],
  },
  {
    question: "Tell me about a time you led a team through a period of change or uncertainty.",
    tags: ["team", "manage", "lead", "leadership", "mentor", "coach", "line manager", "supervisor", "change"],
  },
  {
    question: "Describe a time you had to build something from limited resources.",
    tags: ["build", "launch", "new", "start-up", "startup", "from scratch", "zero", "growth"],
  },
  {
    question: "Give an example of managing multiple competing priorities at once.",
    tags: ["multiple", "priorities", "manage", "organise", "organised", "organisation", "deadlines", "workload"],
  },
  {
    question: "Tell me about a time you championed diversity or inclusion at work.",
    tags: ["diversity", "inclusion", "edi", "equality", "inclusive"],
  },
  {
    question: "Tell me about a time you had to quickly learn a new skill or tool to do your job well.",
    tags: ["learn", "training", "upskill", "adapt", "new tool", "software", "systems", "cms", "crm", "analytics", "tiktok", "adobe"],
  },
  {
    question: "Tell me about a time you had to resolve a disagreement or conflict at work.",
    tags: ["conflict", "disagreement", "difficult conversation", "mediate", "resolve"],
  },
  {
    question: "Describe a time you came up with a genuinely creative or innovative idea that worked.",
    tags: ["creative", "innovative", "idea", "campaign", "content", "brand", "design"],
  },
  {
    question: "Tell me about a time data or analytics changed a decision you made.",
    tags: ["data", "analytics", "metrics", "kpi", "performance", "reporting", "insight", "seo", "ppc"],
  },
  {
    question: "Describe a time you went out of your way to solve a problem for a client or customer.",
    tags: ["customer", "client", "service", "satisfaction", "account", "relationship"],
  },
  {
    question: "Tell me about a time you managed a budget or made a commercially-driven decision.",
    tags: ["budget", "commercial", "revenue", "cost", "profit", "roi", "sales", "target"],
  },
  {
    question: "What's your proudest achievement, and why?",
    tags: [], // generic — always eligible as a fallback/filler
  },
];

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function selectQuestionsHeuristic(jobDescription, count = 5) {
  const jdTokens = tokenize(jobDescription);
  const jdText = " " + jdTokens.join(" ") + " ";

  const scored = QUESTION_BANK.map((entry) => {
    let score = 0;
    entry.tags.forEach((tag) => {
      if (jdText.includes(" " + tag.toLowerCase() + " ") || jdText.includes(tag.toLowerCase())) {
        score += 1;
      }
    });
    return { ...entry, score };
  });

  // Highest-scoring, most JD-relevant questions first.
  scored.sort((a, b) => b.score - a.score);

  const withSignal = scored.filter((s) => s.score > 0);
  const generic = scored.filter((s) => s.score === 0);

  const selected = [...withSignal, ...generic].slice(0, count);

  // Always make sure "proudest achievement" style closer is present if room allows.
  const hasGeneric = selected.some((s) => s.tags.length === 0);
  if (!hasGeneric && selected.length === count) {
    selected[selected.length - 1] = scored.find((s) => s.tags.length === 0);
  }

  return selected.map((s) => ({ question: s.question, matchedOn: s.tags.filter((t) => jdText.includes(t.toLowerCase())) }));
}

// If the model ignores the "no preamble" instruction and still front-loads
// a sentence or two of scene-setting before the actual question, this
// finds the real question-opening phrase and strips everything before it,
// rather than showing the candidate a wall of text with the question
// buried at the end. Falls back to the original text untouched if no
// recognisable opener is found (better a slightly long question than a
// silently mangled one).
const QUESTION_OPENERS = [
  "tell me about a time", "describe a time", "describe a situation",
  "give me an example", "give an example", "walk me through a time",
  "what's your", "what is your", "how did you", "how do you",
];
function stripPreamble(question) {
  const q = (question || "").trim();
  const lower = q.toLowerCase();
  let earliest = -1;
  QUESTION_OPENERS.forEach((opener) => {
    const idx = lower.indexOf(opener);
    if (idx > 0 && (earliest === -1 || idx < earliest)) earliest = idx;
  });
  if (earliest > 0) {
    // Capitalise the trimmed sentence's first letter.
    const trimmed = q.slice(earliest);
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return q;
}

async function selectQuestions(jobDescription, count = 5) {
  if (!hasAnthropic()) return selectQuestionsHeuristic(jobDescription, count);

  const result = await claudeJSON(
    `You're a senior recruiter writing competency-based interview questions for the role described below. ` +
    `Write ${count} questions that a real interviewer would plausibly ask for THIS specific role — ground ` +
    `each one in something actually mentioned or implied in the job description (a responsibility, a skill, ` +
    `a type of stakeholder, a pressure the role involves), not generic filler. Cover a genuine spread of ` +
    `competencies (e.g. don't ask 5 variations on "tell me about teamwork") — mix things like stakeholder ` +
    `influence, handling setbacks, prioritisation, decision-making under pressure, and anything the JD ` +
    `specifically flags as important. Use natural interview phrasing ("Tell me about a time...", "Describe ` +
    `a situation where...", "Give me an example of..."). Do not write questions about the candidate's CV — ` +
    `you only have the job description, not their background.\n\n` +
    `CRITICAL FORMAT RULE: each question must be ONLY the question itself — one sentence, starting directly ` +
    `with the question phrasing (e.g. "Tell me about a time..."). Do NOT prefix it with any scene-setting, ` +
    `context paragraph, explanation of why you're asking, or restatement of the job description. A candidate ` +
    `should be able to read it in one breath, the way a real interviewer would actually say it out loud.\n\n` +
    `JOB DESCRIPTION:\n${jobDescription}\n\n` +
    `Return JSON: {"questions": ["question 1", "question 2", ...]} with exactly ${count} items.`
  );

  if (!result || !Array.isArray(result.questions) || result.questions.length === 0) {
    return selectQuestionsHeuristic(jobDescription, count);
  }
  return result.questions.slice(0, count).map((q) => ({ question: stripPreamble(q), matchedOn: [] }));
}

module.exports = { QUESTION_BANK, selectQuestions, selectQuestionsHeuristic };
