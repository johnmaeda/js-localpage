import { chromium, BrowserContext } from "playwright";
import { loadConfig } from "../config.js";
import { getProfileDir } from "../storage/paths.js";
import * as fs from "fs";
import * as path from "path";

export async function launchEdgeProfile(): Promise<BrowserContext> {
  const config = loadConfig();
  const profilePath = config.profilePath || getProfileDir();

  fs.mkdirSync(profilePath, { recursive: true });

  const context = await chromium.launchPersistentContext(profilePath, {
    channel: config.browserChannel || "msedge",
    headless: false,
    args: ["--disable-features=msEdgeEnhancedSandbox"],
    chromiumSandbox: true,
  });

  return context;
}

export async function loginSession(): Promise<void> {
  console.log("Launching Edge with LocalPage profile...");
  console.log("Log into your sites, then close the browser window when done.");
  console.log(`Profile: ${loadConfig().profilePath}`);

  const context = await launchEdgeProfile();

  const page = context.pages()[0] || await context.newPage();
  await page.goto("about:blank");

  // Handle both browser close and Ctrl-C gracefully
  const cleanup = async () => {
    try { await context.close(); } catch {}
    console.log("\nSession saved. Your logins will persist for future captures.");
    console.log(`Profile stored at: ${loadConfig().profilePath}`);
    console.log("\nTip: Run 'localpage logout' to delete all cached credentials.");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Wait for all pages to close
  await new Promise<void>((resolve) => {
    const checkPages = () => {
      if (context.pages().length === 0) {
        resolve();
      }
    };
    context.on("page", () => {
      for (const p of context.pages()) {
        p.on("close", checkPages);
      }
    });
    for (const p of context.pages()) {
      p.on("close", checkPages);
    }
    context.on("close", () => resolve());
  });

  await cleanup();
}

export function logoutSession(): void {
  const config = loadConfig();
  const profilePath = config.profilePath || getProfileDir();

  if (!fs.existsSync(profilePath)) {
    console.log("No browser profile found. Nothing to delete.");
    return;
  }

  fs.rmSync(profilePath, { recursive: true, force: true });
  console.log("Browser profile deleted. All cached credentials have been removed.");
  console.log(`Removed: ${profilePath}`);
  console.log("\nRun 'localpage login' to create a fresh session.");
}
