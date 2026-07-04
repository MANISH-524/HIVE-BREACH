import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Skill, SkillMetadata, VerificationTrack } from "../types/index.js";
import { parse as parseYaml } from "yaml";
import { generateId } from "../utils/index.js";

export interface SkillLibrary {
  skills: Skill[];
  staged: Skill[];
  load(dir: string): void;
  findByMitreId(id: string): Skill[];
  findByCategory(cat: string): Skill[];
  findByTag(tag: string): Skill[];
  search(query: string): Skill[];
  promoteToActive(skillId: string): boolean;
}

export function createSkillLibrary(): SkillLibrary {
  const skills: Skill[] = [];
  const staged: Skill[] = [];

  function loadDir(dir: string): Skill[] {
    const result: Skill[] = [];
    if (!existsSync(dir)) return result;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...loadDir(fullPath));
      } else if (entry.name.endsWith(".md")) {
        const parsed = parseSkillFile(fullPath);
        if (parsed) result.push(parsed);
      }
    }
    return result;
  }

  return {
    get skills() { return skills; },
    get staged() { return staged; },

    load(dir: string) {
      const activeDir = resolve(dir);
      const stagingDir = resolve(dir, "..", "_staging");

      skills.push(...loadDir(activeDir));

      if (existsSync(stagingDir)) {
        staged.push(...loadDir(stagingDir));
      }
    },

    findByMitreId(id: string) {
      const all = [...skills, ...staged];
      return all.filter((s) => s.metadata.mitreAttackIds.includes(id));
    },

    findByCategory(cat: string) {
      const all = [...skills, ...staged];
      return all.filter((s) => s.metadata.category === cat);
    },

    findByTag(tag: string) {
      const all = [...skills, ...staged];
      return all.filter((s) => s.metadata.tags.includes(tag));
    },

    search(query: string) {
      const all = [...skills, ...staged];
      const lower = query.toLowerCase();
      return all.filter(
        (s) =>
          s.metadata.name.toLowerCase().includes(lower) ||
          s.metadata.id.toLowerCase().includes(lower) ||
          s.body.toLowerCase().includes(lower),
      );
    },

    promoteToActive(skillId: string) {
      const idx = staged.findIndex((s) => s.metadata.id === skillId);
      if (idx === -1) return false;
      const [skill] = staged.splice(idx, 1) as [Skill];
      skills.push(skill);
      return true;
    },
  };
}

const FRONT_MATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

export function parseSkillFile(filePath: string): Skill | null {
  const raw = readFileSync(filePath, "utf-8");
  const match = raw.match(FRONT_MATTER_RE);
  if (!match) return null;

  const rawMeta = parseYaml(match[1]!) as Record<string, unknown>;
  const body = match[2]!.trim();

  const metadata: SkillMetadata = {
    id: (rawMeta["id"] as string) ?? generateId(),
    name: (rawMeta["name"] as string) ?? "Unnamed Skill",
    category: (rawMeta["category"] as SkillMetadata["category"]) ?? "penetration-testing",
    mitreAttackIds: (rawMeta["mitre_attack_ids"] as string[]) ?? [],
    owaspMapping: (rawMeta["owasp_mapping"] as string[]) ?? [],
    cweIds: (rawMeta["cwe_ids"] as string[]) ?? [],
    verificationTrack: (rawMeta["verification_track"] as VerificationTrack) ?? "exploit-verified",
    severity: (rawMeta["severity"] as SkillMetadata["severity"]) ?? "medium",
    tools: (rawMeta["tools"] as string[]) ?? [],
    stage: (rawMeta["stage"] as string) ?? "",
    tags: (rawMeta["tags"] as string[]) ?? [],
  };

  return { metadata, body };
}


