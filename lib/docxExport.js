const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  ShadingType, BorderStyle, LevelFormat, convertInchesToTwip,
} = require("docx");

const NAVY = "1F3864";
const ACCENT = "2E74B5";
const GREY = "595959";

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 140 },
    border: { bottom: { color: NAVY, space: 4, style: BorderStyle.SINGLE, size: 8 } },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 28 })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, color: ACCENT, size: 22 })],
  });
}
function p(text, italics = false) {
  return new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text, size: 21, italics })] });
}
function note(text) {
  return new Paragraph({
    spacing: { after: 160 },
    shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
    children: [new TextRun({ text, italics: true, size: 20, color: GREY })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 90 },
    children: [new TextRun({ text, size: 21 })],
  });
}
function starLine(label, text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 21, color: ACCENT }),
      new TextRun({ text: text || "—", size: 21 }),
    ],
  });
}

async function buildReportDocx(report) {
  const children = [
    new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: "Interview Preparation Report", bold: true, size: 36, color: NAVY })] }),
    new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: `${report.candidateName || "Candidate"} — ${report.companyName || "Company"}`, bold: true, size: 24, color: ACCENT })] }),
    new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: `Generated ${new Date(report.generatedAt).toLocaleString("en-GB")}`, size: 18, color: GREY, italics: true })] }),

    h1("1. Company Research"),
    p(report.research.snapshot),

    h1("2. Opening Pitch — The Pitch Sandwich"),
    h2("Bread 1 — Connect"),
    p(report.pitch.bread1, true),
    h2("Filling — Fit"),
    p(report.pitch.filling, true),
    h2("Bread 2 — Values"),
    p(report.pitch.bread2, true),

    h1("3. Gap Analysis — the Cake + Cherry Method"),
    p("Matched strengths (found in both the job description and your CV):"),
    ...(report.gapAnalysis.matchedStrengths.length
      ? report.gapAnalysis.matchedStrengths.map((m) => bullet(m))
      : [note("No strong keyword overlap detected — worth checking the CV genuinely covers the role.")]),
    p("Development areas and cherries on top:"),
    ...report.gapAnalysis.developmentAreas.flatMap((d) => [
      starLine("Area", d.area),
      starLine("Cherry", d.cherry),
    ]),

    h1("4. STAR Answers"),
    p(report.starGuide.intro),
    ...report.starGuide.steps.flatMap((s) => [starLine(`${s.letter} — ${s.label}`, s.explanation)]),
    ...report.starGuide.tips.map((t) => bullet(t)),
    new Paragraph({ text: "", spacing: { after: 100 } }),
    ...report.starAnswers.flatMap((a) => [
      h2(a.question),
      starLine("Situation", a.situation),
      starLine("Task", a.task),
      starLine("Action", a.action),
      starLine("Result", a.result),
      ...(a.note ? [note(a.note)] : []),
    ]),

    h1("5. Your Questions"),
    ...Object.entries(report.questionsToAsk).flatMap(([type, qs]) => [
      h2(type),
      ...qs.map((q) => bullet(q)),
    ]),
  ];

  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.18) } } } }],
      }],
    },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 } } }, children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildReportDocx };
