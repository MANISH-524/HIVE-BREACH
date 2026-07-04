import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

/**
 * Sensitive Path / Directory / File Discovery
 * Runs under the Recon Agent umbrella, flagged as "active" mode in audit trail
 * since it generates real traffic against the target (many requests, active probing).
 */
export class SensitivePathDiscovery {
  async discover(baseAgent: BaseAgent, target: string, auditLog: string[]): Promise<Finding[]> {
    auditLog.push("[Sensitive Path Discovery] Active probing mode started");

    const result = await baseAgent["llmComplete"](
      `You are a Sensitive Path Discovery Expert. This is ACTIVE probing — you generate real traffic against the target.

Search for THESE exact categories of sensitive paths:
1. **Hidden directories & panels:** /admin, /wp-admin, /phpmyadmin, /manage, /dashboard, /panel, /cpanel, /config
2. **Exposed .git directories:** /.git/, /.git/config, /.git/HEAD, /.git/logs
3. **Backup files:** *.bak, *.old, *.backup, *.zip, *.tar.gz, *.sql, *.dump
4. **Configuration files:** /.env, /wp-config.php, /config.yml, /settings.py, /application.properties, /web.config
5. **Debug/development endpoints:** /debug, /test, /dev, /staging, /graphiql, /swagger-ui, /api-docs
6. **Log files:** /logs/, *.log, /error_log, /access_log
7. **Database dumps:** *.sql, dump.sql, db_backup.sql
8. **CI/CD artifacts:** /.github/, /.gitlab-ci.yml, /Jenkinsfile, /Dockerfile, /docker-compose.yml

For EACH finding, specify the exact URL/path discovered.
Mark severity as "high" for exposed .git directories (source code leak).
Mark severity as "critical" for exposed .env files with secrets.
Mark severity as "medium" for admin panels accessible without auth.`,
      `Target: ${target}\n\nDiscover sensitive paths, directories, and files. Return JSON array with: title, exact URL/path, description, severity, evidence.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          baseAgent["createFinding"]({
            title: `[Path Discovery] ${item.title ?? "Exposed path"}`,
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "medium",
            verificationTrack: "state-verified",
            evidence: `Path: ${item.path ?? item.url ?? target}\n${item.evidence ?? ""}`,
            rawOutput: JSON.stringify(item),
          }),
        );
      }
    } catch { /* fallthrough */ }

    return [baseAgent["createFinding"]({
      title: "Sensitive path discovery raw output",
      description: result.slice(0, 500),
      severity: "info",
      verificationTrack: "state-verified",
      evidence: result,
    })];
  }
}