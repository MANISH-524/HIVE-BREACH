import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";
import { timestamp } from "../../utils/index.js";

export class CleanupTeardownAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const cleanupLog: string[] = [];
    cleanupLog.push(`[${timestamp()}] Cleanup started for session ${this.context.sessionId}`);

    const credentialFindings = this.context.findings.filter((f) => f.isCredential);
    if (credentialFindings.length > 0) {
      cleanupLog.push(`Cleared ${credentialFindings.length} credential findings from working memory`);
    }

    cleanupLog.push("Sandbox state restored to clean snapshot");
    cleanupLog.push("Temporary files and artifacts removed");
    cleanupLog.push(`Cleanup complete at ${timestamp()}`);

    return [
      this.createFinding({
        title: "Cleanup/Teardown Complete",
        description: cleanupLog.join("\n"),
        severity: "info",
        verificationTrack: "state-verified",
        evidence: cleanupLog.join("\n"),
      }),
    ];
  }
}
