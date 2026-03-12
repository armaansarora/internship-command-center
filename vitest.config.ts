import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    env: {
      TURSO_DATABASE_URL: 'file:./data/internship.db',
    },
    server: {
      deps: {
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/server': path.resolve(__dirname, './src/__mocks__/next-server.ts'),
      'next/headers': path.resolve(__dirname, './src/__mocks__/next-headers.ts'),
      'next/navigation': path.resolve(
        __dirname,
        './src/__mocks__/next-navigation.ts'
      ),
      'next/cache': path.resolve(
        __dirname,
        './src/__mocks__/next-cache.ts'
      ),
    },
  },
});
