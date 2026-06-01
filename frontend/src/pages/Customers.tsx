import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Phone, ShoppingBag, DollarSign, X } from 'lucide-react';
import { customersApi } from '../services/api';
import { Customer, Order } from '../types';
import { format } from 'date-fns';

function CustomerModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['customer-orders', customer.id],
    queryFn: () => customersApi.getOrders(customer.id).then((r) => r.data),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{customer.name ?? 'Sin nombre'}</h2>
              <p className="text-gray-400 text-sm">{customer.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-purple-600">{customer.order_count}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pedidos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">${Number(customer.total_spent).toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total gastado</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-700">
              ${customer.order_count > 0 ? (Number(customer.total_spent) / customer.order_count).toFixed(0) : '0'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Ticket promedio</p>
          </div>
        </div>

        {customer.address && (
          <div className="px-6 py-3 border-b">
            <p className="text-sm text-gray-500">📍 {customer.address}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Historial de pedidos</h3>
          {orders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Sin pedidos registrados</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <span className="text-purple-600 font-mono text-sm font-bold">#{order.order_number}</span>
                    <span className="ml-2 text-sm text-gray-600 capitalize">{order.status}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  <span className="font-semibold">${Number(order.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: () =>
      customersApi.list({ search: search || undefined, limit: 100 }).then((r) => r.data),
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">Directorio de clientes que han pedido via WhatsApp</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p>No se encontraron clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="card text-left hover:shadow-md hover:border-purple-200 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.name ?? 'Sin nombre'}</p>
                  <p className="text-gray-400 text-xs flex items-center gap-1">
                    <Phone size={10} />
                    {c.phone}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <ShoppingBag size={13} className="text-purple-400" />
                  <span>{c.order_count} pedidos</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <DollarSign size={13} className="text-green-400" />
                  <span>${Number(c.total_spent).toFixed(2)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
