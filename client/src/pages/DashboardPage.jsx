import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getApiError } from '../utils/apiError';

export default function DashboardPage({ token }) {
  const navigate = useNavigate();
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
  const [systemStatus, setSystemStatus] = useState('checking');

  const reportMonthKey = `rdm_report_downloaded_${new Date().toISOString().slice(0, 7)}`;
  const reportDownloadedThisMonth = Boolean(localStorage.getItem(reportMonthKey));

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

  useEffect(() => {
    let mounted = true;

    async function checkSystemHealth() {
      try {
        await api.get('/health');
        if (mounted) setSystemStatus('online');
      } catch (_error) {
        if (mounted) setSystemStatus('offline');
      }
    }

    checkSystemHealth();
    const intervalId = window.setInterval(checkSystemHealth, 60000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [token]);

  const cards = [
    { label: 'Suppliers', value: stats.suppliers, path: '/suppliers', color: 'stat-card-blue' },
    { label: 'Shops', value: stats.shops, path: '/shops', color: 'stat-card-green' },
    { label: 'Materials', value: stats.materials, path: '/materials', color: 'stat-card-lilac' },
    { label: 'Products', value: stats.products, path: '/products', color: 'stat-card-rose' },
    { label: 'Purchases', value: stats.purchases, path: '/purchases', color: 'stat-card-gold' },
    { label: 'Cuttings', value: stats.cuttings, path: '/cuttings', color: 'stat-card-peach' },
    { label: 'Stock Items', value: stats.stock, path: '/stock', color: 'stat-card-blue' }
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <h1>Hello, Designer! <span aria-hidden="true">👋</span></h1>
        <p>Here's a summary of your inventory and operations.</p>
      </header>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          <button className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium" type="button" onClick={loadStats}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="dashboard-section-heading">
          <h2>🔔 Notifications</h2>
          <span className={`system-status ${systemStatus}`}>
            ● System: {systemStatus === 'checking' ? 'Checking...' : systemStatus === 'online' ? 'Online' : 'Unavailable'}
          </span>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          {systemStatus === 'offline' ? (
            <div className="dashboard-notice notice-error">
              The system API is unavailable. Save your work and try again when the system is online.
            </div>
          ) : null}

          {!reportDownloadedThisMonth ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              <span>Monthly report has not been downloaded for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.</span>
              <button
                className="dashboard-inline-button"
                type="button"
                onClick={() => navigate('/reports')}
              >
                Open Reports
              </button>
            </div>
          ) : (
            <p className="dashboard-notice notice-success">
              Monthly report downloaded for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
            </p>
          )}
        </div>
      </section>

      <div className="dashboard-stat-grid">
        {cards.map((card) => (
          <button
            key={card.label}
            className={`dashboard-stat-card ${card.color}`}
            type="button"
            onClick={() => navigate(card.path)}
            aria-label={`Open ${card.label}`}
          >
            <p className="dashboard-stat-label">{card.label}</p>
            {loading ? (
              <p className="dashboard-stat-value">...</p>
            ) : (
              <p className="dashboard-stat-value">{card.value}</p>
            )}
          </button>
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
