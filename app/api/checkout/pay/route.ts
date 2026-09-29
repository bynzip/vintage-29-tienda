import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Confirmación de pago pendiente (cargo Culqi + registro del pedido en Odoo). Ver docs/06 y docs/04.",
    },
    { status: 501 },
  );
}
