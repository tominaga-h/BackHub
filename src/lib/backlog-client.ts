import { Backlog } from "backlog-js";

export function createBacklogClient(): Backlog {
  const spaceUrl = process.env.BACKLOG_SPACE_URL;
  const apiKey = process.env.BACKLOG_API_KEY;

  if (!spaceUrl || !apiKey) {
    throw new Error("BACKLOG_SPACE_URL and BACKLOG_API_KEY must be set");
  }

  const host = new URL(spaceUrl).hostname;
  return new Backlog({ host, apiKey });
}

export function getBacklogHost(): string {
  const spaceUrl = process.env.BACKLOG_SPACE_URL;
  if (!spaceUrl) throw new Error("BACKLOG_SPACE_URL must be set");
  return new URL(spaceUrl).hostname;
}

export function getProjectKeys(): string[] {
  const keys = process.env.BACKLOG_PROJECT_KEYS;
  if (!keys) throw new Error("BACKLOG_PROJECT_KEYS must be set");
  return keys.split(",").map((k) => k.trim()).filter(Boolean);
}
