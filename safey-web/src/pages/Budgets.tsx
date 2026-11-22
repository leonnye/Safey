import { ChevronLeft, ChevronRight, PieChart, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Ring } from '@/components/charts';
import { Button, Empty, Field, MoneyInput, PageHeader, Progress, Sheet, Tile } from '@/components/ui';
import { addDays, addMonths, formatMonth, startOfMonth } from '@/domain/dates';
import { periodSummary } from '@/domain/engine/summary';
import { minorToInput, parseMoneyInput } from '@/domain/money';
import type { Budget } from '@/domain/types';
import { money } from '@/lib/format';
import { categoryVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';
import { useLookups } from '@/store/useFinance';

function BudgetSheet({ budget, presetCategory, onClose }: { budget: Budget | null; presetCategory?: string; onClose: () => void }) {
  const { data, currency, saveBudget, deleteBudget } = useStore();
  const taken = new Set(data.budgets.filter((b) => b.period === 'month' && b.id !== budget?.id).map((b) => b.categoryId));
  const options = data.categories.filter((c) => c.direction === 'expense' && c.isActive && !taken.has(c.id));
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? presetCategory ?? options[0]?.id ?? '');
  const [limit, setLimit] = useState(budget ? minorToInput(budget.limitMinor) : '');
  const [error, setError] = useState<string | null>(null);
  const cat = data.categories.find((c) => c.id === categoryId);

  return (
    <Sheet title={budget ? 'Edit budget' : 'Add budget'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const p = parseMoneyInput(limit);
          if (!p.ok) return setError(p.error);
          if (!categoryId) return setError('Choose a category.');
          saveBudget({ id: budget?.id, categoryId, limitMinor: p.minor, period: 'month' });
          onClose();
        }}
      >
        <Field label="Category">
          <div className="with-tile">
            <Tile visual={categoryVisual(cat)} size={18} />
            <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!!budget}>
              {(budget ? data.categories.filter((c) => c.id === budget.categoryId) : options).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Monthly limit">
          <MoneyInput value={limit} onChange={setLimit} currency={currency} small autoFocus />
        </Field>
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" block>
          Save budget
        </Button>
        {budget ? (
          <Button
            type="button"
            variant="danger"
            block
            icon={Trash2}
            onClick={() => {
              deleteBudget(budget.id);
              onClose();
            }}
          >
            Remove budget
          </Button>
        ) : null}
      </form>
    </Sheet>
  );
}

export function Budgets() {
  const { data, today, currency } = useStore();
  const { category } = useLookups();
  const [month, setMonth] = useState(startOfMonth(today));
  const [editing, setEditing] = useState<{ budget: Budget | null; preset?: string } | null>(null);

  const monthEnd = addDays(addMonths(month, 1), -1);
  const summary = periodSummary(data.transactions, month, monthEnd < today ? monthEnd : today);
  const spentBy = new Map(summary.expenseByCategory.map((c) => [c.categoryId, c.totalMinor]));
  const budgets = data.budgets.filter((b) => b.period === 'month');
  const totalLimit = budgets.reduce((s, b) => s + b.limitMinor, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentBy.get(b.categoryId) ?? 0), 0);
  const unbudgeted = summary.expenseByCategory.filter((c) => !budgets.some((b) => b.categoryId === c.categoryId));
  const isCurrent = month === startOfMonth(today);

  return (
    <div className="page">
      <PageHeader title="Budgets" back />
      <div className="row-between card" style={{ padding: 6, borderRadius: 999 }}>
        <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={18} />
        </button>
        <strong>{formatMonth(month)}</strong>
        <button className="icon-btn" aria-label="Next month" disabled={isCurrent} style={{ opacity: isCurrent ? 0.35 : 1 }} onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="card">
          <Empty visual={{ icon: PieChart, hue: '#B9A3FF' }} title="No budgets yet" action={<Button size="sm" icon={Plus} onClick={() => setEditing({ budget: null })}>Add budget</Button>}>
            Set a monthly limit for food, transport or anything else. Safey tells you when you get close.
          </Empty>
        </div>
      ) : (
        <>
          <div className="card row-between" style={{ justifyContent: 'flex-start', gap: 22, padding: 20 }}>
            <Ring ratio={totalLimit ? totalSpent / totalLimit : 0} />
            <div>
              <div className="label" style={{ color: 'var(--lavender)' }}>
                Total Spending
              </div>
              <div className="title-lg num" style={{ marginTop: 4 }}>
                {money(totalSpent, currency)}
              </div>
              <div className="small muted num">of {money(totalLimit, currency)} budgeted</div>
              {!isCurrent ? null : <div className="tiny muted" style={{ marginTop: 6 }}>{money(Math.max(0, totalLimit - totalSpent), currency)} left this month</div>}
            </div>
          </div>

          <div className="card card--flush">
            <div className="list">
              {budgets.map((b) => {
                const spent = spentBy.get(b.categoryId) ?? 0;
                const ratio = spent / b.limitMinor;
                const cat = category(b.categoryId);
                return (
                  <button key={b.id} className="list-row" onClick={() => setEditing({ budget: b })}>
                    <Tile visual={categoryVisual(cat)} solid />
                    <div className="grow">
                      <div className="row-between">
                        <span className="title">{cat?.name ?? 'Category'}</span>
                        <span className={`small num ${ratio >= 1 ? 'out' : ratio >= 0.8 ? '' : 'secondary'}`} style={ratio >= 0.8 && ratio < 1 ? { color: 'var(--warning)' } : undefined}>
                          {Math.round(ratio * 100)}%
                        </span>
                      </div>
                      <div style={{ margin: '8px 0 6px' }}>
                        <Progress ratio={ratio} />
                      </div>
                      <div className="row-between tiny muted num">
                        <span>{money(spent, currency)} spent</span>
                        <span>{money(b.limitMinor, currency)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <Button variant="secondary" block icon={Plus} onClick={() => setEditing({ budget: null })}>
        Add Budget
      </Button>

      {unbudgeted.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Without a budget</h2>
          </div>
          <div className="card card--flush">
            <div className="list">
              {unbudgeted.map((c) => (
                <button key={c.categoryId} className="list-row" onClick={() => setEditing({ budget: null, preset: c.categoryId })}>
                  <Tile visual={categoryVisual(category(c.categoryId))} />
                  <div className="grow">
                    <div className="title">{category(c.categoryId)?.name ?? 'Other'}</div>
                    <div className="sub">Tap to set a limit</div>
                  </div>
                  <div className="amount num out">{money(c.totalMinor, currency)}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {editing ? <BudgetSheet budget={editing.budget} presetCategory={editing.preset} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
