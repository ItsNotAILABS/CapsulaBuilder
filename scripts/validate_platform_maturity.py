#!/usr/bin/env python3
"""Deterministic repository maturity validator for MonadBuilder+ and THESIS.

The validator checks required governance documents, canonical product naming,
forbidden overclaim language, JSON manifests, MCP source presence, desktop
security configuration, research-paper structure, and proofroom readiness.
It writes a machine-readable receipt when --write-receipt is supplied.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "README.md",
    "docs/PRODUCTION.md",
    "docs/DEPLOYMENT.md",
    "docs/SECURITY_AND_AUTHORITY_MODEL.md",
    "docs/platform-integration-manifest.json",
    "artifacts/mcp-bridge/package.json",
    "artifacts/mcp-bridge/src/index.mjs",
    "artifacts/mcp-bridge/src/bridge.mjs",
    "artifacts/mcp-bridge/src/http.mjs",
    "artifacts/mcp-bridge/src/security.mjs",
    "artifacts/mcp-bridge/src/schema.mjs",
    "desktop/package.json",
    "desktop/src/main.mjs",
    "desktop/src/preload.mjs",
]

REQUIRED_README_TERMS = [
    "MonadBuilder+",
    "THESIS Agent Desktop",
    "MCP Spine",
    "PARRALAX",
    "Agents propose. Policy evaluates. Owners approve. Wallets sign. Receipts remember.",
]

FORBIDDEN_UNQUALIFIED = [
    r"\bunbreakable\b",
    r"\bperfect security\b",
    r"\bguaranteed returns?\b",
    r"\bfully autonomous trading\b",
    r"\bexternally audited\b",
    r"\bmilitary[- ]grade\b",
]

@dataclass(frozen=True)
class Check:
    name: str
    passed: bool
    detail: str


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def iter_public_text() -> Iterable[Path]:
    ignored = {"node_modules", ".git", "dist", "build", "coverage"}
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in ignored for part in path.parts):
            continue
        if path.suffix.lower() in {".md", ".txt", ".json", ".yml", ".yaml"}:
            yield path


def run() -> list[Check]:
    checks: list[Check] = []
    for rel in REQUIRED_FILES:
        checks.append(Check(f"required:{rel}", (ROOT / rel).is_file(), "required repository artifact"))

    readme = text("README.md")
    for term in REQUIRED_README_TERMS:
        checks.append(Check(f"readme-term:{term}", term in readme, "canonical public architecture term"))
    checks.append(Check("two-public-products", "There is no third public application" in readme, "canonical product boundary"))
    checks.append(Check("nova-internal", "NOVA remains an internal runtime" in readme, "internal runtime classification"))

    manifest_path = ROOT / "docs/platform-integration-manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        checks.append(Check("manifest-json", True, "valid JSON"))
        serialized = json.dumps(manifest)
        checks.append(Check("manifest-monadbuilder", "MonadBuilder+" in serialized, "web product declared"))
        checks.append(Check("manifest-thesis", "THESIS Agent Desktop" in serialized, "desktop product declared"))
    except Exception as exc:  # noqa: BLE001
        checks.append(Check("manifest-json", False, str(exc)))

    desktop_main = text("desktop/src/main.mjs")
    for needle in ["contextIsolation: true", "sandbox: true", "nodeIntegration: false"]:
        checks.append(Check(f"desktop-security:{needle}", needle in desktop_main, "Electron isolation invariant"))

    package = json.loads(text("artifacts/mcp-bridge/package.json"))
    scripts = package.get("scripts", {})
    for script in ["typecheck", "test", "proof"]:
        checks.append(Check(f"mcp-script:{script}", script in scripts, "required MCP validation script"))

    production = text("docs/PRODUCTION.md")
    for level in ["L0 - Concept", "L1 - Source", "L2 - Locally validated", "L3 - Release candidate", "L4 - Externally deployed", "L5 - Independently assessed"]:
        checks.append(Check(f"maturity-level:{level}", level in production, "maturity taxonomy"))

    security = text("docs/SECURITY_AND_AUTHORITY_MODEL.md")
    for subject in ["Prompt and tool injection", "Replay and stale authorization", "Namespace crossover", "Receipt tampering", "Wallet and transaction abuse"]:
        checks.append(Check(f"threat:{subject}", subject in security, "required threat class"))

    findings: list[str] = []
    for path in iter_public_text():
        body = path.read_text(encoding="utf-8", errors="replace")
        for pattern in FORBIDDEN_UNQUALIFIED:
            for match in re.finditer(pattern, body, flags=re.IGNORECASE):
                context = body[max(0, match.start() - 80): match.end() + 80].lower()
                if any(q in context for q in ["does not claim", "not claim", "must not", "do not", "unless", "non-claims"]):
                    continue
                findings.append(f"{path.relative_to(ROOT)}:{match.group(0)}")
    checks.append(Check("public-claim-lint", not findings, "; ".join(findings[:20]) or "no unqualified prohibited claims"))

    papers = sorted((ROOT / "research/papers").glob("*.md")) if (ROOT / "research/papers").exists() else []
    checks.append(Check("research-paper-count", len(papers) >= 3, f"found {len(papers)} papers"))
    for paper in papers:
        body = paper.read_text(encoding="utf-8")
        for section in ["## Abstract", "## Architecture", "## Evaluation", "## Limitations", "## Conclusion"]:
            checks.append(Check(f"paper:{paper.name}:{section}", section in body, "required research section"))

    return checks


def write_receipt(path: Path, checks: list[Check]) -> None:
    files = {}
    for rel in REQUIRED_FILES:
        p = ROOT / rel
        if p.is_file():
            files[rel] = f"sha256:{sha256(p)}"
    body = {
        "schema": "medina.platform-maturity-receipt.v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "repository": "ItsNotAILABS/CapsulaBuilder",
        "status": "pass" if all(c.passed for c in checks) else "fail",
        "assertions": len(checks),
        "passed": sum(c.passed for c in checks),
        "failed": sum(not c.passed for c in checks),
        "checks": [asdict(c) for c in checks],
        "files": files,
    }
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
    body["receiptHash"] = "sha256:" + hashlib.sha256(canonical).hexdigest()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-receipt", type=Path)
    args = parser.parse_args()
    checks = run()
    for check in checks:
        print(f"{'PASS' if check.passed else 'FAIL'} {check.name}: {check.detail}")
    print(f"\n{sum(c.passed for c in checks)}/{len(checks)} assertions passed")
    if args.write_receipt:
        write_receipt(args.write_receipt, checks)
        print(f"receipt: {args.write_receipt}")
    return 0 if all(c.passed for c in checks) else 1

if __name__ == "__main__":
    sys.exit(main())
