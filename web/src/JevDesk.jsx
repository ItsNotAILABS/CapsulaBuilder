import React, { useState } from "react";

/** Happy path: propose → JEV+policy REJECT or pass → owner sign → receipt. */
export function JevDesk({ api, network, busy: parentBusy }) {
  const [goal, setGoal] = useState("safe MON/USDC swap under 100");
  const [reckless, setReckless] = useState(false);
  const [out, setOut] = useState(null);
  const [signed, setSigned] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const disabled = busy || parentBusy;

  async function run() {
    setBusy(true);
    setErr("");
    setSigned(null);
    try {
      const d = await api("/jev/run", {
        method: "POST",
        body: JSON.stringify({ goal, reckless, network }),
      });
      setOut(d);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    const h = out?.receipt?.receipt_hash;
    if (!h) return;
    setBusy(true);
    try {
      const d = await api("/jev/sign", {
        method: "POST",
        body: JSON.stringify({ receipt_hash: h, network }),
      });
      setSigned(d);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  const status = out?.status;
  const ev = out?.evaluation || {};

  return (
    <section className="panel jev-desk">
      <span className="eyebrow">JEV DESK · NOVA HOLDS THE GOAL</span>
      <h2>Propose → laws decide → you sign</h2>
      <p className="muted">
        Python policy is the decide brain. REJECT is a feature. Receipt remembers.
      </p>
      <label>
        Goal
        <input value={goal} onChange={(e) => setGoal(e.target.value)} disabled={disabled} />
      </label>
      <label className="row">
        <input
          type="checkbox"
          checked={reckless}
          onChange={(e) => setReckless(e.target.checked)}
          disabled={disabled}
        />
        Reckless demo (should REJECT)
      </label>
      <div className="row">
        <button type="button" className="forge" disabled={disabled} onClick={run}>
          Run JEV
        </button>
        {status === "NEEDS_OWNER_SIGN" && (
          <button type="button" disabled={disabled} onClick={sign}>
            Owner sign
          </button>
        )}
      </div>
      {err && <p className="bad">{err}</p>}
      {out && (
        <pre className="receipt">
          {status}
          {"\n"}
          {ev.human_summary || ""}
          {"\n"}
          token={out.jev?.token}
          {"\n"}
          receipt={(out.receipt?.receipt_hash || "").slice(0, 24)}
          {signed ? `\nSIGNED ${(signed.receipt?.receipt_hash || "").slice(0, 24)}` : ""}
        </pre>
      )}
    </section>
  );
}
