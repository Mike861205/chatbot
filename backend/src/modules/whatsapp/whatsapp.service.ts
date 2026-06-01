import axios from "axios";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

export async function sendWhatsAppMessage(
  accessToken: string,
  phoneNumberId: string,
  toPhone: string,
  message: string,
): Promise<void> {
  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${phoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "text",
      text: { preview_url: false, body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  logger.debug(`WhatsApp message sent to ${toPhone}`);
}

export async function sendWhatsAppTemplate(
  accessToken: string,
  phoneNumberId: string,
  toPhone: string,
  templateName: string,
  components: unknown[],
): Promise<void> {
  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${phoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "es_MX" },
        components,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );
}

export function parseWebhookPayload(body: Record<string, unknown>): Array<{
  businessPhone: string;
  fromPhone: string;
  messageText: string;
  messageId: string;
  phoneNumberId: string;
}> {
  const messages: Array<{
    businessPhone: string;
    fromPhone: string;
    messageText: string;
    messageId: string;
    phoneNumberId: string;
  }> = [];

  try {
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;

    if (!value) return messages;

    const metadata = value.metadata as Record<string, unknown>;
    const phoneNumberId = metadata?.phone_number_id as string;
    const displayPhone = metadata?.display_phone_number as string;

    const incomingMessages = value.messages as Array<Record<string, unknown>>;
    if (!incomingMessages) return messages;

    for (const msg of incomingMessages) {
      if (msg.type !== "text") continue; // Only handle text for now
      const text = (msg.text as Record<string, string>)?.body;
      if (!text) continue;

      messages.push({
        businessPhone: displayPhone,
        fromPhone: msg.from as string,
        messageText: text,
        messageId: msg.id as string,
        phoneNumberId,
      });
    }
  } catch (err) {
    logger.error("Error parsing webhook payload", err);
  }

  return messages;
}
