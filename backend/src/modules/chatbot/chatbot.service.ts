import { tenantQuery, tenantQueryOne } from "../../db/pool";
import { getFullMenu } from "../menu/menu.service";
import { getRestaurantConfig } from "../menu/menu.service";
import { upsertCustomer } from "../customers/customers.service";
import { createOrder, CartItem } from "../orders/orders.service";
import { chatCompletion, extractIntent, ChatMessage } from "./openai.service";
import { logger } from "../../utils/logger";

// ─── Conversation state machine ────────────────────────────────────────────────
// States: greeting → menu_browsing → ordering → cart_review →
//         collect_info → confirm_order → order_placed

export interface ConversationContext {
  cart: CartItem[];
  customerName?: string;
  customerAddress?: string;
  orderType?: "delivery" | "pickup";
  currentCategory?: string;
  pendingItemName?: string;
  customerId?: string;
  lastOrderId?: string;
  history: ChatMessage[];
}

export async function getOrCreateConversation(
  schema: string,
  phone: string,
): Promise<{ id: string; state: string; context: ConversationContext }> {
  const existing = await tenantQueryOne<{
    id: string;
    state: string;
    context: ConversationContext;
    customer_id: string;
  }>(
    schema,
    "SELECT id, state, context, customer_id FROM conversations WHERE customer_phone = $1",
    [phone],
  );

  if (existing) {
    return {
      id: existing.id,
      state: existing.state,
      context: {
        ...existing.context,
        cart: (existing.context as ConversationContext)?.cart ?? [],
        history: (existing.context as ConversationContext)?.history ?? [],
        customerId:
          existing.customer_id ??
          (existing.context as ConversationContext)?.customerId,
      } as ConversationContext,
    };
  }

  const [conv] = await tenantQuery<{ id: string }>(
    schema,
    `INSERT INTO conversations (customer_phone, state, context)
     VALUES ($1, 'greeting', '{}') RETURNING id`,
    [phone],
  );

  return { id: conv.id, state: "greeting", context: { cart: [], history: [] } };
}

export async function saveConversation(
  schema: string,
  phone: string,
  state: string,
  context: ConversationContext,
  customerId?: string,
): Promise<void> {
  await tenantQuery(
    schema,
    `UPDATE conversations
     SET state = $1, context = $2, customer_id = $3,
         last_message_at = NOW(), updated_at = NOW()
     WHERE customer_phone = $4`,
    [state, JSON.stringify(context), customerId ?? null, phone],
  );
}

export async function logMessage(
  schema: string,
  phone: string,
  direction: "inbound" | "outbound",
  content: string,
  whatsappMessageId?: string,
): Promise<void> {
  await tenantQuery(
    schema,
    `INSERT INTO message_log (customer_phone, direction, content, whatsapp_message_id)
     VALUES ($1, $2, $3, $4)`,
    [phone, direction, content, whatsappMessageId ?? null],
  );
}

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatMenu(
  menu: Array<{
    name: string;
    emoji: string;
    items: Array<{ name: string; price: number; description?: string }>;
  }>,
  currency: string,
): string {
  return menu
    .map((cat) => {
      const emoji = cat.emoji ? `${cat.emoji} ` : "";
      const items = cat.items
        .map(
          (i) =>
            `  • ${i.name} - ${currency}${i.price.toFixed(2)}${i.description ? `: ${i.description}` : ""}`,
        )
        .join("\n");
      return `*${emoji}${cat.name}*\n${items}`;
    })
    .join("\n\n");
}

function formatCart(cart: CartItem[], currency: string): string {
  if (cart.length === 0) return "Tu carrito está vacío 🛒";
  const lines = cart.map(
    (i) => `• ${i.quantity}x ${i.name} — ${currency}${i.lineTotal.toFixed(2)}`,
  );
  const total = cart.reduce((s, i) => s + i.lineTotal, 0);
  return `${lines.join("\n")}\n\n*Total: ${currency}${total.toFixed(2)}*`;
}

// ─── Main chatbot handler ──────────────────────────────────────────────────────

export async function handleIncomingMessage(
  schema: string,
  fromPhone: string,
  messageText: string,
  whatsappMessageId?: string,
): Promise<string> {
  // Load config & menu
  const [config, fullMenu] = await Promise.all([
    getRestaurantConfig(schema) as Promise<Record<
      string,
      string | boolean | number
    > | null>,
    getFullMenu(schema) as Promise<
      Array<{
        name: string;
        emoji: string;
        items: Array<{
          id: string;
          name: string;
          price: number;
          description?: string;
        }>;
      }>
    >,
  ]);

  const restaurantName =
    (config?.restaurant_name as string) ?? "el restaurante";
  const currency = (config?.currency_symbol as string) ?? "$";
  const welcomeMessage = (config?.welcome_message as string) ?? "¡Bienvenido!";
  const isAcceptingOrders = config?.is_accepting_orders !== false;
  const deliveryFee = (config?.delivery_fee as number) ?? 0;

  // Load/create conversation
  const conv = await getOrCreateConversation(schema, fromPhone);
  const { context } = conv;
  let { state } = conv;

  // Log inbound message
  await logMessage(
    schema,
    fromPhone,
    "inbound",
    messageText,
    whatsappMessageId,
  );

  // Build menu summary for AI intent extraction
  const menuSummary = fullMenu
    .map((c) => `${c.name}: ${c.items.map((i) => i.name).join(", ")}`)
    .join(" | ");

  // Extract intent
  const intentResult = await extractIntent(messageText, menuSummary);
  const { intent, items: intentItems } = intentResult;
  const categoryName = (intentResult as Record<string, unknown>)
    .categoryName as string | undefined;

  logger.debug(`[Chatbot] phone=${fromPhone} state=${state} intent=${intent}`);

  let response = "";

  // ── State machine ──────────────────────────────────────────────────────────
  if (intent === "GREET" || state === "greeting") {
    const customer = await tenantQueryOne<{ name: string }>(
      schema,
      "SELECT name FROM customers WHERE phone = $1",
      [fromPhone],
    );
    const greeting = customer?.name
      ? `¡Hola ${customer.name}! 👋`
      : `¡Hola! 👋 Bienvenido a *${restaurantName}*`;

    response = `${greeting}\n\n${welcomeMessage}\n\n¿Qué deseas hacer?\n• Ver el *menú* 🍽️\n• Hacer un *pedido* 🛒\n• Ver tus *pedidos anteriores* 📋\n\nEscribe *menú* para empezar.`;
    state = "menu_browsing";
  } else if (intent === "VIEW_MENU") {
    if (fullMenu.length === 0) {
      response = "Lo siento, el menú no está disponible en este momento. 😔";
    } else {
      response = `🍽️ *Menú de ${restaurantName}*\n\n${formatMenu(fullMenu, currency)}\n\n¿Qué te gustaría ordenar? Escribe el nombre del platillo y la cantidad (ej: "2 tacos al pastor").`;
      state = "ordering";
    }
  } else if (intent === "VIEW_CATEGORY" && categoryName) {
    const cat = fullMenu.find((c) =>
      c.name.toLowerCase().includes((categoryName as string).toLowerCase()),
    );
    if (cat) {
      const items = cat.items
        .map(
          (i) =>
            `• *${i.name}* — ${currency}${i.price.toFixed(2)}${i.description ? `\n  ${i.description}` : ""}`,
        )
        .join("\n");
      response = `${cat.emoji ?? ""} *${cat.name}*\n\n${items}\n\n¿Qué quieres agregar a tu pedido?`;
      state = "ordering";
    } else {
      response = `No encontré esa categoría. Escribe *menú* para ver todas las opciones.`;
    }
  } else if (intent === "ADD_ITEM" && intentItems && intentItems.length > 0) {
    if (!isAcceptingOrders) {
      response =
        "😔 Lo siento, en este momento no estamos aceptando pedidos. Por favor intenta más tarde.";
    } else {
      const added: string[] = [];
      const notFound: string[] = [];

      for (const intentItem of intentItems) {
        // Search in menu
        const found = fullMenu
          .flatMap((c) => c.items)
          .find((i) =>
            i.name.toLowerCase().includes(intentItem.name.toLowerCase()),
          );

        if (found) {
          const lineTotal = found.price * intentItem.quantity;
          const existingIdx = context.cart.findIndex(
            (c) => c.itemId === found.id,
          );
          if (existingIdx >= 0) {
            context.cart[existingIdx].quantity += intentItem.quantity;
            context.cart[existingIdx].lineTotal =
              context.cart[existingIdx].price *
              context.cart[existingIdx].quantity;
          } else {
            context.cart.push({
              itemId: found.id,
              name: found.name,
              price: found.price,
              quantity: intentItem.quantity,
              modifiers: [],
              lineTotal,
              notes: intentItem.notes,
            });
          }
          added.push(`${intentItem.quantity}x ${found.name}`);
        } else {
          notFound.push(intentItem.name);
        }
      }

      const addedMsg = added.length ? `✅ Agregado: ${added.join(", ")}` : "";
      const notFoundMsg = notFound.length
        ? `❌ No encontré: ${notFound.join(", ")}. Revisa el *menú* para ver opciones disponibles.`
        : "";

      response = `${addedMsg}${notFoundMsg ? "\n" + notFoundMsg : ""}\n\n${formatCart(context.cart, currency)}\n\n¿Algo más? Escribe *confirmar* para proceder con tu pedido.`;
      state = "ordering";
    }
  } else if (intent === "REMOVE_ITEM") {
    if (context.cart.length === 0) {
      response = "Tu carrito está vacío 🛒";
    } else {
      // Use AI to identify which item to remove
      const systemMsg = `Given cart: ${JSON.stringify(context.cart.map((c) => c.name))} and message: "${messageText}", return JSON: {"itemName": "name to remove"}`;
      const aiRes = await chatCompletion([
        { role: "system", content: systemMsg },
        { role: "user", content: messageText },
      ]);
      try {
        const { itemName } = JSON.parse(aiRes);
        const idx = context.cart.findIndex((c) =>
          c.name.toLowerCase().includes(itemName.toLowerCase()),
        );
        if (idx >= 0) {
          const removed = context.cart.splice(idx, 1)[0];
          response = `✅ Eliminado: ${removed.name}\n\n${formatCart(context.cart, currency)}`;
        } else {
          response = `No encontré ese artículo en tu carrito.\n\n${formatCart(context.cart, currency)}`;
        }
      } catch {
        response = `No pude procesar eso. ¿Cuál artículo quieres eliminar?\n\n${formatCart(context.cart, currency)}`;
      }
    }
  } else if (intent === "VIEW_CART") {
    response = formatCart(context.cart, currency);
    if (context.cart.length > 0) {
      response +=
        "\n\nEscribe *confirmar* para hacer tu pedido o sigue agregando artículos.";
    }
  } else if (
    intent === "CONFIRM_ORDER" ||
    (state === "ordering" && messageText.toLowerCase().includes("confirmar"))
  ) {
    if (context.cart.length === 0) {
      response =
        "Tu carrito está vacío 🛒 Primero agrega algunos artículos. Escribe *menú* para ver opciones.";
    } else {
      response = `📋 *Resumen de tu pedido:*\n\n${formatCart(context.cart, currency)}${deliveryFee > 0 ? `\n🚚 Envío: ${currency}${deliveryFee.toFixed(2)}` : ""}\n\n¿Cómo deseas recibir tu pedido?\n1️⃣ *Entrega a domicilio*\n2️⃣ *Recoger en restaurante*`;
      state = "collect_info";
    }
  } else if (state === "collect_info") {
    const text = messageText.toLowerCase();

    if (!context.orderType) {
      if (
        text.includes("1") ||
        text.includes("domicilio") ||
        text.includes("entrega")
      ) {
        context.orderType = "delivery";
        response = `🚚 Perfecto, entrega a domicilio.\n\nPor favor dime tu *nombre completo*:`;
      } else if (
        text.includes("2") ||
        text.includes("recoger") ||
        text.includes("restaurante")
      ) {
        context.orderType = "pickup";
        response = `🏪 Perfecto, recoges en el restaurante.\n\nPor favor dime tu *nombre completo*:`;
      } else {
        response = `Por favor selecciona:\n1️⃣ *Entrega a domicilio*\n2️⃣ *Recoger en restaurante*`;
      }
    } else if (!context.customerName) {
      context.customerName = messageText.trim();
      if (context.orderType === "delivery") {
        response = `Gracias, *${context.customerName}*! 👋\n\nPor favor proporciona tu *dirección de entrega*:`;
      } else {
        state = "confirm_order";
        const total = context.cart.reduce((s, i) => s + i.lineTotal, 0);
        response = `Gracias, *${context.customerName}*! 👋\n\n${formatCart(context.cart, currency)}\n\n¿Confirmas tu pedido? Escribe *sí* para confirmar o *no* para cancelar.`;
      }
    } else if (context.orderType === "delivery" && !context.customerAddress) {
      context.customerAddress = messageText.trim();
      state = "confirm_order";
      const total =
        context.cart.reduce((s, i) => s + i.lineTotal, 0) + deliveryFee;
      response = `📍 Dirección: ${context.customerAddress}\n\n${formatCart(context.cart, currency)}${deliveryFee > 0 ? `\n🚚 Envío: ${currency}${deliveryFee.toFixed(2)}` : ""}\n*Total: ${currency}${total.toFixed(2)}*\n\n¿Confirmas tu pedido? Escribe *sí* para confirmar o *no* para cancelar.`;
    }
  } else if (state === "confirm_order") {
    const text = messageText.toLowerCase();
    if (
      text.includes("sí") ||
      text.includes("si") ||
      text.includes("yes") ||
      text.includes("confirmar")
    ) {
      try {
        // Upsert customer
        const customerId = await upsertCustomer(schema, fromPhone, {
          name: context.customerName,
          address: context.customerAddress,
        });
        context.customerId = customerId;

        // Create order
        const order = await createOrder(schema, {
          customerId,
          items: context.cart,
          type: context.orderType ?? "pickup",
          deliveryAddress: context.customerAddress,
          deliveryFee,
        });

        context.lastOrderId = order.id;
        const totalDisplay = `${currency}${order.total.toFixed(2)}`;

        response = `🎉 *¡Pedido confirmado!*\n\n📋 Número de pedido: #${order.order_number}\n💰 Total: ${totalDisplay}\n⏱️ Tiempo estimado: 20-30 min\n\n${
          context.orderType === "delivery"
            ? `🚚 Entrega en: ${context.customerAddress}`
            : "🏪 Pasa a recoger a nuestra ubicación"
        }\n\nTe notificaremos cuando tu pedido esté listo. ¡Gracias por tu preferencia! 😊`;

        // Reset conversation
        state = "greeting";
        context.cart = [];
        context.customerAddress = undefined;
        context.orderType = undefined;
      } catch (err) {
        logger.error("Error creating order", err);
        response =
          "😔 Hubo un error al procesar tu pedido. Por favor intenta de nuevo.";
      }
    } else if (text.includes("no") || text.includes("cancel")) {
      state = "ordering";
      response = `Pedido cancelado. Tu carrito sigue guardado:\n\n${formatCart(context.cart, currency)}\n\nEscribe *confirmar* cuando estés listo o *vaciar* para limpiar el carrito.`;
    } else {
      response = `¿Confirmas tu pedido? Escribe *sí* para confirmar o *no* para cancelar.`;
    }
  } else if (intent === "CANCEL_ORDER") {
    context.cart = [];
    context.customerAddress = undefined;
    context.orderType = undefined;
    state = "greeting";
    response = `✅ Pedido cancelado. Tu carrito ha sido vaciado.\n\nEscribe *menú* cuando quieras volver a ordenar. 😊`;
  } else if (intent === "HELP") {
    response = `🆘 *Comandos disponibles:*\n\n• *menú* — Ver el menú completo\n• *carrito* — Ver tu carrito actual\n• *confirmar* — Proceder con el pedido\n• *cancelar* — Cancelar y vaciar carrito\n• *ayuda* — Ver estos comandos\n\n¿En qué te puedo ayudar?`;
  } else {
    // Fallback: use AI for free-form conversation
    const systemPrompt = `Eres un asistente amigable de ${restaurantName}. 
Ayudas a los clientes a hacer pedidos de comida por WhatsApp.
Sé breve, amigable y útil. Guía al cliente hacia hacer un pedido.
Menú disponible: ${menuSummary}
Estado actual del chat: ${state}
Carrito del cliente: ${context.cart.length > 0 ? context.cart.map((i) => `${i.quantity}x ${i.name}`).join(", ") : "vacío"}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...((context.history ?? []).slice(-6) as ChatMessage[]),
      { role: "user", content: messageText },
    ];

    response = await chatCompletion(messages);
  }

  // Keep conversation history (last 10 messages)
  if (!context.history) context.history = [];
  context.history.push({ role: "user", content: messageText });
  context.history.push({ role: "assistant", content: response });
  if (context.history.length > 20) context.history = context.history.slice(-20);

  // Save conversation state
  await saveConversation(schema, fromPhone, state, context, context.customerId);

  // Log outbound message
  await logMessage(schema, fromPhone, "outbound", response);

  return response;
}
