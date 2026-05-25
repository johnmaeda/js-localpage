// Secret patterns to redact from saved content
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/gi, label: "API_KEY" },
  { pattern: /(?:secret|token|password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi, label: "SECRET" },
  { pattern: /Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, label: "BEARER_TOKEN" },
  { pattern: /ghp_[A-Za-z0-9]{36,}/g, label: "GITHUB_TOKEN" },
  { pattern: /sk-[A-Za-z0-9]{32,}/g, label: "OPENAI_KEY" },
  { pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, label: "JWT" },
  { pattern: /AKIA[A-Z0-9]{16}/g, label: "AWS_KEY" },
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const { pattern, label } of SECRET_PATTERNS) {
    result = result.replace(pattern, `[REDACTED:${label}]`);
  }
  return result;
}

export function containsSecrets(text: string): boolean {
  for (const { pattern } of SECRET_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}
