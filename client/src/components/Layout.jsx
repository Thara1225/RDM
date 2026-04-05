import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const modules = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Suppliers', path: '/suppliers', icon: '🏭' },
  { name: 'Shops', path: '/shops', icon: '🛍️' },
  { name: 'Materials', path: '/materials', icon: '📦' },
  { name: 'Products', path: '/products', icon: '👗' },
  { name: 'Purchases', path: '/purchases', icon: '📥' },
  { name: 'Shop Orders', path: '/orders', icon: '📋' },
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
    <div className="flex h-screen bg-slate-100">
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="font-bold text-lg">RDM</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {modules.map((module) => (
            <button
              key={module.path}
              onClick={() => navigate(module.path)}
              className={`w-full text-left px-3 py-2 rounded transition-colors ${
                location.pathname === module.path
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
              title={module.name}
            >
              <span className="text-xl">{module.icon}</span>
              {sidebarOpen && <span className="ml-3 text-sm">{module.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          {sidebarOpen ? (
            <div className="mb-3 space-y-2">
              <p className="text-xs text-slate-300">Theme</p>
              <div className="grid grid-cols-1 gap-1">
                <button
                  className={`rounded px-2 py-1 text-xs ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}
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
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
          >
            {sidebarOpen ? 'Logout' : '🚪'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
