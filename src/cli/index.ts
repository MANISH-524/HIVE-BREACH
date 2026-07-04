#!/usr/bin/env node
import { Command } from "commander";
import { HiveBreach } from "../index.js";
import { TargetSpec } from "../types/index.js";
import { ScanModeSelector, ScanMode } from "../orchestration/scan-modes.js";
import { resolve } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { writeFileSync } from "node:fs";
import picocolors from "picocolors";
import { createToolBelt } from "../toolbelt/index.js";

const program = new Command();

program
  .name("hivebreach")
  .description("Autonomous Multi-Agent AI Penetration Testing Framework")
  .version("1.0.0");

program
  .command("scan")
  .description("Run a security scan against a target")
  .argument("<target>", "Target URL, IP, domain, or repo path")
  .option("-t, --type <type>", "Target type: url, ip, domain, repo, local-path", "url")
  .option("-m, --mode <mode>", "Scan mode: ci (fast, ~10min) or deep (full, ~120min)", "deep")
  .option("-c, --config <path>", "Path to hivebreach.config.json")
  .option("-o, --output <path>", "Output report path")
  .option("--timeout <minutes>", "Time budget in minutes", "60")
  .action(async (target: string, opts: { type: string; mode: string; config?: string; output?: string; timeout: string }) => {
    console.log(picocolors.cyan(`\n  HiveBreach v1.0.0 — Autonomous Multi-Agent Pentesting Framework`));
    console.log(picocolors.dim(`  Mode: ${opts.mode.toUpperCase()}`));

    const modeConfig = ScanModeSelector.getMode(opts.mode as ScanMode);
    if (!modeConfig) {
      console.error(picocolors.red(`  Unknown scan mode: ${opts.mode}. Use "ci" or "deep".`));
      process.exit(1);
    }

    const targetSpec: TargetSpec = {
      type: opts.type as TargetSpec["type"],
      value: target,
    };

    try {
      const hive = new HiveBreach(opts.config, opts.mode as ScanMode);
      const report = await hive.run(targetSpec, modeConfig.agents);

      const outputPath = opts.output ?? resolve(process.cwd(), `hivebreach-report-${Date.now()}.json`);
      writeFileSync(outputPath, JSON.stringify(report, null, 2));

      console.log(picocolors.green(`\n  ✓ Scan complete (${modeConfig.mode.toUpperCase()} mode)`));
      console.log(`  Report: ${outputPath}`);
      console.log(`  Findings: ${report.summary.totalFindings} total`);
      console.log(`    ${picocolors.red(`Critical: ${report.summary.critical}`)}`);
      console.log(`    ${picocolors.yellow(`High: ${report.summary.high}`)}`);
      console.log(`    ${picocolors.cyan(`Medium: ${report.summary.medium}`)}`);
      console.log(`    ${picocolors.dim(`Low: ${report.summary.low}`)}`);
      console.log(`    ${picocolors.dim(`Info: ${report.summary.info}`)}`);
      console.log(`    Exploit-verified: ${report.summary.exploitVerified} | State-verified: ${report.summary.stateVerified}`);
      if (report.complianceMapping?.length) {
        console.log(`    Compliance refs: ${report.complianceMapping.length}`);
      }
      console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
    } catch (err) {
      console.error(picocolors.red(`\n  ✗ Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command("list-tools")
  .description("List registered tools in the tool belt")
  .option("-c, --category <category>", "Filter by category")
  .option("--installed", "Show only installed tools")
  .action((opts: { category?: string; installed?: boolean }) => {
    const belt = createToolBelt();
    let filtered = opts.category ? belt.getByCategory(opts.category) : belt.getAll();
    if (opts.installed) filtered = filtered.filter((e) => e.installed);

    const cat = opts.category ?? "all";
    console.log(`\n  Tool Belt [${cat}] (${filtered.length} tools):\n`);
    for (const entry of filtered) {
      const status = entry.installed ? picocolors.green("✓") : picocolors.dim("○");
      console.log(`  ${status} ${picocolors.bold(entry.name)} — ${entry.description} [${entry.stage}]`);
    }
    console.log();
  });

program
  .command("list-agents")
  .description("List registered expert agents")
  .action(() => {
    const agentsDir = resolve(process.cwd(), "agents");
    if (!existsSync(agentsDir)) {
      console.log("No agents directory found");
      return;
    }
    const dirs = readdirSync(agentsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

    console.log(`\n  Expert Agent Roster (${dirs.length} agents):\n`);
    for (const dir of dirs) {
      console.log(`  🧑‍💻 ${picocolors.bold(dir.name)}`);
    }
    console.log();
  });

program
  .command("list-modes")
  .description("List available scan modes")
  .action(() => {
    console.log(`\n  Scan Modes:\n`);
    for (const mode of ScanModeSelector.MODES) {
      console.log(`  ${picocolors.bold(mode.mode.toUpperCase())} — ${mode.description}`);
      console.log(`    ${picocolors.dim(`Agents: ${mode.agents.length} | Budget: ${mode.timeBudgetMinutes}min`)}`);
      console.log(`    ${picocolors.dim(`Scope: ${mode.scopeHint}`)}\n`);
    }
  });

program.parse(process.argv);