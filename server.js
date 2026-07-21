const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const { v4: uuid } = require("uuid");

const { generateReport } = require("./lib/reportGenerator");
const { buildReportDocx } = require("./lib/docxExport");
const { selectQuestions } = require("./lib/questionBank");

const app = express();
const upload = multer({ dest: path.join(__dirname, "uploads") });

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function extractTextFromFile(filePath, originalName) {
  const name = originalName.toLowerCase();
  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  if (name.endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    return result.text;
  }
  // .txt or unknown — read as plain text
  return fs.readFileSync(filePath, "utf8");
}

// -------------------------------------------------------------------------
// File upload -> extracted text. Used for both the CV and the job
// description upload. Supports .docx (mammoth), .pdf (pdf-parse) and .txt.
// Anything else, the frontend falls back to "paste the text instead".
// -------------------------------------------------------------------------
app.post("/api/extract-text", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    res.json({ text: text.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not extract text from that file. Try pasting it instead." });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

// Kept for backwards compatibility with the earlier CV-only endpoint.
app.post("/api/extract-cv", upload.single("cv"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    res.json({ text: text.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not extract text from that file. Try pasting your CV instead." });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

// -------------------------------------------------------------------------
// Pick competency questions that actually match this job description.
// Prototype: keyword-matched against a fixed question bank (see
// lib/questionBank.js) — genuinely responsive to each JD, no API needed.
// AI UPGRADE POINT: swap for a real model call to write bespoke questions.
// -------------------------------------------------------------------------
app.post("/api/questions", (req, res) => {
  const { jobDescription, count } = req.body;
  if (!jobDescription || !jobDescription.trim()) {
    return res.status(400).json({ error: "Job description is required to select questions." });
  }
  const questions = selectQuestions(jobDescription, count || 5);
  res.json({ questions });
});

// -------------------------------------------------------------------------
// AI UPGRADE POINT — transcription.
// Prototype: no speech-to-text wired up. Returns a clear message so the
// frontend can fall back to a text box. To go live, wire OPENAI_API_KEY and
// call the Whisper / gpt-4o-transcribe endpoint here with req.file, then
// return { text: <transcript> } in the same shape.
// -------------------------------------------------------------------------
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (req.file) fs.unlink(req.file.path, () => {});
  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      text: null,
      message: "Transcription is not wired up in this prototype. Set OPENAI_API_KEY and implement the Whisper call in server.js (/api/transcribe) to enable it. For now, please type your answer.",
    });
  }
  // Real implementation goes here once OPENAI_API_KEY is set.
  res.json({ text: null, message: "OPENAI_API_KEY detected but the Whisper call isn't implemented yet — add it here." });
});

// -------------------------------------------------------------------------
// Generate the report as JSON (used by the frontend to render a preview).
// -------------------------------------------------------------------------
app.post("/api/report", (req, res) => {
  try {
    const report = generateReport(req.body);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not generate report" });
  }
});

// -------------------------------------------------------------------------
// Generate the report and return it as a downloadable .docx.
// -------------------------------------------------------------------------
app.post("/api/report/docx", async (req, res) => {
  try {
    const report = generateReport(req.body);
    const buffer = await buildReportDocx(report);
    const filename = `Interview_Prep_${(report.companyName || "report").replace(/[^a-z0-9]/gi, "_")}_${uuid().slice(0, 8)}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not build the document" });
  }
});

// -------------------------------------------------------------------------
// PAYMENT — not wired up in this prototype.
// To go live: replace this stub with a real Stripe Checkout session
// (stripe.checkout.sessions.create) and only allow /api/report* once a
// session has been confirmed paid (e.g. via a webhook + short-lived token).
// -------------------------------------------------------------------------
app.post("/api/checkout", (req, res) => {
  res.json({
    url: null,
    message: "Payment is not wired up in this prototype. Add STRIPE_SECRET_KEY and create a real Checkout session here — see README.md.",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Interview prep app running on http://localhost:${PORT}`));
