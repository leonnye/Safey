import { ArrowLeftRight, Bell, CalendarClock, FileUp, House, PieChart, Plus, Settings, Sparkle, Target, Wallet } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '@/assets/safey-mark-alpha.png';
import { useStore } from '@/store/store';
import { useFinance } from '@/store/useFinance';
import { Banner, Button } from './ui';

const TABS = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/future', label: 'Future Self', icon: Sparkle, center: true },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
];

const SIDE = [
  { section: 'Overview' },
  { to: '/home', label: 'Home', icon: House },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/future', label: 'Future Self', icon: Sparkle },
  { to: '/alerts', label: 'Early warnings', icon: Bell, alerts: true },
  { section: 'Plan' },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/bills', label: 'Bills & income', icon: CalendarClock },
  { to: '/goals', label: 'Goals', icon: Target },
  { section: 'Money' },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/import', label: 'Import CSV', icon: FileUp },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Layout() {
  const navigate = useNavigate();
  const { saveError, loadError, data } = useStore();
  const { visible } = useFinance();
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="side-brand">
          <img src={logo} alt="" />
          Safey
        </div>
        <Button icon={Plus} onClick={() => navigate('/transactions/new')} style={{ marginBottom: 8 }}>
          Add transaction
        </Button>
        {SIDE.map((item) =>
          'section' in item ? (
            <div key={item.section} className="side-section">
              {item.section}
            </div>
          ) : (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <item.icon size={19} />
              {item.label}
              {'alerts' in item && visible.length > 0 ? <span className="badge badge--danger">{visible.length}</span> : null}
            </NavLink>
          ),
        )}
        <div className="side-foot">
          {data.profile?.mode === 'demo' ? <span className="badge badge--warning">Sample data</span> : null}
          <p className="hint" style={{ marginTop: 10 }}>
            Your records stay in this browser. Safey never connects to your bank or Mobile Money.
          </p>
        </div>
      </aside>

      <main className="main">
        {loadError || saveError ? (
          <div className="page page--wide" style={{ marginBottom: 16 }}>
            <Banner tone="danger">{loadError ?? saveError}</Banner>
          </div>
        ) : null}
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {TABS.map((t) =>
          t.center ? (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `nav-center ${isActive ? 'active' : ''}`} aria-label={t.label}>
              <Sparkle size={26} fill="currentColor" />
            </NavLink>
          ) : (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">
                <t.icon size={20} />
              </span>
              {t.label}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}
