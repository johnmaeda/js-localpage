import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface LocalPageConfig {
  browser: string;
  browserChannel: string;
  profilePath: string;
  remoteProcessing: boolean;
  saveRawHtml: boolean;
  saveMarkdown: boolean;
  saveScreenshots: boolean;
  redactSecrets: boolean;
  llmProvider: string;
  instantModel: string;
  fastModel: string;
  bestModel: string;
  defaultModelMode: "instant" | "fast" | "best";
}

const DEFAULT_CONFIG: LocalPageConfig = {
  browser: "edge",
  browserChannel: "msedge",
  profilePath: path.join(os.homedir(), ".localpage", "edge-profile"),
  remoteProcessing: false,
  saveRawHtml: true,
  saveMarkdown: true,
  saveScreenshots: false,
  redactSecrets: true,
  llmProvider: "ollama",
  instantModel: "qwen3.5:9b",
  fastModel: "qwen3.6:27b",
  bestModel: "qwen3.6:35b",
  defaultModelMode: "instant",
};

export function getConfigDir(): string {
  return path.join(os.homedir(), ".localpage");
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function loadConfig(): LocalPageConfig {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: LocalPageConfig): void {
  const configDir = getConfigDir();
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

export function ensureConfigExists(): LocalPageConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    return config;
  }
  return loadConfig();
}
