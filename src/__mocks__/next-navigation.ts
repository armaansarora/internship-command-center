// Mock for next/navigation used by next-auth in vitest environment
export function redirect(url: string) {
  throw new Error(`NEXT_REDIRECT: ${url}`);
}

export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return '/';
}

export function useSearchParams() {
  return new URLSearchParams();
}
