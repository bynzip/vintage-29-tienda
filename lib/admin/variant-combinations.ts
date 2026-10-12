export type VariantDraft = {
  id: string;
  color_id: string | null;
  size_id: string | null;
  sku: string;
  variant_name: string;
  amount_cents: number | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  is_active: boolean;
  position: number;
};

export function buildVariantCombinations({
  existing,
  colorIds,
  sizeIds,
  colorNames,
  sizeNames,
  createId = () => crypto.randomUUID(),
}: {
  existing: VariantDraft[];
  colorIds: string[];
  sizeIds: string[];
  colorNames: Map<string, string>;
  sizeNames: Map<string, string>;
  createId?: () => string;
}): VariantDraft[] {
  if (!colorIds.length && !sizeIds.length) return existing;

  const colors: Array<string | null> = colorIds.length ? colorIds : [null];
  const sizes: Array<string | null> = sizeIds.length ? sizeIds : [null];
  const previousByCombination = new Map(
    existing.map((variant) => [`${variant.color_id ?? ""}::${variant.size_id ?? ""}`, variant]),
  );

  return colors.flatMap((colorId, colorIndex) => sizes.map((sizeId, sizeIndex) => {
    const position = colorIndex * sizes.length + sizeIndex;
    const combination = `${colorId ?? ""}::${sizeId ?? ""}`;
    const variantName = [colorId ? colorNames.get(colorId) : null, sizeId ? sizeNames.get(sizeId) : null]
      .filter(Boolean)
      .join(" / ");
    const previous = previousByCombination.get(combination);
    if (previous) {
      return { ...previous, color_id: colorId, size_id: sizeId, variant_name: variantName, position };
    }
    return {
      id: createId(),
      color_id: colorId,
      size_id: sizeId,
      sku: "",
      variant_name: variantName,
      amount_cents: null,
      quantity_on_hand: 0,
      quantity_reserved: 0,
      is_active: true,
      position,
    };
  }));
}
