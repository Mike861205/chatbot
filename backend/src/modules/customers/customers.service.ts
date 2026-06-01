import { tenantQuery, tenantQueryOne } from "../../db/pool";

export async function upsertCustomer(
  schema: string,
  phone: string,
  data?: { name?: string; email?: string; address?: string },
) {
  const existing = await tenantQueryOne<{ id: string }>(
    schema,
    "SELECT id FROM customers WHERE phone = $1",
    [phone],
  );

  if (existing) {
    if (data && Object.keys(data).length > 0) {
      const fields: string[] = ["updated_at = NOW()"];
      const values: unknown[] = [];
      let idx = 1;
      if (data.name) {
        fields.unshift(`name = $${idx++}`);
        values.push(data.name);
      }
      if (data.email) {
        fields.push(`email = $${idx++}`);
        values.push(data.email);
      }
      if (data.address) {
        fields.push(`address = $${idx++}`);
        values.push(data.address);
      }
      values.push(existing.id);
      await tenantQuery(
        schema,
        `UPDATE customers SET ${fields.join(", ")} WHERE id = $${idx}`,
        values,
      );
    }
    return existing.id;
  }

  const [customer] = await tenantQuery<{ id: string }>(
    schema,
    `INSERT INTO customers (phone, name, email, address) VALUES ($1, $2, $3, $4) RETURNING id`,
    [phone, data?.name ?? null, data?.email ?? null, data?.address ?? null],
  );
  return customer.id;
}

export async function getCustomers(
  schema: string,
  opts?: { limit?: number; offset?: number; search?: string },
) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (opts?.search) {
    conditions.push(
      `(name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`,
    );
    values.push(`%${opts.search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  values.push(limit, offset);

  return tenantQuery(
    schema,
    `SELECT * FROM customers ${where}
     ORDER BY order_count DESC, created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  );
}

export async function getCustomerById(schema: string, id: string) {
  return tenantQueryOne(schema, "SELECT * FROM customers WHERE id = $1", [id]);
}

export async function getCustomerByPhone(schema: string, phone: string) {
  return tenantQueryOne(schema, "SELECT * FROM customers WHERE phone = $1", [
    phone,
  ]);
}

export async function getCustomerOrders(schema: string, customerId: string) {
  return tenantQuery(
    schema,
    `SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId],
  );
}
