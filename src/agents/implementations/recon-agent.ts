import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class ReconAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const target = this.context.target.value;

    const targetProfile = await this.llmComplete(
      `You are a Reconnaissance Expert. Your job: map the ENTIRE attack surface of the target.
Produce a comprehensive "Target Profile" that every downstream agent reads before starting.

**DEEP FINGERPRINTING:**
1. **OS + Service Versions** (e.g., Ubuntu 22.04, Apache 2.4.51, OpenSSH 8.9p1)
   - This tells Exploit Agent which CVEs actually apply — don't guess versions, be specific.
2. **Technology Stack & Frameworks** (Django 4.1, React 18, Laravel 10, Express.js, .NET Core)
   - This routes the target to the right specialist agent (Django → Python-specific skills, React → client-side focus)
3. **CMS Fingerprinting** (WordPress 6.2, Drupal 10, Joomla — or "none")
   - Unlocks CMS-specific skill playbooks if detected
4. **WAF / Firewall Detection** — is a WAF present? (Cloudflare, AWS WAF, ModSecurity, Imperva)
   - If active, Active Testing Agent must adapt technique or flag reduced confidence
5. **SSL/TLS Configuration** — ciphers, versions, cert expiry, HSTS
6. **Server Headers Analysis** — what information is leaking in responses?

**Attack Surface Enumeration:**
7. Open/Filtered ports and running services
8. Subdomains and related domains
9. Login/auth endpoints identified
10. Admin/management interfaces
11. Debug/development endpoints exposed

Output ALL findings as a JSON array. Each finding must include: title, description, severity, evidence.
This is MANDATORY first output — other agents depend on this.`,
      `Target: ${target}\n\nProduce full Target Profile with deep fingerprinting. Return JSON array of findings.`,
    );

    try {
      const parsed = JSON.parse(targetProfile);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          findings.push(
            this.createFinding({
              title: item.title ?? "Recon finding",
              description: item.description ?? "",
              severity: item.severity ?? "info",
              verificationTrack: "state-verified",
              evidence: item.evidence ?? "",
              rawOutput: JSON.stringify(item),
            }),
          );
        }
      }
    } catch {
      findings.push(
        this.createFinding({
          title: "Recon scan raw output",
          description: targetProfile.slice(0, 500),
          severity: "info",
          verificationTrack: "state-verified",
          evidence: targetProfile,
        }),
      );
    }

    return findings;
  }
}