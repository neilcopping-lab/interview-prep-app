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
const { getAvailableSlots, bookSlot } = require("./lib/booking");
const { hasOpenAI, getOpenAI, TRANSCRIBE_MODEL } = require("./lib/aiClients");

const app = express();

// Security: cap upload size (10MB) and restrict to the file types the app
// actually handles — rejects anything else before it ever touches disk.
const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_UPLOAD_TYPES.has(file.mimetype) || file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

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
app.post("/api/questions", async (req, res) => {
  const { jobDescription, count } = req.body;
  if (!jobDescription || !jobDescription.trim()) {
    return res.status(400).json({ error: "Job description is required to select questions." });
  }
  try {
    const questions = await selectQuestions(jobDescription, count || 5);
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not select questions" });
  }
});

// -------------------------------------------------------------------------
// Transcription. Uses OpenAI's transcription API when OPENAI_API_KEY is
// set; otherwise returns a clear message so the frontend falls back to a
// text box. If the real call fails for any reason (bad key, rate limit,
// network), it degrades the same way rather than erroring out — the
// candidate can always just type instead.
// -------------------------------------------------------------------------
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  const filePath = req.file && req.file.path;
  if (!hasOpenAI()) {
    if (filePath) fs.unlink(filePath, () => {});
    return res.json({
      text: null,
      message: "Transcription isn't configured yet — add OPENAI_API_KEY in Render's Environment tab. For now, please type your answer.",
    });
  }
  try {
    const client = getOpenAI();
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: TRANSCRIBE_MODEL,
    });
    res.json({ text: (transcription.text || "").trim() });
  } catch (err) {
    console.error("[/api/transcribe] falling back:", err.message);
    res.json({ text: null, message: "Transcription hit a problem just now — please type your answer instead." });
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
});

// -------------------------------------------------------------------------
// Generate the report as JSON (used by the frontend to render a preview).
// -------------------------------------------------------------------------
app.post("/api/report", async (req, res) => {
  try {
    const report = await generateReport(req.body);
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
    const report = await generateReport(req.body);
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
// Two line items to support: the £45 report, and the optional £29 coaching
// add-on — /api/booking/book below should also check for a confirmed
// payment on that specific slot before accepting it.
// -------------------------------------------------------------------------
app.post("/api/checkout", (req, res) => {
  res.json({
    url: null,
    message: "Payment is not wired up in this prototype. Add STRIPE_SECRET_KEY and create a real Checkout session here — see README.md.",
  });
});

// -------------------------------------------------------------------------
// COACHING ADD-ON BOOKING (£29) — real slot generation and double-booking
// prevention, no payment gate yet (see PAYMENT note above and README).
// -------------------------------------------------------------------------
app.get("/api/booking/slots", (req, res) => {
  res.json({ slots: getAvailableSlots() });
});

app.post("/api/booking/book", (req, res) => {
  const { slot, name, email, companyName } = req.body || {};
  if (!slot || !name || !email) {
    return res.status(400).json({ error: "Slot, name and email are required." });
  }
  const result = bookSlot({ slot, name, email, companyName });
  if (!result.ok) return res.status(409).json(result);
  res.json(result);
});

// Catch multer errors (oversized or wrong-type uploads) with a clean JSON
// response instead of a raw stack trace.
app.use((err, req, res, next) => {
  if (err && err.message) {
    console.error(err);
    return res.status(400).json({ error: err.message === "Unsupported file type" ? err.message : "That file couldn't be uploaded — check it's under 10MB and a PDF, Word doc or text file." });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Interview prep app running on http://localhost:${PORT}`));
