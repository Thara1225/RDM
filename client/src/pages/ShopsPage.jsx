import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';
import useDebouncedValue from '../utils/useDebouncedValue';

const emptyForm = {
  name: '',
  shopCode: '',
  phone: '',
  address: '',
  notes: ''
};

export default function ShopsPage({ token }) {
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function loadShops(activeSearch = debouncedSearch) {
    setApiError('');
    setIsLoading(true);

    try {
      const params = { ...(activeSearch.trim() ? { q: activeSearch.trim() } : {}) };
      const response = await api.get('/shops', { params });
      setShops(response.data || []);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load shops'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadShops(debouncedSearch);
  }, [debouncedSearch, token]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  }

  function openEditModal(shop) {
    setEditingId(shop.id);
    setForm({
      name: shop.name || '',
      shopCode: shop.shopCode || '',
      phone: shop.phone || '',
      address: shop.address || '',
      notes: shop.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
    setFormError('');
  }

  async function saveShop(event) {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Shop name is required');
      return;
    }

    if (!form.shopCode.trim()) {
      setFormError('Shop code is required');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        shopCode: form.shopCode.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null
      };

      if (editingId) {
        await api.put(`/shops/${editingId}`, payload);
      } else {
        await api.post('/shops', payload);
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      await loadShops();
    } catch (error) {
      setFormError(getApiError(error, 'Failed to save shop'));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteShop(shop) {
    const ok = window.confirm(`Delete shop "${shop.name}"?`);
    if (!ok) {
      return;
    }

    setApiError('');
    try {
      await api.delete(`/shops/${shop.id}`);
      await loadShops();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to delete shop'));
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shops</h1>
            <p className="mt-1 text-sm text-slate-600">Create shops with code and search by shop name or code.</p>
          </div>
          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            type="button"
            onClick={openAddModal}
          >
            Add Shop
          </button>
        </div>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{apiError}</p>
          <button className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium" type="button" onClick={() => loadShops()}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Search by shop name or shop code
            <input
              className="mt-1 w-80 rounded border border-slate-300 px-3 py-2"
              placeholder="Type shop name or code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => loadShops(search)}
            type="button"
          >
            Search
          </button>

          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={async () => {
              setSearch('');
              await loadShops('');
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Shop List</h2>

        {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-2 font-medium">Shop Code</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shops.map((shop) => (
                <tr key={shop.id}>
                  <td className="px-3 py-2">{shop.shopCode || '-'}</td>
                  <td className="px-3 py-2">{shop.name}</td>
                  <td className="px-3 py-2">{shop.phone || '-'}</td>
                  <td className="px-3 py-2">{shop.address || '-'}</td>
                  <td className="px-3 py-2">{new Date(shop.createdAt).toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                        type="button"
                        onClick={() => openEditModal(shop)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                        type="button"
                        onClick={() => deleteShop(shop)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && shops.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No shops found.</p>
          ) : null}
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Shop' : 'Add Shop'}</h2>
              <button
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                type="button"
                onClick={closeModal}
              >
                Close
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={saveShop}>
              <label className="text-sm font-medium text-slate-700 block">
                Shop Name *
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>

              <label className="text-sm font-medium text-slate-700 block">
                Shop Code *
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={form.shopCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, shopCode: event.target.value }))}
                  placeholder="Example: SHP-001"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 block">
                Phone
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>

              <label className="text-sm font-medium text-slate-700 block">
                Address
                <textarea
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  rows={2}
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </label>

              <label className="text-sm font-medium text-slate-700 block">
                Notes
                <textarea
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>

              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

              <div className="flex justify-end gap-2">
                <button
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                  type="button"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingId ? 'Update Shop' : 'Save Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
