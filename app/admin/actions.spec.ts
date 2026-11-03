import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getAdmin: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getActiveAdmin: mocks.getAdmin,
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("@/lib/catalog/products", () => ({ getImageAssetPaths: () => [] }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
import {
  uploadMediaAction,
  deleteMediaAssetAction,
  reorderHomeSlidesAction,
} from "./actions";
const id = "80000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAdmin.mockResolvedValue({
    user: { id },
    supabase: {
      storage: {
        from: () => ({
          upload: mocks.upload,
          remove: mocks.remove,
          getPublicUrl: () => ({
            data: { publicUrl: "https://own.invalid/file.png" },
          }),
        }),
      },
      from: () => ({ insert: mocks.insert }),
      rpc: mocks.rpc,
    },
  });
});
it("no deja una subida sin registro cuando falla la base de datos", async () => {
  const data = new FormData();
  data.set(
    "file",
    new File(
      [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])],
      "photo.png",
      { type: "image/png" },
    ),
  );
  mocks.upload.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: { message: "database down" } });
  mocks.remove.mockResolvedValue({ error: null });
  expect((await uploadMediaAction(data)).error).toBeTruthy();
  expect(mocks.remove).toHaveBeenCalledOnce();
});
it("un archivo en uso no llega a eliminarse de Storage", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "23514" } });
  expect((await deleteMediaAssetAction(id)).error).toBeTruthy();
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("un fallo de Storage restaura la marca y se informa como error", async () => {
  mocks.rpc
    .mockResolvedValueOnce({
      data: [{ file_path: "products/photo.png" }],
      error: null,
    })
    .mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: { message: "storage down" } });
  expect((await deleteMediaAssetAction(id)).error).toBeTruthy();
  expect(mocks.rpc).toHaveBeenLastCalledWith("finish_media_deletion", {
    p_id: id,
    p_removed: false,
  });
});
it("un error al reordenar nunca se informa como éxito", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "40001" } });
  expect((await reorderHomeSlidesAction([id])).error).toBeTruthy();
});
it("un usuario sin autorización no puede iniciar una eliminación", async () => {
  mocks.getAdmin.mockResolvedValue({ user: null, supabase: null });
  expect((await deleteMediaAssetAction(id)).error).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
