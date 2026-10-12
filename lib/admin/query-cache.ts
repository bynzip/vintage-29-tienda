type CacheEntry<T> = {
  data?: T;
  updatedAt: number;
  request?: Promise<T>;
};

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_STALE_TIME = 20_000;

export function getCachedAdminData<T>(key: string): T | undefined {
  return cache.get(key)?.data as T | undefined;
}

export function isAdminDataFresh(key: string, staleTime = DEFAULT_STALE_TIME) {
  const entry = cache.get(key);
  return Boolean(entry?.data !== undefined && Date.now() - entry.updatedAt < staleTime);
}

export function loadAdminData<T>(
  key: string,
  loader: () => Promise<T>,
  staleTime = DEFAULT_STALE_TIME,
  cacheResult = true,
): Promise<T> {
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (cacheResult && isAdminDataFresh(key, staleTime)) {
    return Promise.resolve(existing!.data as T);
  }
  if (existing?.request) return existing.request;

  const request = loader().then(
    (data) => {
      if (cacheResult && cache.get(key)?.request === request) {
        cache.set(key, { data, updatedAt: Date.now() });
      }
      return data;
    },
    (error: unknown) => {
      if (cache.get(key)?.request === request) {
        if (existing?.data !== undefined) cache.set(key, existing);
        else cache.delete(key);
      }
      throw error;
    },
  );

  if (cacheResult) cache.set(key, { data: existing?.data, updatedAt: existing?.updatedAt ?? 0, request });
  return request;
}

export function invalidateAdminData(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
