import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';
import useDebouncedValue from '../utils/useDebouncedValue';
import { toAssetUrl } from '../utils/assetUrl';

const emptyForm = {
  name: '',
  category: '',
  dressCode: '',
  stockQty: '',
  description: '',
  photoFile: null
};

export default function ProductsPage({ token }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [stockInputById, setStockInputById] = useState({});

  async function loadProducts(activeSearch = debouncedSearch) {
    setApiError('');
    setIsLoading(true);

    try {
      const params = { ...(activeSearch.trim() ? { q: activeSearch.trim() } : {}) };
      const response = await api.get('/products', { params });
      setProducts(response.data);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load products'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts(debouncedSearch);
  }, [debouncedSearch, token]);

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoPreview(null);
    setFormError('');
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      category: product.category || '',
      dressCode: product.dressCode || '',
      stockQty: String(product.stockQty ?? ''),
      description: product.description || '',
      photoFile: null
    });
    setPhotoPreview(product.photoUrl);
    setFormError('');
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Product name is required');
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      if (form.category.trim()) {
        formData.append('category', form.category.trim());
      }
      if (form.description.trim()) {
        formData.append('description', form.description.trim());
      }
      if (form.dressCode.trim()) {
        formData.append('dressCode', form.dressCode.trim());
      }
      if (form.stockQty !== '') {
        formData.append('stockQty', form.stockQty);
      }
      if (form.photoFile) {
        formData.append('photo', form.photoFile);
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      startAdd();
      await loadProducts();
    } catch (error) {
      setFormError(getApiError(error, 'Failed to save product'));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct(product) {
    const ok = window.confirm(`Delete product "${product.name}"?`);
    if (!ok) {
      return;
    }

    setApiError('');
    try {
      await api.delete(`/products/${product.id}`);
      await loadProducts();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to delete product'));
    }
  }

  async function updateStock(productId, action) {
    const rawQty = stockInputById[productId] ?? '';
    const qty = Number(rawQty);

    if (!Number.isInteger(qty) || qty <= 0) {
      setApiError('Stock quantity must be a whole number greater than 0');
      return;
    }

    setApiError('');

    try {
      await api.patch(`/stock/products/${productId}`, {
        action,
        quantity: qty
      });
      setStockInputById((prev) => ({ ...prev, [productId]: '' }));
      await loadProducts();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to update stock quantity'));
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <p className="mt-1 text-sm text-slate-600">Add, manage, and track finished products with photos.</p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{apiError}</p>
          <button className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium" type="button" onClick={() => loadProducts()}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Search by Dress Code
            <input
              className="mt-1 w-72 rounded border border-slate-300 px-3 py-2"
              placeholder="Type dress code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => loadProducts(search)}
            type="button"
          >
            Search
          </button>

          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={async () => {
              setSearch('');
              await loadProducts('');
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow" onSubmit={saveProduct}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            {editingId ? (
              <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={startAdd}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Product Name *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="Dress, Shirt, etc."
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Category
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="Casual, Formal, etc."
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Dress Code
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="DRS-1001"
                value={form.dressCode}
                onChange={(event) => setForm((prev) => ({ ...prev, dressCode: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Stock Quantity
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="number"
                min="0"
                step="1"
                placeholder="How many dresses in stock"
                value={form.stockQty}
                onChange={(event) => setForm((prev) => ({ ...prev, stockQty: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows={3}
                placeholder="Additional details..."
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Product Photo (PNG or JPG)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePhotoChange}
              />
            </label>

            {photoPreview ? (
              <div className="rounded border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-700 mb-2">Photo Preview</p>
                <img
                  alt="Product preview"
                  className="max-h-48 rounded object-cover"
                  src={photoPreview}
                />
              </div>
            ) : null}
          </div>

          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}

          <button
            className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : editingId ? 'Update Product' : 'Save Product'}
          </button>
        </form>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-900">Product List</h2>

          {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

          <div className="mt-4 space-y-3">
            {products.map((product) => (
              <div key={product.id} className="rounded border border-slate-200 p-3">
                <div className="flex gap-3">
                  {product.photoUrl ? (
                    <img
                      alt={product.name}
                      className="h-16 w-16 rounded object-cover flex-shrink-0"
                      src={toAssetUrl(product.photoUrl)}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded bg-slate-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    {product.category ? (
                      <p className="text-xs text-slate-600">{product.category}</p>
                    ) : null}
                    {product.dressCode ? (
                      <p className="text-xs text-slate-600">Dress Code: {product.dressCode}</p>
                    ) : null}
                    <p className="text-xs text-slate-700 mt-1">In Stock: {product.stockQty ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Qty"
                        value={stockInputById[product.id] ?? ''}
                        onChange={(event) => setStockInputById((prev) => ({ ...prev, [product.id]: event.target.value }))}
                      />
                      <button
                        className="rounded border border-green-300 px-2 py-1 text-xs font-medium text-green-700"
                        type="button"
                        onClick={() => updateStock(product.id, 'add')}
                      >
                        Add Stock
                      </button>
                      <button
                        className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700"
                        type="button"
                        onClick={() => updateStock(product.id, 'remove')}
                      >
                        Remove Stock
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                      type="button"
                      onClick={() => startEdit(product)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                      type="button"
                      onClick={() => deleteProduct(product)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && products.length === 0 ? (
              <p className="text-sm text-slate-600">No products found. Create one above.</p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
