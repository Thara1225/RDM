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
import ChangePasswordPage from './pages/ChangePasswordPage';
import StockPage from './pages/StockPage';

function App() {
  const [token, setToken] = useState(localStorage.getItem('rdm_token') || '');
  const [loginForm, setLoginForm] = useState({ email: 'admin@example.com', password: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    email: 'admin@example.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
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

  async function changePasswordFromLogin(event) {
    event.preventDefault();
    setLoginError('');

    try {
      const response = await api.post('/auth/change-password-from-login', passwordChangeForm);
      setLoginError(response.data.message);
      setPasswordChangeForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setIsChangingPassword(false);
    } catch (error) {
      setLoginError(getApiError(error, 'Failed to change password'));
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
      <main className="login-screen">
        <div className="login-garment login-garment-left" aria-hidden="true">👗</div>
        <div className="login-card">
          <div className="login-hanger" aria-hidden="true">♧</div>
          <div className="login-brand">
            <span>RDM</span> Admin Login
          </div>
          <p className="login-subtitle">
            {isChangingPassword ? 'Change your password securely.' : 'Sign in to use the system.'}
          </p>

          <form className="login-form" onSubmit={isChangingPassword ? changePasswordFromLogin : login}>
            <label className="login-label">
              Email
              <input
                className="login-input"
                type="email"
                placeholder="you@example.com"
                value={isChangingPassword ? passwordChangeForm.email : loginForm.email}
                onChange={(event) => {
                  if (isChangingPassword) {
                    setPasswordChangeForm((prev) => ({ ...prev, email: event.target.value }));
                  } else {
                    setLoginForm((prev) => ({ ...prev, email: event.target.value }));
                  }
                }}
              />
            </label>

            <label className="login-label">
              {isChangingPassword ? 'Current Password' : 'Password'}
              <span className="login-password-wrap">
                <input
                  className="login-input"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={isChangingPassword ? passwordChangeForm.currentPassword : loginForm.password}
                  onChange={(event) => {
                    if (isChangingPassword) {
                      setPasswordChangeForm((prev) => ({ ...prev, currentPassword: event.target.value }));
                    } else {
                      setLoginForm((prev) => ({ ...prev, password: event.target.value }));
                    }
                  }}
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                >
                  {showLoginPassword ? '◉' : '◌'}
                </button>
              </span>
            </label>

            {isChangingPassword ? (
              <>
                <label className="login-label">
                  New Password
                  <input
                    className="login-input"
                    type="password"
                    minLength={6}
                    required
                    value={passwordChangeForm.newPassword}
                    onChange={(event) => setPasswordChangeForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  />
                </label>
                <label className="login-label">
                  Confirm New Password
                  <input
                    className="login-input"
                    type="password"
                    minLength={6}
                    required
                    value={passwordChangeForm.confirmPassword}
                    onChange={(event) => setPasswordChangeForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  />
                </label>
              </>
            ) : null}

            {loginError ? <p className="login-message">{loginError}</p> : null}

            <button
              className="login-submit"
              type="submit"
            >
              {isChangingPassword ? 'Change password' : 'Sign in'} <span aria-hidden="true">↗</span>
            </button>
          </form>
          <button
            className="login-change-link"
            type="button"
            onClick={() => {
              setLoginError('');
              setIsChangingPassword((prev) => !prev);
            }}
          >
            {isChangingPassword ? 'Back to Login' : 'Change Password'}
          </button>
          <div className="login-secure-note">100% secure · Handle with care</div>
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
        <Route path="/stock" element={<StockPage token={token} />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  );
}

export default App;
