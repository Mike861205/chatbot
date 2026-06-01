import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Building2, ToggleLeft, ToggleRight, Users } from "lucide-react";
import { authApi } from "../services/api";
import { Tenant } from "../types";
import { format } from "date-fns";

export default function SuperAdmin() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const qc = useQueryClient();

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: () => authApi.listTenants().then((r) => r.data),
  });

  const toggleTenant = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      authApi.updateTenant(id, { isActive }),
    onSuccess: () => {
      toast.success("Tenant actualizado");
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });

  const planColors: Record<string, string> = {
    basic: "bg-gray-100 text-gray-600",
    pro: "bg-blue-100 text-blue-700",
    enterprise: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🛡️ Super Admin
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestión de tenants del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo restaurante
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">{tenants.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total restaurantes</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">
            {tenants.filter((t) => t.is_active).length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Activos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">
            {tenants.filter((t) => t.whatsapp_phone_number).length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Con WhatsApp configurado</p>
        </div>
      </div>

      {/* Tenants table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-6 py-3 font-medium">Restaurante</th>
              <th className="px-6 py-3 font-medium">Slug</th>
              <th className="px-6 py-3 font-medium">WhatsApp</th>
              <th className="px-6 py-3 font-medium">Plan</th>
              <th className="px-6 py-3 font-medium">Creado</th>
              <th className="px-6 py-3 font-medium">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Building2 size={16} className="text-purple-600" />
                    </div>
                    <p className="font-medium">{tenant.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {tenant.slug}
                  </code>
                </td>
                <td className="px-6 py-4 font-mono text-xs">
                  {tenant.whatsapp_phone_number ?? (
                    <span className="text-gray-300">No configurado</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`badge ${planColors[tenant.plan] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {tenant.plan}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                  {format(new Date(tenant.created_at), "dd/MM/yyyy")}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      toggleTenant.mutate({
                        id: tenant.id,
                        isActive: !tenant.is_active,
                      })
                    }
                    className={
                      tenant.is_active ? "text-green-500" : "text-gray-300"
                    }
                  >
                    {tenant.is_active ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-gray-400"
                >
                  No hay restaurantes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateForm && (
        <CreateTenantModal
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["tenants"] });
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminPassword: "",
    adminName: "",
    whatsappPhone: "",
    plan: "basic",
  });
  const [loading, setLoading] = useState(false);

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const create = async () => {
    if (
      !form.name ||
      !form.slug ||
      !form.adminEmail ||
      !form.adminPassword ||
      !form.adminName
    ) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      await authApi.createTenant(form);
      toast.success(`Restaurante "${form.name}" creado exitosamente`);
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      toast.error(msg ?? "Error al crear restaurante");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-lg">Nuevo restaurante</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Información del restaurante
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              className="input"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: autoSlug(e.target.value),
                })
              }
              placeholder="Tacos El Gordo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *{" "}
              <span className="text-gray-400 font-normal">
                (identificador único)
              </span>
            </label>
            <input
              className="input font-mono"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: autoSlug(e.target.value) })
              }
              placeholder="tacos-el-gordo"
            />
            <p className="text-xs text-gray-400 mt-1">
              Solo letras, números y guiones
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp (opcional)
            </label>
            <input
              className="input"
              value={form.whatsappPhone}
              onChange={(e) =>
                setForm({ ...form, whatsappPhone: e.target.value })
              }
              placeholder="+521234567890"
            />
          </div>

          <hr />
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Administrador
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del admin *
            </label>
            <input
              className="input"
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              className="input"
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña *
            </label>
            <input
              className="input"
              type="password"
              value={form.adminPassword}
              onChange={(e) =>
                setForm({ ...form, adminPassword: e.target.value })
              }
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-primary flex-1"
              onClick={create}
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear restaurante"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
