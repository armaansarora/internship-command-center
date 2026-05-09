import { spawn, type ChildProcess } from "node:child_process";
import process from "node:process";
import { startStubServer } from "../tests/e2e/helpers/stub-server";

interface ManagedStub {
  url: string;
  stop: () => Promise<void>;
}

const STUB_PORT = 3001;
const STUB_URL = `http://localhost:${STUB_PORT}`;

async function main(): Promise<void> {
  const stub = await startOrReuseStub();
  const child = spawnNextDev(stub.url);

  let stopped = false;
  async function stop(exitCode: number): Promise<void> {
    if (stopped) return;
    stopped = true;
    if (!child.killed) child.kill();
    await stub.stop();
    process.exit(exitCode);
  }

  child.on("exit", (code, signal) => {
    const exitCode = code ?? (signal ? 1 : 0);
    void stop(exitCode);
  });

  process.on("SIGINT", () => void stop(130));
  process.on("SIGTERM", () => void stop(143));
}

async function startOrReuseStub(): Promise<ManagedStub> {
  try {
    const server = await startStubServer({ port: STUB_PORT });
    console.log(`[dev-preview] Supabase stub listening on ${server.url}`);
    return {
      url: server.url,
      stop: server.stop,
    };
  } catch (error) {
    if (isAddressInUse(error) && await isStubHealthy()) {
      console.log(`[dev-preview] Reusing existing Supabase stub on ${STUB_URL}`);
      return {
        url: STUB_URL,
        stop: async () => undefined,
      };
    }
    throw error;
  }
}

function spawnNextDev(stubUrl: string): ChildProcess {
  console.log("[dev-preview] Starting Next.js with local preview auth");
  return spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      TOWER_DEV_PREVIEW_AUTH: "1",
      NEXT_PUBLIC_SUPABASE_URL: stubUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub_for_dev_preview",
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_stub_for_dev_preview",
      MATCH_ANON_SECRET: "stub-match-anon-secret-for-dev-preview",
      CRON_SECRET: "stub-cron-secret-for-dev-preview",
    },
  });
}

async function isStubHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${STUB_URL}/__test__/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function isAddressInUse(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "EADDRINUSE"
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[dev-preview] ${message}`);
  process.exit(1);
});
