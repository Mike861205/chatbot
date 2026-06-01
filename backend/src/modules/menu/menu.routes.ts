import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { tenantContext } from "../../middleware/tenant";
import {
  handleGetConfig,
  handleUpdateConfig,
  handleGetCategories,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleGetItems,
  handleGetItem,
  handleCreateItem,
  handleUpdateItem,
  handleDeleteItem,
  handleGetFullMenu,
} from "./menu.controller";

const router = Router();
const guard = [authenticate, tenantContext];
const adminGuard = [
  authenticate,
  tenantContext,
  requireRole("admin", "manager"),
];

// Restaurant config
router.get("/config", ...guard, handleGetConfig);
router.put("/config", ...adminGuard, handleUpdateConfig);

// Full menu (for chatbot / public use)
router.get("/full", ...guard, handleGetFullMenu);

// Categories
router.get("/categories", ...guard, handleGetCategories);
router.post("/categories", ...adminGuard, handleCreateCategory);
router.put("/categories/:id", ...adminGuard, handleUpdateCategory);
router.delete("/categories/:id", ...adminGuard, handleDeleteCategory);

// Items
router.get("/items", ...guard, handleGetItems);
router.get("/items/:id", ...guard, handleGetItem);
router.post("/items", ...adminGuard, handleCreateItem);
router.put("/items/:id", ...adminGuard, handleUpdateItem);
router.delete("/items/:id", ...adminGuard, handleDeleteItem);

export default router;
