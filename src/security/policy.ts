import { loadConfig } from "../config.js";

export interface PolicyViolation {
  rule: string;
  message: string;
}

export function checkPolicy(): PolicyViolation[] {
  const config = loadConfig();
  const violations: PolicyViolation[] = [];

  if (config.remoteProcessing) {
    violations.push({
      rule: "no-remote",
      message: "Remote processing is enabled. Page content may leave the machine.",
    });
  }

  if (config.llmProvider !== "ollama") {
    violations.push({
      rule: "local-llm-only",
      message: `LLM provider "${config.llmProvider}" is not local. Only "ollama" is allowed by default.`,
    });
  }

  return violations;
}

export function enforcePolicy(): void {
  const violations = checkPolicy();
  if (violations.length > 0) {
    console.warn("⚠️  Security policy warnings:");
    for (const v of violations) {
      console.warn(`   [${v.rule}] ${v.message}`);
    }
  }
}

export function warnRawHtml(): void {
  console.warn("⚠️  Raw HTML is being saved. It may contain session tokens or sensitive data.");
}
