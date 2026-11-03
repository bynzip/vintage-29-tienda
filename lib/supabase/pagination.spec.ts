import { expect, it } from "vitest";
import { readAllPages } from "./pagination";

it("recupera registros posteriores a la primera página sin duplicarlos", async () => {
  const source = Array.from({ length: 451 }, (_, id) => ({ id }));
  const result = await readAllPages(async (from, to) => ({
    data: source.slice(from, to + 1),
    error: null,
  }));
  expect(result).toEqual(source);
});
it("no presenta un catálogo parcial como exitoso si falla otra página", async () => {
  await expect(
    readAllPages(
      async (from) =>
        from === 0
          ? { data: [1, 2], error: null }
          : { data: null, error: { message: "connection failed" } },
      2,
    ),
  ).rejects.toThrow("connection failed");
});
