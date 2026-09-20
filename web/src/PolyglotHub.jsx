import React, { useCallback, useEffect, useState } from "react";

/**
 * Polyglot intelligence hub — Julia · Node · Python · WASM · WebGPU
 * Backend: /polyglot/*   Browser: WebGPU + WebAssembly
 */
export function PolyglotHub({ api, network, busy: parentBusy, onNavigate, onRunSystem }) {
  const [catalog, setCatalog] = useState(null);
  const [mesh, setMesh] = useState(null);
  const [out, setOut] = useState(null);
  const [gpu, setGpu] = useState(null);
  const [wasm, setWasm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [log, setLog] = useState("");
  const [lang, setLang] = useState("julia");
  const [cmd, setCmd] = useState("spectral");

  const refresh = useCallback(async () => {
    try {
      setCatalog(await api("/polyglot"));
    } catch (e) {
      setErr(String(e.message || e));
    }
  }, [api]);

  useEffect(() => {
    refresh();
    probeWebGPU();
    probeWasm();
  }, [refresh]);

  function flash(m) {
    setLog(m);
    setTimeout(() => setLog(""), 4000);
  }

  async function probeWebGPU() {
    try {
      if (!navigator.gpu) {
        setGpu({ ok: false, reason: "navigator.gpu unavailable — use Chrome/Edge with WebGPU" });
        return;
      }
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        setGpu({ ok: false, reason: "no GPU adapter" });
        return;
      }
      const info = adapter.info || {};
      const limits = adapter.limits || {};
      setGpu({
        ok: true,
        vendor: info.vendor || info.description || "adapter",
        architecture: info.architecture,
        maxBuffer: limits.maxBufferSize,
        maxCompute: limits.maxComputeWorkgroupsPerDimension,
        features: adapter.features ? [...adapter.features].slice(0, 12) : [],
        locality: "browser-webgpu",
      });
    } catch (e) {
      setGpu({ ok: false, reason: String(e.message || e) });
    }
  }

  async function probeWasm() {
    try {
      // same tiny add module as Node bridge
      const bytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f,
        0x01, 0x7f, 0x03, 0x02, 0x01, 0x00, 0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
        0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
      ]);
      const { instance } = await WebAssembly.instantiate(bytes);
      const add = instance.exports.add;
      setWasm({
        ok: true,
        locality: "browser-wasm",
        samples: [add(1, 2), add(10, 32), add(100, 23)],
        export: "add",
      });
    } catch (e) {
      setWasm({ ok: false, reason: String(e.message || e) });
    }
  }

  const disabled = busy || parentBusy;

  async function runMesh() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/polyglot/mesh", {
        method: "POST",
        body: JSON.stringify({
          equity: 10000,
          vol: 0.02,
          estimated_gas: 80000,
        }),
      });
      setMesh(data);
      setOut(data);
      flash(
        `Mesh · winner ${data.synthesis?.winner_agent || "—"} · VaR ${Number(data.synthesis?.var || 0).toFixed(2)}`
      );
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runOne() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/polyglot/run", {
        method: "POST",
        body: JSON.stringify({ lang, cmd, params: {} }),
      });
      setOut(data);
      flash(`${lang}/${cmd} · ${data.ok ? "ok" : "fail"}`);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  const syn = mesh?.synthesis || out?.synthesis;

  return (
    <section className="panel polyglot-hub">
      <div className="win-strip platform-strip">
        <div className="win-copy">
          <span className="eyebrow">POLYGLOT INTEL · JULIA · NODE · PYTHON · WASM · WEBGPU</span>
          <h3>Embedded intelligence across languages</h3>
          <p className="muted sm">
            AI is racing to build new data centres while the GPUs we already have sit at 5% utilisation. IOChain turns that idle hardware into a trustable AI inference infrastructure, settled on Solana. Developers publish models, deployers run them, investors hold fractional shares in the models they back. Pay-per-call, on-chain, peer to peer. Ships with a CLI, Tauri desktop, web app, and TS + Python SDKs.
          </p>
          <p className="muted sm">
            Julia <b>{catalog?.julia?.available ? "ON" : "off"}</b> · Node{" "}
            <b>{catalog?.node?.available ? "ON" : "off"}</b> · Python <b>ON</b> · WebGPU{" "}
            <b>{gpu?.ok ? "ON" : "off"}</b> · WASM <b>{wasm?.ok ? "ON" : "off"}</b>
          </p>
        </div>
        <div className="win-actions">
          <button type="button" className="forge win-btn" disabled={disabled} onClick={runMesh}>
            Run polyglot mesh
          </button>
          {onRunSystem && (
            <button type="button" className="ghost" disabled={disabled} onClick={onRunSystem}>
              ▶ RUN SYSTEM
            </button>
          )}
          <button type="button" className="ghost" onClick={() => onNavigate?.("cloud")}>
            Cloud
          </button>
        </div>
      </div>

      {err ? <div className="banner err">{err}</div> : null}
      {log ? <div className="banner ok">{log}</div> : null}

      <div className="primitive-row local-caps" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {[
          ["Julia", catalog?.julia?.available ? "ready" : "missing", catalog?.julia?.available],
          ["Node", catalog?.node?.available ? "ready" : "missing", catalog?.node?.available],
          ["Python", "embedded", true],
          ["WebGPU", gpu?.ok ? gpu.vendor || "adapter" : "n/a", gpu?.ok],
          ["WASM", wasm?.ok ? `add→${wasm.samples?.[0]}` : "n/a", wasm?.ok],
        ].map(([n, m, ok]) => (
          <div key={n} className={`primitive-card ${ok ? "ok" : "warn"}`}>
            <span className="eyebrow">runtime</span>
            <b>{n}</b>
            <span className="muted sm">{m}</span>
          </div>
        ))}
      </div>

      <div className="grid2 tight" style={{ margin: "12px" }}>
        <article className="result">
          <label>RUN LANGUAGE ENGINE</label>
          <div className="chips tight">
            {["julia", "node", "python"].map((l) => (
              <button
                key={l}
                type="button"
                className={`ghost ${lang === l ? "on" : ""}`}
                onClick={() => setLang(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="chips tight" style={{ marginTop: 8 }}>
            {(lang === "julia"
              ? ["pulse", "spectral", "monte_carlo", "portfolio", "gas", "agent_score"]
              : lang === "node"
                ? ["pulse", "agent-rank", "wasm-native", "webgpu-info"]
                : ["intel", "pulse"]
            ).map((c) => (
              <button
                key={c}
                type="button"
                className={`ghost ${cmd === c ? "on" : ""}`}
                onClick={() => setCmd(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button type="button" className="forge" disabled={disabled} onClick={runOne} style={{ marginTop: 10 }}>
            Run {lang}/{cmd}
          </button>
          <button type="button" className="ghost" disabled={disabled} onClick={runMesh} style={{ marginLeft: 8 }}>
            Full mesh
          </button>
          {syn && (
            <div className="proto featured" style={{ marginTop: 12 }}>
              <span className="eyebrow">SYNTHESIS</span>
              <b>Winner agent: {syn.winner_agent || "—"}</b>
              <p className="muted sm">{syn.message}</p>
              <div className="kv">
                <span>VaR</span>
                <b>{Number(syn.var || 0).toFixed(2)}</b>
              </div>
              <div className="kv">
                <span>CVaR</span>
                <b>{Number(syn.cvar || 0).toFixed(2)}</b>
              </div>
              <div className="kv">
                <span>Gas limit</span>
                <b>{syn.recommended_gas_limit ?? "—"}</b>
              </div>
              <div className="kv">
                <span>Python z</span>
                <b>{Number(syn.python_z || 0).toFixed(3)}</b>
              </div>
            </div>
          )}
        </article>
        <article className="result">
          <label>OUTPUT</label>
          {!out ? (
            <p className="muted sm">Run mesh or a single language engine.</p>
          ) : (
            <pre className="code sm doc-preview" style={{ maxHeight: 420 }}>
              {JSON.stringify(out, null, 2).slice(0, 14000)}
            </pre>
          )}
          <label>BROWSER WEBGPU</label>
          <pre className="code sm">{JSON.stringify(gpu, null, 2)}</pre>
          <label>BROWSER WASM</label>
          <pre className="code sm">{JSON.stringify(wasm, null, 2)}</pre>
        </article>
      </div>

      <article className="result" style={{ margin: "0 12px 12px" }}>
        <label>STACK MAP</label>
        <ul className="pillars">
          <li>
            <b>Julia</b> — spectral, Monte Carlo VaR/CVaR, portfolio, gas, agent utility
          </li>
          <li>
            <b>Node</b> — agent rank, native WASM add, WebGPU info, Julia relay
          </li>
          <li>
            <b>Python</b> — FastAPI host, cloud engines, company OS, desk, laws
          </li>
          <li>
            <b>React</b> — this hub + PLATFORM + LOCAL AI (Transformers.js)
          </li>
          <li>
            <b>Solidity</b> — SovereignVault / PolicyKernel on Monad
          </li>
          <li>
            <b>PowerShell</b> — scripts/run_polyglot.ps1 · scripts/run_all.ps1
          </li>
        </ul>
      </article>
    </section>
  );
}
