/**
 * THESIS browser environment — full local stack API
 */

import { inferenceStatus } from "./inference.js";
import { memoryStats } from "./memory.js";
import { graphStats } from "./knowledgeGraph.js";
import { securityDashboard } from "./security.js";
import { listAgents } from "./research.js";
import { teachStats, securityPlaybook } from "./teach.js";
import { extensionManifestSummary } from "./extension.js";

export {
  ensureEmbedder,
  embed,
  embedSafe,
  embedFallback,
  inferenceStatus,
  loadInferenceSettings,
  saveInferenceSettings,
  defaultInferenceSettings,
  resetEmbedder,
  applyTransformersEnv,
  probeLocalModel,
  probeWebGPU,
  resolveDevice,
  deviceStatus,
  benchmarkInference,
  MODEL_PRESETS,
} from "./inference.js";

export {
  remember,
  listNotes,
  listEvents,
  listDocs,
  listRuns,
  memoryStats,
  recall,
  logEvent,
  cosine,
} from "./memory.js";

export {
  getGraph,
  upsertNode,
  addEdge,
  neighbors,
  searchNodes,
  graphStats,
  hydrateFromPlatform,
  ingestText,
  exportGraph,
  clearGraph,
} from "./knowledgeGraph.js";

export {
  scanText,
  assertSafe,
  monitorPayload,
  auditMemory,
  securityDashboard,
} from "./security.js";

export { runResearch, listAgents, rankTexts } from "./research.js";

export {
  generateResearchReport,
  generateSecurityBrief,
  generateKnowledgeMap,
  generatePlatformOpsDoc,
  downloadMarkdown,
} from "./documents.js";

export {
  generatePdfReport,
  generateExcelWorkbook,
  exportSecurityPdf,
  exportInventoryExcel,
  exportResearchExcel,
} from "./export.js";

export { downloadSecurityExtension, extensionManifestSummary } from "./extension.js";

export {
  LESSONS,
  loadProgress,
  saveProgress,
  markLesson,
  teachStats,
  getLesson,
  TOOL_TIPS,
  securityPlaybook,
} from "./teach.js";

export async function localAiManifest() {
  let mem = { notes: 0, events: 0, docs: 0, runs: 0 };
  let sec = { posture: "unknown", alerts: 0 };
  try {
    mem = await memoryStats();
  } catch {
    /* idb */
  }
  try {
    sec = await securityDashboard();
  } catch {
    /* ignore */
  }
  return {
    schema: "thesis.browser_env.v1",
    product: "THESIS Browser Environment",
    locality: "browser-only",
    engines: {
      inference: inferenceStatus(),
      memory: mem,
      knowledge_graph: graphStats(),
      security: sec,
      agents: listAgents(),
      documents: {
        formats: ["markdown", "pdf", "xlsx"],
        store: "IndexedDB + download",
      },
      teach: teachStats(),
      extension: extensionManifestSummary(),
      playbook: securityPlaybook(),
    },
    doctrine: [
      "Inference runs in the browser (Transformers.js · custom models supported)",
      "Storage is IndexedDB — never leaves the device",
      "Security gate blocks keys/seeds before write or export",
      "Agents use local embeddings + graph + public platform pulse only",
      "PDF / Excel / Markdown generate offline",
      "Extension package: activeTab + storage only — load unpacked after review",
      "Teach-as-you-use lessons live in this tab",
    ],
  };
}
