import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Webhook de Culqi pendiente (verificación de firma + idempotencia). Ver docs/06 §5.",
    },
    { status: 501 },
  );
}
