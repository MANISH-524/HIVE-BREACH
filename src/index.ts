import { loadConfig } from "./config/index.js";
import { registerAllAgents } from "./agents/register-all.js";
import { Orchestrator } from "./orchestration/orchestrator.js";
import { createAgentCardLibrary } from "./agents/loader.js";
import { LlmRouter } from "./llm/router.js";
import { TargetSpec, Report, AgentRole } from "./types/index.js";
import { createSkillLibrary } from "./skills/loader.js";
import { ScanMode } from "./orchestration/scan-modes.js";
import { PluginManager } from "./agents/plugin-architecture.js";
import { CveIngestionService } from "./skills/cve-ingestion.js";
import { resolve } from "node:path";

export * from "./types/index.js";
export * from "./config/index.js";
export * from "./utils/index.js";
export * from "./llm/index.js";
export * from "./agents/index.js";
export * from "./orchestration/index.js";
export * from "./skills/index.js";
export * from "./toolbelt/index.js";
export * from "./execution-engine/index.js";
export * from "./governance/index.js";

export class HiveBreach {
  private orchestrator: Orchestrator;
  private llmRouter: LlmRouter;
  private skillLibrary: ReturnType<typeof createSkillLibrary>;
  private pluginManager = new PluginManager();
  private cveIngestion = new CveIngestionService();
  private scanMode: ScanMode;

  constructor(configPath?: string, scanMode: ScanMode = "deep") {
    const config = loadConfig(configPath);
    this.llmRouter = new LlmRouter();
    this.scanMode = scanMode;

    registerAllAgents();

    const cardLibrary = createAgentCardLibrary();
    cardLibrary.load(resolve(process.cwd(), "agents"));

    this.skillLibrary = createSkillLibrary();
    this.skillLibrary.load(resolve(process.cwd(), "skills"));

    this.orchestrator = new Orchestrator({
      llmRouter: this.llmRouter,
      llmConfig: config.llm,
      agentCards: cardLibrary.cards,
      scope: config.defaultScope,
      scanMode: this.scanMode,
    });
  }

  async run(target: TargetSpec, agents?: AgentRole[]): Promise<Report> {
    return this.orchestrator.run(target, agents);
  }

  getOrchestrator(): Orchestrator {
    return this.orchestrator;
  }

  getSkillLibrary() {
    return this.skillLibrary;
  }

  getLlmRouter(): LlmRouter {
    return this.llmRouter;
  }

  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  getCveIngestion(): CveIngestionService {
    return this.cveIngestion;
  }
}

export function createHiveBreach(configPath?: string, scanMode?: ScanMode): HiveBreach {
  return new HiveBreach(configPath, scanMode);
}