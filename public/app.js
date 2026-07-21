const state = {
  candidateName: "",
  companyName: "",
  connectDetail: "",
  values: [],
  jobDescription: "",
  cvText: "",
  answers: [], // filled once questions are selected in toStep2
};

const $ = (id) => document.getElementById(id);

// Safe listener attach: if an element is missing (e.g. a partial deploy where
// index.html and app.js are out of sync), this logs a clear console warning
// and skips it — instead of throwing and silently breaking every other
// button on the page, which is what a bare $("id").addEventListener(...)
// would do the moment one expected element isn't found.
function on(id, event, handler) {
  const el = $(id);
  if (!el) {
    console.warn(`[interview-prep-app] Expected element #${id} was not found — index.html and app.js may be out of sync. Skipping its "${event}" handler.`);
    return;
  }
  el.addEventListener(event, handler);
}

function showPanel(n) {
  [1, 2, 3].forEach((i) => $(`panel-${i}`).classList.toggle("hidden", i !== n));
  document.querySelectorAll(".step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === n);
  });
}

async function extractFileText(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/extract-text", { method: "POST", body: fd });
  return res.json();
}

// ---------------- STEP 1 ----------------
on("jdFile", "change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const data = await extractFileText(file);
  if (data.text) $("jobDescription").value = data.text;
  else alert(data.error || "Could not read that file — please paste the job description instead.");
});

on("cvFile", "change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const data = await extractFileText(file);
  if (data.text) $("cvText").value = data.text;
  else alert(data.error || "Could not read that file — please paste your CV instead.");
});

on("toStep2", "click", async () => {
  state.candidateName = ($("candidateName")?.value || "").trim();
  state.companyName = ($("companyName")?.value || "").trim();
  state.connectDetail = ($("connectDetail")?.value || "").trim();
  state.values = ($("values")?.value || "").split(",").map((v) => v.trim()).filter(Boolean);
  state.jobDescription = ($("jobDescription")?.value || "").trim();
  state.cvText = ($("cvText")?.value || "").trim();

  if (!state.jobDescription || !state.cvText) {
    alert("Please add both a job description and your CV before continuing.");
    return;
  }

  const btn = $("toStep2");
  const status = $("questionStatus");
  if (btn) btn.disabled = true;
  if (status) status.textContent = "Reading the job description and picking your questions…";

  try {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: state.jobDescription, count: 5 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not select questions");

    state.answers = data.questions.map((q) => ({ question: q.question, transcript: "" }));
    renderQuestions();
    showPanel(2);
    if (status) status.textContent = "";
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Something went wrong picking questions — please try again.";
  } finally {
    if (btn) btn.disabled = false;
  }
});

// ---------------- STEP 2 ----------------
function renderQuestions() {
  const container = $("questionList");
  container.innerHTML = "";
  state.answers.forEach((a, idx) => {
    const card = document.createElement("div");
    card.className = "qa-card";
    card.innerHTML = `
      <h4>${idx + 1}. ${a.question}</h4>
      <div class="qa-controls">
        <button class="record-btn" data-idx="${idx}">● Record answer</button>
        <span class="qa-status" id="qa-status-${idx}">Not recorded — you can also just type below</span>
      </div>
      <textarea rows="3" id="qa-text-${idx}" placeholder="Type or paste your answer here"></textarea>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll(".record-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleRecording(btn));
  });
}

let mediaRecorder, audioChunks = [], activeIdx = null;

async function toggleRecording(btn) {
  const idx = Number(btn.dataset.idx);
  if (mediaRecorder && mediaRecorder.state === "recording" && activeIdx === idx) {
    mediaRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    activeIdx = idx;
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      btn.classList.remove("recording");
      btn.textContent = "● Record answer";
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const statusEl = $(`qa-status-${idx}`);
      statusEl.textContent = "Transcribing…";
      const fd = new FormData();
      fd.append("audio", blob, "answer.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (data.text) {
        $(`qa-text-${idx}`).value = data.text;
        statusEl.textContent = "Transcribed ✓";
      } else {
        statusEl.textContent = data.message || "Transcription unavailable — please type your answer.";
      }
    };
    mediaRecorder.start();
    btn.classList.add("recording");
    btn.textContent = "■ Stop recording";
    $(`qa-status-${idx}`).textContent = "Recording…";
  } catch (err) {
    alert("Couldn't access the microphone. You can type your answer instead.");
  }
}

on("back1", "click", () => showPanel(1));

on("toStep3", "click", async () => {
  state.answers.forEach((a, idx) => {
    a.transcript = ($(`qa-text-${idx}`)?.value || "").trim();
  });
  showPanel(3);
  if ($("genStatus")) $("genStatus").textContent = "Generating…";
  if ($("reportPreview")) $("reportPreview").innerHTML = "";

  try {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    const report = await res.json();
    if (!res.ok) throw new Error(report.error || "Could not generate report");
    state.generatedReport = report; // reused by downloadReportAsDocx so we don't pay for every AI call (and the cover image) twice
    renderReport(report);
    const aiTag = report.aiPowered ? " (AI-powered)" : " (prototype mode — add ANTHROPIC_API_KEY for full AI generation)";
    if ($("genStatus")) $("genStatus").textContent = `Generated for ${report.candidateName || "you"} — ${report.companyName || "this role"}${aiTag}`;
    // Downloadable the moment it's ready — paid for it, get it immediately,
    // don't make them hunt for a button. The button stays too, for a re-download.
    downloadReportAsDocx();
    renderAddonCard();
  } catch (err) {
    console.error(err);
    if ($("genStatus")) $("genStatus").textContent = "Something went wrong generating the report — please go back and try again.";
  }
});

on("back2", "click", () => showPanel(2));

// ---------------- STEP 3 ----------------
function block(title, html) {
  return `<div class="report-block"><h3>${title}</h3>${html}</div>`;
}
function upgradeFlagIfNeeded(text) {
  if (text && text.includes("[AI UPGRADE POINT")) {
    return `<div class="upgrade-flag">⚠ ${text}</div>`;
  }
  return `<p>${text}</p>`;
}
// Renders the "Sources:" line under a researched section — only appears
// when Claude's web search actually returned citations for that section.
function sourcesHtml(sources) {
  if (!sources || !sources.length) return "";
  const links = sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>`).join(" &nbsp;•&nbsp; ");
  return `<div class="report-sources"><b>Sources:</b> ${links}</div>`;
}
// Renders a { headline, bullets, sources } research section as a real
// bullet list — this is what replaced the old wall-of-prose paragraphs.
// Falls back to the upgrade-flag treatment if the AI call fell back
// (bullets will be empty in that case).
function researchBlock(title, section) {
  const headline = section.headline ? `<p>${section.headline}</p>` : "";
  const bullets = section.bullets && section.bullets.length
    ? `<ul>${section.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`
    : upgradeFlagIfNeeded(section.headline || "");
  return block(title, headline + bullets + sourcesHtml(section.sources));
}
// Small inline SVG bar showing how much of the JD the CV covers — a
// supporting visual next to the actual Cake + Cherry bullet analysis,
// not a replacement for it.
function skillsMatchSvg(skillsMatch) {
  if (!skillsMatch || skillsMatch.percent === null) return "";
  const pct = skillsMatch.percent;
  const w = 400, h = 26;
  const filledW = Math.round((w * pct) / 100);
  return `
    <div class="skills-match">
      <div class="skills-match-label"><b>Skills Match: ${pct}%</b> — ${skillsMatch.matched} of ${skillsMatch.total} job requirements matched to your CV</div>
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Skills match ${pct} percent">
        <rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="rgba(236,230,216,0.12)"></rect>
        <rect x="0" y="0" width="${filledW}" height="${h}" rx="4" fill="var(--mustard)"></rect>
      </svg>
    </div>
  `;
}

// Bespoke cover banner — the AI-generated abstract artwork (if it rendered
// successfully) with the candidate/company name overlaid as real HTML
// text, not AI-rendered text. Omitted cleanly if no image came back (no
// OPENAI_API_KEY, or the call failed) — never blocks the rest of the report.
function coverBannerHtml(r) {
  if (!r.cover || !r.cover.base64) return "";
  return `
    <div class="cover-banner">
      <img src="data:image/png;base64,${r.cover.base64}" alt="Cover artwork" />
      <div class="cover-banner-text">
        <div class="cover-banner-name">${r.candidateName || "Your"}</div>
        <div class="cover-banner-sub">Interview Prep — ${r.companyName || "Your Role"}</div>
      </div>
    </div>
  `;
}

function renderReport(r) {
  let html = coverBannerHtml(r);

  html += researchBlock("1. Company Overview", r.research);
  html += researchBlock("2. Recent News &amp; Press Activity", r.recentNews);
  html += researchBlock("3. Employee Sentiment (Reviews)", r.employeeSentiment);
  html += researchBlock("4. Social Media Presence", r.socialMedia);
  html += researchBlock("5. Market &amp; Sector Intelligence", r.marketIntelligence);
  html += researchBlock("6. Challenges You May Be Facing in This Role", r.roleChallenges);

  html += block("7. Opening Pitch — The Pitch Sandwich", `
    <h4>Bread 1 — Connect</h4>${upgradeFlagIfNeeded(r.pitch.bread1)}
    <h4>Filling — Fit</h4>${upgradeFlagIfNeeded(r.pitch.filling)}
    <h4>Bread 2 — Values</h4>${upgradeFlagIfNeeded(r.pitch.bread2)}
  `);

  const matched = r.gapAnalysis.matchedStrengths.length
    ? `<p><b>Matched strengths:</b></p><ul>${r.gapAnalysis.matchedStrengths.map((m) => `<li>${m}</li>`).join("")}</ul>`
    : `<p><b>Matched strengths:</b> none detected — check the CV genuinely covers this role.</p>`;
  const gaps = r.gapAnalysis.developmentAreas.map((d) =>
    `<div class="star-line"><b>Area:</b> ${d.area}</div><div class="upgrade-flag">⚠ ${d.cherry}</div>`
  ).join("");
  html += block("8. Gap Analysis — the Cake + Cherry Method", skillsMatchSvg(r.skillsMatch) + matched + gaps);

  const guide = r.starGuide;
  const guideHtml = guide ? `
    <p>${guide.intro}</p>
    <div class="star-grid">
      ${guide.steps.map((s) => `<div class="star-item"><b>${s.letter}</b> ${s.label} — ${s.explanation}</div>`).join("")}
    </div>
    <ul>${guide.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
    <hr style="border:none;border-top:1px solid rgba(236,230,216,0.15);margin:16px 0;">
  ` : "";

  const stars = r.starAnswers.map((a) => `
    <h4>${a.question}</h4>
    <div class="star-line"><b>Situation:</b> ${a.situation}</div>
    <div class="star-line"><b>Task:</b> ${a.task || "—"}</div>
    <div class="star-line"><b>Action:</b> ${a.action || "—"}</div>
    <div class="star-line"><b>Result:</b> ${a.result || "—"}</div>
    ${a.note ? `<div class="upgrade-flag">⚠ ${a.note}</div>` : ""}
  `).join("<hr style='border:none;border-top:1px solid rgba(236,230,216,0.15);margin:14px 0;'>");
  html += block("9. How to Answer, and Your STAR Answers", guideHtml + stars);

  const qs = Object.entries(r.questionsToAsk).map(([type, list]) => `
    <h4>${type}</h4><ul>${list.map((q) => `<li>${q}</li>`).join("")}</ul>
  `).join("");
  html += block("10. Your Questions", qs);

  $("reportPreview").innerHTML = html;
}

async function downloadReportAsDocx() {
  try {
    // Reuse the report we already generated for the on-screen preview
    // (state.generatedReport) instead of regenerating every AI call —
    // and the cover image — a second time just to build the .docx.
    const body = state.generatedReport ? { report: state.generatedReport } : state;
    const res = await fetch("/api/report/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { alert("Could not build the document."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Interview_Prep_Report.docx";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Could not build the document — use the Download button to try again.");
  }
}

on("downloadDocx", "click", downloadReportAsDocx);

// ---------------- COACHING ADD-ON ----------------
function renderAddonCard() {
  const el = $("addonCard");
  if (!el) return;
  el.classList.remove("hidden");
}

on("showBooking", "click", async () => {
  const panel = $("bookingPanel");
  const slotList = $("slotList");
  if (!panel || !slotList) return;
  panel.classList.remove("hidden");
  slotList.innerHTML = "Loading available times…";
  try {
    const res = await fetch("/api/booking/slots");
    const data = await res.json();
    renderSlots(data.slots || []);
  } catch (err) {
    slotList.innerHTML = "Could not load available times — please try again shortly.";
  }
});

function renderSlots(slots) {
  const slotList = $("slotList");
  if (!slotList) return;
  if (!slots.length) {
    slotList.innerHTML = "No slots available in the next two weeks — please check back soon.";
    return;
  }
  const byDay = {};
  slots.forEach((iso) => {
    const d = new Date(iso);
    const dayKey = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
    byDay[dayKey] = byDay[dayKey] || [];
    byDay[dayKey].push(iso);
  });
  slotList.innerHTML = Object.entries(byDay).map(([day, times]) => `
    <div class="slot-day">
      <div class="slot-day-label">${day}</div>
      <div class="slot-times">
        ${times.map((iso) => `<button class="slot-btn" data-slot="${iso}">${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</button>`).join("")}
      </div>
    </div>
  `).join("");

  slotList.querySelectorAll(".slot-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectSlot(btn.dataset.slot, btn));
  });
}

let selectedSlot = null;

function selectSlot(iso, btn) {
  selectedSlot = iso;
  document.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  const form = $("bookingForm");
  if (form) form.classList.remove("hidden");
  if ($("bookName") && !$("bookName").value) $("bookName").value = state.candidateName || "";
}

on("confirmBooking", "click", async () => {
  const status = $("bookingStatus");
  const name = ($("bookName")?.value || "").trim();
  const email = ($("bookEmail")?.value || "").trim();
  if (!selectedSlot) { if (status) status.textContent = "Please pick a time first."; return; }
  if (!name || !email) { if (status) status.textContent = "Please add your name and email."; return; }

  if (status) status.textContent = "Booking…";
  try {
    const res = await fetch("/api/booking/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot: selectedSlot, name, email, companyName: state.companyName }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (status) status.textContent = data.error || "Could not book that slot — please pick another.";
      return;
    }
    const when = new Date(selectedSlot).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    if (status) status.textContent = `Booked ✓ ${when} (UK time). A confirmation would be emailed to ${email} in production.`;
    $("slotList").innerHTML = "";
    $("bookingForm").classList.add("hidden");
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Something went wrong booking that slot — please try again.";
  }
});
