import { startStubServer, type StubServer } from "./helpers/stub-server";

declare global {
  var __TOWER_STUB_SERVER__: StubServer | undefined;
}

const STUB_PORT = 3001;

/**
 * Boots the Node-side Supabase stub on :3001 before the Playwright suite
 * starts. The stub answers /auth/v1/*, /rest/v1/*, /functions/v1/*, and
 * /__test__/* admin routes. Both Chromium and the Next.js dev-server
 * webServer point NEXT_PUBLIC_SUPABASE_URL at this stub, so every Supabase
 * SDK call (browser or server-side) converges on a single mock state.
 *
 * Closes B1 on R12.10 — see docs/plans/2026-04-24-mock-topology-stub-server-design.md.
 */
export default async function globalSetup(): Promise<void> {
  if (globalThis.__TOWER_STUB_SERVER__) {
    return;
  }
  const server = await startStubServer({ port: STUB_PORT });
  globalThis.__TOWER_STUB_SERVER__ = server;
  process.env.STUB_SUPABASE_URL = server.url;
  console.log(`[stub-server] listening on ${server.url}`);
}
