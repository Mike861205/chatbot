import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Tag, List } from 'lucide-react';
import { menuApi } from '../services/api';
import { MenuItem, MenuCategory } from '../types';

// ─── Category Modal ───────────────────────────────────────────────────────────
function CategoryModal({
  initial,
  onClose,
}: {
  initial?: MenuCategory;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    emoji: initial?.emoji ?? '',
    display_order: initial?.display_order ?? 0,
  });

  const save = useMutation({
    mutationFn: () =>
      initial
        ? menuApi.updateCategory(initial.id, form)
        : menuApi.createCategory(form),
    onSuccess: () => {
      toast.success(initial ? 'Categoría actualizada' : 'Categoría creada');
      qc.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
    onError: () => toast.error('Error al guardar categoría'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-lg">{initial ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Emoji</label>
              <input className="input text-center text-2xl" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🍕" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Pizzas" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Orden de presentación</label>
            <input type="number" className="input" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: +e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Item Modal ───────────────────────────────────────────────────────────────
function ItemModal({
  initial,
  categories,
  onClose,
}: {
  initial?: MenuItem;
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    category_id: initial?.category_id ?? '',
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    price: initial?.price ?? 0,
    is_active: initial?.is_active ?? true,
    is_featured: initial?.is_featured ?? false,
    preparation_time_min: initial?.preparation_time_min ?? 15,
    display_order: initial?.display_order ?? 0,
  });

  const save = useMutation({
    mutationFn: () =>
      initial ? menuApi.updateItem(initial.id, form) : menuApi.createItem(form),
    onSuccess: () => {
      toast.success(initial ? 'Ítem actualizado' : 'Ítem creado');
      qc.invalidateQueries({ queryKey: ['items'] });
      onClose();
    },
    onError: () => toast.error('Error al guardar ítem'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-lg">{initial ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Pizza Margarita" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ingredientes, tamaños..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio *</label>
              <input type="number" step="0.01" min="0" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tiempo prep. (min)</label>
              <input type="number" min="0" className="input" value={form.preparation_time_min} onChange={(e) => setForm({ ...form, preparation_time_min: +e.target.value })} />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <span className="text-sm text-gray-700">Activo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
              <span className="text-sm text-gray-700">Destacado</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = 'items' | 'categories';

export default function Menu() {
  const [tab, setTab] = useState<Tab>('items');
  const [editItem, setEditItem] = useState<MenuItem | undefined>();
  const [editCat, setEditCat] = useState<MenuCategory | undefined>();
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const qc = useQueryClient();

  const { data: items = [], isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ['items'],
    queryFn: () => menuApi.getItems().then((r) => r.data),
  });

  const { data: categories = [], isLoading: loadingCats } = useQuery<MenuCategory[]>({
    queryKey: ['categories'],
    queryFn: () => menuApi.getCategories().then((r) => r.data),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => menuApi.deleteItem(id),
    onSuccess: () => { toast.success('Producto eliminado'); qc.invalidateQueries({ queryKey: ['items'] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  const deleteCat = useMutation({
    mutationFn: (id: string) => menuApi.deleteCategory(id),
    onSuccess: () => { toast.success('Categoría eliminada'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  const toggleItem = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      menuApi.updateItem(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Menú</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona productos y categorías de tu menú</p>
        </div>
        <button
          onClick={() => { setEditItem(undefined); setEditCat(undefined); tab === 'items' ? setShowItemModal(true) : setShowCatModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          {tab === 'items' ? 'Nuevo producto' : 'Nueva categoría'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {(['items', 'categories'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'items' ? <Tag size={14} /> : <List size={14} />}
            {t === 'items' ? 'Productos' : 'Categorías'}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === 'items' && (
        loadingItems ? (
          <div className="text-center py-20 text-gray-400">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Tag size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay productos todavía</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className={`card transition-opacity ${item.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{item.name}</p>
                      {item.is_featured && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">⭐</span>}
                    </div>
                    {item.category_name && (
                      <p className="text-xs text-purple-500 mt-0.5">{item.category_emoji} {item.category_name}</p>
                    )}
                  </div>
                  <span className="font-bold text-lg text-gray-900 ml-3 flex-shrink-0">${Number(item.price).toFixed(2)}</span>
                </div>
                {item.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => toggleItem.mutate({ id: item.id, is_active: !item.is_active })}
                    className="text-gray-400 hover:text-purple-600 transition-colors"
                    title={item.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {item.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => { setEditItem(item); setShowItemModal(true); }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar "${item.name}"?`)) deleteItem.mutate(item.id); }}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Categories tab */}
      {tab === 'categories' && (
        loadingCats ? (
          <div className="text-center py-20 text-gray-400">Cargando...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <List size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay categorías todavía</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{cat.emoji || '📋'}</span>
                  <div>
                    <p className="font-semibold">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => { setEditCat(cat); setShowCatModal(true); }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar categoría "${cat.name}"?`)) deleteCat.mutate(cat.id); }}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showItemModal && (
        <ItemModal
          initial={editItem}
          categories={categories}
          onClose={() => { setShowItemModal(false); setEditItem(undefined); }}
        />
      )}
      {showCatModal && (
        <CategoryModal
          initial={editCat}
          onClose={() => { setShowCatModal(false); setEditCat(undefined); }}
        />
      )}
    </div>
  );
}
