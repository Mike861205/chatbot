import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { tenantContext } from "../../middleware/tenant";
import {
  handleGetOrders,
  handleGetOrder,
  handleUpdateStatus,
  handleGetStats,
} from "./orders.controller";

const router = Router();
const guard = [authenticate, tenantContext];
const manageGuard = [
  authenticate,
  tenantContext,
  requireRole("admin", "manager"),
];

router.get("/stats", ...guard, handleGetStats);
router.get("/", ...guard, handleGetOrders);
router.get("/:id", ...guard, handleGetOrder);
router.patch("/:id/status", ...manageGuard, handleUpdateStatus);

export default router;
