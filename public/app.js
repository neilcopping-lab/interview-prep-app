const QUESTIONS = [
  "Tell me about a time you had to influence a senior stakeholder who didn't initially agree with you.",
  "Describe a time a campaign or project didn't go to plan — what happened, and what did you do?",
  "Tell me about a time you managed a difficult relationship with an external agency or supplier.",
  "Describe a time you received tough feedback and how you responded.",
  "Tell me about a time you had to make a decision quickly with incomplete information.",
];

const state = {
  candidateName: "",
  companyName: "",
  connectDetail: "",
  values: [],
  jobDescription: "",
  cvText: "",
  answers: QUESTIONS.map((q) => ({ question: q, transcript: "" })),
};

const $ = (id) => document.getElementById(id);

function showPanel(n) {
  [1, 2, 3].forEach((i) => $(`panel-${i}`).classList.toggle("hidden", i !== n));
  document.querySelectorAll(".step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === n);
  });
}

// ---------------- STEP 1 ----------------
$("cvFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("cv", file);
  const res = await fetch("/api/extract-cv", { method: "POST", body: fd });
  const data = await res.json();
  if (data.text) $("cvText").value = data.text;
  else alert(data.error || "Could not read that file — please paste your CV instead.");
});

$("toStep2").addEventListener("click", () => {
  state.candidateName = $("candidateName").value.trim();
  state.companyName = $("companyName").value.trim();
  state.connectDetail = $("connectDetail").value.trim();
  state.values = $("values").value.split(",").map((v) => v.trim()).filter(Boolean);
  state.jobDescription = $("jobDescription").value.trim();
  state.cvText = $("cvText").value.trim();

  if (!state.jobDescription || !state.cvText) {
    alert("Please add both a job description and your CV before continuing.");
    return;
  }
  renderQuestions();
  showPanel(2);
});

// ---------------- STEP 2 ----------------
function renderQuestions() {
  const container = $("questionList");
  container.innerHTML = "";
  QUESTIONS.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "qa-card";
    card.innerHTML = `
      <h4>${idx + 1}. ${q}</h4>
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

$("back1").addEventListener("click", () => showPanel(1));

$("toStep3").addEventListener("click", async () => {
  QUESTIONS.forEach((q, idx) => {
    state.answers[idx].transcript = $(`qa-text-${idx}`).value.trim();
  });
  showPanel(3);
  $("genStatus").textContent = "Generating…";
  $("reportPreview").innerHTML = "";

  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  const report = await res.json();
  renderReport(report);
  $("genStatus").textContent = `Generated for ${report.candidateName || "you"} — ${report.companyName || "this role"}`;
});

$("back2").addEventListener("click", () => showPanel(2));

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

function renderReport(r) {
  let html = "";

  html += block("1. Company Research", upgradeFlagIfNeeded(r.research.snapshot));

  html += block("2. Opening Pitch — The Pitch Sandwich", `
    <h4>Bread 1 — Connect</h4>${upgradeFlagIfNeeded(r.pitch.bread1)}
    <h4>Filling — Fit</h4>${upgradeFlagIfNeeded(r.pitch.filling)}
    <h4>Bread 2 — Values</h4>${upgradeFlagIfNeeded(r.pitch.bread2)}
  `);

  const matched = r.gapAnalysis.matchedStrengths.length
    ? `<p><b>Matched strengths:</b> ${r.gapAnalysis.matchedStrengths.join(", ")}</p>`
    : `<p><b>Matched strengths:</b> none detected — check the CV genuinely covers this role.</p>`;
  const gaps = r.gapAnalysis.developmentAreas.map((d) =>
    `<div class="star-line"><b>Area:</b> ${d.area}</div><div class="upgrade-flag">⚠ ${d.cherry}</div>`
  ).join("");
  html += block("3. Gap Analysis — the Cake + Cherry Method", matched + gaps);

  const stars = r.starAnswers.map((a) => `
    <h4>${a.question}</h4>
    <div class="star-line"><b>Situation:</b> ${a.situation}</div>
    <div class="star-line"><b>Task:</b> ${a.task || "—"}</div>
    <div class="star-line"><b>Action:</b> ${a.action || "—"}</div>
    <div class="star-line"><b>Result:</b> ${a.result || "—"}</div>
    ${a.note ? `<div class="upgrade-flag">⚠ ${a.note}</div>` : ""}
  `).join("<hr style='border:none;border-top:1px solid #eee;margin:14px 0;'>");
  html += block("4. STAR Answers", stars);

  const qs = Object.entries(r.questionsToAsk).map(([type, list]) => `
    <h4>${type}</h4><ul>${list.map((q) => `<li>${q}</li>`).join("")}</ul>
  `).join("");
  html += block("5. Your Questions", qs);

  $("reportPreview").innerHTML = html;
}

$("downloadDocx").addEventListener("click", async () => {
  const res = await fetch("/api/report/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) { alert("Could not build the document."); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Interview_Prep_Report.docx";
  a.click();
  URL.revokeObjectURL(url);
});
