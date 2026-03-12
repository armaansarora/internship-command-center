// Mock for next/headers used by next-auth in vitest environment
export function cookies() {
  return {
    get: () => undefined,
    set: () => {},
    delete: () => {},
    getAll: () => [],
    has: () => false,
  };
}

export function headers() {
  return new Headers();
}
