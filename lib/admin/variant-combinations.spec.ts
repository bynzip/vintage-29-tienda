import { describe, expect, it } from "vitest";
import { buildVariantCombinations, type VariantDraft } from "./variant-combinations";

const original: VariantDraft = {
  id: "variant-blue-s",
  color_id: "blue",
  size_id: "s",
  sku: "V29-BL-S",
  variant_name: "Azul / S",
  amount_cents: 12900,
  quantity_on_hand: 4,
  quantity_reserved: 1,
  is_active: false,
  position: 0,
};

describe("buildVariantCombinations", () => {
  it("preserves existing variant data when adding a size and creates only the new combination", () => {
    const generated = buildVariantCombinations({
      existing: [original],
      colorIds: ["blue"],
      sizeIds: ["s", "m"],
      colorNames: new Map([["blue", "Azul"]]),
      sizeNames: new Map([["s", "S"], ["m", "M"]]),
      createId: () => "variant-blue-m",
    });

    expect(generated).toHaveLength(2);
    expect(generated[0]).toEqual({ ...original, variant_name: "Azul / S", position: 0 });
    expect(generated[1]).toMatchObject({
      id: "variant-blue-m",
      color_id: "blue",
      size_id: "m",
      variant_name: "Azul / M",
      amount_cents: null,
      quantity_on_hand: 0,
      is_active: true,
      position: 1,
    });
  });

  it("does not clear variants when no option values are selected", () => {
    expect(buildVariantCombinations({
      existing: [original],
      colorIds: [],
      sizeIds: [],
      colorNames: new Map(),
      sizeNames: new Map(),
    })).toEqual([original]);
  });

  it("keeps variant positions unique across colors and sizes", () => {
    const generated = buildVariantCombinations({
      existing: [],
      colorIds: ["blue", "green"],
      sizeIds: ["s", "m"],
      colorNames: new Map([["blue", "Azul"], ["green", "Verde"]]),
      sizeNames: new Map([["s", "S"], ["m", "M"]]),
      createId: (() => { let id = 0; return () => `new-${id++}`; })(),
    });

    expect(generated.map((variant) => variant.position)).toEqual([0, 1, 2, 3]);
    expect(generated.map((variant) => variant.variant_name)).toEqual([
      "Azul / S", "Azul / M", "Verde / S", "Verde / M",
    ]);
  });
});
