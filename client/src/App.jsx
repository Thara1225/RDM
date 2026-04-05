import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';
import { getApiError } from './utils/apiError';

import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import CuttingsPage from './pages/CuttingsPage';
import SuppliersPage from './pages/SuppliersPage';
import MaterialsPage from './pages/MaterialsPage';
import ShopsPage from './pages/ShopsPage';
import ProductsPage from './pages/ProductsPage';
import ShopOrdersPage from './pages/ShopOrdersPage';
import BillAmountsPage from './pages/BillAmountsPage';
import PurchasesPage from './pages/PurchasesPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  const [token, setToken] = useState(localStorage.getItem('rdm_token') || '');
  const [loginForm, setLoginForm] = useState({ email: 'admin@example.com', password: 'Admin@123' });
  const [loginError, setLoginError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(localStorage.getItem('rdm_token')));

  async function login(event) {
    event.preventDefault();
    setLoginError('');

    try {
      const response = await api.post('/auth/login', loginForm);
      const receivedToken = response.data.token;
      setToken(receivedToken);
      localStorage.setItem('rdm_token', receivedToken);
    } catch (error) {
      setLoginError(getApiError(error, 'Login failed'));
    }
  }

  function logout() {
    localStorage.removeItem('rdm_token');
    setToken('');
  }

  useEffect(() => {
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    let mounted = true;

    async function validateCurrentToken() {
      setIsCheckingAuth(true);
      try {
        await api.get('/auth/me');
      } catch (_error) {
        if (!mounted) {
          return;
        }
        logout();
        setLoginError('Session expired. Please login again.');
      } finally {
        if (mounted) {
          setIsCheckingAuth(false);
        }
      }
    }

    validateCurrentToken();

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    function handleUnauthorized(event) {
      logout();
      setLoginError(event?.detail?.message || 'Session expired. Please login again.');
    }

    window.addEventListener('rdm:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('rdm:unauthorized', handleUnauthorized);
  }, []);

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-slate-700">Validating session...</p>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">RDM Admin Login</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to use the system.</p>

          <form className="mt-6 space-y-4" onSubmit={login}>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>

            {loginError ? <p className="text-sm text-red-600">{loginError}</p> : null}

            <button
              className="w-full rounded bg-slate-900 px-4 py-2 font-medium text-white"
              type="submit"
            >
              Login
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage token={token} />} />
        <Route path="/cuttings" element={<CuttingsPage token={token} />} />
        <Route path="/suppliers" element={<SuppliersPage token={token} />} />
        <Route path="/shops" element={<ShopsPage token={token} />} />
        <Route path="/materials" element={<MaterialsPage token={token} />} />
        <Route path="/products" element={<ProductsPage token={token} />} />
        <Route path="/purchases" element={<PurchasesPage token={token} />} />
        <Route path="/orders" element={<ShopOrdersPage token={token} />} />
        <Route path="/bill-amounts" element={<BillAmountsPage token={token} />} />
        <Route path="/reports" element={<ReportsPage token={token} />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  );
}

export default App;
