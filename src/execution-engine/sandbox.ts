import { execSync } from "node:child_process";
import { SandboxConfig } from "../types/index.js";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { generateId } from "../utils/index.js";

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class DockerSandbox {
  private config: SandboxConfig;
  private workingDir: string;

  constructor(config: SandboxConfig, sessionDir?: string) {
    this.config = config;
    this.workingDir = sessionDir ?? resolve(process.cwd(), ".hivebreach", "sandbox", generateId());
    if (!existsSync(this.workingDir)) {
      mkdirSync(this.workingDir, { recursive: true });
    }
  }

  isDockerAvailable(): boolean {
    try {
      execSync("docker --version", { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  async runCommand(
    command: string,
    options?: { image?: string; memoryLimit?: string; cpuLimit?: string; networkEnabled?: boolean; timeout?: number },
  ): Promise<SandboxResult> {
    if (!this.isDockerAvailable()) {
      return {
        success: false,
        stdout: "",
        stderr: "Docker is not available on this system. Install Docker to use sandbox execution.",
        exitCode: -1,
      };
    }

    const image = options?.image ?? this.config.image;
    const memory = options?.memoryLimit ?? this.config.memoryLimit;
    const cpu = options?.cpuLimit ?? this.config.cpuLimit;
    const network = options?.networkEnabled ?? this.config.networkEnabled;
    const timeout = options?.timeout ?? 300;

    const networkFlag = network ? "" : "--network none";
    const containerName = `hivebreach-${generateId().slice(0, 8)}`;

    const dockerCmd = [
      "docker run",
      "--rm",
      `--name ${containerName}`,
      `--memory ${memory}`,
      `--cpus ${cpu}`,
      networkFlag,
      `-v "${this.workingDir}:/workspace"`,
      `-w /workspace`,
      `--timeout ${timeout}`,
      image,
      `sh -c "${command.replace(/"/g, '\\"')}"`,
    ].join(" ");

    try {
      const output = execSync(dockerCmd, {
        encoding: "utf-8",
        timeout: (timeout + 10) * 1000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        stdout: output,
        stderr: "",
        exitCode: 0,
      };
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string; status?: number };
      return {
        success: false,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? String(err),
        exitCode: error.status ?? -1,
      };
    }
  }

  async reproduceExploit(script: string, language: "bash" | "python" | "javascript" = "bash"): Promise<SandboxResult> {
    const ext = { bash: "sh", python: "py", javascript: "js" }[language];
    const filename = `poc-${generateId().slice(0, 8)}.${ext}`;
    const filePath = resolve(this.workingDir, filename);
    writeFileSync(filePath, script, "utf-8");

    const runner = { bash: "sh", python: "python3", javascript: "node" }[language];
    return this.runCommand(`${runner} ${filename}`, { timeout: 60 });
  }

  cleanup(): void {
    if (this.config.cleanupOnExit && existsSync(this.workingDir)) {
      try {
        rmSync(this.workingDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
}
