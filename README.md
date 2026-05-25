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

![](LocalPageDemo.gif)

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

### Inert model — no tool calling or agentic behavior

The local LLM is used strictly as a text-in → text-out generator. There is no function calling, tool use, structured output parsing, or agentic loop. Ollama receives a plain text prompt and returns a plain text response — it cannot execute code, make network requests, read files, or take actions on your behalf. The model is rendered completely inert by design.

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

## Demo Video

Create a product demo video using [Remotion](https://remotion.dev) without polluting the main repo. Everything lives in `tools/demo-video/` which is gitignored. [This video](LocalPageDemo.gif) was one of the results of that process.

### First-time setup

```bash
# 1. Install the Remotion skill (agent best-practices for video creation)
npx skills add remotion-dev/skills

# 2. Create the sandbox directory
mkdir -p tools/demo-video
cd tools/demo-video

# 3. Scaffold a blank Remotion project
npx create-video@latest --yes --blank --no-tailwind .

# 4. Add transitions support
npm install @remotion/transitions

# 5. Create src/index.ts entrypoint (required by Remotion)
cat > src/index.ts << 'EOF'
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
EOF

# 6. Add convenience scripts to package.json
npm pkg set scripts.video:preview="remotion studio"
npm pkg set scripts.video:render="remotion render LocalPageDemo --output out/localpage-demo.mp4"
```

### Preview

```bash
cd tools/demo-video
npm run video:preview    # Opens Remotion Studio at localhost:3000
```

### Render

```bash
cd tools/demo-video
npm run video:render     # Outputs to tools/demo-video/out/localpage-demo.mp4
```

### Design notes

- All scenes use `interpolate()` + `Easing.bezier()` for motion (no CSS animations)
- Use `<TransitionSeries>` with `fade()` between scenes
- Define composition in `src/Root.tsx` (fps, dimensions, duration)
- Keep styling minimal: Helvetica Neue, charcoal + one accent color
- Place any local assets in `public/`, reference with `staticFile()`

### Repo hygiene

`tools/demo-video/` is in `.gitignore` — it's disposable local tooling. The only tracked files related to video are:

- `.agents/skills/remotion-best-practices/` — skill reference docs
- `skills-lock.json` — skill lockfile

### Copilot CLI prompt

Paste this into GitHub Copilot CLI from your repo root to have it build the entire demo video automatically:

```text
Set up a safe Remotion demo-video sandbox for this repo.

Goal:
Create a 45-second product demo video using the Remotion skill, without polluting or restructuring the existing repo.

Hard constraints:
- Do not modify application source code.
- Do not modify root package.json.
- Do not modify root lockfiles.
- Do not install dependencies at the repo root.
- Do not use external APIs, API keys, cloud rendering, telemetry, paid services, TTS, or generated media services.
- All demo-video files must live only under ./tools/demo-video.
- Add ./tools/demo-video/ to .gitignore so generated video work stays untracked.
- The only intended tracked changes should be:
  1. .gitignore
  2. .agents/skills/remotion/ or related Remotion skill files, if added

Steps:
1. Check current git status.
2. Create a branch named remotion-demo-sandbox if not already on one.
3. Add tools/demo-video/ to .gitignore.
4. Install the Remotion skill using: npx skills add remotion-dev/skills
5. Verify what files changed.
6. Create an isolated Remotion project only inside ./tools/demo-video.
7. Read README.md and package.json only to understand the repo's product story.
8. Create a 45-second demo with:
   - title card
   - problem
   - how this repo helps
   - three feature moments
   - closing CTA
9. Use simple geometric motion, captions, and local assets only.
10. Add scripts only to ./tools/demo-video/package.json:
    - video:preview
    - video:render
11. Output rendered files only to ./tools/demo-video/out.
12. At the end, run git status and explain:
    - what is tracked
    - what is ignored
    - how to preview
    - how to render

Important:
Keep the repo clean. Treat ./tools/demo-video as disposable local tooling.
```
