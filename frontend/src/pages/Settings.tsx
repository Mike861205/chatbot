import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Store, MessageSquare, Webhook } from 'lucide-react';
import { menuApi, authApi } from '../services/api';
import { RestaurantConfig } from '../types';
import { useAuthStore } from '../store/authStore';

export default function Settings() {
  const tenant = useAuthStore((s) => s.tenant);

  const { data: config, isLoading } = useQuery<RestaurantConfig>({
    queryKey: ['restaurant-config'],
    queryFn: () => menuApi.getConfig().then((r) => r.data),
  });

  const [restaurantForm, setRestaurantForm] = useState<Partial<RestaurantConfig>>({});
  const [waForm, setWaForm] = useState({
    whatsapp_phone_number: tenant?.whatsapp_phone_number ?? '',
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_verify_token: '',
  });

  useEffect(() => {
    if (config) setRestaurantForm(config);
  }, [config]);

  const saveConfig = useMutation({
    mutationFn: () => menuApi.updateConfig(restaurantForm),
    onSuccess: () => toast.success('Configuración guardada'),
    onError: () => toast.error('Error al guardar'),
  });

  const saveWhatsApp = useMutation({
    mutationFn: () => authApi.updateTenant(tenant!.id, {
      whatsapp_phone_number: waForm.whatsapp_phone_number,
      whatsapp_access_token: waForm.whatsapp_access_token || undefined,
      whatsapp_phone_number_id: waForm.whatsapp_phone_number_id || undefined,
      whatsapp_verify_token: waForm.whatsapp_verify_token || undefined,
    }),
    onSuccess: () => {
      toast.success('WhatsApp configurado');
    },
    onError: () => toast.error('Error al guardar configuración de WhatsApp'),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Cargando...</div>;

  const rf = restaurantForm;
  const set = (k: keyof RestaurantConfig, v: unknown) =>
    setRestaurantForm((prev) => ({ ...prev, [k]: v }));

  const webhookUrl = `${window.location.protocol}//${window.location.hostname}/api/whatsapp/webhook`;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Ajusta los datos de tu restaurante y la integración con WhatsApp</p>
      </div>

      {/* Restaurant Info */}
      <section className="card mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Store size={18} className="text-purple-600" />
          <h2 className="font-semibold text-lg">Información del Restaurante</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Restaurante</label>
              <input className="input" value={rf.restaurant_name ?? ''} onChange={(e) => set('restaurant_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
              <input className="input" value={rf.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
            <input className="input" value={rf.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
              <input className="input" value={rf.currency ?? ''} onChange={(e) => set('currency', e.target.value)} placeholder="USD" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Símbolo</label>
              <input className="input" value={rf.currency_symbol ?? ''} onChange={(e) => set('currency_symbol', e.target.value)} placeholder="$" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cargo de envío</label>
              <input type="number" className="input" value={rf.delivery_fee ?? 0} onChange={(e) => set('delivery_fee', +e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pedido mínimo</label>
              <input type="number" className="input" value={rf.min_order_amount ?? 0} onChange={(e) => set('min_order_amount', +e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Distancia máx. entrega (km)</label>
              <input type="number" className="input" value={rf.max_delivery_distance_km ?? 0} onChange={(e) => set('max_delivery_distance_km', +e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="accepting"
              className="w-4 h-4 accent-purple-600"
              checked={rf.is_accepting_orders ?? true}
              onChange={(e) => set('is_accepting_orders', e.target.checked)}
            />
            <label htmlFor="accepting" className="text-sm text-gray-700 cursor-pointer">Aceptando pedidos</label>
          </div>
        </div>
        <div className="flex justify-end mt-5 pt-4 border-t">
          <button className="btn-primary flex items-center gap-2" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
            <Save size={16} />
            {saveConfig.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>

      {/* Chatbot Messages */}
      <section className="card mb-6">
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare size={18} className="text-purple-600" />
          <h2 className="font-semibold text-lg">Mensajes del Chatbot</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje de bienvenida</label>
            <textarea className="input resize-none" rows={3} value={rf.welcome_message ?? ''} onChange={(e) => set('welcome_message', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje de despedida</label>
            <textarea className="input resize-none" rows={2} value={rf.goodbye_message ?? ''} onChange={(e) => set('goodbye_message', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Personalidad del chatbot</label>
            <input className="input" value={rf.chatbot_personality ?? ''} onChange={(e) => set('chatbot_personality', e.target.value)} placeholder="amigable y profesional" />
          </div>
        </div>
        <div className="flex justify-end mt-5 pt-4 border-t">
          <button className="btn-primary flex items-center gap-2" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
            <Save size={16} />
            {saveConfig.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="card">
        <div className="flex items-center gap-2 mb-5">
          <Webhook size={18} className="text-green-600" />
          <h2 className="font-semibold text-lg">Integración WhatsApp</h2>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm text-blue-700">
          <p className="font-medium mb-1">URL del Webhook (configura en Meta Developers):</p>
          <code className="text-xs bg-blue-100 px-2 py-1 rounded break-all">{webhookUrl}</code>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Número de teléfono WhatsApp</label>
            <input className="input" value={waForm.whatsapp_phone_number} onChange={(e) => setWaForm({ ...waForm, whatsapp_phone_number: e.target.value })} placeholder="+52155..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number ID (Meta)</label>
            <input className="input" value={waForm.whatsapp_phone_number_id} onChange={(e) => setWaForm({ ...waForm, whatsapp_phone_number_id: e.target.value })} placeholder="123456789..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Access Token (Meta)</label>
            <input type="password" className="input" value={waForm.whatsapp_access_token} onChange={(e) => setWaForm({ ...waForm, whatsapp_access_token: e.target.value })} placeholder="EAAxxxx..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Verify Token (Meta Webhook)</label>
            <input className="input" value={waForm.whatsapp_verify_token} onChange={(e) => setWaForm({ ...waForm, whatsapp_verify_token: e.target.value })} placeholder="token-secreto" />
          </div>
        </div>
        <div className="flex justify-end mt-5 pt-4 border-t">
          <button className="btn-primary flex items-center gap-2" onClick={() => saveWhatsApp.mutate()} disabled={saveWhatsApp.isPending}>
            <Save size={16} />
            {saveWhatsApp.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>
    </div>
  );
}
