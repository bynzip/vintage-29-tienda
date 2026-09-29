"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCatalogData } from "@/lib/api/catalog";

/**
 * Hook único de catálogo: comparte la misma query (y caché) entre hero,
 * carrusel, grilla, buscador, favoritos y detalle de producto.
 */
export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: fetchCatalogData,
  });
}
