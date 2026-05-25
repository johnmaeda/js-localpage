import * as fs from "fs";
import * as path from "path";
import { getCapturesDir, getCaptureDir } from "./paths.js";
import { CaptureMeta } from "./save.js";

export function listCaptures(): CaptureMeta[] {
  const capturesDir = getCapturesDir();
  if (!fs.existsSync(capturesDir)) return [];

  return fs.readdirSync(capturesDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const metaPath = path.join(capturesDir, e.name, "meta.json");
      if (!fs.existsSync(metaPath)) return null;
      return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as CaptureMeta;
    })
    .filter((m): m is CaptureMeta => m !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function deleteCapture(captureId: string): void {
  const captureDir = getCaptureDir(captureId);
  if (!fs.existsSync(captureDir)) {
    throw new Error(`Capture not found: ${captureId}`);
  }
  fs.rmSync(captureDir, { recursive: true, force: true });
}

export function resolveCapture(captureIdOrLatest: string): string {
  if (captureIdOrLatest === "latest" || captureIdOrLatest === "last") {
    return getLatestCaptureId();
  }
  const captureDir = getCaptureDir(captureIdOrLatest);
  if (!fs.existsSync(captureDir)) {
    throw new Error(`Capture not found: ${captureIdOrLatest}`);
  }
  return captureIdOrLatest;
}

export function getLatestCaptureId(): string {
  const capturesDir = getCapturesDir();
  if (!fs.existsSync(capturesDir)) {
    throw new Error("No captures found. Run 'localpage capture <url>' first.");
  }

  const entries = fs.readdirSync(capturesDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort()
    .reverse();

  if (entries.length === 0) {
    throw new Error("No captures found. Run 'localpage capture <url>' first.");
  }

  return entries[0];
}

export function loadMeta(captureId: string): CaptureMeta {
  const metaPath = path.join(getCaptureDir(captureId), "meta.json");
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Capture metadata not found: ${captureId}`);
  }
  return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
}

export function loadRawHtml(captureId: string): string {
  const htmlPath = path.join(getCaptureDir(captureId), "raw.html");
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Raw HTML not found for capture: ${captureId}`);
  }
  return fs.readFileSync(htmlPath, "utf-8");
}

export function loadMarkdown(captureId: string): string {
  const mdPath = path.join(getCaptureDir(captureId), "page.md");
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Markdown not found for capture: ${captureId}. Run 'localpage markdown ${captureId}' first.`);
  }
  return fs.readFileSync(mdPath, "utf-8");
}

export function loadVisibleText(captureId: string): string {
  const txtPath = path.join(getCaptureDir(captureId), "visible.txt");
  if (!fs.existsSync(txtPath)) {
    throw new Error(`Visible text not found for capture: ${captureId}`);
  }
  return fs.readFileSync(txtPath, "utf-8");
}
