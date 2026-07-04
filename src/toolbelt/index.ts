import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ToolEntry } from "../types/index.js";

export interface ToolBelt {
  getAll(): ToolEntry[];
  getByCategory(cat: string): ToolEntry[];
  getByName(name: string): ToolEntry | undefined;
  getByStage(stage: string): ToolEntry[];
  search(query: string): ToolEntry[];
  isInstalled(name: string): boolean;
}

export function createToolBelt(registryPath?: string): ToolBelt {
  const path = registryPath ?? resolve(process.cwd(), "toolbelt", "registry.json");
  let entries: ToolEntry[] = [];

  if (existsSync(path)) {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    entries = parsed.entries ?? parsed;
  }

  return {
    getAll: () => [...entries],
    getByCategory: (cat: string) => entries.filter((t) => t.category === cat),
    getByName: (name: string) => entries.find((t) => t.name === name),
    getByStage: (stage: string) => entries.filter((t) => t.stage === stage),
    search: (query: string) => {
      const lower = query.toLowerCase();
      return entries.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.description.toLowerCase().includes(lower) ||
          t.category.toLowerCase().includes(lower),
      );
    },
    isInstalled: (name: string) => entries.find((t) => t.name === name)?.installed ?? false,
  };
}

export function saveToolBelt(entries: ToolEntry[], registryPath?: string): void {
  const path = registryPath ?? resolve(process.cwd(), "toolbelt", "registry.json");
  writeFileSync(path, JSON.stringify({ entries }, null, 2));
}
