import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { parse as parseYaml } from "yaml";
import { AgentCard, AgentRole, AgentRiskLevel, AgentDefaultMode } from "../types/index.js";

const CARD_FILE_RE = /^agent-card\.(yaml|yml|json)$/;

export interface AgentCardLibrary {
  cards: Map<AgentRole, AgentCard>;
  load(dir: string): void;
  get(role: AgentRole): AgentCard | undefined;
  list(): AgentCard[];
}

export function createAgentCardLibrary(): AgentCardLibrary {
  const cards = new Map<AgentRole, AgentCard>();

  function loadDir(dir: string): void {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        loadDir(fullPath);
      } else if (CARD_FILE_RE.test(entry.name)) {
        const card = parseAgentCardFile(fullPath);
        if (card) cards.set(card.role, card);
      }
    }
  }

  return {
    get cards() { return cards; },
    load(dir: string) { loadDir(dir); },
    get(role: AgentRole) { return cards.get(role); },
    list() { return [...cards.values()]; },
  };
}

export function parseAgentCardFile(filePath: string): AgentCard | null {
  const raw = readFileSync(filePath, "utf-8");
  const data = (extname(filePath) === ".json" ? JSON.parse(raw) : parseYaml(raw)) as Record<string, unknown>;

  const role = data["role"] as AgentRole;
  if (!role) return null;

  return {
    role,
    name: (data["name"] as string) ?? role,
    description: (data["description"] as string) ?? "",
    stage: (data["stage"] as string) ?? "",
    mitreTactics: (data["mitre_tactics"] as string[]) ?? [],
    owaspMapping: (data["owasp_mapping"] as string[]) ?? [],
    tools: (data["tools"] as string[]) ?? [],
    verificationMethod: (data["verification_method"] as string) ?? "",
    communicatesWith: (data["communicates_with"] as AgentRole[]) ?? [],
    riskLevel: (data["risk_level"] as AgentRiskLevel) ?? "medium",
    defaultMode: (data["default_mode"] as AgentDefaultMode) ?? "scope-gated",
    expertise: (data["expertise"] as string) ?? "",
    workingStyle: (data["working_style"] as string) ?? "",
  };
}
