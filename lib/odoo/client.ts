import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Cliente Odoo por JSON-RPC nativo (`/jsonrpc`, `execute_kw`).
 * Decisión D3 (docs/02): no se instala ningún módulo en el Odoo del cliente.
 * Único punto de acoplamiento con el ERP: lib/odoo.
 */

export type OdooConfig = {
  url: string;
  db: string;
  user: string;
  apiKey?: string;
  password?: string;
};

export class OdooError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "OdooError";
  }
}

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

export class OdooClient {
  private uid: number | null = null;
  private requestId = 0;

  constructor(private readonly config: OdooConfig) {
    if (!config.url || !config.db || !config.user) {
      throw new OdooError("Configuración de Odoo incompleta (url, db, user).");
    }
  }

  private get endpoint(): string {
    return `${this.config.url.replace(/\/+$/, "")}/jsonrpc`;
  }

  private async rpc<T>(
    service: string,
    method: string,
    args: unknown[],
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { service, method, args },
        id: ++this.requestId,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new OdooError(`Odoo respondió HTTP ${response.status}`);
    }

    const payload = (await response.json()) as JsonRpcResponse<T>;
    if (payload.error) {
      throw new OdooError(
        payload.error.message,
        payload.error.code,
        payload.error.data,
      );
    }
    return payload.result as T;
  }

  async connect(): Promise<number> {
    const secret = this.config.apiKey || this.config.password || "";
    const uid = await this.rpc<number | false>("common", "authenticate", [
      this.config.db,
      this.config.user,
      secret,
      {},
    ]);
    if (!uid) throw new OdooError("Autenticación con Odoo rechazada.");
    this.uid = uid;
    return uid;
  }

  async executeKw<T>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    if (this.uid === null) await this.connect();
    return this.rpc<T>("object", "execute_kw", [
      this.config.db,
      this.uid,
      this.config.apiKey || this.config.password,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  fieldsGet(model: string): Promise<Record<string, unknown>> {
    return this.executeKw(model, "fields_get", [], {
      attributes: ["string", "type", "required"],
    });
  }

  searchRead<T>(
    model: string,
    domain: unknown[],
    fields: string[],
    options: { limit?: number; offset?: number; order?: string } = {},
  ): Promise<T[]> {
    return this.executeKw<T[]>(model, "search_read", [domain], {
      fields,
      ...options,
    });
  }

  searchCount(model: string, domain: unknown[] = []): Promise<number> {
    return this.executeKw<number>(model, "search_count", [domain]);
  }

  create(model: string, values: Record<string, unknown>): Promise<number> {
    return this.executeKw<number>(model, "create", [values]);
  }

  write(
    model: string,
    ids: number[],
    values: Record<string, unknown>,
  ): Promise<boolean> {
    return this.executeKw<boolean>(model, "write", [ids, values]);
  }
}

export function getOdooClient(): OdooClient {
  return new OdooClient({
    url: serverEnv.odoo.url,
    db: serverEnv.odoo.db,
    user: serverEnv.odoo.user,
    apiKey: serverEnv.odoo.apiKey,
    password: serverEnv.odoo.password,
  });
}
