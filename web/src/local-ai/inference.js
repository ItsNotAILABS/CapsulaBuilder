/**
 * Browser-local inference via Transformers.js (Hugging Face).
 *
 * Supports custom models + custom WASM locations per HF docs:
 *   env.localModelPath
 *   env.allowRemoteModels
 *   env.backends.onnx.wasm.wasmPaths
 *
 * https://huggingface.co/docs/transformers.js/custom_usage
 */

import { logEvent } from "./memory.js";

const SETTINGS_KEY = "thesis.transformers.env.v1";

/** Built-in presets (Hub ids when remote allowed; folder names under /models/ when local) */
export const MODEL_PRESETS = [
  {
    id: "Xenova/all-MiniLM-L6-v2",
    label: "MiniLM L6 v2 (default, embeddings)",
    task: "feature-extraction",
    note: "Small, fast sentence embeddings",
  },
  {
    id: "Xenova/bge-small-en-v1.5",
    label: "BGE small en v1.5",
    task: "feature-extraction",
    note: "Stronger English embeddings",
  },
  {
    id: "Xenova/multi-qa-MiniLM-L6-cos-v1",
    label: "Multi-QA MiniLM",
    task: "feature-extraction",
    note: "Query–passage style embeddings",
  },
];

const DEFAULT_SETTINGS = {
  /** Hugging Face model id OR local folder name under localModelPath */
  modelId: "Xenova/all-MiniLM-L6-v2",
  task: "feature-extraction",
  /** Where local ONNX models are served (Vite public → /models/) */
  localModelPath: "/models/",
  /** Allow download from Hugging Face Hub */
  allowRemoteModels: true,
  /** Allow loading from localModelPath */
  allowLocalModels: true,
  /** Prefer browser Cache API for remote models */
  useBrowserCache: true,
  /**
   * WASM binary directory. Empty string = library default (CDN).
   * Set to "/wasm/" after running scripts/setup-transformers-assets.
   */
  wasmPaths: "",
  /** Force local-only (offline): remote off, local on */
  offlineOnly: false,
  /**
   * Execution backend: "auto" | "webgpu" | "wasm".
   * "auto" uses WebGPU when the browser exposes a usable adapter, else WASM.
   */
  device: "auto",
  /**
   * Weight precision. fp32 is the safe default on WebGPU; fp16 needs the
   * adapter to report the "shader-f16" feature. q8/q4 shrink download size.
   */
  dtype: "fp32",
};

let extractor = null;
let loadedModelId = null;
let loadState = "idle"; // idle | loading | ready | error
let loadError = null;
let loadProgress = 0;
let lastEnvApplied = null;
let activeDevice = null; // backend the loaded pipeline actually runs on
let activeDtype = null;
let deviceFellBack = false; // true when WebGPU was requested but WASM was used
let lastDeviceProbe = null;
let lastBenchmark = null;

export function defaultInferenceSettings() {
  return { ...DEFAULT_SETTINGS };
}

export function loadInferenceSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveInferenceSettings(partial = {}) {
  const next = { ...loadInferenceSettings(), ...partial };
  if (next.offlineOnly) {
    next.allowRemoteModels = false;
    next.allowLocalModels = true;
    if (!next.localModelPath) next.localModelPath = "/models/";
  }
  // normalize trailing slashes for paths
  if (next.localModelPath && !next.localModelPath.endsWith("/")) {
    next.localModelPath += "/";
  }
  if (next.wasmPaths && !next.wasmPaths.endsWith("/") && next.wasmPaths.length > 0) {
    next.wasmPaths += "/";
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

/**
 * Apply Transformers.js env from settings (call before pipeline()).
 * Mirrors HF "Use custom models" guide.
 */
export function applyTransformersEnv(env, settings) {
  const s = settings || loadInferenceSettings();

  // Custom location for models (defaults to '/models/' in the library)
  if (s.localModelPath) {
    env.localModelPath = s.localModelPath;
  }

  // Local / remote toggles
  env.allowLocalModels = s.allowLocalModels !== false;
  env.allowRemoteModels = s.offlineOnly ? false : s.allowRemoteModels !== false;
  env.useBrowserCache = s.useBrowserCache !== false;

  // WASM files — custom path or library CDN default
  if (s.wasmPaths) {
    env.backends = env.backends || {};
    env.backends.onnx = env.backends.onnx || {};
    env.backends.onnx.wasm = env.backends.onnx.wasm || {};
    env.backends.onnx.wasm.wasmPaths = s.wasmPaths;
  }

  lastEnvApplied = {
    localModelPath: env.localModelPath,
    allowLocalModels: env.allowLocalModels,
    allowRemoteModels: env.allowRemoteModels,
    useBrowserCache: env.useBrowserCache,
    wasmPaths: s.wasmPaths || "(library default / CDN)",
    offlineOnly: !!s.offlineOnly,
    modelId: s.modelId,
  };
  return lastEnvApplied;
}

/**
 * Probe the browser for a usable WebGPU adapter.
 *
 * `navigator.gpu` existing is not sufficient — requestAdapter() returns null
 * when no adapter is available (headless, blocklisted driver, disabled flag),
 * so we actually request one and report what came back.
 */
export async function probeWebGPU() {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    lastDeviceProbe = {
      available: false,
      reason: "navigator.gpu unavailable — needs Chrome/Edge 113+, or Safari 18+",
    };
    return lastDeviceProbe;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      lastDeviceProbe = {
        available: false,
        reason: "no WebGPU adapter — driver blocklisted or GPU unavailable",
      };
      return lastDeviceProbe;
    }
    const info = (await adapter.requestAdapterInfo?.()) || adapter.info || {};
    lastDeviceProbe = {
      available: true,
      vendor: info.vendor || "unknown",
      architecture: info.architecture || "",
      description: info.description || "",
      // fp16 halves memory traffic but only when the adapter advertises it
      fp16: adapter.features?.has?.("shader-f16") === true,
      maxBufferSize: adapter.limits?.maxBufferSize ?? null,
      maxStorageBufferBindingSize: adapter.limits?.maxStorageBufferBindingSize ?? null,
    };
    return lastDeviceProbe;
  } catch (e) {
    lastDeviceProbe = { available: false, reason: String(e?.message || e) };
    return lastDeviceProbe;
  }
}

/** Resolve the "auto" setting into a concrete transformers.js device string. */
export async function resolveDevice(settings) {
  const want = (settings?.device || "auto").toLowerCase();
  if (want === "wasm" || want === "cpu") return { device: "wasm", probe: lastDeviceProbe };
  const probe = await probeWebGPU();
  if (want === "webgpu") {
    // explicit request — honor it even if the probe is unsure; load() will fall back on throw
    return { device: "webgpu", probe };
  }
  return { device: probe.available ? "webgpu" : "wasm", probe };
}

export function deviceStatus() {
  return {
    configured: loadInferenceSettings().device,
    active: activeDevice,
    dtype: activeDtype,
    fellBackToWasm: deviceFellBack,
    probe: lastDeviceProbe,
    benchmark: lastBenchmark,
  };
}

export function inferenceStatus() {
  const s = loadInferenceSettings();
  return {
    engine: "transformers.js",
    model: loadedModelId || s.modelId,
    configuredModel: s.modelId,
    task: s.task || "feature-extraction",
    state: loadState,
    progress: loadProgress,
    error: loadError,
    ready: loadState === "ready" && !!extractor,
    locality: activeDevice === "webgpu" ? "browser-webgpu" : "browser-only",
    capabilities: ["feature-extraction", "semantic-recall", "research-ranking", "custom-models"],
    device: {
      configured: s.device,
      active: activeDevice,
      dtype: activeDtype,
      fellBackToWasm: deviceFellBack,
      probe: lastDeviceProbe,
      benchmark: lastBenchmark,
    },
    settings: {
      localModelPath: s.localModelPath,
      allowRemoteModels: s.offlineOnly ? false : s.allowRemoteModels,
      allowLocalModels: s.allowLocalModels,
      useBrowserCache: s.useBrowserCache,
      wasmPaths: s.wasmPaths || null,
      offlineOnly: !!s.offlineOnly,
      device: s.device,
      dtype: s.dtype,
    },
    envApplied: lastEnvApplied,
    presets: MODEL_PRESETS,
    howToCustom: {
      localModelPath: "Serve ONNX models under public/models/ → URL /models/",
      offline: "offlineOnly=true → allowRemoteModels=false, load from /models/{id}/",
      wasm: "Copy ort-*.wasm to public/wasm/ and set wasmPaths=/wasm/",
      convert: "optimum-cli export onnx --model <hf-id> --task feature-extraction ./models/<name>",
    },
  };
}

/** Drop in-memory pipeline so next ensureEmbedder() reloads with new settings */
export function resetEmbedder() {
  extractor = null;
  loadedModelId = null;
  loadState = "idle";
  loadError = null;
  loadProgress = 0;
  activeDevice = null;
  activeDtype = null;
  deviceFellBack = false;
}

/**
 * Load (or return) feature-extraction pipeline.
 * @param {{ onProgress?: Function, force?: boolean, settings?: object }} opts
 */
export async function ensureEmbedder({ onProgress, force = false, settings: override } = {}) {
  const settings = override ? saveInferenceSettings(override) : loadInferenceSettings();
  const modelId = settings.modelId || DEFAULT_SETTINGS.modelId;

  if (force) resetEmbedder();

  if (extractor && loadedModelId === modelId && loadState === "ready") {
    return extractor;
  }

  if (loadState === "loading") {
    for (let i = 0; i < 180; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (extractor && loadState === "ready") return extractor;
      if (loadState === "error") throw new Error(loadError || "model load failed");
    }
    throw new Error("model load timeout");
  }

  loadState = "loading";
  loadError = null;
  loadProgress = 0;
  extractor = null;
  loadedModelId = null;

  try {
    const { pipeline, env } = await import("@huggingface/transformers");
    const applied = applyTransformersEnv(env, settings);
    await logEvent("inference.env", {
      message: `env · local=${applied.localModelPath} remote=${applied.allowRemoteModels} wasm=${applied.wasmPaths}`,
    });

    const task = settings.task || "feature-extraction";
    const progress_callback = (p) => {
      if (p?.progress != null) loadProgress = Math.round(Number(p.progress));
      else if (p?.status === "done" || p?.status === "ready") loadProgress = 100;
      onProgress?.(p);
    };

    const { device: wanted, probe } = await resolveDevice(settings);
    // fp16 is only safe when the adapter advertises shader-f16
    let dtype = settings.dtype || DEFAULT_SETTINGS.dtype;
    if (wanted === "webgpu" && dtype === "fp16" && probe?.fp16 !== true) dtype = "fp32";

    deviceFellBack = false;
    try {
      extractor = await pipeline(task, modelId, { device: wanted, dtype, progress_callback });
      activeDevice = wanted;
    } catch (gpuErr) {
      // WebGPU can fail at init on blocklisted drivers or unsupported ops —
      // fall back to WASM rather than leaving the app with no embedder.
      if (wanted !== "webgpu") throw gpuErr;
      deviceFellBack = true;
      await logEvent("inference.device_fallback", {
        message: `webgpu failed, falling back to wasm · ${String(gpuErr?.message || gpuErr)}`,
      });
      loadProgress = 0;
      extractor = await pipeline(task, modelId, { device: "wasm", dtype: "fp32", progress_callback });
      activeDevice = "wasm";
      dtype = "fp32";
    }
    activeDtype = dtype;

    loadedModelId = modelId;
    loadState = "ready";
    loadProgress = 100;
    await logEvent("inference.ready", {
      message: `model ready · ${modelId} · ${activeDevice}/${activeDtype}${deviceFellBack ? " (fell back)" : ""}`,
      device: activeDevice,
      dtype: activeDtype,
      fellBackToWasm: deviceFellBack,
      offlineOnly: !!settings.offlineOnly,
      localModelPath: settings.localModelPath,
    });
    return extractor;
  } catch (e) {
    loadState = "error";
    loadError = String(e.message || e);
    extractor = null;
    loadedModelId = null;
    await logEvent("inference.error", { message: loadError });
    throw e;
  }
}

/** Mean-pool + L2-normalize embedding */
export async function embed(text, { ensure = true } = {}) {
  if (ensure) await ensureEmbedder();
  if (!extractor) throw new Error("embedder not ready");
  const input = String(text || "").slice(0, 2000);
  if (!input.trim()) return [];
  const out = await extractor(input, { pooling: "mean", normalize: true });
  const data = out?.data || out;
  return Array.from(data);
}

/**
 * Time N embeddings on the currently loaded backend.
 *
 * Reports the device that actually served the run, so the number can be
 * attributed to a backend rather than asserted. A first warmup pass is
 * discarded — on WebGPU the initial call includes shader compilation.
 */
export async function benchmarkInference({ samples = 12, warmup = true } = {}) {
  await ensureEmbedder();
  if (!extractor) throw new Error("embedder not ready");

  const corpus = Array.from(
    { length: samples },
    (_, i) => `benchmark sample ${i}: governed agent inference on idle hardware`
  );

  if (warmup) await embed(corpus[0], { ensure: false });

  const t0 = performance.now();
  for (const text of corpus) {
    // eslint-disable-next-line no-await-in-loop
    await embed(text, { ensure: false });
  }
  const elapsedMs = performance.now() - t0;

  lastBenchmark = {
    device: activeDevice,
    dtype: activeDtype,
    fellBackToWasm: deviceFellBack,
    model: loadedModelId,
    samples,
    elapsedMs: Math.round(elapsedMs),
    msPerEmbedding: Number((elapsedMs / samples).toFixed(2)),
    embeddingsPerSecond: Number((samples / (elapsedMs / 1000)).toFixed(2)),
    adapter: lastDeviceProbe?.available ? lastDeviceProbe.vendor : null,
    at: new Date().toISOString(),
  };
  await logEvent("inference.benchmark", {
    message: `${samples} embeddings on ${activeDevice} · ${lastBenchmark.msPerEmbedding}ms each`,
    ...lastBenchmark,
  });
  return lastBenchmark;
}

export async function embedBatch(texts, { ensure = true } = {}) {
  const list = (texts || []).map((t) => String(t).slice(0, 2000));
  const vectors = [];
  for (const t of list) {
    // sequential to keep browser responsive
    // eslint-disable-next-line no-await-in-loop
    vectors.push(await embed(t, { ensure }));
  }
  return vectors;
}

/** Fallback bag-of-words vector if model unavailable */
export function embedFallback(text) {
  const dims = 64;
  const v = new Array(dims).fill(0);
  const tokens = String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9./-]+/)
    .filter(Boolean);
  for (const t of tokens) {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    v[h % dims] += 1;
  }
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

export async function embedSafe(text) {
  try {
    return await embed(text);
  } catch {
    return embedFallback(text);
  }
}

/**
 * Probe whether a local model folder is reachable (config.json or tokenizer).
 * Used by the UI before offline load.
 */
export async function probeLocalModel(modelId, localModelPath = "/models/") {
  const base = (localModelPath || "/models/").replace(/\/?$/, "/");
  // Local folders often use the full repo id with slashes preserved
  const candidates = [
    `${base}${modelId}/config.json`,
    `${base}${modelId}/tokenizer.json`,
    `${base}${modelId.split("/").pop()}/config.json`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return { ok: true, url, modelId };
    } catch {
      /* try next */
    }
  }
  return {
    ok: false,
    modelId,
    tried: candidates,
    hint: "Place ONNX export under public/models/<modelId>/ or public/models/<name>/",
  };
}
