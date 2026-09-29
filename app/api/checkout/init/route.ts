import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Inicio de compra pendiente. Ver docs/02 §6, docs/03 §6 (stock en vivo) y docs/05 (cotización de envío).",
    },
    { status: 501 },
  );
}
