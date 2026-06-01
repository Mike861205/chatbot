import OpenAI from "openai";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

const openai = new OpenAI({ apiKey: env.openai.apiKey });

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: env.openai.model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (err) {
    logger.error("OpenAI error", err);
    throw new Error("AI service unavailable");
  }
}

export async function extractIntent(
  userMessage: string,
  menuContext: string,
): Promise<{
  intent: string;
  items?: Array<{ name: string; quantity: number; notes?: string }>;
  action?: string;
}> {
  const systemPrompt = `You are an intent classifier for a restaurant order chatbot.
Classify the user message into one of these intents:
- GREET: greeting/hello
- VIEW_MENU: wants to see the menu
- VIEW_CATEGORY: wants a specific category (extract category name)
- ADD_ITEM: wants to add item(s) to cart (extract items with quantities)
- REMOVE_ITEM: wants to remove item from cart
- VIEW_CART: wants to see their current cart
- CONFIRM_ORDER: wants to place/confirm the order
- CANCEL_ORDER: wants to cancel
- PROVIDE_ADDRESS: giving delivery address
- PROVIDE_NAME: giving their name
- PROVIDE_INFO: giving contact info
- HELP: needs help
- OTHER: anything else

Menu available: ${menuContext}

Respond ONLY with valid JSON in this format:
{
  "intent": "INTENT_NAME",
  "items": [{"name": "item name", "quantity": 1, "notes": "optional notes"}],
  "categoryName": "optional category",
  "action": "optional context"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: env.openai.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content);
  } catch {
    return { intent: "OTHER" };
  }
}
