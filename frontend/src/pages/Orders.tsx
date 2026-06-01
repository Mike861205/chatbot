import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Clock, ChefHat, CheckCircle, Truck, XCircle, Eye, RefreshCw } from 'lucide-react';
import { ordersApi } from '../services/api';
import { Order } from '../types';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; next?: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, next: 'confirmed' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle, next: 'preparing' },
  preparing: { label: 'Preparando', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: ChefHat, next: 'ready' },
  ready: { label: 'Listo', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, next: 'delivered' },
  delivered: { label: 'Entregado', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Truck },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-600 border-red-200', icon: XCircle },
};

const filters: StatusFilter[] = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
const filterLabels: Record<StatusFilter, string> = {
  all: 'Todos',
  pending: 'Pendientes',
  confirmed: 'Confirmados',
  preparing: 'Preparando',
  ready: 'Listos',
  delivered: 'Entregados',
  cancelled: 'Cancelados',
};

export default function Orders() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const qc = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ['orders', filter],
    queryFn: () =>
      ordersApi.list({ status: filter === 'all' ? undefined : filter, limit: 100 }).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona y actualiza el estado de los pedidos</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Orders grid */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => {
            const sc = statusConfig[order.status];
            const Icon = sc?.icon ?? Clock;
            const nextStatus = sc?.next;
            const nextSc = nextStatus ? statusConfig[nextStatus] : null;

            return (
              <div key={order.id} className="card hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-purple-600 font-mono font-bold">#{order.order_number}</span>
                    <p className="font-semibold mt-0.5">{order.customer_name ?? 'Sin nombre'}</p>
                    <p className="text-gray-400 text-xs">{order.customer_phone}</p>
                  </div>
                  <span className={`badge border ${sc?.color}`}>
                    <Icon size={12} className="mr-1" />
                    {sc?.label}
                  </span>
                </div>

                {/* Type & address */}
                <p className="text-sm text-gray-500 mb-2">
                  {order.type === 'delivery'
                    ? `🚚 ${order.delivery_address ?? 'Sin dirección'}`
                    : '🏪 Recoger en restaurante'}
                </p>

                {/* Total */}
                <div className="flex items-center justify-between py-2 border-t border-b border-gray-100 my-3">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="font-bold text-lg">${Number(order.total).toFixed(2)}</span>
                </div>

                {/* Time */}
                <p className="text-xs text-gray-400 mb-3">
                  {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-1 py-1.5 text-xs"
                  >
                    <Eye size={13} />
                    Detalle
                  </button>
                  {nextStatus && nextSc && (
                    <button
                      onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                      disabled={updateStatus.isPending}
                      className="btn-primary flex-1 text-xs py-1.5"
                    >
                      → {nextSc.label}
                    </button>
                  )}
                  {order.status === 'pending' && (
                    <button
                      onClick={() => {
                        if (confirm('¿Cancelar pedido?'))
                          updateStatus.mutate({ id: order.id, status: 'cancelled' });
                      }}
                      className="btn-danger py-1.5 px-3 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {orders.length === 0 && (
            <div className="col-span-3 py-20 text-center text-gray-400">
              No hay pedidos {filter !== 'all' ? `con estado "${filterLabels[filter]}"` : ''}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { data: detail } = useQuery<Order>({
    queryKey: ['order-detail', order.id],
    queryFn: () => ordersApi.get(order.id).then((r) => r.data),
  });

  const o = detail ?? order;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-lg">Pedido #{o.order_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-400">Cliente</p><p className="font-medium">{o.customer_name ?? '—'}</p></div>
            <div><p className="text-gray-400">Teléfono</p><p className="font-medium">{o.customer_phone ?? '—'}</p></div>
            <div><p className="text-gray-400">Tipo</p><p className="font-medium capitalize">{o.type}</p></div>
            <div><p className="text-gray-400">Estado</p><p className="font-medium">{statusConfig[o.status]?.label}</p></div>
            {o.delivery_address && <div className="col-span-2"><p className="text-gray-400">Dirección</p><p className="font-medium">{o.delivery_address}</p></div>}
            {o.notes && <div className="col-span-2"><p className="text-gray-400">Notas</p><p className="font-medium">{o.notes}</p></div>}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Artículo</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Cant.</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items?.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{item.item_name}</td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">${Number(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>${Number(o.subtotal).toFixed(2)}</span></div>
            {Number(o.delivery_fee) > 0 && <div className="flex justify-between text-gray-500"><span>Envío</span><span>${Number(o.delivery_fee).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${Number(o.total).toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
