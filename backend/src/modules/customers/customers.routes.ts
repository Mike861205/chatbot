import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { tenantContext } from "../../middleware/tenant";
import {
  handleGetCustomers,
  handleGetCustomer,
  handleGetCustomerOrders,
} from "./customers.controller";

const router = Router();
const guard = [authenticate, tenantContext];

router.get("/", ...guard, handleGetCustomers);
router.get("/:id", ...guard, handleGetCustomer);
router.get("/:id/orders", ...guard, handleGetCustomerOrders);

export default router;
