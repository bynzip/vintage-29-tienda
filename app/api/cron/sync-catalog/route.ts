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
        "Sincronizador de catálogo pendiente (Odoo → caché canónica por write_date). Ver docs/02 §5 y docs/03 §6.",
    },
    { status: 501 },
  );
}
