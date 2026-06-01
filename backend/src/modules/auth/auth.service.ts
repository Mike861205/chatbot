import bcrypt from "bcryptjs";
import { query, queryOne, tenantQuery, tenantQueryOne } from "../../db/pool";
import { signToken } from "../../utils/jwt";
import { createTenantSchema } from "../../db/migrate";
import { logger } from "../../utils/logger";

// ─── Super Admin Auth ──────────────────────────────────────────────────────────

export async function superAdminLogin(email: string, password: string) {
  const admin = await queryOne<{
    id: string;
    email: string;
    password_hash: string;
    name: string;
  }>("SELECT * FROM public.super_admins WHERE email = $1", [email]);

  if (!admin) return null;
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return null;

  const token = signToken({
    userId: admin.id,
    email: admin.email,
    role: "super_admin",
    isSuperAdmin: true,
  });

  return {
    token,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "super_admin",
    },
  };
}

// ─── Tenant Admin Auth ─────────────────────────────────────────────────────────

export async function tenantLogin(
  slug: string,
  email: string,
  password: string,
) {
  // Find tenant
  const tenant = await queryOne<{
    id: string;
    db_schema: string;
    is_active: boolean;
    name: string;
  }>(
    "SELECT id, db_schema, is_active, name FROM public.tenants WHERE slug = $1",
    [slug],
  );

  if (!tenant || !tenant.is_active) return null;

  // Find user in tenant schema
  const user = await tenantQueryOne<{
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: string;
    is_active: boolean;
  }>(tenant.db_schema, "SELECT * FROM users WHERE email = $1", [email]);

  if (!user || !user.is_active) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: tenant.id,
    tenantSchema: tenant.db_schema,
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tenant: { id: tenant.id, name: tenant.name, slug },
  };
}

// ─── Tenant Management (Super Admin) ──────────────────────────────────────────

export async function createTenant(data: {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  whatsappPhone?: string;
}) {
  const schema = `tenant_${data.slug.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  // Check slug uniqueness
  const existing = await queryOne(
    "SELECT id FROM public.tenants WHERE slug = $1",
    [data.slug],
  );
  if (existing) throw new Error("Tenant slug already exists");

  // Create tenant record
  const [tenant] = await query<{ id: string }>(
    `INSERT INTO public.tenants (name, slug, db_schema, whatsapp_phone_number)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [data.name, data.slug, schema, data.whatsappPhone ?? null],
  );

  // Create DB schema
  await createTenantSchema(schema);

  // Create first admin user in tenant schema
  const hash = await bcrypt.hash(data.adminPassword, 12);
  await tenantQuery(
    schema,
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin')`,
    [data.adminEmail, hash, data.adminName],
  );

  // Create default restaurant config
  await tenantQuery(
    schema,
    `INSERT INTO restaurant_config (restaurant_name) VALUES ($1)`,
    [data.name],
  );

  logger.info(`Tenant created: ${data.slug} (schema: ${schema})`);
  return { id: tenant.id, slug: data.slug, schema };
}

export async function listTenants() {
  return query<{
    id: string;
    name: string;
    slug: string;
    whatsapp_phone_number: string;
    is_active: boolean;
    plan: string;
    created_at: string;
  }>(
    `SELECT id, name, slug, whatsapp_phone_number, is_active, plan, created_at
     FROM public.tenants ORDER BY created_at DESC`,
  );
}

export async function updateTenant(
  id: string,
  data: Partial<{
    name: string;
    whatsappPhone: string;
    whatsappAccessToken: string;
    whatsappPhoneNumberId: string;
    isActive: boolean;
    plan: string;
  }>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.whatsappPhone !== undefined) {
    fields.push(`whatsapp_phone_number = $${idx++}`);
    values.push(data.whatsappPhone);
  }
  if (data.whatsappAccessToken !== undefined) {
    fields.push(`whatsapp_access_token = $${idx++}`);
    values.push(data.whatsappAccessToken);
  }
  if (data.whatsappPhoneNumberId !== undefined) {
    fields.push(`whatsapp_phone_number_id = $${idx++}`);
    values.push(data.whatsappPhoneNumberId);
  }
  if (data.isActive !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(data.isActive);
  }
  if (data.plan !== undefined) {
    fields.push(`plan = $${idx++}`);
    values.push(data.plan);
  }

  if (fields.length === 0) return;
  fields.push(`updated_at = NOW()`);
  values.push(id);

  await query(
    `UPDATE public.tenants SET ${fields.join(", ")} WHERE id = $${idx}`,
    values,
  );
}

// ─── Tenant User Management ────────────────────────────────────────────────────

export async function createTenantUser(
  tenantSchema: string,
  data: { email: string; password: string; name: string; role: string },
) {
  const hash = await bcrypt.hash(data.password, 12);
  const [user] = await tenantQuery<{ id: string }>(
    tenantSchema,
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [data.email, hash, data.name, data.role],
  );
  return user;
}

export async function listTenantUsers(tenantSchema: string) {
  return tenantQuery(
    tenantSchema,
    `SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC`,
  );
}

export async function changePassword(
  tenantSchema: string,
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await tenantQueryOne<{ password_hash: string }>(
    tenantSchema,
    "SELECT password_hash FROM users WHERE id = $1",
    [userId],
  );
  if (!user) throw new Error("User not found");
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new Error("Current password incorrect");
  const hash = await bcrypt.hash(newPassword, 12);
  await tenantQuery(
    tenantSchema,
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [hash, userId],
  );
}
