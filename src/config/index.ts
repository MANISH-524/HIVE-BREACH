import { LlmConfig, SandboxConfig, Scope } from "../types/index.js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export interface HiveBreachConfig {
  llm: LlmConfig;
  sandbox: SandboxConfig;
  defaultScope: Scope;
  dataDir: string;
  logLevel: "debug" | "info" | "warn" | "error";
  telemetryEnabled: boolean;
}

export function loadConfig(path?: string): HiveBreachConfig {
  const configPath = path ?? resolve(process.cwd(), "hivebreach.config.json");
  const defaults: HiveBreachConfig = {
    llm: {
      provider: "ollama",
      model: "qwen2.5",
      baseUrl: "http://localhost:11434",
      temperature: 0.3,
      maxTokens: 4096,
    },
    sandbox: {
      enabled: true,
      image: "hivebreach/sandbox:latest",
      memoryLimit: "2g",
      cpuLimit: "1.0",
      networkEnabled: true,
      cleanupOnExit: true,
    },
    defaultScope: {
      authorizedTargets: [],
      allowedTechniques: [],
      maxConcurrentRequests: 5,
      rateLimitPerSecond: 10,
      timeBudgetMinutes: 60,
      allowCredentialAttacks: false,
      wirelessTestingAuthorized: false,
    },
    dataDir: resolve(process.cwd(), ".hivebreach"),
    logLevel: "info",
    telemetryEnabled: false,
  };

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf-8");
    const user = JSON.parse(raw) as Partial<HiveBreachConfig>;
    return { ...defaults, ...user, llm: { ...defaults.llm, ...user.llm }, sandbox: { ...defaults.sandbox, ...user.sandbox } };
  }

  return defaults;
}
