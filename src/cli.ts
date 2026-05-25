#!/usr/bin/env node

import { Command } from "commander";
import { ensureConfigExists, loadConfig } from "./config.js";
import { loginSession, logoutSession } from "./browser/edge.js";
import { capturePage } from "./browser/capture.js";
import { htmlToMarkdown } from "./extract/markdown.js";
import { queryOllama, queryOllamaSilent, checkOllamaAvailable } from "./llm/ollama.js";
import { buildAskPrompt, buildExtractPrompt, buildReformatPrompt } from "./llm/prompts.js";
import { resolveCapture } from "./storage/load.js";
import { loadRawHtml, loadMarkdown, loadMeta, loadVisibleText, listCaptures, deleteCapture } from "./storage/load.js";
import { saveMarkdownFile } from "./storage/save.js";
import { redactSecrets } from "./security/redact.js";
import { enforcePolicy, warnRawHtml } from "./security/policy.js";

const program = new Command();

program
  .name("localpage")
  .description(`Local-first CLI: Edge browser → Markdown → local Ollama reasoning

  Model flags: --instant (9b, default) | --fast (27b) | --best (35b)
  Use "last" or "latest" as <capture-id> for most recent capture.`)
  .version("0.1.0");

// --- audit ---
program
  .command("audit")
  .description("Check dependencies for known security vulnerabilities")
  .action(() => {
    const { execSync } = require("child_process");
    console.log("Running npm audit to check for known vulnerabilities...\n");
    try {
      const result = execSync("npm audit", { cwd: __dirname + "/..", encoding: "utf-8", stdio: "pipe" });
      console.log(result);
    } catch (err: any) {
      // npm audit exits with non-zero if vulnerabilities found
      if (err.stdout) console.log(err.stdout);
      if (err.stderr) console.error(err.stderr);
      console.log("\n⚠️  Vulnerabilities found. Run 'npm audit fix' to auto-patch where possible.");
      process.exit(1);
    }
  });

// --- login ---
program
  .command("login")
  .description("Open Edge to log into sites (sessions persist for future captures)")
  .action(async () => {
    ensureConfigExists();
    await loginSession();
  });

// --- logout ---
program
  .command("logout")
  .description("Delete cached browser profile and all stored credentials")
  .action(() => {
    ensureConfigExists();
    logoutSession();
  });

// --- ls ---
program
  .command("ls")
  .description("List all captures with titles and URLs")
  .action(() => {
    const captures = listCaptures();
    if (captures.length === 0) {
      console.log("No captures yet. Run 'localpage capture <url>' to get started.");
      return;
    }
    for (const meta of captures) {
      const md = meta.hasMarkdown ? "✓" : " ";
      console.log(`[${md}] ${meta.id}  ${meta.title || "(no title)"}  ${meta.url}`);
    }
    console.log(`\n${captures.length} capture(s). [✓] = Markdown available`);
  });

// --- cat ---
program
  .command("cat <capture-id>")
  .description("Print capture content (use 'last' for most recent)")
  .option("--html", "Print raw HTML instead")
  .option("--text", "Print visible text instead")
  .action((captureId: string, opts: { html?: boolean; text?: boolean }) => {
    const resolved = resolveCapture(captureId);
    if (opts.html) {
      console.log(loadRawHtml(resolved));
    } else if (opts.text) {
      console.log(loadVisibleText(resolved));
    } else {
      console.log(loadMarkdown(resolved));
    }
  });

// --- rm ---
program
  .command("rm <capture-id>")
  .description("Delete a capture (use 'last' for most recent)")
  .action((captureId: string) => {
    const resolved = resolveCapture(captureId);
    const meta = loadMeta(resolved);
    deleteCapture(resolved);
    console.log(`Deleted: ${meta.title || resolved}`);
  });

// --- capture ---
program
  .command("capture <url>")
  .description("Capture an authenticated page → saves HTML + Markdown")
  .option("--screenshot", "Save a screenshot of the page")
  .option("--wait <ms>", "Wait time for dynamic content (default: 2000)", "2000")
  .action(async (url: string, opts: { screenshot?: boolean; wait?: string }) => {
    ensureConfigExists();
    enforcePolicy();

    const config = loadConfig();
    if (config.saveRawHtml) {
      warnRawHtml();
    }

    const captureId = await capturePage(url, {
      screenshot: opts.screenshot,
      waitMs: parseInt(opts.wait || "2000", 10),
    });

    // Auto-convert to markdown if configured
    if (config.saveMarkdown) {
      const html = loadRawHtml(captureId);
      let markdown = htmlToMarkdown(html, url);
      if (config.redactSecrets) {
        markdown = redactSecrets(markdown);
      }
      saveMarkdownFile(captureId, markdown);
      console.log("Markdown saved.");
    }
  });

// --- markdown ---
program
  .command("markdown <capture-id>")
  .description("Re-convert captured HTML to Markdown (use 'last')")
  .action(async (captureId: string) => {
    ensureConfigExists();

    const resolved = resolveCapture(captureId);
    const meta = loadMeta(resolved);
    const html = loadRawHtml(resolved);

    const config = loadConfig();
    let markdown = htmlToMarkdown(html, meta.url);
    if (config.redactSecrets) {
      markdown = redactSecrets(markdown);
    }

    saveMarkdownFile(resolved, markdown);
    console.log(`Markdown saved for: ${meta.title}`);
    console.log(`ID: ${resolved}`);
  });

// --- reformat ---
program
  .command("reformat <capture-id>")
  .description("LLM-reformat Markdown (tables, headings) — use 'last'")
  .option("--instant", "Use the instant model (default)")
  .option("--fast", "Use the fast model")
  .option("--best", "Use the best model")
  .option("--think", "Show the model's reasoning process")
  .action(async (captureId: string, opts: { instant?: boolean; fast?: boolean; best?: boolean; think?: boolean }) => {
    ensureConfigExists();
    enforcePolicy();

    const available = await checkOllamaAvailable();
    if (!available) {
      console.error("Error: Ollama is not running. Start it with: ollama serve");
      process.exit(1);
    }

    const resolved = resolveCapture(captureId);
    const markdown = loadMarkdown(resolved);
    const mode = opts.best ? "best" : opts.fast ? "fast" : "instant";

    const prompt = buildReformatPrompt(markdown);
    console.log(`Reformatting (${mode} model)...`);

    const reformatted = await queryOllama(prompt, mode, { showThinking: opts.think });
    process.stdout.write("\n");
    saveMarkdownFile(resolved, reformatted);
    console.log("Reformatted Markdown saved.");
    console.log(`ID: ${resolved}`);
  });

// --- ask ---
program
  .command("ask <capture-id> <question>")
  .description("Ask a question about a capture — use 'last'")
  .option("--instant", "Use the instant model (default)")
  .option("--fast", "Use the fast model")
  .option("--best", "Use the best model")
  .option("--think", "Show the model's reasoning process")
  .action(async (captureId: string, question: string, opts: { instant?: boolean; fast?: boolean; best?: boolean; think?: boolean }) => {
    ensureConfigExists();
    enforcePolicy();

    const available = await checkOllamaAvailable();
    if (!available) {
      console.error("Error: Ollama is not running. Start it with: ollama serve");
      process.exit(1);
    }

    const resolved = resolveCapture(captureId);
    const markdown = loadMarkdown(resolved);
    const mode = opts.best ? "best" : opts.fast ? "fast" : "instant";

    const prompt = buildAskPrompt(markdown, question);
    console.log(`Asking (${mode} model)...\n`);

    await queryOllama(prompt, mode, { showThinking: opts.think });
    console.log("");
  });

// --- extract ---
program
  .command("extract <url>")
  .description("Capture + Markdown + ask in one command")
  .option("--ask <question>", "Question to ask about the page")
  .option("--instant", "Use the instant model (default)")
  .option("--fast", "Use the fast model")
  .option("--best", "Use the best model")
  .option("--think", "Show the model's reasoning process")
  .option("--screenshot", "Save a screenshot")
  .action(async (url: string, opts: { ask?: string; instant?: boolean; fast?: boolean; best?: boolean; think?: boolean; screenshot?: boolean }) => {
    ensureConfigExists();
    enforcePolicy();

    const config = loadConfig();
    if (config.saveRawHtml) {
      warnRawHtml();
    }

    // Capture
    const captureId = await capturePage(url, { screenshot: opts.screenshot });

    // Convert to Markdown
    const html = loadRawHtml(captureId);
    let markdown = htmlToMarkdown(html, url);
    if (config.redactSecrets) {
      markdown = redactSecrets(markdown);
    }
    saveMarkdownFile(captureId, markdown);
    console.log("Markdown saved.");

    // Ask (if question provided)
    if (opts.ask) {
      const available = await checkOllamaAvailable();
      if (!available) {
        console.error("Error: Ollama is not running. Start it with: ollama serve");
        process.exit(1);
      }

      const mode = opts.best ? "best" : opts.fast ? "fast" : "instant";
      const prompt = buildExtractPrompt(markdown, opts.ask);
      console.log(`\nAsking (${mode} model)...\n`);

      await queryOllama(prompt, mode, { showThinking: opts.think });
      console.log("");
    }
  });

program.parse();
