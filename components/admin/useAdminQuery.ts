"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCachedAdminData,
  invalidateAdminData,
  isAdminDataFresh,
  loadAdminData,
} from "@/lib/admin/query-cache";

export function useAdminQuery<T>(
  key: string,
  loader: () => Promise<T>,
  options: { cache?: boolean; invalidatePrefix?: string; refreshToken?: string } = {},
) {
  const cacheResult = options.cache ?? true;
  const [data, setData] = useState<T | undefined>(() =>
    cacheResult ? getCachedAdminData<T>(key) : undefined,
  );
  const [loading, setLoading] = useState(() => data === undefined);
  const [error, setError] = useState<string | null>(null);

  const refreshToken = options.refreshToken;
  const invalidatePrefix = options.invalidatePrefix;

  const load = useCallback(async () => {
    return loadAdminData(key, loader, undefined, cacheResult);
  }, [cacheResult, key, loader]);

  useEffect(() => {
    let active = true;

    if (refreshToken && invalidatePrefix) invalidateAdminData(invalidatePrefix);

    const cached = cacheResult ? getCachedAdminData<T>(key) : undefined;
    if (cached !== undefined) {
      setData(cached);
      setLoading(false);
    } else {
      setData(undefined);
      setLoading(true);
    }
    setError(null);

    if (cacheResult && isAdminDataFresh(key)) return () => { active = false; };

    void load().then(
      (result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      },
      (cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos.");
        setLoading(false);
      },
    );

    return () => { active = false; };
  }, [cacheResult, invalidatePrefix, key, load, refreshToken]);

  return { data, loading, error };
}
