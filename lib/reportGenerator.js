/**
 * Report generation logic for the Com'mon People Interview Prep Report.
 *
 * PROTOTYPE MODE: everything in here runs without any paid API and produces
 * a real, usable report. The two places that would most benefit from a real
 * AI model are clearly marked "AI UPGRADE POINT" — wire an API key and swap
 * the marked function body for a real model call and the rest of the app
 * (frontend, docx export, download flow) does not need to change.
 *
 * Recommended real-world upgrade:
 *   - ANTHROPIC_API_KEY -> Claude API (with the web_search tool enabled) for
 *     company research, gap analysis reasoning and STAR answer drafting.
 *   - OPENAI_API_KEY -> Whisper / gpt-4o-transcribe for turning the recorded
 *     verbal answers into text (see transcribe.js).
 */

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

/**
 * AI UPGRADE POINT #1 — Gap analysis.
 * Prototype: naive keyword overlap between JD and CV.
 * Real version: send both texts to an LLM and ask it to reason about
 * genuine capability gaps, not just missing words (e.g. "Adobe" vs "Canva"
 * should be recognised as an adjacent-skill gap, not a random miss).
 */
function gapAnalysis(jobDescription, cvText) {
  const jdWords = topKeywords(jobDescription, 25);
  const cvWords = new Set(topKeywords(cvText, 60));
  const matched = jdWords.filter((w) => cvWords.has(w));
  const gaps = jdWords.filter((w) => !cvWords.has(w)).slice(0, 6);
  return { matched, gaps };
}

/**
 * AI UPGRADE POINT #2 — Company research.
 * Prototype: returns a placeholder block explaining what would populate
 * here. Real version: an LLM call with web search enabled, run against the
 * company name, following the same "Step 01" categories as the Com'mon
 * People guide (website, LinkedIn, social, reviews, competitors, USP).
 */
function companyResearch(companyName) {
  return {
    snapshot: `[AI UPGRADE POINT] Company research for "${companyName}" would appear here — `
      + `website, LinkedIn tone, recent social/campaign activity, reviews, competitors and USP, `
      + `following the guide's Step 01 checklist. Wire ANTHROPIC_API_KEY with the web_search tool `
      + `enabled to populate this automatically.`,
  };
}

function pitchSandwich({ candidateName, connectDetail, cvText, jobDescription, values }) {
  const jdWords = topKeywords(jobDescription, 8).slice(0, 4).join(", ");
  return {
    bread1: `A bit about me — I'm ${candidateName || "[name]"}${connectDetail ? `, ${connectDetail}` : " — [add a personal detail here, e.g. where you're based or an outside interest]"}.`,
    filling: `Professionally, [AI UPGRADE POINT: summarise the candidate's most relevant experience from their CV, `
      + `weighted toward what the job description emphasises most — this JD leans heavily on: ${jdWords || "[keywords]"}].`,
    bread2: `In how I work, I value ${values && values.length ? values.join(" and ") : "[value 1] and [value 2]"}, `
      + `which means you'll get someone who [add what that looks like in behaviour].`,
  };
}

/**
 * STAR answers are built directly from the candidate's own verbal input —
 * this is the one part of the flow where the prototype already uses real
 * user-generated content, not a placeholder. What's missing without an LLM
 * is the *structuring*: turning a rambling verbal answer into clean
 * Situation / Task / Action / Result paragraphs. Prototype does a light,
 * rule-based split; the AI upgrade point replaces this with a real rewrite.
 */
function draftStarAnswer(question, transcript) {
  if (!transcript || !transcript.trim()) {
    return {
      question,
      situation: "[No answer recorded yet]",
      task: "",
      action: "",
      result: "",
    };
  }
  // Naive prototype split: chop the transcript into quarters as a rough
  // stand-in for Situation / Task / Action / Result. This is intentionally
  // crude — flagged clearly so nobody mistakes it for the real thing.
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
    situation: parts[0] || "[AI UPGRADE POINT would restructure this from the transcript]",
    task: parts[1] || "",
    action: parts[2] || "",
    result: parts[3] || "",
    note: "Prototype split — a real model call (AI UPGRADE POINT) would rewrite this cleanly into S/T/A/R rather than chopping the transcript into quarters.",
  };
}

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

function generateReport(input) {
  const {
    candidateName, companyName, connectDetail, values,
    jobDescription, cvText, answers,
  } = input;

  const { matched, gaps } = gapAnalysis(jobDescription, cvText);
  const research = companyResearch(companyName);
  const pitch = pitchSandwich({ candidateName, connectDetail, cvText, jobDescription, values });
  const starAnswers = (answers || []).map((a) => draftStarAnswer(a.question, a.transcript));
  const questions = questionsToAsk(companyName);

  return {
    candidateName,
    companyName,
    generatedAt: new Date().toISOString(),
    research,
    pitch,
    gapAnalysis: {
      matchedStrengths: matched,
      developmentAreas: gaps.map((g) => ({
        area: g,
        cherry: "[AI UPGRADE POINT: a proactive, credible solution for this gap would be drafted here]",
      })),
    },
    starAnswers,
    questionsToAsk: questions,
  };
}

module.exports = { generateReport, topKeywords, gapAnalysis };
