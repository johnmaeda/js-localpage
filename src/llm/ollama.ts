import { loadConfig } from "../config.js";

export interface OllamaResponse {
  model: string;
  response: string;
  thinking?: string;
  done: boolean;
}

export type ModelMode = "instant" | "fast" | "best";

function resolveModel(config: ReturnType<typeof loadConfig>, mode: ModelMode): string {
  switch (mode) {
    case "instant": return config.instantModel;
    case "best": return config.bestModel;
    default: return config.fastModel;
  }
}

export interface QueryOptions {
  showThinking?: boolean;
}

export async function queryOllama(
  prompt: string,
  modelMode: ModelMode = "instant",
  options: QueryOptions = {}
): Promise<string> {
  const config = loadConfig();
  const model = resolveModel(config, modelMode);
  const showThinking = options.showThinking ?? false;

  // Estimate token count (~4 chars per token) and show context to user
  const estimatedTokens = Math.ceil(prompt.length / 4);
  console.log(`Model: ${model}`);
  console.log(`Prompt: ~${estimatedTokens.toLocaleString()} tokens (${(prompt.length / 1024).toFixed(1)} KB)`);
  console.log(`Waiting for first token...\n`);

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Model "${model}" not found. Install it with: ollama pull ${model}`
      );
    }
    throw new Error(
      `Ollama request failed (${response.status}): ${await response.text()}`
    );
  }

  // Stream tokens to stdout as they arrive
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullResponse = "";
  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  let firstResponseTime: number | null = null;
  let thinkingTokenCount = 0;
  let isThinking = false;

  // ANSI dim for thinking text
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter(l => l.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line) as OllamaResponse;

        // Handle thinking tokens (separate field from response)
        if (data.thinking) {
          if (!firstTokenTime) firstTokenTime = Date.now();
          if (!isThinking) {
            isThinking = true;
            if (showThinking) {
              process.stdout.write(DIM + "💭 ");
            } else {
              process.stdout.write("💭 Thinking");
            }
          }

          thinkingTokenCount++;
          if (showThinking) {
            process.stdout.write(data.thinking);
          } else {
            // Show a dot every 50 tokens
            if (thinkingTokenCount % 50 === 0) {
              process.stdout.write(".");
            }
          }
        }

        // Handle response tokens (the actual answer)
        if (data.response) {
          if (!firstTokenTime) firstTokenTime = Date.now();

          // Transition from thinking to response
          if (isThinking) {
            isThinking = false;
            if (showThinking) {
              process.stdout.write(RESET + "\n\n");
            } else {
              process.stdout.write(` (${thinkingTokenCount} tokens)\n\n`);
            }
          }

          if (!firstResponseTime) firstResponseTime = Date.now();
          process.stdout.write(data.response);
          fullResponse += data.response;
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  // If still in thinking at end (no response tokens yet)
  if (isThinking) {
    if (showThinking) {
      process.stdout.write(RESET + "\n");
    } else {
      process.stdout.write(` (${thinkingTokenCount} tokens)\n`);
    }
  }

  // Print timing stats
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const ttft = firstTokenTime ? (((firstTokenTime - startTime) / 1000).toFixed(1)) : "?";
  const outputTokens = Math.ceil(fullResponse.length / 4);
  const thinkInfo = thinkingTokenCount > 0 ? ` | ${thinkingTokenCount} thinking tokens` : "";
  console.log(`\n\n⏱  ${elapsed}s total | ${ttft}s to first token | ~${outputTokens.toLocaleString()} output tokens${thinkInfo}`);

  return fullResponse;
}

/** Non-streaming version for when output is captured (not displayed) */
export async function queryOllamaSilent(
  prompt: string,
  modelMode: ModelMode = "instant"
): Promise<string> {
  const config = loadConfig();
  const model = resolveModel(config, modelMode);

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Model "${model}" not found. Install it with: ollama pull ${model}`
      );
    }
    throw new Error(
      `Ollama request failed (${response.status}): ${await response.text()}`
    );
  }

  const data = (await response.json()) as OllamaResponse;
  return data.response;
}

export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    return response.ok;
  } catch {
    return false;
  }
}
