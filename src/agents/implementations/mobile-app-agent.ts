import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class MobileAppAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;
    const result = await this.llmComplete(
      `You are a Mobile Application Security Expert. Check for:
1. Insecure data storage (SharedPreferences, SQLite, Keychain issues)
2. Hardcoded API keys / secrets in source
3. Weak certificate pinning / TLS validation
4. Insecure IPC (Android Intents, iOS URL schemes)
5. Side-loading / tampering risks
6. Runtime manipulation risks (Frida, Objection)
7. Exposed deep links / scheme handlers

Return JSON array with title, description, severity, evidence, fixSuggestion.`,
      `Target mobile app: ${target}\n\nAnalyze mobile app security. Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Mobile finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "medium",
            verificationTrack: "state-verified",
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
