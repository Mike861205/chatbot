import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import {
  getCustomers,
  getCustomerById,
  getCustomerOrders,
} from "./customers.service";

export async function handleGetCustomers(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const customers = await getCustomers(req.user!.tenantSchema!, {
    search: req.query.search as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
  });
  res.json(customers);
}

export async function handleGetCustomer(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const customer = await getCustomerById(
    req.user!.tenantSchema!,
    req.params.id,
  );
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(customer);
}

export async function handleGetCustomerOrders(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const orders = await getCustomerOrders(
    req.user!.tenantSchema!,
    req.params.id,
  );
  res.json(orders);
}
