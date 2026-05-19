import { join, resolve } from "node:path";

export const CREATIVE_BROWSER_SESSION_PROVIDERS = [
  "gemini",
  "chatgpt",
] as const;

export type CreativeBrowserSessionProvider = (typeof CREATIVE_BROWSER_SESSION_PROVIDERS)[number];

export const CREATIVE_BROWSER_SESSION_ENGINES = [
  "playwright-chromium",
  "google-chrome",
] as const;

export type CreativeBrowserSessionEngine = (typeof CREATIVE_BROWSER_SESSION_ENGINES)[number];

export interface CreativeBrowserSessionPlan {
  schemaVersion: "tower-creative-browser-session-v1";
  sessionId: string;
  provider: CreativeBrowserSessionProvider;
  engine: CreativeBrowserSessionEngine;
  browserUrl: string;
  browserExecutablePath: string;
  profileDirectory: string;
  downloadDirectory: string;
  queueDirectory: string;
  runbookPath: string;
  launchCommand: string[];
  launchCommandText: string;
  remoteDebuggingPort?: number;
  isolationRules: string[];
  scalingPolicy: {
    subscriptionUiMaxInteractiveSessions: number;
    trueParallelGenerationPath: "api-adapter-required";
    laneOutputStrategy: "batch-review-boards-before-production-sources";
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function commandText(command: readonly string[]): string {
  return command.map((part) => shellQuote(part)).join(" ");
}

function assertSafeSessionId(sessionId: string): string {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(sessionId)) {
    throw new Error("--session must use lowercase letters, numbers, and hyphens.");
  }

  if (sessionId.includes("main") || sessionId.includes("personal") || sessionId.includes("default")) {
    throw new Error("--session must not target a main, personal, or default browser profile.");
  }

  return sessionId;
}

export function assertCreativeBrowserSessionProvider(value: string): CreativeBrowserSessionProvider {
  if (!CREATIVE_BROWSER_SESSION_PROVIDERS.includes(value as CreativeBrowserSessionProvider)) {
    throw new Error(`Unknown creative browser provider: ${value}`);
  }

  return value as CreativeBrowserSessionProvider;
}

export function assertCreativeBrowserSessionEngine(value: string): CreativeBrowserSessionEngine {
  if (!CREATIVE_BROWSER_SESSION_ENGINES.includes(value as CreativeBrowserSessionEngine)) {
    throw new Error(`Unknown creative browser engine: ${value}`);
  }

  return value as CreativeBrowserSessionEngine;
}

export function defaultCreativeBrowserUrl(provider: CreativeBrowserSessionProvider): string {
  if (provider === "chatgpt") return "https://chatgpt.com/";

  return "https://gemini.google.com/app";
}

export function createCreativeBrowserSessionPlan(input: {
  sessionId: string;
  provider?: CreativeBrowserSessionProvider;
  engine?: CreativeBrowserSessionEngine;
  browserExecutablePath?: string;
  artlabRoot?: string;
  browserUrl?: string;
  remoteDebuggingPort?: number;
}): CreativeBrowserSessionPlan {
  const sessionId = assertSafeSessionId(input.sessionId);
  const provider = input.provider ?? "gemini";
  const engine = input.engine ?? "playwright-chromium";
  const browserExecutablePath = input.browserExecutablePath
    ?? (engine === "google-chrome"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "Google Chrome for Testing");
  const artlabRoot = input.artlabRoot ?? ".artlab";
  const sessionRoot = resolve(artlabRoot, "browser-sessions", sessionId);
  const profileDirectory = join(sessionRoot, "browser-profile");
  const downloadDirectory = join(sessionRoot, "downloads");
  const queueDirectory = join(sessionRoot, "queue");
  const browserUrl = input.browserUrl ?? defaultCreativeBrowserUrl(provider);
  const launchCommand = [
    browserExecutablePath,
    `--user-data-dir=${profileDirectory}`,
    "--no-first-run",
    "--disable-sync",
    "--new-window",
    browserUrl,
    ...(input.remoteDebuggingPort ? [`--remote-debugging-port=${input.remoteDebuggingPort}`] : []),
  ];

  return {
    schemaVersion: "tower-creative-browser-session-v1",
    sessionId,
    provider,
    engine,
    browserUrl,
    browserExecutablePath,
    profileDirectory,
    downloadDirectory,
    queueDirectory,
    runbookPath: join(sessionRoot, "browser-session-runbook.md"),
    launchCommand,
    launchCommandText: commandText(launchCommand),
    ...(input.remoteDebuggingPort ? { remoteDebuggingPort: input.remoteDebuggingPort } : {}),
    isolationRules: [
      "Do not use Armaan's daily Chrome profile for Creative Production Engine image generation.",
      "Use this isolated browser profile for provider sign-in, image generation, downloads, and queue work.",
      "Default to Playwright's Google Chrome for Testing/Chromium runtime so Computer Use does not collide with the user's daily Chrome app.",
      "Do not open visible provider tabs in the user's daily browser.",
      "Keep downloaded files in the session download directory, then capture them into labeled .artlab/inbox slots.",
      "If a provider UI changes or becomes too manual, record the friction and switch to a better adapter strategy before scaling.",
    ],
    scalingPolicy: {
      subscriptionUiMaxInteractiveSessions: 2,
      trueParallelGenerationPath: "api-adapter-required",
      laneOutputStrategy: "batch-review-boards-before-production-sources",
    },
  };
}

export function renderCreativeBrowserSessionRunbook(plan: CreativeBrowserSessionPlan): string {
  return `# Creative Browser Session

Session: \`${plan.sessionId}\`
Provider: \`${plan.provider}\`
Engine: \`${plan.engine}\`
URL: ${plan.browserUrl}

This is an isolated Tower Art Studio browser profile. It exists so image generation never hijacks Armaan's daily Chrome tabs, history, active work, downloads, or side panel. The default engine is Playwright Chromium / Google Chrome for Testing, not Armaan's normal Chrome app.

## Launch

\`\`\`bash
${plan.launchCommandText}
\`\`\`

## Directories

- Profile: \`${plan.profileDirectory}\`
- Downloads: \`${plan.downloadDirectory}\`
- Queue: \`${plan.queueDirectory}\`
- Browser executable: \`${plan.browserExecutablePath}\`

## Rules

${plan.isolationRules.map((rule) => `- ${rule}`).join("\n")}

## Scaling Reality

- Subscription UI generation is allowed only through isolated sessions.
- Subscription UI generation is capped at ${plan.scalingPolicy.subscriptionUiMaxInteractiveSessions} interactive sessions by default.
- True unattended five-lane image generation requires an API adapter. The engine must not pretend multiple manual browser sessions are scalable.
- For broad exploration, use batch review boards and concept sheets before production source sprites.
- For production sources, use fewer high-quality probes, capture every download, and QA before expanding.
`;
}
