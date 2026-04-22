#!/usr/bin/env tsx
import { Command } from "commander";
import { VERSION } from "./lib/version.js";
import { registerPhases } from "./commands/phases.js";
import { registerBrief } from "./commands/brief.js";
import { registerLog } from "./commands/log.js";
import { registerBlocked } from "./commands/blocked.js";
import { registerStatus } from "./commands/status.js";

const program = new Command();

program
  .name("tower")
  .description("Context-transfer CLI for The Tower project")
  .version(VERSION);

program
  .command("hello")
  .description("smoke test")
  .action(() => {
    console.log("tower alive");
  });

registerPhases(program);
registerBrief(program);
registerLog(program);
registerBlocked(program);
registerStatus(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
