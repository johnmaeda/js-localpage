# LocalPage

![](banner.png)

Local-first CLI tool that turns authenticated Microsoft Edge pages into high-quality Markdown, then optionally interprets them with a local Ollama model.

```text
Sensitive browser content stays local.
No cloud scraping. No Chrome extension. No remote LLM.
```

## Privacy by Design

This tool was written from the ground up to **never call external LLM APIs or cloud services**. Everything runs locally on your machine:

- **Browser capture** — Playwright drives your local Edge installation. No remote scraping service.
- **Markdown conversion** — Readability + Turndown run in-process. No hosted conversion APIs.
- **LLM reasoning** — Ollama on localhost only. No OpenAI, no Anthropic, no cloud endpoints.
- **Storage** — All captures, HTML, and Markdown are written to `~/.localpage/` on your local filesystem. Nothing is committed to your git repo.
- **No telemetry** — Zero analytics, tracking, or phone-home behavior of any kind.

The code contains explicit policy enforcement (`src/security/policy.ts`) that warns if any configuration would send data off-machine. The default config has `"remoteProcessing": false` and cannot be changed without deliberate user action.

**Why this matters:** If you capture authenticated pages (dashboards, internal tools, private docs), that content may contain credentials, PII, proprietary data, or session tokens. LocalPage ensures none of this ever leaves your machine, gets swept into a git repo, or is accidentally copied to a cloud service.

## Install

```bash
npm install
npm run build
npm link        # Makes 'localpage' available as a global command
```

## Setup

```bash
# Install Playwright browser binaries (one-time)
npx playwright install msedge

# Start Ollama (for LLM features)
ollama serve
ollama pull qwen3.5:9b    # instant (default)
ollama pull qwen3.6:27b   # fast
ollama pull qwen3.6:35b   # best
```

## Usage

### Login to authenticated sites

```bash
localpage login
```

Opens Edge with a dedicated LocalPage profile. Log into your sites, then close the browser.

### Capture a page

```bash
localpage capture https://private-site.com/dashboard
```

### Manage captures

```bash
localpage ls              # List all captures
localpage cat latest      # Print Markdown of most recent capture
localpage cat latest --html   # Print raw HTML
localpage cat latest --text   # Print visible text
localpage rm <capture-id>     # Delete a capture
```

### Convert to Markdown

```bash
localpage markdown latest
```

### Reformat Markdown with LLM

```bash
localpage reformat latest             # Improve structure using instant model
localpage reformat latest --fast      # Use fast model for better quality
localpage reformat latest --think     # Show the model's reasoning process
```

### Ask questions locally

```bash
localpage ask latest "What are the key takeaways?"
localpage ask latest "Extract action items" --fast
localpage ask latest "Summarize this page" --best
localpage ask latest "What's important here?" --think
```

### All-in-one

```bash
localpage extract https://site.com/page --ask "Summarize this"
localpage extract https://site.com/page --ask "Action items" --fast --think
```

## Model Tiers

| Flag | Model | Use case |
|------|-------|----------|
| `--instant` (default) | qwen3.5:9b | Quick answers, realtime loops |
| `--fast` | qwen3.6:27b | High-quality general use |
| `--best` | qwen3.6:35b | Difficult pages, complex tasks |

## Thinking Mode

Qwen3 models reason internally before answering. By default, LocalPage shows a progress indicator during thinking:

```
💭 Thinking.......... (342 tokens)

Here's the actual answer...
```

Add `--think` to see the full reasoning streamed in real-time:

```
💭 Let me analyze the page structure...
I can see several data tables with quarterly results...

Here's the actual answer...
```

Timing stats are shown after each response:

```
⏱  12.3s total | 1.2s to first token | ~450 output tokens | ~342 thinking tokens
```

## Storage

Captures are saved to `~/.localpage/captures/` with:
- `meta.json` — URL, title, timestamp
- `raw.html` — full rendered HTML
- `visible.txt` — visible text content
- `page.md` — Markdown conversion

## Configuration

Config lives at `~/.localpage/config.json`. Defaults:

```json
{
  "browser": "edge",
  "browserChannel": "msedge",
  "profilePath": "~/.localpage/edge-profile",
  "remoteProcessing": false,
  "saveRawHtml": true,
  "saveMarkdown": true,
  "saveScreenshots": false,
  "redactSecrets": true,
  "llmProvider": "ollama",
  "instantModel": "qwen3.5:9b",
  "fastModel": "qwen3.6:27b",
  "bestModel": "qwen3.6:35b",
  "defaultModelMode": "instant"
}
```

## Security

**Assume a high-security posture.** This tool handles authenticated browser content.

### Guarantees

- All content stays on your machine — no cloud APIs, no telemetry
- Secrets are automatically redacted from saved text
- Browser profile is isolated from your daily Edge profile
- No page content is ever transmitted off-device
- LLM processing runs exclusively on localhost (Ollama)

### Dependency Audit

This tool uses open-source npm packages. To verify no known vulnerabilities exist:

```bash
localpage audit
```

Or equivalently:

```bash
npm audit
```

Run this periodically, especially after `npm install` or `npm update`. If vulnerabilities are found, run `npm audit fix` to auto-patch where possible.

### Security Posture Tips

- Keep dependencies up to date: `npm update`
- Review audit results before deploying in sensitive environments
- The `~/.localpage/` directory contains sensitive data (browser sessions, page captures) — protect it with appropriate file permissions
- Consider running `chmod 700 ~/.localpage` to restrict access to your user only
