/**
 * Shared, lazily-created API clients. Both read their key from an
 * environment variable — set in Render's Environment tab, never in code.
 *
 * hasAnthropic() / hasOpenAI() let the rest of the app check whether a key
 * is configured before attempting a real call, so it can fall back to the
 * prototype's rule-based behaviour instead of crashing when a key is
 * missing (e.g. running locally without one set).
 */

let anthropicClient = null;
let openaiClient = null;

function hasAnthropic() {
  return !!process.env.ANTHROPIC_API_KEY;
}

function hasOpenAI() {
  return !!process.env.OPENAI_API_KEY;
}

function getAnthropic() {
  if (!hasAnthropic()) return null;
  if (!anthropicClient) {
    const Anthropic = require("@anthropic-ai/sdk");
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getOpenAI() {
  if (!hasOpenAI()) return null;
  if (!openaiClient) {
    const OpenAI = require("openai");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// The model used for all report-writing calls. Overridable via env var
// without a code change if you want to try a different one.
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL || "gpt-4o-transcribe";

// ---------------------------------------------------------------------
// Shared Claude call helpers, used by both lib/reportGenerator.js and
// lib/questionBank.js. Both return null on any failure (missing key,
// network error, bad response) so callers can fall back cleanly instead
// of crashing.
// ---------------------------------------------------------------------

// Prepended to every prompt. This is a paid product — someone is spending
// £45 (or £74 with the coaching add-on) on this report, so the bar is
// "genuinely useful and specific," not "plausible-sounding AI filler."
// Explicitly telling the model that tends to measurably improve output
// quality and tone versus a bare instruction.
const QUALITY_PREAMBLE = "You're writing part of a paid interview preparation product — a real person has paid for this and is relying on it to walk into a real interview well prepared. Write like an experienced, specific, no-nonsense recruiter, not like generic AI career advice. Be concrete. Avoid vague filler phrases (\"leverage your skills\", \"showcase your passion\", \"in today's competitive job market\"). If you don't have enough information to say something specific and true, say less rather than padding it out.\n\n";

// Returns { text, sources } — never a bare string — so every caller has
// access to real citation URLs when web search was used. `sources` is
// always an array (empty when web search wasn't enabled or nothing was
// cited); callers that don't care about sources can just destructure
// `.text` and ignore it.
async function claudeText(prompt, { webSearch = false, maxTokens = 1024 } = {}) {
  const client = getAnthropic();
  if (!client) return null;
  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: QUALITY_PREAMBLE + prompt }],
      ...(webSearch ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] } : {}),
    });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!text) return null;

    // Pull real source URLs out of any citations Claude attached to its
    // text blocks (only present when webSearch was used). De-duped by URL,
    // capped so a report section can't end up with 20 near-identical links.
    const seen = new Set();
    const sources = [];
    response.content.forEach((block) => {
      if (block.type !== "text" || !Array.isArray(block.citations)) return;
      block.citations.forEach((c) => {
        if (c.url && !seen.has(c.url)) {
          seen.add(c.url);
          sources.push({ url: c.url, title: c.title || c.url });
        }
      });
    });

    return { text, sources: sources.slice(0, 6) };
  } catch (err) {
    console.error("[claudeText] falling back:", err.message);
    return null;
  }
}

async function claudeJSON(prompt, { maxTokens = 1024 } = {}) {
  const result = await claudeText(
    `${prompt}\n\nRespond with ONLY valid JSON, no markdown code fences, no commentary before or after it.`,
    { maxTokens }
  );
  if (!result || !result.text) return null;
  try {
    const cleaned = result.text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[claudeJSON] could not parse response, falling back:", err.message);
    return null;
  }
}

module.exports = {
  hasAnthropic, hasOpenAI, getAnthropic, getOpenAI, CLAUDE_MODEL, TRANSCRIBE_MODEL,
  claudeText, claudeJSON,
};
