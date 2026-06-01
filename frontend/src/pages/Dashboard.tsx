import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Truck,
} from "lucide-react";
import { ordersApi, customersApi } from "../services/api";
import { OrderStats, Order } from "../types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "../store/authStore";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  preparing: {
    label: "Preparando",
    color: "bg-orange-100 text-orange-700",
    icon: ChefHat,
  },
  ready: {
    label: "Listo",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  delivered: {
    label: "Entregado",
    color: "bg-gray-100 text-gray-600",
    icon: Truck,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-600",
    icon: XCircle,
  },
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const tenant = useAuthStore((s) => s.tenant);

  const { data: stats } = useQuery<OrderStats>({
    queryKey: ["order-stats"],
    queryFn: () => ordersApi.getStats().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: recentOrders } = useQuery<Order[]>({
    queryKey: ["recent-orders"],
    queryFn: () => ordersApi.list({ limit: 10 }).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: customers } = useQuery<unknown[]>({
    queryKey: ["customers-count"],
    queryFn: () => customersApi.list({ limit: 1 }).then((r) => r.data),
  });

  const currency = "$";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {tenant?.name ?? "Panel de administración"} —{" "}
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Ingresos hoy"
          value={`${currency}${parseFloat(stats?.revenue_today ?? "0").toFixed(2)}`}
          icon={TrendingUp}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Pedidos pendientes"
          value={stats?.pending ?? 0}
          icon={Clock}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Total pedidos"
          value={stats?.total_orders ?? 0}
          icon={ShoppingBag}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Ingresos del mes"
          value={`${currency}${parseFloat(stats?.revenue_month ?? "0").toFixed(2)}`}
          icon={Users}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {Object.entries(statusConfig).map(([key, { label, color }]) => (
          <div key={key} className="card text-center py-4">
            <p className="text-2xl font-bold">
              {(stats as Record<string, string> | undefined)?.[key] ?? 0}
            </p>
            <span className={`badge mt-1 ${color}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Pedidos recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders?.map((order) => {
                const s = statusConfig[order.status];
                const Icon = s?.icon ?? Clock;
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 font-mono font-medium text-purple-600">
                      #{order.order_number}
                    </td>
                    <td className="py-3">
                      <p className="font-medium">
                        {order.customer_name ?? "Sin nombre"}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {order.customer_phone}
                      </p>
                    </td>
                    <td className="py-3 font-semibold">
                      {currency}
                      {Number(order.total).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className={`badge gap-1 ${s?.color ?? ""}`}>
                        <Icon size={12} />
                        {s?.label}
                      </span>
                    </td>
                    <td className="py-3 capitalize text-gray-600">
                      {order.type === "delivery"
                        ? "🚚 Domicilio"
                        : "🏪 Recoger"}
                    </td>
                    <td className="py-3 text-gray-400 text-xs">
                      {format(new Date(order.created_at), "dd/MM HH:mm")}
                    </td>
                  </tr>
                );
              })}
              {!recentOrders?.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No hay pedidos recientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
