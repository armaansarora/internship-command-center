#!/usr/bin/env tsx
import { Command } from "commander";
import { VERSION } from "./lib/version.js";

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

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
