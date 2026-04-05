import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';
import { toAssetUrl } from '../utils/assetUrl';

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  itemName: '',
  quantity: '',
  unitPrice: '',
  purchaseDate: today,
  notes: '',
  photoFile: null
};

export default function PurchasesPage({ token }) {
  const [purchases, setPurchases] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [photoPreview, setPhotoPreview] = useState(null);

  const totalAmount = useMemo(
    () => purchases.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0),
    [purchases]
  );

  async function loadPurchases() {
    setApiError('');
    setIsLoading(true);

    try {
      const response = await api.get('/purchases', {
        params: { scope: 'standalone' }
      });
      setPurchases(response.data || []);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load purchases'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPurchases();
  }, [token]);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, photoFile: file }));

    if (!file) {
      setPhotoPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result || null);
    reader.readAsDataURL(file);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoPreview(null);
    setFormError('');
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      itemName: row.itemName || '',
      quantity: String(Number(row.quantity) || ''),
      unitPrice: String(Number(row.unitPrice) || ''),
      purchaseDate: new Date(row.purchaseDate).toISOString().slice(0, 10),
      notes: row.notes || '',
      photoFile: null
    });
    setPhotoPreview(row.photoUrl || null);
    setFormError('');
  }

  async function deletePurchase(row) {
    const ok = window.confirm(`Delete purchase "${row.itemName || '-'}"?`);
    if (!ok) {
      return;
    }

    setApiError('');
    try {
      await api.delete(`/purchases/${row.id}`);
      if (editingId === row.id) {
        startAdd();
      }
      await loadPurchases();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to delete purchase'));
    }
  }

  async function savePurchase(event) {
    event.preventDefault();
    setFormError('');

    if (!form.itemName.trim()) {
      setFormError('Item name is required');
      return;
    }

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Quantity must be greater than 0');
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setFormError('Unit price must be greater than 0');
      return;
    }

    if (!form.purchaseDate) {
      setFormError('Purchase date is required');
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('itemName', form.itemName.trim());
      formData.append('quantity', String(quantity));
      formData.append('unitPrice', String(unitPrice));
      formData.append('purchaseDate', form.purchaseDate);
      if (form.notes.trim()) {
        formData.append('notes', form.notes.trim());
      }
      if (form.photoFile) {
        formData.append('photo', form.photoFile);
      }

      if (editingId) {
        await api.put(`/purchases/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/purchases', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      startAdd();
      await loadPurchases();
    } catch (error) {
      setFormError(getApiError(error, 'Failed to save purchase'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Purchases</h1>
        <p className="mt-1 text-sm text-slate-600">Track independent purchases like machines, tools, and assets with photos and total amount.</p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow" onSubmit={savePurchase}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Purchase' : 'Add Purchase'}</h2>
            {editingId ? (
              <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={startAdd}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Item Name *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.itemName}
                placeholder="Sewing Machine, Overlock Machine, Table, etc."
                onChange={(event) => setForm((prev) => ({ ...prev, itemName: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Quantity *
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Unit Price *
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                />
              </label>
            </div>

            <label className="text-sm font-medium text-slate-700">
              Purchase Date *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="date"
                value={form.purchaseDate}
                onChange={(event) => setForm((prev) => ({ ...prev, purchaseDate: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Purchase Photo (PNG or JPG)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePhotoChange}
              />
            </label>

            {photoPreview ? (
              <div className="rounded border border-slate-200 p-3">
                <p className="mb-2 text-xs font-medium text-slate-700">Photo Preview</p>
                <img
                  alt="Purchase preview"
                  className="max-h-44 rounded object-cover"
                  src={/^data:|^https?:\/\//i.test(photoPreview) ? photoPreview : toAssetUrl(photoPreview)}
                />
              </div>
            ) : null}

            <label className="text-sm font-medium text-slate-700">
              Notes
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional notes"
              />
            </label>
          </div>

          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}

          <button
            className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : editingId ? 'Update Purchase' : 'Save Purchase'}
          </button>
        </form>

        <section className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Standalone Purchase Table</h2>
            <p className="text-sm text-slate-600">Total Amount: {totalAmount.toFixed(2)}</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Only purchases created from this page are shown here.</p>

          {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2 font-medium">Photo</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      {row.photoUrl ? (
                        <img alt={row.itemName || 'Purchase'} className="h-10 w-10 rounded object-cover" src={toAssetUrl(row.photoUrl)} />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-100" />
                      )}
                    </td>
                    <td className="px-3 py-2">{row.itemName || '-'}</td>
                    <td className="px-3 py-2">{Number(row.quantity).toFixed(3)}</td>
                    <td className="px-3 py-2">{Number(row.unitPrice).toFixed(2)}</td>
                    <td className="px-3 py-2">{Number(row.totalPrice).toFixed(2)}</td>
                    <td className="px-3 py-2">{new Date(row.purchaseDate).toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                          type="button"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                          type="button"
                          onClick={() => deletePurchase(row)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && purchases.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No purchases found. Add one using the form.</p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
