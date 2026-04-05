import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';

export default function DashboardPage({ token }) {
  const [stats, setStats] = useState({
    suppliers: 0,
    shops: 0,
    materials: 0,
    products: 0,
    purchases: 0,
    cuttings: 0,
    stock: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lowStockItems, setLowStockItems] = useState([]);

  async function loadStats() {
    setError('');
    setLoading(true);

    try {
      const [suppliersRes, shopsRes, materialsRes, productsRes, purchasesRes, cuttingsRes, stockRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/shops'),
        api.get('/materials'),
        api.get('/products'),
        api.get('/purchases'),
        api.get('/cuttings'),
        api.get('/stock')
      ]);

      setStats({
        suppliers: suppliersRes.data.length,
        shops: shopsRes.data.length,
        materials: materialsRes.data.length,
        products: productsRes.data.length,
        purchases: purchasesRes.data.length,
        cuttings: cuttingsRes.data.length,
        stock: stockRes.data.length
      });

      const flagged = (stockRes.data || []).filter((row) => Number(row.availableQuantity || 0) <= Number(row.minStockLevel || 0));
      setLowStockItems(flagged);
    } catch (err) {
      setError(getApiError(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [token]);

  const cards = [
    { label: 'Suppliers', value: stats.suppliers, color: 'bg-blue-50 border-blue-200' },
    { label: 'Shops', value: stats.shops, color: 'bg-green-50 border-green-200' },
    { label: 'Materials', value: stats.materials, color: 'bg-purple-50 border-purple-200' },
    { label: 'Products', value: stats.products, color: 'bg-pink-50 border-pink-200' },
    { label: 'Purchases', value: stats.purchases, color: 'bg-yellow-50 border-yellow-200' },
    { label: 'Cuttings', value: stats.cuttings, color: 'bg-orange-50 border-orange-200' },
    { label: 'Stock Items', value: stats.stock, color: 'bg-indigo-50 border-indigo-200' }
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Summary of your inventory and operations.</p>
      </header>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          <button className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium" type="button" onClick={loadStats}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={`dashboard-stat-card rounded-lg border-2 p-6 ${card.color}`}>
            <p className="dashboard-stat-label text-sm font-medium text-slate-700">{card.label}</p>
            {loading ? (
              <p className="dashboard-stat-value mt-2 text-2xl font-bold text-slate-600">...</p>
            ) : (
              <p className="dashboard-stat-value mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Low-Stock Alerts</h2>
        {lowStockItems.length === 0 ? (
          <p className="mt-2 text-sm text-green-700">No low-stock alerts. Inventory levels look good.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2 font-medium">Material</th>
                  <th className="px-3 py-2 font-medium">Available</th>
                  <th className="px-3 py-2 font-medium">Min Level</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">{row.material?.name || '-'}</td>
                    <td className="px-3 py-2">{Number(row.availableQuantity).toFixed(3)}</td>
                    <td className="px-3 py-2">{Number(row.minStockLevel).toFixed(3)}</td>
                    <td className="px-3 py-2 font-medium text-red-600">Low</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li>✓ All modules are accessible from the sidebar</li>
          <li>✓ Stock engine is active and tracking purchases and cuttings</li>
          <li>✓ API validation enforces material/product existence and quantity rules</li>
          <li>✓ Insufficient stock is blocked automatically</li>
        </ul>
      </section>
    </div>
  );
}
