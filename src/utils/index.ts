import { randomUUID } from "node:crypto";

export function generateId(): string {
  return randomUUID();
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function severityScore(s: string): number {
  const map: Record<string, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };
  return map[s] ?? 0;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export function dedent(str: string): string {
  const lines = str.split("\n");
  const indent = lines.reduce((min, l) => {
    const m = l.match(/^(\s*)/);
    return m ? Math.min(min, m[1]!.length) : min;
  }, Infinity);
  return lines.map((l) => l.slice(indent)).join("\n").trim();
}
