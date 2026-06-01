import { Request, Response } from "express";
import { z } from "zod";
import {
  superAdminLogin,
  tenantLogin,
  createTenant,
  listTenants,
  updateTenant,
  createTenantUser,
  listTenantUsers,
  changePassword,
} from "./auth.service";
import { AuthRequest } from "../../middleware/auth";

// ─── Super Admin ───────────────────────────────────────────────────────────────

export async function handleSuperAdminLogin(
  req: Request,
  res: Response,
): Promise<void> {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await superAdminLogin(parsed.data.email, parsed.data.password);
  if (!result) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  res.json(result);
}

// ─── Tenant Login ──────────────────────────────────────────────────────────────

export async function handleTenantLogin(
  req: Request,
  res: Response,
): Promise<void> {
  const schema = z.object({
    slug: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await tenantLogin(
    parsed.data.slug,
    parsed.data.email,
    parsed.data.password,
  );
  if (!result) {
    res.status(401).json({ error: "Invalid credentials or tenant not found" });
    return;
  }
  res.json(result);
}

// ─── Tenant CRUD (Super Admin only) ───────────────────────────────────────────

export async function handleCreateTenant(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const schema = z.object({
    name: z.string().min(2),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
    adminName: z.string().min(2),
    whatsappPhone: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const tenant = await createTenant(parsed.data);
    res.status(201).json(tenant);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create tenant";
    res.status(400).json({ error: message });
  }
}

export async function handleListTenants(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  const tenants = await listTenants();
  res.json(tenants);
}

export async function handleUpdateTenant(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const schema = z.object({
    name: z.string().optional(),
    whatsappPhone: z.string().optional(),
    whatsappAccessToken: z.string().optional(),
    whatsappPhoneNumberId: z.string().optional(),
    isActive: z.boolean().optional(),
    plan: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  await updateTenant(req.params.id, parsed.data);
  res.json({ success: true });
}

// ─── Tenant User Management ────────────────────────────────────────────────────

export async function handleListUsers(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const users = await listTenantUsers(req.user!.tenantSchema!);
  res.json(users);
}

export async function handleCreateUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
    role: z.enum(["admin", "manager", "viewer"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const user = await createTenantUser(req.user!.tenantSchema!, parsed.data);
    res.status(201).json(user);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create user";
    res.status(400).json({ error: message });
  }
}

export async function handleChangePassword(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    await changePassword(
      req.user!.tenantSchema!,
      req.user!.userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to change password";
    res.status(400).json({ error: message });
  }
}

export async function handleMe(req: AuthRequest, res: Response): Promise<void> {
  res.json({ user: req.user });
}
