import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const modules = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Suppliers', path: '/suppliers', icon: '🏭' },
  { name: 'Shops', path: '/shops', icon: '🛍️' },
  { name: 'Materials', path: '/materials', icon: '📦' },
  { name: 'Products', path: '/products', icon: '👗' },
  { name: 'Purchases', path: '/purchases', icon: '📥' },
  { name: 'Shop Sales', path: '/orders', icon: '📋' },
  { name: 'Bill Amounts', path: '/bill-amounts', icon: '💰' },
  { name: 'Cuttings', path: '/cuttings', icon: '✂️' },
  { name: 'Reports', path: '/reports', icon: '📄' }
];

export default function Layout({ children, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('rdm_theme_mode');
    return saved === 'dark' || saved === 'night';
  });

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-dark', 'theme-night');
    html.classList.add(isDarkMode ? 'theme-dark' : 'theme-light');
    localStorage.setItem('rdm_theme_mode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <aside
        className="app-sidebar"
      >
        <div className="app-brand-row">
          <div className="app-brand-mark">↗</div>
          {sidebarOpen && <h1 className="app-brand-name">RDM</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="app-collapse-button"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        <nav className="app-nav">
          {modules.map((module) => (
            <button
              key={module.path}
              onClick={() => navigate(module.path)}
              className={`app-nav-item ${
                location.pathname === module.path
                  ? 'active'
                  : ''
              }`}
              title={module.name}
            >
              <span className="app-nav-icon">{module.icon}</span>
              {sidebarOpen && <span className="app-nav-label">{module.name}</span>}
            </button>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <button
            onClick={() => navigate('/change-password')}
            className={`app-footer-button app-change-password ${
              location.pathname === '/change-password'
                ? 'active'
                : ''
            }`}
            title="Change Password"
          >
            {sidebarOpen ? 'Change Password' : '🔑'}
          </button>

          {sidebarOpen ? (
            <div className="mb-3 space-y-2">
              <div className="app-theme-control">
                <button
                  className="app-footer-button"
                  onClick={() => setIsDarkMode((prev) => !prev)}
                  type="button"
                >
                  {isDarkMode ? 'Dark Mode: On' : 'Dark Mode: Off'}
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={onLogout}
            className="app-logout-button"
          >
            {sidebarOpen ? 'Logout' : '🚪'}
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
