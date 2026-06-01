import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { queryOne } from "../db/pool";

// Attaches tenant context from JWT to request
export function tenantContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user?.tenantSchema) {
    res.status(400).json({ error: "Tenant context missing" });
    return;
  }
  next();
}

// Resolve tenant by WhatsApp phone number (used in webhook)
export async function resolveTenantByPhone(
  phone: string,
): Promise<{
  id: string;
  schema: string;
  accessToken: string;
  phoneNumberId: string;
} | null> {
  const tenant = await queryOne<{
    id: string;
    db_schema: string;
    whatsapp_access_token: string;
    whatsapp_phone_number_id: string;
    is_active: boolean;
  }>(
    `SELECT id, db_schema, whatsapp_access_token, whatsapp_phone_number_id, is_active
     FROM public.tenants
     WHERE whatsapp_phone_number = $1`,
    [phone],
  );

  if (!tenant || !tenant.is_active) return null;

  return {
    id: tenant.id,
    schema: tenant.db_schema,
    accessToken: tenant.whatsapp_access_token,
    phoneNumberId: tenant.whatsapp_phone_number_id,
  };
}
