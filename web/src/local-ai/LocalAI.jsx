import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as Local from "./index.js";

const SECTIONS = [
  ["teach", "Teach & Security"],
  ["models", "Models"],
  ["work", "Memory · Agents"],
  ["export", "Export · Extension"],
];

/**
 * Full browser environment: inference, storage, agents, PDF/Excel,
 * security scanning, extension download — with teach-as-you-use.
 */
export function LocalAI({ api, network, busy: parentBusy, onNavigate, onRunSystem }) {
  const [section, setSection] = useState("teach");
  const [manifest, setManifest] = useState(null);
  const [inf, setInf] = useState(Local.inferenceStatus());
  const [modelCfg, setModelCfg] = useState(() => Local.loadInferenceSettings());
  const [probe, setProbe] = useState(null);
  const [gpu, setGpu] = useState(null);
  const [bench, setBench] = useState(null);
  const [mem, setMem] = useState(null);
  const [graph, setGraph] = useState(null);
  const [sec, setSec] = useState(null);
  const [teach, setTeach] = useState(() => Local.teachStats());
  const [lessonId, setLessonId] = useState(() => Local.teachStats().next?.id || Local.LESSONS[0].id);
  const [quizPick, setQuizPick] = useState(null);
  const [quizMsg, setQuizMsg] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState(
    "Monad gas limits, desk rejects, and how vault route stays signature-gated"
  );
  const [scanBox, setScanBox] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [research, setResearch] = useState(null);
  const [docs, setDocs] = useState([]);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [lastAudit, setLastAudit] = useState(null);
  const [platformSnap, setPlatformSnap] = useState(null);

  const lesson = useMemo(() => Local.getLesson(lessonId), [lessonId]);
  const progress = Local.loadProgress();

  const refresh = useCallback(async () => {
    try {
      const m = await Local.localAiManifest();
      setManifest(m);
      setInf(Local.inferenceStatus());
      setModelCfg(Local.loadInferenceSettings());
      setMem(m.engines.memory);
      setGraph(m.engines.knowledge_graph);
      setSec(m.engines.security);
      setTeach(Local.teachStats());
      setNotes(await Local.listNotes({ limit: 12 }));
      setEvents(await Local.listEvents({ limit: 12 }));
      setDocs(await Local.listDocs({ limit: 12 }));
      setNodes(Local.searchNodes("", { limit: 16 }));
    } catch (e) {
      setErr(String(e.message || e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function flash(msg) {
    setLog(msg);
    setTimeout(() => setLog(""), 4200);
  }

  const disabled = busy || parentBusy;

  async function withBusy(fn) {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function loadModel(force = true) {
    await withBusy(async () => {
      Local.saveInferenceSettings(modelCfg);
      await Local.ensureEmbedder({
        force,
        onProgress: () => setInf(Local.inferenceStatus()),
      });
      setInf(Local.inferenceStatus());
      flash(`Model ready · ${Local.inferenceStatus().model}`);
      await refresh();
    });
  }

  async function probeLocal() {
    await withBusy(async () => {
      const r = await Local.probeLocalModel(modelCfg.modelId, modelCfg.localModelPath);
      setProbe(r);
      flash(r.ok ? `Found · ${r.url}` : "Local model not found under /models/");
    });
  }

  async function saveNote() {
    await withBusy(async () => {
      Local.assertSafe(note);
      const emb = await Local.embedSafe(note);
      await Local.remember(note, { kind: "note", embedding: emb, source: "user" });
      await Local.ingestText(note, { source: "user-note" });
      setNote("");
      flash("Remembered locally");
      await refresh();
    });
  }

  async function runResearch() {
    await withBusy(async () => {
      Local.assertSafe(query);
      let pulse = {};
      try {
        const plat = await api(`/platform?network=${network}`);
        setPlatformSnap(plat);
        pulse = {
          version: plat.version,
          laws: plat.pulse?.laws,
          wallets: plat.pulse?.wallets,
          desk_equity: plat.pulse?.desk_equity,
          apps: (plat.apps?.first_party || []).map((a) => ({ id: a.id, name: a.name })),
        };
        try {
          const desk = await api("/desk");
          pulse.venues = (desk.venues || []).map((v) => ({ id: v.id, name: v.name }));
          pulse.desk_equity = desk.equity;
        } catch {
          /* optional */
        }
      } catch {
        /* offline */
      }
      const run = await Local.runResearch(query, pulse);
      setResearch(run);
      const all = await Local.listDocs({ limit: 20 });
      setDocs(all);
      if (run.document_id) setSelectedDoc(all.find((d) => d.id === run.document_id) || all[0]);
      flash(`Research done · ${(run.elapsed_ms || 0).toFixed(0)}ms`);
      await refresh();
    });
  }

  async function runSecurityAudit() {
    await withBusy(async () => {
      const audit = await Local.auditMemory();
      setLastAudit(audit);
      const dash = await Local.securityDashboard();
      const doc = await Local.generateSecurityBrief(dash, audit);
      setSelectedDoc(doc);
      flash(`Audit · ${audit.findings?.length || 0} findings`);
      await refresh();
    });
  }

  function runScan() {
    try {
      const r = Local.scanText(scanBox, { context: "live-scan" });
      setScanResult(r);
      flash(r.ok ? "Scan clean" : `${r.findings.length} findings · score ${r.score}`);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  async function hydrateGraph() {
    await withBusy(async () => {
      let facts = {};
      try {
        const plat = await api(`/platform?network=${network}`);
        setPlatformSnap(plat);
        facts = {
          version: plat.version,
          laws: plat.pulse?.laws,
          wallets: plat.pulse?.wallets,
          desk_equity: plat.pulse?.desk_equity,
          apps: (plat.apps?.first_party || []).slice(0, 12),
        };
        const desk = await api("/desk");
        facts.venues = desk.venues || [];
        facts.desk_equity = desk.equity;
      } catch {
        /* ok */
      }
      const st = await Local.hydrateFromPlatform(facts);
      const doc = await Local.generateKnowledgeMap(st, Local.searchNodes("", { limit: 30 }));
      setSelectedDoc(doc);
      flash(`Graph · ${st.nodes} nodes / ${st.edges} edges`);
      await refresh();
    });
  }

  async function exportPdfSecurity() {
    await withBusy(async () => {
      const dash = await Local.securityDashboard();
      const audit = lastAudit || (await Local.auditMemory());
      const out = await Local.exportSecurityPdf(dash, audit);
      flash(`PDF · ${out.filename}`);
      await refresh();
    });
  }

  async function exportExcel() {
    await withBusy(async () => {
      let plat = platformSnap;
      try {
        plat = await api(`/platform?network=${network}`);
        setPlatformSnap(plat);
      } catch {
        /* */
      }
      const audit = lastAudit || { findings: [] };
      const out = await Local.exportInventoryExcel({
        platform: plat,
        notes,
        events,
        findings: audit.findings || [],
      });
      flash(`Excel · ${out.filename}`);
      await refresh();
    });
  }

  async function exportResearchXlsx() {
    if (!research) {
      setErr("Run research first");
      return;
    }
    await withBusy(async () => {
      const out = await Local.exportResearchExcel(research);
      flash(`Excel · ${out.filename}`);
    });
  }

  async function downloadExt() {
    await withBusy(async () => {
      const out = await Local.downloadSecurityExtension();
      flash(`Extension ZIP · ${out.filename}`);
    });
  }

  function submitQuiz() {
    if (quizPick == null) {
      setQuizMsg("Pick an answer");
      return;
    }
    const ok = quizPick === lesson.quiz.answer;
    Local.markLesson(lesson.id, { quizOk: ok });
    setTeach(Local.teachStats());
    setQuizMsg(ok ? "Correct — lesson complete" : "Not quite — re-read teach, try again");
    if (ok) {
      const next = Local.teachStats().next;
      if (next) setLessonId(next.id);
      setQuizPick(null);
    }
    flash(ok ? `Lesson done · ${lesson.title}` : "Review the teach block");
  }

  return (
    <section className="panel local-ai">
      <div className="win-strip platform-strip">
        <div className="win-copy">
          <span className="eyebrow">BROWSER ENVIRONMENT · SECURE · TEACHES AS YOU USE</span>
          <h3>Inference · storage · agents · PDF/Excel · security · extension</h3>
          <p className="muted sm">
            On-device only. Security gate blocks keys/seeds. Lessons unlock confidence before you
            export or install.
          </p>
          <p className="muted sm">
            Model <code>{inf.model}</code> · {inf.state}
            {inf.state === "loading" ? ` ${inf.progress}%` : ""} · notes <b>{mem?.notes ?? 0}</b> ·
            graph <b>{graph?.nodes ?? 0}</b> · security <b>{sec?.posture || "—"}</b> · teach{" "}
            <b>
              {teach.done}/{teach.total}
            </b>
          </p>
        </div>
        <div className="win-actions">
          <button type="button" className="forge win-btn" disabled={disabled} onClick={() => loadModel(true)}>
            {inf.ready ? "Reload model" : "Load model"}
          </button>
          <button type="button" className="ghost" disabled={disabled} onClick={runSecurityAudit}>
            Security audit
          </button>
          {onRunSystem && (
            <button type="button" className="ghost" disabled={disabled} onClick={onRunSystem}>
              ▶ RUN SYSTEM
            </button>
          )}
          <button type="button" className="ghost" onClick={() => onNavigate?.("live")}>
            Platform
          </button>
        </div>
      </div>

      {err ? <div className="banner err">{err}</div> : null}
      {log ? <div className="banner ok">{log}</div> : null}

      <nav className="tabs local-subnav">
        {SECTIONS.map(([id, label]) => (
          <button key={id} type="button" className={section === id ? "on" : ""} onClick={() => setSection(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="primitive-row local-caps">
        {[
          ["Inference", inf.ready ? "ready" : inf.state, inf.ready],
          ["Storage", `${mem?.notes ?? 0} notes`, true],
          ["Security", sec?.posture || "—", sec?.posture !== "elevated"],
          ["Agents", `${(manifest?.engines?.agents || []).length}`, true],
          ["Exports", "md · pdf · xlsx", true],
          ["Teach", `${teach.pct}%`, teach.pct >= 50],
        ].map(([name, metric, ok]) => (
          <div key={name} className={`primitive-card ${ok ? "ok" : "warn"}`}>
            <span className="eyebrow">env</span>
            <b>{name}</b>
            <span className="muted sm">{metric}</span>
          </div>
        ))}
      </div>

      {section === "teach" && (
        <div className="grid2 tight" style={{ margin: "12px" }}>
          <article className="result">
            <label>
              TEACH · {teach.done}/{teach.total} · {teach.pct}%
            </label>
            <p className="muted sm">Complete lessons in order. Each ends with a quick check.</p>
            <div className="lesson-list">
              {Local.LESSONS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`proto project-btn ${lessonId === l.id ? "yes" : ""} ${progress[l.id]?.done ? "done" : ""}`}
                  onClick={() => {
                    setLessonId(l.id);
                    setQuizPick(null);
                    setQuizMsg("");
                  }}
                >
                  <b>
                    {progress[l.id]?.done ? "✓ " : "○ "}
                    {l.title}
                  </b>
                  <span className="muted sm">
                    {l.track} · ~{l.minutes}m
                  </span>
                </button>
              ))}
            </div>
          </article>
          <article className="result">
            <label>
              {lesson.track.toUpperCase()} · {lesson.title}
            </label>
            <p>{lesson.teach}</p>
            <p className="why-now">
              <b>Do:</b> {lesson.do}
            </p>
            <p className="muted sm law-note">
              <b>Security:</b> {lesson.security}
            </p>
            <label>Check</label>
            <p className="muted sm">{lesson.quiz.q}</p>
            {lesson.quiz.options.map((opt, i) => (
              <label key={opt} className="toggle quiz-opt">
                <input
                  type="radio"
                  name="quiz"
                  checked={quizPick === i}
                  onChange={() => setQuizPick(i)}
                />
                {opt}
              </label>
            ))}
            <button type="button" className="forge" style={{ marginTop: 10 }} onClick={submitQuiz}>
              Submit answer
            </button>
            {quizMsg && <p className="muted sm">{quizMsg}</p>}
          </article>
          <article className="result">
            <label>SECURITY PLAYBOOK</label>
            {(manifest?.engines?.playbook || Local.securityPlaybook()).map((r) => (
              <div key={r.rule} className="proto">
                <b>{r.rule}</b>
                <p className="muted sm">{r.how}</p>
                <em className="law-chip mini" style={{ display: "inline-block" }}>
                  {r.law}
                </em>
              </div>
            ))}
          </article>
          <article className="result">
            <label>LIVE SECURITY SCAN</label>
            <p className="muted sm">Paste public text only — gate blocks critical secrets on write paths.</p>
            <textarea
              className="local-textarea"
              rows={4}
              value={scanBox}
              onChange={(e) => setScanBox(e.target.value)}
              placeholder="Scan research notes, drafts, agent output…"
            />
            <div className="chips tight">
              <button type="button" className="ghost" onClick={runScan}>
                Scan now
              </button>
              <button type="button" className="ghost" disabled={disabled} onClick={runSecurityAudit}>
                Full memory audit
              </button>
            </div>
            {scanResult && (
              <div className={`proto ${scanResult.ok ? "yes" : "no"}`}>
                <b>
                  {scanResult.ok ? "CLEAN" : "FINDINGS"} · score {scanResult.score}
                </b>
                {(scanResult.findings || []).map((f) => (
                  <p key={f.id + f.label} className="muted sm">
                    [{f.severity}] {f.label} ×{f.count}
                  </p>
                ))}
              </div>
            )}
            <div className="kv">
              <span>Posture</span>
              <b className={sec?.posture === "calm" ? "up" : "down"}>{sec?.posture || "—"}</b>
            </div>
            <div className="kv">
              <span>Alerts</span>
              <b>{sec?.alerts ?? 0}</b>
            </div>
          </article>
        </div>
      )}

      {section === "models" && (
        <article className="result model-config" style={{ margin: "12px" }}>
          <label>CUSTOM MODELS · TRANSFORMERS.JS</label>
          <p className="muted sm">
            <code>env.localModelPath</code> · <code>allowRemoteModels</code> ·{" "}
            <code>wasmPaths</code> — convert with Optimum into <code>public/models/</code>
          </p>
          <div className="model-grid">
            <label className="field">
              <span>Model id</span>
              <input
                value={modelCfg.modelId || ""}
                onChange={(e) => setModelCfg((c) => ({ ...c, modelId: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>localModelPath</span>
              <input
                value={modelCfg.localModelPath || ""}
                onChange={(e) => setModelCfg((c) => ({ ...c, localModelPath: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>wasmPaths</span>
              <input
                value={modelCfg.wasmPaths || ""}
                onChange={(e) => setModelCfg((c) => ({ ...c, wasmPaths: e.target.value }))}
                placeholder="/wasm/ or empty for CDN"
              />
            </label>
            <label className="field">
              <span>Task</span>
              <input
                value={modelCfg.task || "feature-extraction"}
                onChange={(e) => setModelCfg((c) => ({ ...c, task: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Device</span>
              <select
                value={modelCfg.device || "auto"}
                onChange={(e) => setModelCfg((c) => ({ ...c, device: e.target.value }))}
              >
                <option value="auto">auto (WebGPU if available)</option>
                <option value="webgpu">webgpu</option>
                <option value="wasm">wasm</option>
              </select>
            </label>
            <label className="field">
              <span>dtype</span>
              <select
                value={modelCfg.dtype || "fp32"}
                onChange={(e) => setModelCfg((c) => ({ ...c, dtype: e.target.value }))}
              >
                <option value="fp32">fp32</option>
                <option value="fp16">fp16 (needs shader-f16)</option>
                <option value="q8">q8</option>
                <option value="q4">q4</option>
              </select>
            </label>
          </div>

          <label>EXECUTION BACKEND</label>
          <div className="kv">
            <span>Running on</span>
            <b>
              {inf?.device?.active
                ? `${inf.device.active}${inf.device.dtype ? ` / ${inf.device.dtype}` : ""}`
                : "— load a model —"}
            </b>
          </div>
          {inf?.device?.fellBackToWasm && (
            <p className="muted sm">
              WebGPU was requested but failed to initialize — fell back to WASM. See the event log
              for the adapter error.
            </p>
          )}
          {gpu && (
            <div className="kv">
              <span>Adapter</span>
              <b>
                {gpu.available
                  ? `${gpu.vendor}${gpu.architecture ? ` · ${gpu.architecture}` : ""}${gpu.fp16 ? " · fp16" : ""}`
                  : gpu.reason}
              </b>
            </div>
          )}
          <div className="chips tight">
            <button
              type="button"
              className="ghost"
              onClick={async () => setGpu(await Local.probeWebGPU())}
            >
              Probe WebGPU
            </button>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                try {
                  const b = await Local.benchmarkInference({ samples: 12 });
                  setBench(b);
                  setInf(Local.inferenceStatus());
                  flash(`${b.device} · ${b.msPerEmbedding}ms per embedding`);
                } catch (e) {
                  flash(String(e.message || e));
                }
              }}
            >
              Benchmark 12 embeddings
            </button>
          </div>
          {bench && (
            <p className="muted sm">
              {bench.samples} embeddings on <b>{bench.device}</b>/{bench.dtype} ·{" "}
              {bench.msPerEmbedding}ms each · {bench.embeddingsPerSecond}/sec
              {bench.adapter ? ` · ${bench.adapter}` : ""}
            </p>
          )}
          <div className="chips tight model-toggles">
            <label className="toggle">
              <input
                type="checkbox"
                checked={!!modelCfg.allowRemoteModels && !modelCfg.offlineOnly}
                onChange={(e) =>
                  setModelCfg((c) => ({
                    ...c,
                    allowRemoteModels: e.target.checked,
                    offlineOnly: e.target.checked ? false : c.offlineOnly,
                  }))
                }
              />
              allowRemoteModels
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={modelCfg.allowLocalModels !== false}
                onChange={(e) => setModelCfg((c) => ({ ...c, allowLocalModels: e.target.checked }))}
              />
              allowLocalModels
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={!!modelCfg.offlineOnly}
                onChange={(e) =>
                  setModelCfg((c) => ({
                    ...c,
                    offlineOnly: e.target.checked,
                    allowRemoteModels: e.target.checked ? false : c.allowRemoteModels,
                    wasmPaths: e.target.checked ? c.wasmPaths || "/wasm/" : c.wasmPaths,
                  }))
                }
              />
              offline only
            </label>
          </div>
          <div className="chips tight">
            <button type="button" className="ghost" disabled={disabled} onClick={() => loadModel(true)}>
              Apply & load
            </button>
            <button type="button" className="ghost" disabled={disabled} onClick={probeLocal}>
              Probe /models/
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const n = Local.saveInferenceSettings({
                  offlineOnly: false,
                  allowRemoteModels: true,
                  modelId: "Xenova/all-MiniLM-L6-v2",
                  wasmPaths: "",
                });
                setModelCfg(n);
                flash("Hub preset");
              }}
            >
              Hub preset
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const n = Local.saveInferenceSettings({
                  offlineOnly: true,
                  allowRemoteModels: false,
                  localModelPath: "/models/",
                  wasmPaths: "/wasm/",
                });
                setModelCfg(n);
                flash("Offline preset");
              }}
            >
              Offline preset
            </button>
            {(Local.MODEL_PRESETS || []).map((p) => (
              <button
                key={p.id}
                type="button"
                className="ghost"
                onClick={() => setModelCfg((c) => ({ ...c, modelId: p.id, task: p.task }))}
              >
                {p.id.split("/").pop()}
              </button>
            ))}
          </div>
          {probe && (
            <p className={`muted sm ${probe.ok ? "up" : "down"}`}>
              Probe: {probe.ok ? probe.url : (probe.tried || []).join(" · ")}
            </p>
          )}
          <pre className="code sm doc-preview">{`optimum-cli export onnx --model sentence-transformers/all-MiniLM-L6-v2 --task feature-extraction ./web/public/models/all-MiniLM-L6-v2
powershell -File scripts/setup-transformers-assets.ps1`}</pre>
        </article>
      )}

      {section === "work" && (
        <div className="grid3">
          <article className="result">
            <label>LOCAL MEMORY</label>
            <p className="muted sm">{Local.TOOL_TIPS.memory.body}</p>
            <textarea
              className="local-textarea"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (never keys/seeds)…"
            />
            <div className="chips tight">
              <button type="button" className="ghost" disabled={disabled || !note.trim()} onClick={saveNote}>
                Remember
              </button>
              <button type="button" className="ghost" disabled={disabled} onClick={hydrateGraph}>
                Hydrate graph
              </button>
            </div>
            {notes.map((n) => (
              <div key={n.id} className="proto">
                <b className="muted sm">{n.kind}</b>
                <p className="muted sm">{(n.text || "").slice(0, 160)}</p>
              </div>
            ))}
          </article>
          <article className="result">
            <label>RESEARCH AGENTS</label>
            <p className="muted sm">{Local.TOOL_TIPS.agents.body}</p>
            {(manifest?.engines?.agents || Local.listAgents()).map((a) => (
              <div key={a.id} className="proto">
                <b>
                  {a.name} · {a.id}
                </b>
                <p className="muted sm">{a.role}</p>
              </div>
            ))}
            <textarea
              className="local-textarea"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="forge" disabled={disabled || !query.trim()} onClick={runResearch}>
              Run research
            </button>
            {research && (
              <div className="proto featured">
                <b>{research.summary}</b>
                <ul className="pillars">
                  {(research.synth?.insights || []).slice(0, 4).map((i) => (
                    <li key={i.title}>{i.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
          <article className="result">
            <label>KNOWLEDGE GRAPH</label>
            <p className="muted sm">
              {graph?.nodes ?? 0} nodes · {graph?.edges ?? 0} edges
            </p>
            <div className="kg-nodes">
              {nodes.map((n) => (
                <span key={n.id} className="badge on">
                  {n.type}:{String(n.label).slice(0, 20)}
                </span>
              ))}
            </div>
            <label>Events</label>
            {events.slice(0, 6).map((e) => (
              <div key={e.id} className="proto">
                <b className="muted sm">{e.kind}</b>
                <p className="muted sm">{e.text}</p>
              </div>
            ))}
          </article>
        </div>
      )}

      {section === "export" && (
        <div className="grid2 tight" style={{ margin: "12px" }}>
          <article className="result">
            <label>PDF · EXCEL · MARKDOWN</label>
            <p className="muted sm">
              {Local.TOOL_TIPS.pdf.body} {Local.TOOL_TIPS.excel.body}
            </p>
            <div className="chips tight">
              <button type="button" className="ghost" disabled={disabled} onClick={exportPdfSecurity}>
                Security PDF
              </button>
              <button type="button" className="ghost" disabled={disabled} onClick={exportExcel}>
                Inventory Excel
              </button>
              <button type="button" className="ghost" disabled={disabled || !research} onClick={exportResearchXlsx}>
                Research Excel
              </button>
              <button
                type="button"
                className="ghost"
                disabled={disabled}
                onClick={() =>
                  withBusy(async () => {
                    const plat = await api(`/platform?network=${network}`);
                    const doc = await Local.generatePlatformOpsDoc(plat);
                    setSelectedDoc(doc);
                    flash("Ops markdown saved");
                    await refresh();
                  })
                }
              >
                Ops Markdown
              </button>
            </div>
            <label>Saved docs</label>
            {docs.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`proto project-btn ${selectedDoc?.id === d.id ? "yes" : ""}`}
                onClick={() => setSelectedDoc(d)}
              >
                <b>{d.title}</b>
                <span className="muted sm">{d.format || "md"}</span>
              </button>
            ))}
            {selectedDoc && (
              <>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => Local.downloadMarkdown(selectedDoc)}
                >
                  Download .md
                </button>
                <pre className="code sm doc-preview">{selectedDoc.text?.slice(0, 3500)}</pre>
              </>
            )}
          </article>
          <article className="result">
            <label>PACKAGED EXTENSION</label>
            <p className="muted sm">{Local.TOOL_TIPS.extension.body}</p>
            <div className="kv">
              <span>Name</span>
              <b>{manifest?.engines?.extension?.name || "THESIS Security Seatbelt"}</b>
            </div>
            <div className="kv">
              <span>Permissions</span>
              <b className="mono sm">
                {(manifest?.engines?.extension?.permissions || ["activeTab", "storage"]).join(", ")}
              </b>
            </div>
            <button type="button" className="forge" disabled={disabled} onClick={downloadExt}>
              Download extension ZIP
            </button>
            <ol className="pillars">
              <li>Unzip the package</li>
              <li>chrome://extensions → Developer mode</li>
              <li>Load unpacked → select folder</li>
              <li>Pin popup · scan public text only</li>
            </ol>
            <p className="muted sm law-note">
              <b>Security:</b> {Local.TOOL_TIPS.extension.security}
            </p>
          </article>
        </div>
      )}

      <article className="result" style={{ margin: "0 12px 12px" }}>
        <label>DOCTRINE</label>
        <ul className="pillars">
          {(manifest?.doctrine || []).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
