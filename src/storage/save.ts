import * as fs from "fs";
import * as path from "path";
import { getCapturesDir, getCaptureDir, generateCaptureId } from "./paths.js";

export interface CaptureMeta {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  hasRawHtml: boolean;
  hasMarkdown: boolean;
  hasScreenshot: boolean;
}

export interface CaptureBundle {
  meta: CaptureMeta;
  rawHtml?: string;
  visibleText?: string;
  markdown?: string;
}

export function saveCapture(bundle: CaptureBundle): string {
  const captureDir = getCaptureDir(bundle.meta.id);
  fs.mkdirSync(captureDir, { recursive: true });

  fs.writeFileSync(
    path.join(captureDir, "meta.json"),
    JSON.stringify(bundle.meta, null, 2),
    "utf-8"
  );

  if (bundle.rawHtml) {
    fs.writeFileSync(path.join(captureDir, "raw.html"), bundle.rawHtml, "utf-8");
  }

  if (bundle.visibleText) {
    fs.writeFileSync(path.join(captureDir, "visible.txt"), bundle.visibleText, "utf-8");
  }

  if (bundle.markdown) {
    fs.writeFileSync(path.join(captureDir, "page.md"), bundle.markdown, "utf-8");
  }

  return bundle.meta.id;
}

export function saveScreenshot(captureId: string, buffer: Buffer): void {
  const captureDir = getCaptureDir(captureId);
  fs.writeFileSync(path.join(captureDir, "screenshot.png"), buffer);
}

export function saveMarkdownFile(captureId: string, markdown: string): void {
  const captureDir = getCaptureDir(captureId);
  fs.writeFileSync(path.join(captureDir, "page.md"), markdown, "utf-8");

  const metaPath = path.join(captureDir, "meta.json");
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    meta.hasMarkdown = true;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  }
}
