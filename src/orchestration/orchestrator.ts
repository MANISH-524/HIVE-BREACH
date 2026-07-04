import {
  OrchestratorPlan,
  TargetSpec,
  Scope,
  AgentRole,
  AgentCard,
  AgentContext,
  Finding,
  Report,
  LlmConfig,
  ComplianceReference,
} from "../types/index.js";
import { LlmRouter } from "../llm/router.js";
import { CommunicationBus } from "./communication-bus/index.js";
import { ScopeAuthGate } from "./scope-auth-gate/index.js";
import { SanityCheckLayer } from "./sanity-check-layer/index.js";
import { instantiateAgent } from "../agents/registry.js";
import { generateId, timestamp } from "../utils/index.js";
import { ScanModeSelector, ScanMode, ScanModeConfig } from "./scan-modes.js";
import { ComplianceMapper } from "../governance/compliance-mapping.js";
import { AttackPathVisualizer } from "../governance/attack-path-visualizer.js";
import { SecretsVault } from "../execution-engine/secrets-vault.js";
import { HumanApprovalGate } from "./human-approval-gate.js";
import { RateLimitGovernor } from "./rate-limit-governor.js";

export interface OrchestratorOptions {
  llmRouter: LlmRouter;
  llmConfig: LlmConfig;
  agentCards: Map<AgentRole, AgentCard>;
  scope: Scope;
  scanMode?: ScanMode;
  onFinding?: (finding: Finding) => void;
  onPlanChange?: (plan: OrchestratorPlan) => void;
}

export class Orchestrator {
  private router: LlmRouter;
  private llmConfig: LlmConfig;
  private bus: CommunicationBus;
  private gate: ScopeAuthGate;
  private sanity: SanityCheckLayer;
  private agentCards: Map<AgentRole, AgentCard>;
  private scope: Scope;
  private scanMode: ScanModeConfig;
  private findings: Finding[] = [];
  private auditLog: string[] = [];
  private startTime: number = 0;
  private onFinding?: (finding: Finding) => void;
  private onPlanChange?: (plan: OrchestratorPlan) => void;
  private complianceMapper = new ComplianceMapper();
  private attackPathVisualizer = new AttackPathVisualizer();
  private secretsVault = new SecretsVault();
  private approvalGate = new HumanApprovalGate();
  private rateLimitGovernor = new RateLimitGovernor();

  constructor(options: OrchestratorOptions) {
    this.router = options.llmRouter;
    this.llmConfig = options.llmConfig;
    this.agentCards = options.agentCards;
    this.scope = options.scope;
    this.bus = new CommunicationBus();
    this.gate = new ScopeAuthGate(this.scope);
    this.sanity = new SanityCheckLayer();
    this.onFinding = options.onFinding;
    this.onPlanChange = options.onPlanChange;
    this.scanMode = ScanModeSelector.getMode(options.scanMode ?? "deep") ?? ScanModeSelector.MODES[1]!;
    this.rateLimitGovernor.initProvider(this.llmConfig);
  }

  getBus(): CommunicationBus { return this.bus; }
  getGate(): ScopeAuthGate { return this.gate; }
  getSanity(): SanityCheckLayer { return this.sanity; }
  getAuditLog(): string[] { return [...this.auditLog]; }
  getApprovalGate(): HumanApprovalGate { return this.approvalGate; }
  getSecretsVault(): SecretsVault { return this.secretsVault; }
  getComplianceMapper(): ComplianceMapper { return this.complianceMapper; }
  getRateLimitGovernor(): RateLimitGovernor { return this.rateLimitGovernor; }

  private log(msg: string): void {
    this.auditLog.push(`[${timestamp()}] ${msg}`);
  }

  async run(target: TargetSpec, agents?: AgentRole[]): Promise<Report> {
    this.startTime = Date.now();
    const sessionId = generateId();
    this.log(`Session ${sessionId} started | Mode: ${this.scanMode.mode} | Target: ${target.value}`);

    const authCheck = this.gate.isTargetAuthorized(target);
    if (!authCheck.allowed) {
      throw new Error(authCheck.reason);
    }

    const rolesToRun = agents ?? this.scanMode.agents;
    const rolesFinal = [...new Set(rolesToRun)];

    const plan: OrchestratorPlan = {
      sessionId,
      target,
      scope: this.scope,
      agentsToSpawn: rolesFinal,
      priority: "high",
      status: "planned",
    };

    const sanityResult = this.sanity.isPlanValid(plan);
    if (!sanityResult.valid) {
      const reasons = sanityResult.violations.map((v) => (!v.allowed) ? v.reason : "").filter(Boolean).join("; ");
      throw new Error(`[HiveBreach] Sanity check failed: ${reasons}`);
    }

    plan.status = "running";
    this.onPlanChange?.(plan);
    this.log(`Orchestrator plan approved. Mode: ${this.scanMode.mode}, ${rolesFinal.length} agents.`);

    for (const role of rolesFinal) {
      const card = this.agentCards.get(role);
      if (!card) { this.log(`No agent card for ${role}, skipping`); continue; }

      const agentAuth = this.gate.checkAgentAuthorization(role);
      if (!agentAuth.allowed) { this.log(`Agent ${role} skipped: ${agentAuth.reason}`); continue; }

      const elapsed = (Date.now() - this.startTime) / 60000;
      const timeCheck = this.gate.checkTimeBudget(elapsed);
      if (!timeCheck.allowed) {
        this.log(`Time budget exhausted at ${elapsed.toFixed(1)}min. Skipping remaining agents.`);
        continue;
      }

      const rateCheck = this.rateLimitGovernor.canRequest(this.llmConfig);
      if (!rateCheck.allowed) {
        this.log(`Rate limit: ${rateCheck.reason}`);
        if (rateCheck.waitMs) await new Promise((r) => setTimeout(r, rateCheck.waitMs));
      }

      const context: AgentContext = {
        sessionId,
        target,
        llmConfig: this.llmConfig,
        scope: this.scope,
        findings: [...this.findings],
        messages: [],
      };

      try {
        this.log(`Spawning agent: ${role} (${card.name})`);
        const agent = instantiateAgent(role, card, this.router, context);
        const findings = await agent.execute();

        for (const f of findings) {
          this.bus.send(role, "report" as AgentRole, "finding", f);
          this.findings.push(f);
          this.onFinding?.(f);

          if (f.isCredential) {
            this.secretsVault.store(f.id, f.evidence, role, 48);
            this.log(`[SECURITY] Credential routed to encrypted vault | finding: ${f.id}`);
          }
        }

        this.log(`Agent ${role} completed: ${findings.length} findings`);
      } catch (err) {
        this.log(`Agent ${role} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    plan.status = "completed";
    this.onPlanChange?.(plan);
    this.secretsVault.purgeExpired();
    this.log(`Session ${sessionId} completed. Findings: ${this.findings.length}. Cost: $${this.rateLimitGovernor.getTotalCost().toFixed(4)}`);

    return this.buildReport(sessionId, target);
  }

  private buildReport(sessionId: string, target: TargetSpec): Report {
    const duration = Date.now() - this.startTime;
    const allFindings = this.findings;
    const authFindings = allFindings.filter((f) => f.severity !== "info" || f.agentRole === "report");

    const critical = authFindings.filter((f) => f.severity === "critical").length;
    const high = authFindings.filter((f) => f.severity === "high").length;
    const medium = authFindings.filter((f) => f.severity === "medium").length;
    const low = authFindings.filter((f) => f.severity === "low").length;
    const info = allFindings.filter((f) => f.severity === "info").length;
    const exploitVerified = allFindings.filter((f) => f.verificationTrack === "exploit-verified").length;
    const stateVerified = allFindings.filter((f) => f.verificationTrack === "state-verified").length;

    const complianceRefs: ComplianceReference[] = [];
    for (const f of allFindings) {
      const refs = this.complianceMapper.mapFinding(f);
      complianceRefs.push(...refs);
    }

    const attackChains = this.attackPathVisualizer.analyze(allFindings);

    return {
      sessionId,
      target,
      timestamp: timestamp(),
      duration,
      summary: {
        totalFindings: allFindings.length,
        critical,
        high,
        medium,
        low,
        info,
        exploitVerified,
        stateVerified,
      },
      findings: [...allFindings],
      complianceMapping: complianceRefs.length > 0 ? complianceRefs : undefined,
      auditLog: [...this.auditLog, this.attackPathVisualizer.generateReport(attackChains)],
      disclaimer: "This is a suggested remediation for developer review — it has not been applied or validated as a patch.",
    };
  }
}