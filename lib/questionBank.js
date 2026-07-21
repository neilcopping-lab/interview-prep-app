/**
 * Competency question bank + JD-matching selector.
 *
 * PROTOTYPE MODE: this picks the best-matching questions from a fixed bank
 * by scoring keyword overlap against the job description. It's genuinely
 * responsive to each JD (a driver-recruitment JD and a finance JD will get
 * different questions) without needing a paid API.
 *
 * AI UPGRADE POINT: a real LLM call could write bespoke questions from
 * scratch, tuned to the exact language of the JD, rather than picking the
 * closest matches from a fixed list. Swap selectQuestions() for a model call
 * that returns 5 tailored questions and nothing else here needs to change —
 * the rest of the app just consumes whatever question text it's given.
 */

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

function selectQuestions(jobDescription, count = 5) {
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

module.exports = { QUESTION_BANK, selectQuestions };
