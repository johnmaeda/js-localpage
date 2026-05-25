import { BrowserContext, Page } from "playwright";
import { launchEdgeProfile } from "./edge.js";
import { loadConfig } from "../config.js";
import { generateCaptureId } from "../storage/paths.js";
import { saveCapture, saveScreenshot, CaptureBundle, CaptureMeta } from "../storage/save.js";

export interface CaptureOptions {
  screenshot?: boolean;
  waitMs?: number;
}

export async function capturePage(
  url: string,
  options: CaptureOptions = {}
): Promise<string> {
  const config = loadConfig();
  const waitMs = options.waitMs ?? 2000;
  const takeScreenshot = options.screenshot ?? config.saveScreenshots;

  console.log(`Capturing: ${url}`);

  const context = await launchEdgeProfile();

  try {
    const page = context.pages()[0] || await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    // Brief wait for dynamic content
    await page.waitForTimeout(waitMs);

    const title = await page.title();
    const rawHtml = await page.content();
    const visibleText = await page.evaluate(() => document.body.innerText);

    const captureId = generateCaptureId();
    const meta: CaptureMeta = {
      id: captureId,
      url,
      title,
      timestamp: new Date().toISOString(),
      hasRawHtml: config.saveRawHtml,
      hasMarkdown: false,
      hasScreenshot: takeScreenshot,
    };

    const bundle: CaptureBundle = { meta };

    if (config.saveRawHtml) {
      bundle.rawHtml = rawHtml;
    }

    bundle.visibleText = visibleText;

    saveCapture(bundle);

    if (takeScreenshot) {
      const buffer = await page.screenshot({ fullPage: true });
      saveScreenshot(captureId, buffer);
    }

    console.log(`Captured: ${title}`);
    console.log(`ID: ${captureId}`);

    return captureId;
  } finally {
    await context.close();
  }
}
