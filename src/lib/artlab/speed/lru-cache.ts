export interface LruCache<K, V> {
  getOrFetch(key: K, fetcher: () => Promise<V>): Promise<V>;
  has(key: K): boolean;
  clear(): void;
}

export function createLruCache<K, V>(options: { capacity: number }): LruCache<K, V> {
  const map = new Map<K, V>();
  function touch(key: K, value: V): void {
    map.delete(key);
    map.set(key, value);
    while (map.size > options.capacity) {
      const oldest = map.keys().next().value as K;
      map.delete(oldest);
    }
  }
  return {
    async getOrFetch(key: K, fetcher: () => Promise<V>): Promise<V> {
      if (map.has(key)) {
        const v = map.get(key)!;
        touch(key, v);
        return v;
      }
      const v = await fetcher();
      touch(key, v);
      return v;
    },
    has(key: K): boolean { return map.has(key); },
    clear(): void { map.clear(); },
  };
}
