import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export const db = globalThis.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db;
}

export { schema };
