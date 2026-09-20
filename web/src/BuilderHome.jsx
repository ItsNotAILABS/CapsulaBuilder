import React, { useCallback, useEffect, useState } from "react";
import { MicButton } from "./MicButton.jsx";
import { apiUrl } from "./api.js";

/**
 * MonadBuilder HQ — polished, utility-first home.
 * Text brief only · STT for notes/commands · one-tap utilities that actually run.
 */
export function BuilderHome({ api, network, busy: parentBusy, onNavigate, onRunSystem, onRefreshHome }) {
  const [now, setNow] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState("");
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [note, setNote] = useState("");
  const [sttPartial, setSttPartial] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api(`/builder/now?network=${network}`);
      setNow(d);
      setErr("");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }, [api, network]);

  useEffect(() => {
    load();
  }, [load]);

  const disabled = busy || parentBusy;
  const stats = now?.stats || {};
  const gas = now?.gas || {};
  const desk = now?.desk || {};
  const arena = now?.arena_peek || {};
  const top = now?.signal_top || {};

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  }

  async function runTap(id) {
    setBusy(true);
    setRunning(id);
    setErr("");
    try {
      let data;
      if (id === "morning") {
        data = await api("/builder/morning", {
          method: "POST",
          body: JSON.stringify({ network }),
        });
        flash(data.celebration || data.headline || "Morning done");
        await load();
        if (onRefreshHome) onRefreshHome();
      } else if (id === "reject") {
        data = await api("/tools/reject_demo/run", { method: "POST", body: "{}" });
        flash(data?.result?.proof || "Reject proven");
      } else if (id === "auto") {
        data = await api("/auto/loop", {
          method: "POST",
          body: JSON.stringify({ network }),
        });
        flash(data.headline || "Auto loop done");
      } else if (id === "signals") {
        data = await api(`/signals?network=${network}`);
        flash(`Signals: ${data.n} · top ${data.leaderboard?.[0]?.symbol || "—"}`);
      } else if (id === "x") {
        data = await api("/x/from-actions", { method: "POST" });
        flash("X draft ready — open intent to post");
      } else if (id === "edge") {
        data = await api("/edge/run", {
          method: "POST",
          body: JSON.stringify({ agent: "seatbelt", action: "brief", network }),
        });
        flash(data?.result?.summary || "Edge seatbelt ok");
      } else if (id === "jev") {
        if (onNavigate) onNavigate("jev");
        flash("JEV desk");
        return;
      } else if (id === "agent") {
        data = await api("/agent/step", {
          method: "POST",
          body: JSON.stringify({
            goal: note || "safe daily ops",
            network,
            note,
            stt: "",
            execute: true,
          }),
        });
        flash(data.intent || "Agent step done");
      } else if (id === "report") {
        data = await api("/reports/full", {
          method: "POST",
          body: JSON.stringify({ network, format: "both" }),
        });
        flash("Report ready — download below");
      } else {
        data = { ok: false };
      }
      setResult({ id, data, at: Date.now() });
      if (id !== "morning") await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
      setRunning("");
    }
  }

  function onDictate(t) {
    setSttPartial("");
    const low = t.toLowerCase();
    if (low.includes("morning") || low.includes("start my day") || low.includes("check in")) {
      runTap("morning");
      return;
    }
    if (low.includes("reject")) {
      runTap("reject");
      return;
    }
    if (low.includes("auto") || low.includes("signal")) {
      runTap(low.includes("auto") ? "auto" : "signals");
      return;
    }
    if (low.includes("post") || low.includes("tweet") || low.includes("draft x")) {
      runTap("x");
      return;
    }
    if (low.includes("report") || low.includes("pdf")) {
      runTap("report");
      return;
    }
    if (low.includes("agent") || low.includes("think")) {
      runTap("agent");
      return;
    }
    setNote((n) => (n ? `${n} ${t}` : t));
  }

  const taps = now?.taps || [];
  const resultData = result?.data;

  return (
    <section className="panel builder-home polished">
      <div className="builder-hero">
        <div className="builder-hero-main">
          <span className="eyebrow">MONADBUILDER HQ · UTILITY NOW · TEXT ONLY</span>
          <h2 className="builder-title">{now?.one_liner || "AI delivers your Monad day"}</h2>
          <p className="builder-brief">
            {now?.headline || "Loading seatbelt brief…"}
          </p>
          {now?.celebration ? (
            <p className="builder-celeb">{now.celebration}</p>
          ) : null}
          <div className="builder-meta">
            <span className="stat-chip">LVL <b>{stats.level ?? "—"}</b></span>
            <span className="stat-chip">XP <b>{stats.xp ?? 0}</b></span>
            <span className="stat-chip">🔥 <b>{stats.streak ?? 0}</b></span>
            <span className="stat-chip">Mood <b>{now?.mood || "…"}</b></span>
            <span className="stat-chip">
              Desk <b>{desk.equity != null ? Number(desk.equity).toFixed(0) : "—"}</b>
            </span>
            <span className="stat-chip">
              Day PnL <b>{desk.day_pnl != null ? Number(desk.day_pnl).toFixed(1) : "—"}</b>
            </span>
            {now?.ready_ms != null && (
              <span className="stat-chip muted">ready {now.ready_ms}ms</span>
            )}
          </div>
        </div>
        <div className="builder-hero-actions">
          <button
            type="button"
            className="forge builder-primary"
            disabled={disabled}
            onClick={() => runTap("morning")}
          >
            {running === "morning" ? "Running…" : "▶ AI MORNING"}
          </button>
          <button type="button" className="ghost" disabled={disabled} onClick={load}>
            Refresh
          </button>
          <MicButton label="STT" disabled={disabled} onPartial={setSttPartial} onText={onDictate} />
          <button type="button" className="ghost" onClick={() => onNavigate?.("jev")}>
            JEV desk
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("agent")}>
            Agent
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("judge")}>
            Proof
          </button>
        </div>
      </div>

      {toast ? <div className="banner ok">{toast}</div> : null}
      {err ? <div className="banner err">{err}</div> : null}

      {/* Live utility strip — always filled on load */}
      <div className="utility-strip">
        <div className={`util-card ${arena.reject_is_a_feature ? "ok" : ""}`}>
          <em>REJECT peek</em>
          <b>
            {arena.n_rejected ?? "—"} / {arena.n_accepted ?? "—"}
          </b>
          <span>rejected · accepted</span>
        </div>
        <div className="util-card ok">
          <em>Top signal</em>
          <b>
            {top.side || "—"} {top.symbol || ""}
          </b>
          <span>score {top.score ?? "—"} · auto={String(top.auto)}</span>
        </div>
        <div className="util-card">
          <em>Gas (Monad)</em>
          <b>{gas.limit ?? "—"}</b>
          <span>{gas.title || "limit coach"}</span>
        </div>
        <div className="util-card">
          <em>Edge sim</em>
          <b>seatbelt</b>
          <span className="truncate">{now?.edge_brief || "…"}</span>
        </div>
      </div>

      <label className="builder-section-label">ONE-TAP UTILITIES</label>
      <div className="tap-grid">
        {taps.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tap-card ${t.primary ? "primary" : ""} ${running === t.id ? "running" : ""}`}
            disabled={disabled}
            onClick={() => runTap(t.id)}
          >
            <strong>{running === t.id ? "…" : t.label}</strong>
            <span>{t.desc}</span>
            <em>{t.seconds}s</em>
          </button>
        ))}
      </div>

      <div className="grid2 builder-bottom">
        <article className="result live-result">
          <label>LIVE RESULT</label>
          {!result ? (
            <p className="muted">
              Tap a utility above — results show here. Mic for commands (morning, reject, auto…).
            </p>
          ) : (
            <>
              <div className="kv">
                <span>Action</span>
                <b>{result.id}</b>
              </div>
              {result.id === "x" && resultData?.intent_url && (
                <p>
                  <a className="link" href={resultData.intent_url} target="_blank" rel="noreferrer">
                    Open X to post →
                  </a>
                </p>
              )}
              {result.id === "report" && resultData?.download?.pdf && (
                <p>
                  <a
                    className="link"
                    href={apiUrl(resultData.download.pdf)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download PDF →
                  </a>
                  {" · "}
                  <a
                    className="link"
                    href={apiUrl(resultData.download.markdown)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Markdown
                  </a>
                </p>
              )}
              <pre className="code sm result-pre">
                {JSON.stringify(
                  resultData?.result ||
                    resultData?.headline ||
                    resultData?.answer ||
                    resultData?.text ||
                    resultData?.leaderboard ||
                    resultData,
                  null,
                  2
                ).slice(0, 2200)}
              </pre>
            </>
          )}
          <label style={{ marginTop: 12 }}>NOTES · STT (no robot voice)</label>
          {sttPartial ? <p className="muted sm">…{sttPartial}</p> : null}
          <textarea
            className="term-input note-box"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dictate or type notes for agent step…"
          />
        </article>

        <article>
          <label>SIGNALS BOARD</label>
          <div className="plans">
            {(now?.signals || []).map((s) => (
              <div key={s.id || s.rank} className={`plan ${s.auto || s.policy_ok ? "yes" : "no"}`}>
                <header>
                  <b>
                    #{s.rank} {s.side} {s.symbol}
                  </b>
                  <span className={`pill ${s.auto ? "ok" : s.policy_ok ? "warn" : "bad"}`}>
                    {s.score}
                  </span>
                </header>
                <p className="muted sm">
                  {s.auto ? "AUTO" : s.policy_ok ? "OK" : "BLOCK"} · {s.id}
                </p>
              </div>
            ))}
          </div>
          <label style={{ marginTop: 12 }}>GAS TIP</label>
          <p className="muted sm">
            <b>{gas.title}</b> — {gas.body}
          </p>
          <div className="chips tight" style={{ marginTop: 12 }}>
            <button type="button" className="ghost" onClick={() => onNavigate?.("term")}>
              TERM
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("hybrid")}>
              HYBRID / EDGE
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("desk")}>
              DESK
            </button>
            <button type="button" className="ghost" disabled={disabled} onClick={onRunSystem}>
              ▶ RUN SYSTEM
            </button>
          </div>
          <p className="muted sm" style={{ marginTop: 10 }}>
            Text briefs · STT for notes/commands · edge agents optional
          </p>
        </article>
      </div>
    </section>
  );
}
