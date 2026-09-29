import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Cliente Culqi (docs/06). La llave secreta solo vive en el servidor.
 * TODO Fase 4: crear cargos (POST /charges, montos en céntimos, PEN),
 * consultar estado por referencia y verificar la firma del webhook.
 */

const CULQI_API = "https://api.culqi.com/v2";

export type CulqiChargeInput = {
  amount: number;
  currency?: "PEN";
  email: string;
  sourceId: string;
  description?: string;
  metadata?: Record<string, string>;
};

export async function createCharge(input: CulqiChargeInput) {
  if (!serverEnv.culqi.secretKey) {
    throw new Error("CULQI_SECRET_KEY no configurada.");
  }

  const response = await fetch(`${CULQI_API}/charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.culqi.secretKey}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency_code: input.currency ?? "PEN",
      email: input.email,
      source_id: input.sourceId,
      description: input.description,
      metadata: input.metadata,
    }),
  });

  if (!response.ok) {
    throw new Error(`Culqi respondió HTTP ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}
