import "server-only";

/**
 * Acceso tipado a variables de entorno de servidor.
 * NUNCA importar este módulo desde componentes cliente.
 * Ver docs/02-arquitectura.md §10 y docs/09-registros-necesarios-integracion.md.
 */
export const serverEnv = {
  odoo: {
    url: process.env.ODOO_URL ?? "",
    db: process.env.ODOO_DB ?? "",
    user: process.env.ODOO_USER ?? "",
    apiKey: process.env.ODOO_API_KEY ?? "",
    password: process.env.ODOO_PASSWORD ?? "",
  },
  culqi: {
    publicKey: process.env.CULQI_PUBLIC_KEY ?? "",
    secretKey: process.env.CULQI_SECRET_KEY ?? "",
    webhookSecret: process.env.CULQI_WEBHOOK_SECRET ?? "",
  },
  databaseUrl: process.env.DATABASE_URL ?? "",
  store: {
    name: process.env.NEXT_PUBLIC_STORE_NAME ?? "Vintage 29",
    whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "",
    alertEmail: process.env.STORE_ALERT_EMAIL ?? "",
  },
  cronSecret: process.env.CRON_SECRET ?? "",
};

export function isOdooConfigured(): boolean {
  const { url, db, user, apiKey, password } = serverEnv.odoo;
  return Boolean(url && db && user && (apiKey || password));
}

export function isCulqiConfigured(): boolean {
  return Boolean(serverEnv.culqi.secretKey);
}
