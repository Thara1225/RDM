import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getApiError } from '../utils/apiError';
import useDebouncedValue from '../utils/useDebouncedValue';
const emptyForm = {
  name: '',
  phone: '',
  address: '',
  notes: ''
};

const today = new Date().toISOString().slice(0, 10);

const emptyPurchaseForm = {
  materialId: '',
  quantity: '',
  unitPrice: '',
  purchaseDate: today,
  notes: ''
};

export default function SuppliersPage({ token }) {
  const navigate = useNavigate();
  const detailsRef = useRef(null);

  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
  const [purchaseError, setPurchaseError] = useState('');
  const [isPurchaseSaving, setIsPurchaseSaving] = useState(false);

  async function loadSuppliers(activeFilters = {}) {
    setApiError('');
    setIsLoading(true);

    try {
      const params = {
        ...(activeFilters.search?.trim() ? { q: activeFilters.search.trim() } : {}),
        ...(activeFilters.fromDate ? { fromDate: activeFilters.fromDate } : {}),
        ...(activeFilters.toDate ? { toDate: activeFilters.toDate } : {}),
        sortBy: activeFilters.sortBy || sortBy,
        sortOrder: activeFilters.sortOrder || sortOrder
      };

      const response = await api.get('/suppliers', { params });
      setSuppliers(response.data);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load suppliers'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers({ search: debouncedSearch, fromDate, toDate, sortBy, sortOrder });
  }, [debouncedSearch, fromDate, toDate, sortBy, sortOrder, token]);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const response = await api.get('/materials');
        setMaterials(response.data);
      } catch (_error) {
        // Keep page usable even if materials fail to load.
      }
    }

    loadMaterials();
  }, [token]);

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }

  function startEdit(supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setFormError('');
  }

  async function saveSupplier(event) {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Supplier name is required');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null
      };

      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }

      startAdd();
      await loadSuppliers();
    } catch (error) {
      setFormError(getApiError(error, 'Failed to save supplier'));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSupplier(supplier) {
    const ok = window.confirm(`Delete supplier \"${supplier.name}\"?`);
    if (!ok) {
      return;
    }

    setApiError('');
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier(null);
      }
      await loadSuppliers();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to delete supplier'));
    }
  }

  async function viewSupplierDetails(supplierId) {
    setDetailsLoading(true);
    setApiError('');
    setPurchaseError('');

    try {
      const response = await api.get(`/suppliers/${supplierId}`);
      setSelectedSupplier(response.data);
      setPurchaseForm(emptyPurchaseForm);
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load supplier details'));
    } finally {
      setDetailsLoading(false);
    }
  }

  async function addPurchaseForSelectedSupplier(event) {
    event.preventDefault();
    if (!selectedSupplier) {
      return;
    }

    setPurchaseError('');

    if (!purchaseForm.materialId || !purchaseForm.quantity || !purchaseForm.unitPrice || !purchaseForm.purchaseDate) {
      setPurchaseError('Material, quantity, unit price and date are required');
      return;
    }

    setIsPurchaseSaving(true);
    try {
      await api.post(
        '/purchases',
        {
          supplierId: selectedSupplier.id,
          materialId: Number(purchaseForm.materialId),
          quantity: Number(purchaseForm.quantity),
          unitPrice: Number(purchaseForm.unitPrice),
          purchaseDate: purchaseForm.purchaseDate,
          notes: purchaseForm.notes.trim() || null
        }
      );

      const refreshed = await api.get(`/suppliers/${selectedSupplier.id}`);
      setSelectedSupplier(refreshed.data);
      setPurchaseForm(emptyPurchaseForm);
      await loadSuppliers();
    } catch (error) {
      setPurchaseError(getApiError(error, 'Failed to save purchase'));
    } finally {
      setIsPurchaseSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
        <p className="mt-1 text-sm text-slate-600">Add, manage, and review supplier purchase activity.</p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Search by name or phone
            <input
              className="mt-1 w-72 rounded border border-slate-300 px-3 py-2"
              placeholder="Type supplier name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Sort by
            <select
              className="mt-1 w-40 rounded border border-slate-300 px-3 py-2"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="createdAt">Date Added</option>
              <option value="name">Name</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Order
            <select
              className="mt-1 w-32 rounded border border-slate-300 px-3 py-2"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Added From
            <input
              className="mt-1 w-40 rounded border border-slate-300 px-3 py-2"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Added To
            <input
              className="mt-1 w-40 rounded border border-slate-300 px-3 py-2"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>

          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => loadSuppliers({ search, fromDate, toDate, sortBy, sortOrder })}
            type="button"
          >
            Search
          </button>

          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={async () => {
              setSearch('');
              setFromDate('');
              setToDate('');
              setSortBy('createdAt');
              setSortOrder('desc');
              await loadSuppliers({ search: '', fromDate: '', toDate: '', sortBy: 'createdAt', sortOrder: 'desc' });
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow" onSubmit={saveSupplier}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h2>
            {editingId ? (
              <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={startAdd}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Supplier Name *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Phone
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Address
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows={2}
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Notes
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows={2}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>

          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}

          <button
            className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : editingId ? 'Update Supplier' : 'Save Supplier'}
          </button>
        </form>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-900">Supplier List</h2>

          {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Address</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Materials (Qty)</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-3 py-2">{supplier.name}</td>
                    <td className="px-3 py-2">{supplier.phone || '-'}</td>
                    <td className="px-3 py-2">{supplier.address || '-'}</td>
                    <td className="px-3 py-2">{new Date(supplier.createdAt).toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      {selectedSupplier?.id === supplier.id && (selectedSupplier.materialSummary || []).length > 0 ? (
                        <div className="max-w-56 space-y-1">
                          {selectedSupplier.materialSummary.slice(0, 2).map((row) => (
                            <p key={row.materialId} className="truncate text-xs text-slate-700">
                              {row.materialName}: {row.totalQuantity} {row.unitType}
                            </p>
                          ))}
                          {selectedSupplier.materialSummary.length > 2 ? (
                            <p className="text-xs text-slate-500">+{selectedSupplier.materialSummary.length - 2} more</p>
                          ) : null}
                          <button
                            className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700"
                            type="button"
                            onClick={() => viewSupplierDetails(supplier.id)}
                          >
                            View Details
                          </button>
                        </div>
                      ) : (
                        <button
                          className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700"
                          type="button"
                          onClick={() => viewSupplierDetails(supplier.id)}
                        >
                          View Details
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                          type="button"
                          onClick={() => startEdit(supplier)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                          type="button"
                          onClick={() => deleteSupplier(supplier)}
                        >
                          Delete
                        </button>
                        <button
                          className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700"
                          type="button"
                          onClick={() => viewSupplierDetails(supplier.id)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && suppliers.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No suppliers found.</p>
            ) : null}
          </div>
        </section>
      </section>

      <section ref={detailsRef} className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Supplier Details</h2>
          <div className="flex flex-wrap items-center gap-2">
            {selectedSupplier ? (
              <button
                className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700"
                type="button"
                onClick={() => viewSupplierDetails(selectedSupplier.id)}
              >
                Refresh Details
              </button>
            ) : null}
          </div>
        </div>

        {detailsLoading ? <p className="mt-4 text-sm text-slate-600">Loading details...</p> : null}

        {!selectedSupplier && !detailsLoading ? (
          <p className="mt-4 text-sm text-slate-600">Click View on a supplier to see full details and purchase history.</p>
        ) : null}

        {selectedSupplier ? (
          <div className="mt-4 space-y-5">
            <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Viewing supplier: <span className="font-semibold">{selectedSupplier.name}</span>
            </div>

            <div className="rounded border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-semibold text-slate-900">Add Purchase For This Supplier</h3>
              <p className="mt-1 text-sm text-slate-600">
                Use this to record material and unit price. Totals and material summary will update instantly.
              </p>
              <form className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5" onSubmit={addPurchaseForSelectedSupplier}>
                <label className="text-sm font-medium text-slate-700 lg:col-span-2">
                  Material
                  <div className="mt-1 flex gap-2">
                    <select
                      className="flex-1 rounded border border-slate-300 px-3 py-2"
                      value={purchaseForm.materialId}
                      onChange={(event) => setPurchaseForm((prev) => ({ ...prev, materialId: event.target.value }))}
                    >
                      <option value="">Select material</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.unitType})
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      type="button"
                      onClick={() => navigate('/materials')}
                      title="Add new material"
                    >
                      + Add
                    </button>
                  </div>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Quantity
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={purchaseForm.quantity}
                    onChange={(event) => setPurchaseForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Unit Price
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={purchaseForm.unitPrice}
                    onChange={(event) => setPurchaseForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Purchase Date
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={(event) => setPurchaseForm((prev) => ({ ...prev, purchaseDate: event.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 md:col-span-2 lg:col-span-4">
                  Notes
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={purchaseForm.notes}
                    onChange={(event) => setPurchaseForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>

                <div className="flex items-end">
                  <button
                    className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    type="submit"
                    disabled={isPurchaseSaving}
                  >
                    {isPurchaseSaving ? 'Saving...' : 'Add Purchase'}
                  </button>
                </div>
              </form>
              {purchaseError ? <p className="mt-2 text-sm text-red-600">{purchaseError}</p> : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedSupplier.name}</p>
              </div>
              <div className="rounded border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedSupplier.phone || '-'}</p>
              </div>
              <div className="rounded border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Purchases</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedSupplier.purchaseStats?.totalPurchases ?? 0}</p>
              </div>
              <div className="rounded border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Amount Purchased</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedSupplier.purchaseStats?.totalAmountPurchased ?? 0}</p>
              </div>
            </div>

            {(selectedSupplier.purchaseStats?.totalPurchases ?? 0) === 0 ? (
              <p className="text-sm text-amber-700">
                This supplier has no purchase records yet. Add at least one purchase above to see material totals and amount.
              </p>
            ) : null}

            <div>
              <h3 className="font-semibold text-slate-900">Material Summary (What and How Much)</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-2 font-medium">Material</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Unit Price</th>
                      <th className="px-3 py-2 font-medium">Unit</th>
                      <th className="px-3 py-2 font-medium">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedSupplier.materialSummary || []).map((row) => (
                      <tr key={row.materialId}>
                        <td className="px-3 py-2">{row.materialName}</td>
                        <td className="px-3 py-2">{row.totalQuantity}</td>
                        <td className="px-3 py-2">{row.latestUnitPrice}</td>
                        <td className="px-3 py-2">{row.unitType}</td>
                        <td className="px-3 py-2">{row.totalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(selectedSupplier.materialSummary || []).length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No material purchase data.</p>
                ) : null}
              </div>
            </div>

          </div>
        ) : null}
      </section>
    </div>
  );
}
