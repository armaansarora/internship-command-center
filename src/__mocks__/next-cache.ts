// Mock for next/cache used by server actions in vitest environment
export function revalidatePath(_path: string) {
  // no-op in tests
}

export function revalidateTag(_tag: string) {
  // no-op in tests
}
