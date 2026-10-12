import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCachedAdminData,
  invalidateAdminData,
  loadAdminData,
} from "./query-cache";

describe("admin query cache", () => {
  afterEach(() => {
    vi.useRealTimers();
    invalidateAdminData("admin-cache-test:");
  });

  it("reuses fresh data and reloads it when stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    const loader = vi.fn(async () => ({ value: loader.mock.calls.length }));

    const first = await loadAdminData("admin-cache-test:products", loader, 1_000);
    const reused = await loadAdminData("admin-cache-test:products", loader, 1_000);

    expect(reused).toEqual(first);
    expect(loader).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_001);
    const refreshed = await loadAdminData("admin-cache-test:products", loader, 1_000);

    expect(refreshed).not.toEqual(first);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent reads and allows prefix invalidation", async () => {
    let resolve!: (value: string[]) => void;
    const loader = vi.fn(() => new Promise<string[]>((done) => { resolve = done; }));
    const first = loadAdminData("admin-cache-test:user-a:categories", loader);
    const second = loadAdminData("admin-cache-test:user-a:categories", loader);

    expect(loader).toHaveBeenCalledTimes(1);
    resolve(["Pantalones"]);
    await expect(Promise.all([first, second])).resolves.toEqual([["Pantalones"], ["Pantalones"]]);
    expect(getCachedAdminData<string[]>("admin-cache-test:user-a:categories")).toEqual(["Pantalones"]);

    invalidateAdminData("admin-cache-test:user-a:");
    expect(getCachedAdminData("admin-cache-test:user-a:categories")).toBeUndefined();
  });
});
