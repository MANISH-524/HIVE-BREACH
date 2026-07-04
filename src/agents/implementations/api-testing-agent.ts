import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class ApiTestingAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const target = this.context.target.value;

    const result = await this.llmComplete(
      `You are an API Security Testing Expert. Focus exclusively on API endpoints.
Check for:
1. Broken Object Level Authorization (BOLA)
2. Broken User Authentication
3. Excessive Data Exposure
4. Rate limiting / resource exhaustion
5. GraphQL injection / introspection leaks
6. Mass assignment
7. SSRF via API parameters

Return findings as JSON array with: title, description, severity, evidence, fixSuggestion.`,
      `Target: ${target}\n\nTest API endpoints. Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          findings.push(this.createFinding({
            title: item.title ?? "API finding",
            description: item.description ?? "",
            severity: item.severity ?? "medium",
            verificationTrack: "exploit-verified",
            evidence: item.evidence ?? "",
            fixSuggestion: item.fixSuggestion,
            rawOutput: JSON.stringify(item),
          }));
        }
      }
    } catch {
      findings.push(this.createFinding({
        title: "API scan raw output",
        description: result.slice(0, 500),
        severity: "info",
        verificationTrack: "exploit-verified",
        evidence: result,
      }));
    }

    return findings;
  }
}
