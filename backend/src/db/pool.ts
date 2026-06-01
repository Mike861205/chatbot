import { Pool, PoolClient } from "pg";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// Main pool for public schema operations
export const pool = new Pool(
  env.db.connectionString
    ? {
        connectionString: env.db.connectionString,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: env.db.host,
        port: env.db.port,
        database: env.db.name,
        user: env.db.user,
        password: env.db.password,
        ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
);

pool.on("error", (err) => {
  logger.error("Unexpected DB pool error", err);
});

// Get a client scoped to a tenant schema
export async function getTenantClient(
  tenantSchema: string,
): Promise<PoolClient> {
  const client = await pool.connect();
  // Validate schema name to prevent SQL injection (only alphanumeric + underscore)
  if (!/^[a-z0-9_]+$/.test(tenantSchema)) {
    client.release();
    throw new Error("Invalid tenant schema name");
  }
  await client.query(`SET search_path TO ${tenantSchema}, public`);
  return client;
}

// Execute query in tenant schema context
export async function tenantQuery<T = Record<string, unknown>>(
  tenantSchema: string,
  text: string,
  params?: unknown[],
): Promise<T[]> {
  if (!/^[a-z0-9_]+$/.test(tenantSchema)) {
    throw new Error("Invalid tenant schema name");
  }
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${tenantSchema}, public`);
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function tenantQueryOne<T = Record<string, unknown>>(
  tenantSchema: string,
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await tenantQuery<T>(tenantSchema, text, params);
  return rows[0] ?? null;
}
