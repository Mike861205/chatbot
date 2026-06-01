import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
} from "./orders.service";

export async function handleGetOrders(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const orders = await getOrders(req.user!.tenantSchema!, {
    status: req.query.status as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
  });
  res.json(orders);
}

export async function handleGetOrder(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const order = await getOrderById(req.user!.tenantSchema!, req.params.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
}

export async function handleUpdateStatus(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const bodySchema = z.object({
    status: z.enum([
      "confirmed",
      "preparing",
      "ready",
      "delivered",
      "cancelled",
    ]),
    cancellationReason: z.string().optional(),
    estimatedTimeMin: z.number().optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  await updateOrderStatus(
    req.user!.tenantSchema!,
    req.params.id,
    parsed.data.status,
    {
      cancellationReason: parsed.data.cancellationReason,
      estimatedTimeMin: parsed.data.estimatedTimeMin,
    },
  );
  res.json({ success: true });
}

export async function handleGetStats(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const stats = await getOrderStats(req.user!.tenantSchema!);
  res.json(stats);
}
