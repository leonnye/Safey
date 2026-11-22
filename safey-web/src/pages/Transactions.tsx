import { FileUp, Plus, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sortTxns, TxnRow } from '@/components/finance';
import { Button, Empty, PageHeader, Toast } from '@/components/ui';
import { formatMonth } from '@/domain/dates';
import type { Transaction } from '@/domain/types';
import { money, relativeDay } from '@/lib/format';
import { useStore } from '@/store/store';
import { useLookups } from '@/store/useFinance';

type Filter = 'all' | 'income' | 'expense' | 'csv';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
  { value: 'csv', label: 'Imported' },
];

export function Transactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, today, currency, restoreTransaction } = useStore();
  const deleted = (location.state as { deleted?: Transaction | null } | null)?.deleted ?? null;
  const clearDeleted = useCallback(() => navigate('.', { replace: true, state: null }), [navigate]);
  const { categoryName, sourceLabel } = useLookups();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sortTxns(data.transactions).filter((t) => {
      if (filter === 'csv' ? t.origin !== 'csv' : filter !== 'all' && t.direction !== filter) return false;
      if (!q) return true;
      return [t.note, categoryName(t.categoryId), sourceLabel(t.sourceId)].some((s) => s.toLowerCase().includes(q));
    });
    const map = new Map<string, typeof list>();
    for (const t of list) {
      const key = t.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [data.transactions, filter, query, categoryName, sourceLabel]);

  return (
    <div className="page">
      <PageHeader
        title="Transactions"
        action={
          <div className="row-between" style={{ gap: 8 }}>
            <Button size="sm" variant="secondary" icon={FileUp} onClick={() => navigate('/import')}>
              Import
            </Button>
            <Button size="sm" icon={Plus} className="only-desktop-inline" onClick={() => navigate('/transactions/new')}>
              Add
            </Button>
          </div>
        }
      />
      <div className="chips" role="toolbar" aria-label="Filter transactions">
        {FILTERS.map((f) => (
          <button key={f.value} className="chip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      <label className="search">
        <Search size={18} />
        <input className="input" placeholder="Search transactions…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search transactions" />
      </label>

      {groups.length === 0 ? (
        <div className="card">
          <Empty
            visual={{ icon: Search, hue: '#B9A3FF' }}
            title={data.transactions.length ? 'Nothing matches' : 'No transactions yet'}
            action={
              data.transactions.length ? null : (
                <Button size="sm" icon={Plus} onClick={() => navigate('/transactions/new')}>
                  Add transaction
                </Button>
              )
            }
          >
            {data.transactions.length ? 'Try a different filter or search.' : 'Record money in and out, or import a CSV statement.'}
          </Empty>
        </div>
      ) : (
        groups.map(([month, list]) => {
          const net = list.reduce((s, t) => s + (t.direction === 'income' ? t.amountMinor : -t.amountMinor), 0);
          const days: { date: string; items: Transaction[] }[] = [];
          for (const t of list) {
            const last = days[days.length - 1];
            if (last?.date === t.date) last.items.push(t);
            else days.push({ date: t.date, items: [t] });
          }
          return (
            <section key={month} className="stack" style={{ gap: 10 }}>
              <div className="section-head">
                <h2>{month === today.slice(0, 7) ? 'This month' : formatMonth(`${month}-01`)}</h2>
                <span className={`small num ${net >= 0 ? 'in' : 'out'}`} title="Money in minus money out">
                  {net >= 0 ? '+' : '−'} {money(Math.abs(net), currency)}
                </span>
              </div>
              <div className="card card--flush">
                {days.map((day) => {
                  const dayNet = day.items.reduce((s, t) => s + (t.direction === 'income' ? t.amountMinor : -t.amountMinor), 0);
                  return (
                    <div key={day.date}>
                      <div className="day-head">
                        <span>{relativeDay(day.date, today)}</span>
                        <span className={`num ${dayNet < 0 ? 'out' : dayNet > 0 ? 'in' : 'muted'}`}>
                          {dayNet < 0 ? '−' : dayNet > 0 ? '+' : ''} {money(Math.abs(dayNet), currency)}
                        </span>
                      </div>
                      <div className="list">
                        {day.items.map((t) => (
                          <TxnRow key={t.id} t={t} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <Button className="fab-pill hide-desktop" icon={Plus} onClick={() => navigate('/transactions/new')}>
        Add Transaction
      </Button>
      {deleted ? <Toast message="Transaction deleted" actionLabel="Undo" onAction={() => restoreTransaction(deleted)} onDone={clearDeleted} /> : null}
    </div>
  );
}
