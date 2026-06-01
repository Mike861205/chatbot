import { tenantQuery, tenantQueryOne } from "../../db/pool";

// ─── Restaurant Config ─────────────────────────────────────────────────────────

export async function getRestaurantConfig(schema: string) {
  return tenantQueryOne(schema, "SELECT * FROM restaurant_config LIMIT 1");
}

export async function updateRestaurantConfig(
  schema: string,
  data: Record<string, unknown>,
) {
  const allowed = [
    "restaurant_name",
    "address",
    "phone",
    "email",
    "logo_url",
    "welcome_message",
    "goodbye_message",
    "timezone",
    "currency",
    "currency_symbol",
    "opening_hours",
    "is_accepting_orders",
    "min_order_amount",
    "delivery_fee",
    "max_delivery_distance_km",
    "chatbot_personality",
  ];
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  await tenantQuery(
    schema,
    `UPDATE restaurant_config SET ${fields.join(", ")}`,
    values,
  );
}

// ─── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(schema: string, activeOnly = false) {
  const where = activeOnly ? "WHERE is_active = true" : "";
  return tenantQuery(
    schema,
    `SELECT * FROM menu_categories ${where} ORDER BY display_order, name`,
  );
}

export async function createCategory(
  schema: string,
  data: {
    name: string;
    description?: string;
    emoji?: string;
    displayOrder?: number;
  },
) {
  const [cat] = await tenantQuery<{ id: string }>(
    schema,
    `INSERT INTO menu_categories (name, description, emoji, display_order)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      data.name,
      data.description ?? null,
      data.emoji ?? null,
      data.displayOrder ?? 0,
    ],
  );
  return cat;
}

export async function updateCategory(
  schema: string,
  id: string,
  data: {
    name?: string;
    description?: string;
    emoji?: string;
    displayOrder?: number;
    isActive?: boolean;
  },
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(data.description);
  }
  if (data.emoji !== undefined) {
    fields.push(`emoji = $${idx++}`);
    values.push(data.emoji);
  }
  if (data.displayOrder !== undefined) {
    fields.push(`display_order = $${idx++}`);
    values.push(data.displayOrder);
  }
  if (data.isActive !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(data.isActive);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  values.push(id);
  await tenantQuery(
    schema,
    `UPDATE menu_categories SET ${fields.join(", ")} WHERE id = $${idx}`,
    values,
  );
}

export async function deleteCategory(schema: string, id: string) {
  await tenantQuery(schema, "DELETE FROM menu_categories WHERE id = $1", [id]);
}

// ─── Menu Items ────────────────────────────────────────────────────────────────

export async function getMenuItems(
  schema: string,
  opts?: { categoryId?: string; activeOnly?: boolean },
) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (opts?.categoryId) {
    conditions.push(`i.category_id = $${idx++}`);
    values.push(opts.categoryId);
  }
  if (opts?.activeOnly) {
    conditions.push(`i.is_active = true`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return tenantQuery(
    schema,
    `SELECT i.*, c.name as category_name, c.emoji as category_emoji
     FROM menu_items i
     LEFT JOIN menu_categories c ON c.id = i.category_id
     ${where}
     ORDER BY i.display_order, i.name`,
    values,
  );
}

export async function getMenuItemById(schema: string, id: string) {
  return tenantQueryOne(
    schema,
    `SELECT i.*, c.name as category_name
     FROM menu_items i
     LEFT JOIN menu_categories c ON c.id = i.category_id
     WHERE i.id = $1`,
    [id],
  );
}

export async function createMenuItem(
  schema: string,
  data: {
    categoryId?: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isFeatured?: boolean;
    preparationTimeMin?: number;
    tags?: string[];
    displayOrder?: number;
  },
) {
  const [item] = await tenantQuery<{ id: string }>(
    schema,
    `INSERT INTO menu_items
       (category_id, name, description, price, image_url, is_featured,
        preparation_time_min, tags, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      data.categoryId ?? null,
      data.name,
      data.description ?? null,
      data.price,
      data.imageUrl ?? null,
      data.isFeatured ?? false,
      data.preparationTimeMin ?? 15,
      data.tags ?? [],
      data.displayOrder ?? 0,
    ],
  );
  return item;
}

export async function updateMenuItem(
  schema: string,
  id: string,
  data: Record<string, unknown>,
) {
  const allowed: Record<string, string> = {
    categoryId: "category_id",
    name: "name",
    description: "description",
    price: "price",
    imageUrl: "image_url",
    isActive: "is_active",
    isFeatured: "is_featured",
    preparationTimeMin: "preparation_time_min",
    tags: "tags",
    displayOrder: "display_order",
  };
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [key, col] of Object.entries(allowed)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  values.push(id);
  await tenantQuery(
    schema,
    `UPDATE menu_items SET ${fields.join(", ")} WHERE id = $${idx}`,
    values,
  );
}

export async function deleteMenuItem(schema: string, id: string) {
  await tenantQuery(schema, "DELETE FROM menu_items WHERE id = $1", [id]);
}

// ─── Full Menu (for chatbot) ───────────────────────────────────────────────────

export async function getFullMenu(schema: string) {
  const categories = await getCategories(schema, true);
  const items = await getMenuItems(schema, { activeOnly: true });

  return categories.map((cat: Record<string, unknown>) => ({
    ...cat,
    items: items.filter(
      (item: Record<string, unknown>) => item.category_id === cat.id,
    ),
  }));
}
