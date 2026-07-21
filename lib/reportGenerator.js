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

const { hasAnthropic, getAnthropic, CLAUDE_MODEL } = require("./aiClients");

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
// Claude call helpers
// ---------------------------------------------------------------------

async function claudeText(prompt, { webSearch = false, maxTokens = 1024 } = {}) {
  const client = getAnthropic();
  if (!client) return null;
  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      ...(webSearch ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] } : {}),
    });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return text || null;
  } catch (err) {
    console.error("[claudeText] falling back:", err.message);
    return null;
  }
}

async function claudeJSON(prompt, { maxTokens = 1024 } = {}) {
  const raw = await claudeText(
    `${prompt}\n\nRespond with ONLY valid JSON, no markdown code fences, no commentary before or after it.`,
    { maxTokens }
  );
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[claudeJSON] could not parse response, falling back:", err.message);
    return null;
  }
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
    `"developmentAreas": [{"area": "short phrase naming the gap", "cherry": "one or two sentence proactive solution, in second person (\\"you\\")"}] up to 5}`
  );

  if (!result || !Array.isArray(result.matchedStrengths) || !Array.isArray(result.developmentAreas)) {
    return gapAnalysisHeuristic(jobDescription, cvText);
  }
  return result;
}

// ---------------------------------------------------------------------
// Company research
// ---------------------------------------------------------------------

function companyResearchFallback(companyName) {
  return {
    snapshot: `[AI UPGRADE POINT] Company research for "${companyName}" would appear here — `
      + `website, LinkedIn tone, recent social/campaign activity, reviews, competitors and USP, `
      + `following the guide's Step 01 checklist. Wire ANTHROPIC_API_KEY with the web_search tool `
      + `enabled to populate this automatically.`,
  };
}

async function companyResearch(companyName) {
  if (!companyName || !companyName.trim()) return companyResearchFallback(companyName);
  if (!hasAnthropic()) return companyResearchFallback(companyName);

  const text = await claudeText(
    `Research the company "${companyName}" for someone about to interview there. Search the web for ` +
    `current information and write a concise briefing (150-250 words, plain prose, no headers) covering: ` +
    `what they do and who they serve, their stated values/culture, any recent news or growth, and how ` +
    `they compare to competitors in their space. If you can't find reliable information on a specific ` +
    `point, say so plainly rather than guessing — never invent facts about a real company. Write it as ` +
    `direct, useful briefing notes, not a sales pitch.`,
    { webSearch: true, maxTokens: 800 }
  );

  if (!text) return companyResearchFallback(companyName);
  return { snapshot: text };
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
    const text = await claudeText(
      `Write the "Filling" layer of a Pitch Sandwich (the "tell me about yourself" answer framework: ` +
      `Connect / Fit / Values). This layer covers top-line skills and proof, matched to the job description. ` +
      `Write 2-3 sentences, first person, starting with "Professionally, ...". Use only real experience from ` +
      `the CV below — never invent achievements. Weight it toward what this specific job description asks for.\n\n` +
      `JOB DESCRIPTION:\n${jobDescription}\n\nCV:\n${cvText}`,
      { maxTokens: 300 }
    );
    if (text) filling = text;
  }

  return { bread1, filling, bread2 };
}

// ---------------------------------------------------------------------
// STAR answers
// ---------------------------------------------------------------------

function draftStarAnswerHeuristic(question, transcript) {
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

async function draftStarAnswer(question, transcript) {
  if (!transcript || !transcript.trim()) {
    return { question, situation: "[No answer recorded yet]", task: "", action: "", result: "" };
  }
  if (!hasAnthropic()) return draftStarAnswerHeuristic(question, transcript);

  const result = await claudeJSON(
    `Rewrite this rambling spoken interview answer into a clean STAR structure (Situation, Task, Action, ` +
    `Result). Use only what's actually said — don't invent details, numbers or outcomes that aren't there. ` +
    `Tidy up filler words and false starts, but keep it in the candidate's own voice and first person ("I"). ` +
    `If a part (e.g. Result) genuinely isn't covered in the transcript, say so honestly rather than making ` +
    `something up.\n\nQUESTION: ${question}\n\nTRANSCRIPT: ${transcript}\n\n` +
    `Return JSON: {"situation": "...", "task": "...", "action": "...", "result": "..."}`
  );

  if (!result) return draftStarAnswerHeuristic(question, transcript);
  return {
    question,
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

const STAR_GUIDE = {
  intro: "Before you record or type each answer, structure it in your head using STAR. It's the difference between rambling and a story the interviewer can actually follow.",
  steps: [
    { letter: "S", label: "Situation", explanation: "Set the scene, briefly — where you were, what the context was. A sentence or two, not the whole backstory." },
    { letter: "T", label: "Task", explanation: "What you were specifically responsible for delivering. Not the team's goal — yours." },
    { letter: "A", label: "Action", explanation: "What you actually did, step by step. This is the part that gets scored — don't rush it, and say \"I,\" not \"we.\"" },
    { letter: "R", label: "Result", explanation: "What happened. Numbers and outcomes if you have them — even a rough estimate beats no number at all." },
  ],
  tips: [
    "Own it: say \"I,\" not \"we\" — the panel is hiring you, not your old team.",
    "The Action is the money shot: don't rabbit-hole in the Situation, get to what you actually did.",
    "Two or three strong, versatile stories can answer several different questions — you don't need a perfectly unique story for every single one.",
  ],
};

// ---------------------------------------------------------------------
// Assemble the report. Independent AI calls run in parallel to keep
// total generation time down.
// ---------------------------------------------------------------------

async function generateReport(input) {
  const {
    candidateName, companyName, connectDetail, values,
    jobDescription, cvText, answers,
  } = input;

  const [gaps, research, pitch, starAnswers] = await Promise.all([
    gapAnalysis(jobDescription, cvText),
    companyResearch(companyName),
    pitchSandwich({ candidateName, connectDetail, cvText, jobDescription, values }),
    Promise.all((answers || []).map((a) => draftStarAnswer(a.question, a.transcript))),
  ]);

  const questions = questionsToAsk(companyName);

  return {
    candidateName,
    companyName,
    generatedAt: new Date().toISOString(),
    aiPowered: hasAnthropic(),
    research,
    pitch,
    gapAnalysis: gaps,
    starGuide: STAR_GUIDE,
    starAnswers,
    questionsToAsk: questions,
  };
}

module.exports = { generateReport, topKeywords, gapAnalysisHeuristic, STAR_GUIDE };
