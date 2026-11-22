import { type ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Splash } from './components/Splash';
import { Accounts } from './pages/Accounts';
import { AlertDetail, Alerts } from './pages/Alerts';
import { Bills } from './pages/Bills';
import { Budgets } from './pages/Budgets';
import { FutureSelf } from './pages/FutureSelf';
import { Goals } from './pages/Goals';
import { Home } from './pages/Home';
import { ImportCsv } from './pages/ImportCsv';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { TransactionForm } from './pages/TransactionForm';
import { Transactions } from './pages/Transactions';
import { Welcome } from './pages/Welcome';
import { StoreProvider, useStore } from './store/store';

function RequireProfile({ children }: { children: ReactNode }) {
  const { data } = useStore();
  return data.profile ? children : <Navigate to="/welcome" replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { data } = useStore();
  return data.profile ? <Navigate to="/home" replace /> : children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function SplashGate() {
  const [phase, setPhase] = useState<'show' | 'leaving' | 'done'>(() => (sessionStorage.getItem('safey.splash') ? 'done' : 'show'));
  useEffect(() => {
    if (phase === 'done') return;
    const a = setTimeout(() => setPhase('leaving'), 1300);
    const b = setTimeout(() => {
      sessionStorage.setItem('safey.splash', '1');
      setPhase('done');
    }, 1750);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [phase]);
  return phase === 'done' ? null : <Splash leaving={phase === 'leaving'} />;
}

export function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <ScrollToTop />
        <SplashGate />
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route
            path="/welcome"
            element={
              <GuestOnly>
                <Welcome />
              </GuestOnly>
            }
          />
          <Route
            path="/onboarding"
            element={
              <GuestOnly>
                <Onboarding />
              </GuestOnly>
            }
          />
          <Route
            element={
              <RequireProfile>
                <Layout />
              </RequireProfile>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/new" element={<TransactionForm />} />
            <Route path="/transactions/:id" element={<TransactionForm />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/import" element={<ImportCsv />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/future" element={<FutureSelf />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/alerts/:fingerprint" element={<AlertDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
