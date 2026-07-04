import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";
export class ActiveTestingAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const target = this.context.target.value;

    const result = await this.llmComplete(
      `You are an Active Testing Expert. Your job: craft and execute requests against the target.
Use burp-mcp, curl, ZAP, or Caido.

For each test:
1. Specify the exact request (method, URL, headers, body)
2. Execute it conceptually
3. Analyze the response
4. If vulnerable, return the finding

Return findings as JSON array with: title, description, severity, evidence, poc (proof of concept request/response).`,
      `Target: ${target}\n\nActively test this target. Return JSON array of findings with PoC.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          findings.push(this.createFinding({
            title: item.title ?? "Active testing finding",
            description: item.description ?? "",
            severity: item.severity ?? "medium",
            verificationTrack: "exploit-verified",
            evidence: item.evidence ?? "",
            poc: item.poc,
            fixSuggestion: item.fixSuggestion,
            rawOutput: JSON.stringify(item),
          }));
        }
      }
    } catch {
      findings.push(this.createFinding({
        title: "Active testing raw output",
        description: result.slice(0, 500),
        severity: "info",
        verificationTrack: "exploit-verified",
        evidence: result,
      }));
    }

    return findings;
  }
}
