import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class WebExpertAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const target = this.context.target.value;

    const result = await this.llmComplete(
      `You are a Web Application Security Expert. Your job: find vulnerabilities in the target web application.
For each finding, provide: title, description, severity (critical/high/medium/low/info), evidence, and optional fixSuggestion.

Classes of vulnerabilities to check:
1. SQL Injection (all variants)
2. Cross-Site Scripting (reflected, stored, DOM)
3. Server-Side Request Forgery (SSRF)
4. Broken Access Control / IDOR
5. Authentication flaws (weak password policy, MFA bypass, session fixation)
6. File inclusion / path traversal
7. Insecure deserialization
8. Security misconfiguration

Return findings as a JSON array. Include raw evidence in the evidence field.`,
      `Target: ${target}\n\nTest this web application for vulnerabilities. Return JSON array of findings.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          findings.push(
            this.createFinding({
              title: item.title ?? "Web finding",
              description: item.description ?? "",
              severity: item.severity ?? "medium",
              verificationTrack: "exploit-verified",
              evidence: item.evidence ?? "",
              fixSuggestion: item.fixSuggestion,
              owaspMapping: item.owaspMapping,
              cweIds: item.cweIds,
              rawOutput: JSON.stringify(item),
            }),
          );
        }
      }
    } catch {
      findings.push(
        this.createFinding({
          title: "Web scan raw output",
          description: result.slice(0, 500),
          severity: "info",
          verificationTrack: "exploit-verified",
          evidence: result,
        }),
      );
    }

    return findings;
  }
}
