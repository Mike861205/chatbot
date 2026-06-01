import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (slug: string, email: string, password: string) =>
    api.post("/auth/login", { slug, email, password }),
  superLogin: (email: string, password: string) =>
    api.post("/auth/super/login", { email, password }),
  me: () => api.get("/auth/me"),
  listTenants: () => api.get("/auth/tenants"),
  createTenant: (data: unknown) => api.post("/auth/tenants", data),
  updateTenant: (id: string, data: unknown) =>
    api.put(`/auth/tenants/${id}`, data),
  listUsers: () => api.get("/auth/users"),
  createUser: (data: unknown) => api.post("/auth/users", data),
  changePassword: (data: unknown) => api.put("/auth/password", data),
};

// ─── Menu ──────────────────────────────────────────────────────────────────────
export const menuApi = {
  getConfig: () => api.get("/menu/config"),
  updateConfig: (data: unknown) => api.put("/menu/config", data),
  getCategories: () => api.get("/menu/categories"),
  createCategory: (data: unknown) => api.post("/menu/categories", data),
  updateCategory: (id: string, data: unknown) =>
    api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/menu/categories/${id}`),
  getItems: (categoryId?: string) =>
    api.get("/menu/items", { params: categoryId ? { categoryId } : undefined }),
  createItem: (data: unknown) => api.post("/menu/items", data),
  updateItem: (id: string, data: unknown) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/menu/items/${id}`),
  getFullMenu: () => api.get("/menu/full"),
};

// ─── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  getStats: () => api.get("/orders/stats"),
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get("/orders", { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, data: unknown) =>
    api.patch(`/orders/${id}/status`, data),
};

// ─── Customers ─────────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params?: { search?: string; limit?: number; offset?: number }) =>
    api.get("/customers", { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  getOrders: (id: string) => api.get(`/customers/${id}/orders`),
};
