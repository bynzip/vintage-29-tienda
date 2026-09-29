import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Reintento de pedidos pagados sin registrar pendiente (estado pagado_pendiente_registro). Ver docs/04 §4 y docs/06 §4.",
    },
    { status: 501 },
  );
}
