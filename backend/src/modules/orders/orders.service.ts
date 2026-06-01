import { tenantQuery, tenantQueryOne } from "../../db/pool";

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: Array<{ group: string; option: string; delta: number }>;
  lineTotal: number;
  notes?: string;
}

export async function createOrder(
  schema: string,
  data: {
    customerId: string;
    items: CartItem[];
    type: "delivery" | "pickup";
    deliveryAddress?: string;
    notes?: string;
    deliveryFee?: number;
  },
) {
  const subtotal = data.items.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryFee = data.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  const [order] = await tenantQuery<{ id: string; order_number: number }>(
    schema,
    `INSERT INTO orders
       (customer_id, status, type, subtotal, delivery_fee, total,
        delivery_address, notes)
     VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7)
     RETURNING id, order_number`,
    [
      data.customerId,
      data.type,
      subtotal,
      deliveryFee,
      total,
      data.deliveryAddress ?? null,
      data.notes ?? null,
    ],
  );

  // Insert order items
  for (const item of data.items) {
    await tenantQuery(
      schema,
      `INSERT INTO order_items
         (order_id, item_id, item_name, item_price, quantity, modifiers, line_total, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        order.id,
        item.itemId,
        item.name,
        item.price,
        item.quantity,
        JSON.stringify(item.modifiers),
        item.lineTotal,
        item.notes ?? null,
      ],
    );
  }

  // Update customer stats
  await tenantQuery(
    schema,
    `UPDATE customers
     SET order_count = order_count + 1,
         total_spent = total_spent + $1,
         updated_at = NOW()
     WHERE id = $2`,
    [total, data.customerId],
  );

  return { ...order, subtotal, deliveryFee, total };
}

export async function getOrders(
  schema: string,
  opts?: {
    status?: string;
    limit?: number;
    offset?: number;
    customerId?: string;
  },
) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (opts?.status) {
    conditions.push(`o.status = $${idx++}`);
    values.push(opts.status);
  }
  if (opts?.customerId) {
    conditions.push(`o.customer_id = $${idx++}`);
    values.push(opts.customerId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  values.push(limit, offset);

  return tenantQuery(
    schema,
    `SELECT o.*, c.name as customer_name, c.phone as customer_phone
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  );
}

export async function getOrderById(schema: string, id: string) {
  const order = await tenantQueryOne(
    schema,
    `SELECT o.*, c.name as customer_name, c.phone as customer_phone
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1`,
    [id],
  );
  if (!order) return null;

  const items = await tenantQuery(
    schema,
    "SELECT * FROM order_items WHERE order_id = $1",
    [id],
  );

  return { ...order, items };
}

export async function updateOrderStatus(
  schema: string,
  id: string,
  status: "confirmed" | "preparing" | "ready" | "delivered" | "cancelled",
  extra?: { cancellationReason?: string; estimatedTimeMin?: number },
) {
  const timestampCol: Record<string, string> = {
    confirmed: "confirmed_at",
    ready: "ready_at",
    delivered: "delivered_at",
    cancelled: "cancelled_at",
  };

  const fields = [`status = $1`, `updated_at = NOW()`];
  const values: unknown[] = [status];
  let idx = 2;

  if (timestampCol[status]) {
    fields.push(`${timestampCol[status]} = NOW()`);
  }
  if (extra?.cancellationReason && status === "cancelled") {
    fields.push(`cancellation_reason = $${idx++}`);
    values.push(extra.cancellationReason);
  }
  if (extra?.estimatedTimeMin !== undefined) {
    fields.push(`estimated_time_min = $${idx++}`);
    values.push(extra.estimatedTimeMin);
  }
  values.push(id);

  await tenantQuery(
    schema,
    `UPDATE orders SET ${fields.join(", ")} WHERE id = $${idx}`,
    values,
  );
}

export async function getOrderStats(schema: string) {
  const [stats] = await tenantQuery<{
    total_orders: string;
    pending: string;
    confirmed: string;
    preparing: string;
    ready: string;
    delivered: string;
    cancelled: string;
    revenue_today: string;
    revenue_month: string;
  }>(
    schema,
    `SELECT
       COUNT(*) as total_orders,
       COUNT(*) FILTER (WHERE status = 'pending') as pending,
       COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
       COUNT(*) FILTER (WHERE status = 'preparing') as preparing,
       COUNT(*) FILTER (WHERE status = 'ready') as ready,
       COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
       COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
       COALESCE(SUM(total) FILTER (
         WHERE status = 'delivered' AND created_at >= CURRENT_DATE
       ), 0) as revenue_today,
       COALESCE(SUM(total) FILTER (
         WHERE status = 'delivered'
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
       ), 0) as revenue_month
     FROM orders`,
  );
  return stats;
}
