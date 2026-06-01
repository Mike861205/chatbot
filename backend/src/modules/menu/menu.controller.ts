import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import {
  getRestaurantConfig,
  updateRestaurantConfig,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getFullMenu,
} from "./menu.service";

const schema = () => (req: AuthRequest) => req.user!.tenantSchema!;

// ─── Restaurant Config ─────────────────────────────────────────────────────────

export async function handleGetConfig(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const config = await getRestaurantConfig(req.user!.tenantSchema!);
  res.json(config);
}

export async function handleUpdateConfig(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  await updateRestaurantConfig(req.user!.tenantSchema!, req.body);
  res.json({ success: true });
}

// ─── Categories ────────────────────────────────────────────────────────────────

export async function handleGetCategories(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const cats = await getCategories(req.user!.tenantSchema!);
  res.json(cats);
}

export async function handleCreateCategory(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const bodySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    emoji: z.string().optional(),
    displayOrder: z.number().optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const cat = await createCategory(req.user!.tenantSchema!, parsed.data);
  res.status(201).json(cat);
}

export async function handleUpdateCategory(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  await updateCategory(req.user!.tenantSchema!, req.params.id, req.body);
  res.json({ success: true });
}

export async function handleDeleteCategory(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  await deleteCategory(req.user!.tenantSchema!, req.params.id);
  res.json({ success: true });
}

// ─── Menu Items ────────────────────────────────────────────────────────────────

export async function handleGetItems(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const items = await getMenuItems(req.user!.tenantSchema!, {
    categoryId: req.query.categoryId as string | undefined,
  });
  res.json(items);
}

export async function handleGetItem(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const item = await getMenuItemById(req.user!.tenantSchema!, req.params.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
}

export async function handleCreateItem(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const bodySchema = z.object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    imageUrl: z.string().url().optional(),
    isFeatured: z.boolean().optional(),
    preparationTimeMin: z.number().optional(),
    tags: z.array(z.string()).optional(),
    displayOrder: z.number().optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const item = await createMenuItem(req.user!.tenantSchema!, parsed.data);
  res.status(201).json(item);
}

export async function handleUpdateItem(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  await updateMenuItem(req.user!.tenantSchema!, req.params.id, req.body);
  res.json({ success: true });
}

export async function handleDeleteItem(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  await deleteMenuItem(req.user!.tenantSchema!, req.params.id);
  res.json({ success: true });
}

export async function handleGetFullMenu(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const menu = await getFullMenu(req.user!.tenantSchema!);
  res.json(menu);
}
