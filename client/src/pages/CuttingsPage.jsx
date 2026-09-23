import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';

const today = new Date().toISOString().slice(0, 10);

export default function CuttingsPage({ token }) {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [cuttings, setCuttings] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    productId: '',
    materialId: '',
    quantityCut: '',
    cutDate: today,
    notes: ''
  });

  const [filters, setFilters] = useState({
    productId: '',
    materialId: '',
    fromDate: '',
    toDate: ''
  });

  async function loadMasterData() {
    const [productsResponse, materialsResponse] = await Promise.all([
      api.get('/products'),
      api.get('/materials')
    ]);

    setProducts(productsResponse.data);
    setMaterials(materialsResponse.data);
  }

  async function loadCuttings(activeFilters = filters) {
    const params = {
      ...(activeFilters.productId ? { productId: activeFilters.productId } : {}),
      ...(activeFilters.materialId ? { materialId: activeFilters.materialId } : {}),
      ...(activeFilters.fromDate ? { fromDate: activeFilters.fromDate } : {}),
      ...(activeFilters.toDate ? { toDate: activeFilters.toDate } : {})
    };

    const response = await api.get('/cuttings', { params });
    setCuttings(response.data);
  }

  useEffect(() => {
    async function load() {
      setApiError('');
      setIsLoading(true);
      try {
        await loadMasterData();
        await loadCuttings();
      } catch (error) {
        setApiError(getApiError(error, 'Failed to load cuttings page data'));
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [token]);

  async function submitCutting(event) {
    event.preventDefault();
    setApiError('');

    try {
      await api.post(
        '/cuttings',
        {
          productId: Number(form.productId),
          materialId: Number(form.materialId),
          quantityCut: Number(form.quantityCut),
          clothUsed: 0,
          cutDate: form.cutDate,
          notes: form.notes || null
        }
      );

      setForm((current) => ({
        ...current,
        quantityCut: '',
        notes: ''
      }));

      await loadCuttings();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to save cutting'));
    }
  }

  async function applyFilters(event) {
    event.preventDefault();
    setApiError('');
    try {
      await loadCuttings(filters);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to filter cuttings'));
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Cuttings Module</h1>
        <p className="mt-1 text-sm text-slate-600">
          Record cloth usage, deduct stock, and filter cutting history.
        </p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow" onSubmit={submitCutting}>
          <h2 className="text-lg font-semibold text-slate-900">Add Cutting</h2>
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Product
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.productId}
                onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
              >
                <option value="">Select product</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.dressCode ? ` (${item.dressCode})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Material
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.materialId}
                onChange={(event) => setForm((prev) => ({ ...prev, materialId: event.target.value }))}
              >
                <option value="">Select material</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unitType})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Quantity Cut
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="number"
                min="1"
                value={form.quantityCut}
                onChange={(event) => setForm((prev) => ({ ...prev, quantityCut: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Date
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="date"
                value={form.cutDate}
                onChange={(event) => setForm((prev) => ({ ...prev, cutDate: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Notes
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>

          <button className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white" type="submit">
            Save Cutting
          </button>
        </form>

        <form className="rounded-xl bg-white p-6 shadow" onSubmit={applyFilters}>
          <h2 className="text-lg font-semibold text-slate-900">Filter Cuttings</h2>
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Product
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={filters.productId}
                onChange={(event) => setFilters((prev) => ({ ...prev, productId: event.target.value }))}
              >
                <option value="">All products</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.dressCode ? ` (${item.dressCode})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Material
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={filters.materialId}
                onChange={(event) => setFilters((prev) => ({ ...prev, materialId: event.target.value }))}
              >
                <option value="">All materials</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              From Date
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="date"
                value={filters.fromDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              To Date
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="date"
                value={filters.toDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
              />
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">
              Apply Filters
            </button>
            <button
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              type="button"
              onClick={async () => {
                const reset = { productId: '', materialId: '', fromDate: '', toDate: '' };
                setFilters(reset);
                await loadCuttings(reset);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Cutting History</h2>

        {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Dress Code</th>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Qty Cut</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuttings.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">{new Date(item.cutDate).toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{item.product?.name}</td>
                  <td className="px-3 py-2">{item.product?.dressCode || '-'}</td>
                  <td className="px-3 py-2">
                    {item.material?.name} ({item.material?.unitType})
                  </td>
                  <td className="px-3 py-2">{item.quantityCut}</td>
                  <td className="px-3 py-2">{item.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && cuttings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No cuttings found for selected filters.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
