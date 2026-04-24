import type { StubServer } from "./helpers/stub-server";

declare global {
  var __TOWER_STUB_SERVER__: StubServer | undefined;
}

export default async function globalTeardown(): Promise<void> {
  const server = globalThis.__TOWER_STUB_SERVER__;
  if (server) {
    await server.stop();
    globalThis.__TOWER_STUB_SERVER__ = undefined;
    console.log(`[stub-server] stopped`);
  }
}
