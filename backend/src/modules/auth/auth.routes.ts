import { Router } from "express";
import {
  authenticate,
  requireSuperAdmin,
  requireRole,
} from "../../middleware/auth";
import {
  handleSuperAdminLogin,
  handleTenantLogin,
  handleCreateTenant,
  handleListTenants,
  handleUpdateTenant,
  handleListUsers,
  handleCreateUser,
  handleChangePassword,
  handleMe,
} from "./auth.controller";

const router = Router();

// Public auth endpoints
router.post("/super/login", handleSuperAdminLogin);
router.post("/login", handleTenantLogin);

// Current user
router.get("/me", authenticate, handleMe);

// Super admin: tenant management
router.get("/tenants", authenticate, requireSuperAdmin, handleListTenants);
router.post("/tenants", authenticate, requireSuperAdmin, handleCreateTenant);
router.put("/tenants/:id", authenticate, requireSuperAdmin, handleUpdateTenant);

// Tenant admin: user management
router.get("/users", authenticate, requireRole("admin"), handleListUsers);
router.post("/users", authenticate, requireRole("admin"), handleCreateUser);
router.put("/password", authenticate, handleChangePassword);

export default router;
