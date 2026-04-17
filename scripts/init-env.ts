import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const examplePath = path.join(root, ".env.example");
const localPath = path.join(root, ".env.local");

if (!fs.existsSync(examplePath)) {
  console.error("Missing .env.example in project root.");
  process.exit(1);
}

if (fs.existsSync(localPath)) {
  console.log(
    ".env.local already exists — not overwriting (so we don't wipe your keys).\n" +
      "To start over: delete .env.local, then run: npm run env:init"
  );
  process.exit(0);
}

fs.copyFileSync(examplePath, localPath);
console.log(
  "Created .env.local from .env.example.\n" +
    "Next: open .env.local in Cursor and paste your Supabase + Anthropic values after each =\n" +
    "Then run: npm run dev"
);
