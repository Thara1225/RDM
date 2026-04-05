import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';
import useDebouncedValue from '../utils/useDebouncedValue';
import { toAssetUrl } from '../utils/assetUrl';

const emptyForm = {
  name: '',
  dressCode: '',
  quantity: ''
};

export default function StockPage({ token }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [adjustById, setAdjustById] = useState({});

  async function loadStock(activeSearch = debouncedSearch) {
    setApiError('');
    setIsLoading(true);

    try {
      const params = activeSearch.trim() ? { q: activeSearch.trim() } : {};
      const response = await api.get('/stock/products', { params });
      setItems(response.data);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load stock'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStock(debouncedSearch);
  }, [debouncedSearch, token]);

  async function addDressToStock(event) {
    event.preventDefault();
    setFormError('');

    const qty = Number(form.quantity);

    if (!form.name.trim()) {
      setFormError('Dress name is required');
      return;
    }

    if (!Number.isInteger(qty) || qty < 0) {
      setFormError('Quantity must be a whole number 0 or more');
      return;
    }

    setIsSaving(true);

    try {
      await api.post('/stock/products', {
        name: form.name.trim(),
        dressCode: form.dressCode.trim() || null,
        quantity: qty
      });

      setForm(emptyForm);
      await loadStock();
    } catch (error) {
      setFormError(getApiError(error, 'Failed to add dress to stock'));
    } finally {
      setIsSaving(false);
    }
  }

  async function adjustStock(item, action) {
    const rawValue = adjustById[item.id] ?? '';
    const quantity = Number(rawValue);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setApiError('Enter a valid quantity greater than 0');
      return;
    }

    setApiError('');

    try {
      await api.patch(`/stock/products/${item.id}`, {
        action,
        quantity
      });

      setAdjustById((prev) => ({ ...prev, [item.id]: '' }));
      await loadStock();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to update stock'));
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Dress Stock</h1>
        <p className="mt-1 text-sm text-slate-600">Track dresses you have to sell and available quantity.</p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{apiError}</p>
          <button className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium" type="button" onClick={() => loadStock()}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Search dress
            <input
              className="mt-1 w-72 rounded border border-slate-300 px-3 py-2"
              placeholder="Name or dress code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => loadStock(search)}
            type="button"
          >
            Search
          </button>

          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={async () => {
              setSearch('');
              await loadStock('');
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow" onSubmit={addDressToStock}>
          <h2 className="text-lg font-semibold text-slate-900">Add Dress To Stock</h2>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Dress Name *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Sleeveless Dress"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Dress Code
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.dressCode}
                onChange={(event) => setForm((prev) => ({ ...prev, dressCode: event.target.value }))}
                placeholder="DRS-1001"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Quantity In Stock
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
              />
            </label>
          </div>

          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}

          <button
            className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Add Dress'}
          </button>
        </form>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-900">Current Stock</h2>

          {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded border border-slate-200 p-3">
                <div className="flex gap-3">
                  {item.photoUrl ? (
                    <img
                      alt={item.name}
                      className="h-16 w-16 rounded object-cover flex-shrink-0"
                      src={toAssetUrl(item.photoUrl)}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded bg-slate-100 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-600">Dress Code: {item.dressCode || '-'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">In Stock: {item.stockQty}</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Qty"
                        value={adjustById[item.id] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAdjustById((prev) => ({ ...prev, [item.id]: value }));
                        }}
                      />

                      <button
                        className="rounded border border-green-300 px-2 py-1 text-xs font-medium text-green-700"
                        type="button"
                        onClick={() => adjustStock(item, 'add')}
                      >
                        Add
                      </button>

                      <button
                        className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700"
                        type="button"
                        onClick={() => adjustStock(item, 'remove')}
                      >
                        Remove
                      </button>

                      <button
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                        type="button"
                        onClick={() => adjustStock(item, 'set')}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!isLoading && items.length === 0 ? (
              <p className="text-sm text-slate-600">No dresses in stock yet.</p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
