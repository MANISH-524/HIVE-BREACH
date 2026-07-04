import { Scope, TargetSpec, AgentRole, SanityCheckResult } from "../../types/index.js";

/**
 * Scope & Authorization Gate
 * Deterministic (non-LLM) enforcement of the single hard boundary.
 * This is the ONE place "trust the AI" is the wrong design.
 */
export class ScopeAuthGate {
  private scope: Scope;

  constructor(scope: Scope) {
    this.scope = scope;
  }

  isTargetAuthorized(target: TargetSpec): SanityCheckResult {
    const value = target.value.toLowerCase();

    for (const authorized of this.scope.authorizedTargets) {
      if (value.includes(authorized.toLowerCase())) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: `Target "${target.value}" is not in the authorized scope. Authorized targets: ${this.scope.authorizedTargets.join(", ")}`,
    };
  }

  isTechniqueAllowed(technique: string): SanityCheckResult {
    if (this.scope.allowedTechniques.length === 0) {
      return { allowed: true };
    }

    for (const allowed of this.scope.allowedTechniques) {
      if (technique.toLowerCase().includes(allowed.toLowerCase())) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: `Technique "${technique}" is not in the allowed list. Allowed: ${this.scope.allowedTechniques.join(", ")}`,
    };
  }

  checkRateLimit(currentRequests: number): SanityCheckResult {
    if (currentRequests >= this.scope.maxConcurrentRequests) {
      return {
        allowed: false,
        reason: `Concurrent request limit reached (${currentRequests}/${this.scope.maxConcurrentRequests})`,
      };
    }
    return { allowed: true };
  }

  checkAgentAuthorization(role: AgentRole): SanityCheckResult {
    if (role === "password-credential" && !this.scope.allowCredentialAttacks) {
      return {
        allowed: false,
        reason: "Credential attacks are not authorized in the current RoE scope. Set allowCredentialAttacks: true to enable.",
      };
    }
    if (role === "wireless" && !this.scope.wirelessTestingAuthorized) {
      return {
        allowed: false,
        reason: "Wireless testing requires a separate RoE clause. Set wirelessTestingAuthorized: true after adding it.",
      };
    }
    return { allowed: true };
  }

  checkTimeBudget(elapsedMinutes: number): SanityCheckResult {
    if (elapsedMinutes >= this.scope.timeBudgetMinutes) {
      return {
        allowed: false,
        reason: `Time budget exhausted (${elapsedMinutes}/${this.scope.timeBudgetMinutes} minutes)`,
      };
    }
    return { allowed: true };
  }
}
