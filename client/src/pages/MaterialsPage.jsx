import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';
import useDebouncedValue from '../utils/useDebouncedValue';
import { toAssetUrl } from '../utils/assetUrl';
const emptyForm = {
  name: '',
  category: '',
  color: '',
  unitType: 'yard',
  photoFile: null,
  description: ''
};

export default function MaterialsPage({ token }) {
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  async function loadMaterials(activeSearch = debouncedSearch) {
    setApiError('');
    setIsLoading(true);

    try {
      const params = {
        ...(activeSearch.trim() ? { q: activeSearch.trim() } : {})
      };

      const response = await api.get('/materials', { params });
      setMaterials(response.data);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load materials'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials(debouncedSearch);
  }, [debouncedSearch, token]);

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoPreview(null);
    setFormError('');
  }

  function startEdit(material) {
    setEditingId(material.id);
    setForm({
      name: material.name || '',
      category: material.category || '',
      color: material.color || '',
      unitType: material.unitType || 'yard',
      photoFile: null,
      description: material.description || ''
    });
    setPhotoPreview(material.photoUrl || null);
    setFormError('');
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result || null);
      };
      reader.readAsDataURL(file);
    }
  }

  async function saveMaterial(event) {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Material name is required');
      return;
    }

    if (!form.unitType) {
      setFormError('Unit type is required');
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('unitType', form.unitType);
      if (form.category.trim()) {
        formData.append('category', form.category.trim());
      }
      if (form.color.trim()) {
        formData.append('color', form.color.trim());
      }
      if (form.description.trim()) {
        formData.append('description', form.description.trim());
      }
      if (form.photoFile) {
        formData.append('photo', form.photoFile);
      }

      if (editingId) {
        await api.put(`/materials/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/materials', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      startAdd();
      await loadMaterials();
    } catch (error) {
      setFormError(getApiError(error, 'Failed to save material'));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMaterial(material) {
    const ok = window.confirm(`Delete material \"${material.name}\"?`);
    if (!ok) {
      return;
    }

    setApiError('');
    try {
      await api.delete(`/materials/${material.id}`);
      await loadMaterials();
    } catch (error) {
      setApiError(getApiError(error, 'Failed to delete material'));
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Materials</h1>
        <p className="mt-1 text-sm text-slate-600">Add, manage, and review raw materials inventory.</p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Search by name, category, or color
            <input
              className="mt-1 w-72 rounded border border-slate-300 px-3 py-2"
              placeholder="Type material name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => loadMaterials(search)}
            type="button"
          >
            Search
          </button>

          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={async () => {
              setSearch('');
              await loadMaterials('');
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow" onSubmit={saveMaterial}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Material' : 'Add Material'}</h2>
            {editingId ? (
              <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={startAdd}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Material Name *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="Cotton, Polyester, etc."
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Unit Type *
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.unitType}
                onChange={(event) => setForm((prev) => ({ ...prev, unitType: event.target.value }))}
              >
                <option value="yard">Yard</option>
                <option value="kg">Kilogram</option>
                <option value="piece">Piece</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Category
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="Fabric, Thread, etc."
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Color
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="Red, Blue, White, etc."
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Material Photo (PNG or JPG)
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
                  alt="Material preview"
                  className="max-h-48 rounded object-cover"
                  src={/^data:|^https?:\/\//i.test(photoPreview) ? photoPreview : toAssetUrl(photoPreview)}
                />
              </div>
            ) : null}

            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows={3}
                placeholder="Additional notes about this material..."
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
          </div>

          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}

          <button
            className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : editingId ? 'Update Material' : 'Save Material'}
          </button>
        </form>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-900">Material List</h2>

          {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2 font-medium">Photo</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Color</th>
                  <th className="px-3 py-2 font-medium">Unit Type</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((material) => (
                  <tr key={material.id}>
                    <td className="px-3 py-2">
                      {material.photoUrl ? (
                        <img
                          alt={material.name}
                          className="h-10 w-10 rounded object-cover"
                          src={toAssetUrl(material.photoUrl)}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-100" />
                      )}
                    </td>
                    <td className="px-3 py-2">{material.name}</td>
                    <td className="px-3 py-2">{material.category || '-'}</td>
                    <td className="px-3 py-2">{material.color || '-'}</td>
                    <td className="px-3 py-2">{material.unitType}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                          type="button"
                          onClick={() => startEdit(material)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                          type="button"
                          onClick={() => deleteMaterial(material)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && materials.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No materials found. Create one above.</p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
