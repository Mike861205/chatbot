import { Request, Response } from "express";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { parseWebhookPayload, sendWhatsAppMessage } from "./whatsapp.service";
import { resolveTenantByPhone } from "../../middleware/tenant";
import { handleIncomingMessage } from "../chatbot/chatbot.service";
import { queryOne } from "../../db/pool";

// Webhook verification (GET) — required by Meta
export function handleVerify(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.whatsapp.verifyToken) {
    logger.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
}

// Incoming messages (POST)
export async function handleWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  // Respond immediately so Meta doesn't retry
  res.sendStatus(200);

  const messages = parseWebhookPayload(req.body as Record<string, unknown>);
  if (messages.length === 0) return;

  for (const msg of messages) {
    try {
      // Find tenant by the WhatsApp business phone number ID
      const tenant = await queryOne<{
        id: string;
        db_schema: string;
        whatsapp_access_token: string;
        whatsapp_phone_number_id: string;
        is_active: boolean;
      }>(
        `SELECT id, db_schema, whatsapp_access_token, whatsapp_phone_number_id, is_active
         FROM public.tenants
         WHERE whatsapp_phone_number_id = $1 AND is_active = true`,
        [msg.phoneNumberId],
      );

      if (!tenant) {
        // Try by phone number as fallback
        const tenantByPhone = await resolveTenantByPhone(msg.businessPhone);
        if (!tenantByPhone) {
          logger.warn(
            `No tenant found for phone_number_id: ${msg.phoneNumberId}`,
          );
          continue;
        }
        const fullTenant = await queryOne<{
          whatsapp_access_token: string;
          whatsapp_phone_number_id: string;
        }>(
          `SELECT whatsapp_access_token, whatsapp_phone_number_id
           FROM public.tenants WHERE id = $1`,
          [tenantByPhone.id],
        );
        if (!fullTenant) continue;

        const response = await handleIncomingMessage(
          tenantByPhone.schema,
          msg.fromPhone,
          msg.messageText,
          msg.messageId,
        );

        await sendWhatsAppMessage(
          tenantByPhone.accessToken,
          fullTenant.whatsapp_phone_number_id,
          msg.fromPhone,
          response,
        );
        continue;
      }

      const response = await handleIncomingMessage(
        tenant.db_schema,
        msg.fromPhone,
        msg.messageText,
        msg.messageId,
      );

      await sendWhatsAppMessage(
        tenant.whatsapp_access_token,
        tenant.whatsapp_phone_number_id,
        msg.fromPhone,
        response,
      );
    } catch (err) {
      logger.error(`Error processing message from ${msg.fromPhone}`, err);
    }
  }
}
