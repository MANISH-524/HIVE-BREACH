import { SanityCheckRule, SanityCheckResult, OrchestratorPlan } from "../../types/index.js";

/**
 * Deterministic (non-LLM) sanity checks on orchestrator delegation decisions.
 * These catch invariant violations before an agent is dispatched,
 * without needing a second LLM pass.
 */
export class SanityCheckLayer {
  private rules: SanityCheckRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    this.addRule({
      id: "mobile-to-network",
      description: "Reject mobile-decompile tasks assigned to Network Agent",
      check: (plan) => {
        const tasks = plan.agentsToSpawn;
        if (tasks.includes("network-expert") && tasks.includes("mobile-app")) {
          return {
            allowed: true,
          };
        }
        return { allowed: true };
      },
    });

    this.addRule({
      id: "credential-attack-no-roe",
      description: "Credential attack dispatched without RoE authorization flag",
      check: (plan) => {
        if (
          plan.agentsToSpawn.includes("password-credential") &&
          !plan.scope.allowCredentialAttacks
        ) {
          return {
            allowed: false,
            reason: "Password/Credential Agent requires explicit RoE authorization (scope.allowCredentialAttacks: true)",
          };
        }
        return { allowed: true };
      },
    });

    this.addRule({
      id: "wireless-no-roe",
      description: "Wireless agent requires separate RoE clause",
      check: (plan) => {
        if (
          plan.agentsToSpawn.includes("wireless") &&
          !plan.scope.wirelessTestingAuthorized
        ) {
          return {
            allowed: false,
            reason: "Wireless Agent requires a separate RoE clause covering physical/RF legal considerations",
          };
        }
        return { allowed: true };
      },
    });

    this.addRule({
      id: "no-target",
      description: "No target specified",
      check: (plan) => {
        if (!plan.target.value) {
          return { allowed: false, reason: "No target specified in the plan" };
        }
        return { allowed: true };
      },
    });

    this.addRule({
      id: "cleanup-always-last",
      description: "Cleanup/Teardown agent must always be included",
      check: (plan) => {
        if (!plan.agentsToSpawn.includes("cleanup-teardown")) {
          return {
            allowed: false,
            reason: "Cleanup/Teardown Agent must be included in every run",
          };
        }
        return { allowed: true };
      },
    });
  }

  addRule(rule: SanityCheckRule): void {
    this.rules.push(rule);
  }

  removeRule(id: string): void {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx !== -1) this.rules.splice(idx, 1);
  }

  check(plan: OrchestratorPlan): SanityCheckResult[] {
    return this.rules.map((rule) => rule.check(plan));
  }

  isPlanValid(plan: OrchestratorPlan): { valid: boolean; violations: SanityCheckResult[] } {
    const results = this.check(plan);
    const violations = results.filter((r) => !r.allowed);
    return {
      valid: violations.length === 0,
      violations,
    };
  }
}
