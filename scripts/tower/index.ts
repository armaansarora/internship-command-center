#!/usr/bin/env tsx
import { Command } from "commander";
import { VERSION } from "./lib/version.js";
import { registerPhases } from "./commands/phases.js";
import { registerBrief } from "./commands/brief.js";
import { registerLog } from "./commands/log.js";
import { registerBlocked } from "./commands/blocked.js";
import { registerStatus } from "./commands/status.js";
import { registerLock } from "./commands/lock.js";
import { registerStart } from "./commands/start.js";
import { registerDone } from "./commands/done.js";
import { registerBlock } from "./commands/block.js";
import { registerUndo } from "./commands/undo.js";
import { registerDiff } from "./commands/diff.js";

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
registerLock(program);
registerStart(program);
registerDone(program);
registerBlock(program);
registerUndo(program);
registerDiff(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
