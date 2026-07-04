import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class ClientSideAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;
    const result = await this.llmComplete(
      `You are a Client-Side Security Expert. Check for:
1. DOM-based XSS vulnerabilities
2. Clickjacking (missing X-Frame-Options)
3. Insecure client-side storage (localStorage secrets)
4. Vulnerable JS libraries (retire.js patterns)
5. CSP (Content Security Policy) weaknesses
6. Subresource Integrity (SRI) missing
7. Insecure postMessage handlers

Return JSON array with title, description, severity, evidence, fixSuggestion.`,
      `Target: ${target}\n\nCheck client-side security. Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Client-side finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "low",
            verificationTrack: "exploit-verified",
            evidence: (item.evidence as string) ?? "",
            fixSuggestion: item.fixSuggestion as string,
            rawOutput: JSON.stringify(item),
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [];
  }
}
