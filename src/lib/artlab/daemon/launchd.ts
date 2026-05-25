// src/lib/artlab/daemon/launchd.ts
//
// Renders the launchd plist that supervises the ArtLab daemon. Note that
// `ThrottleInterval` is the launchd RESTART-BACKOFF interval (seconds between
// successive restarts when the process exits), NOT the daemon heartbeat
// cadence. The heartbeat is written every tick from daemon/entry.ts:
// `writeHeartbeat` runs at the top of `runDaemonOnce` and the default sleep
// between ticks is 1 second.
export const ARTLAB_LAUNCHD_LABEL = "com.tower.artlab";

export interface LaunchdPlistInput {
  nodeBinary: string;
  daemonEntry: string;
  workspaceRoot: string;
  logRoot: string;
  // When set, ProgramArguments invokes node with the tsx CLI loader before the
  // daemon entry script — required because vanilla node cannot execute the
  // TypeScript daemon entry directly. tsx's CLI is at node_modules/tsx/dist/cli.mjs.
  tsxLoaderPath?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderLaunchdPlist(input: LaunchdPlistInput): string {
  const args = input.tsxLoaderPath
    ? [input.nodeBinary, input.tsxLoaderPath, input.daemonEntry, "daemon", "run"]
    : [input.nodeBinary, input.daemonEntry, "daemon", "run"];
  const argsXml = args.map((a) => `      <string>${escapeXml(a)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${ARTLAB_LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(input.workspaceRoot)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>${escapeXml(input.logRoot)}/artlab.out.log</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(input.logRoot)}/artlab.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ARTLAB_WORKSPACE_ROOT</key>
    <string>${escapeXml(input.workspaceRoot)}</string>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
`;
}
