import * as path from "path";
import * as os from "os";
import { getConfigDir } from "../config.js";

export function getBaseDir(): string {
  return getConfigDir();
}

export function getCapturesDir(): string {
  return path.join(getBaseDir(), "captures");
}

export function getProfileDir(): string {
  return path.join(getBaseDir(), "edge-profile");
}

export function getCaptureDir(captureId: string): string {
  return path.join(getCapturesDir(), captureId);
}

export function generateCaptureId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
