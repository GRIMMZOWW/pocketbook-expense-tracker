import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, BarChart3, Wallet,
  PiggyBank, Target, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/goals', label: 'Goals', icon: Target },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">Pocketbook</div>
        <p className="text-muted" style={{ margin: '4px 0 0' }}>{user?.name}</p>
        <nav className="sidebar-nav">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="sidebar-link">
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="btn btn-secondary" onClick={logout}>
          <LogOut size={16} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </aside>

      <header className="topbar">
        <span className="brand">Pocketbook</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {menuOpen && (
        <nav className="mobile-menu" aria-label="Mobile menu">
          {LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>
              {label}
            </NavLink>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
            Log out
          </button>
        </nav>
      )}

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Quick navigation">
        {LINKS.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
