import * as fs from "fs";
import * as path from "path";
import { pool, query } from "./pool";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import bcrypt from "bcryptjs";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runMigrations(): Promise<void> {
  logger.info("Running database migrations...");

  // Run public schema migration
  const publicSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "001_public_schema.sql"),
    "utf8",
  );
  await pool.query(publicSql);
  logger.info("Public schema migration complete");

  // Create default super admin if not exists
  const existing = await query(
    "SELECT id FROM public.super_admins WHERE email = $1",
    [env.superAdmin.email],
  );
  if (existing.length === 0) {
    const hash = await bcrypt.hash(env.superAdmin.password, 12);
    await query(
      `INSERT INTO public.super_admins (email, password_hash, name)
       VALUES ($1, $2, 'Super Admin')`,
      [env.superAdmin.email, hash],
    );
    logger.info(`Super admin created: ${env.superAdmin.email}`);
  }

  logger.info("Migrations complete");
}

// Create a new tenant schema from template
export async function createTenantSchema(schema: string): Promise<void> {
  // Validate schema name
  if (!/^tenant_[a-z0-9_]+$/.test(schema)) {
    throw new Error("Invalid schema name format. Must be tenant_{slug}");
  }

  const template = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "002_tenant_schema_template.sql"),
    "utf8",
  );

  // Create schema
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

  // Replace placeholder and run
  const sql = template.replace(/\{SCHEMA\}/g, schema);
  await pool.query(sql);
  logger.info(`Tenant schema created: ${schema}`);
}

export async function dropTenantSchema(schema: string): Promise<void> {
  if (!/^tenant_[a-z0-9_]+$/.test(schema)) {
    throw new Error("Invalid schema name format");
  }
  await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  logger.info(`Tenant schema dropped: ${schema}`);
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info("Migration script complete");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Migration failed", err);
      process.exit(1);
    });
}
