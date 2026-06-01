import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Tenant } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  isSuperAdmin: boolean;
  setAuth: (
    token: string,
    user: User,
    tenant?: Tenant,
    isSuperAdmin?: boolean,
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      isSuperAdmin: false,
      setAuth: (token, user, tenant, isSuperAdmin = false) =>
        set({ token, user, tenant, isSuperAdmin }),
      logout: () =>
        set({ token: null, user: null, tenant: null, isSuperAdmin: false }),
    }),
    { name: "auth-storage" },
  ),
);
