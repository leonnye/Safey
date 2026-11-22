import { ChevronLeft, ChevronRight, PieChart, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Ring } from '@/components/charts';
import { Button, Empty, Field, MoneyInput, PageHeader, Progress, Sheet, Tile } from '@/components/ui';
import { addDays, addMonths, diffDays, formatMonth, startOfMonth } from '@/domain/dates';
import { periodSummary } from '@/domain/engine/summary';
import { minorToInput, parseMoneyInput } from '@/domain/money';
import type { Budget } from '@/domain/types';
import { money } from '@/lib/format';
import { categoryVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';
import { useLookups } from '@/store/useFinance';

function BudgetSheet({
  budget,
  presetCategory,
  suggestedMinor,
  onClose,
}: {
  budget: Budget | null;
  presetCategory?: string;
  suggestedMinor?: number;
  onClose: () => void;
}) {
  const { data, currency, saveBudget, deleteBudget } = useStore();
  const taken = new Set(data.budgets.filter((b) => b.period === 'month' && b.id !== budget?.id).map((b) => b.categoryId));
  const options = data.categories.filter((c) => c.direction === 'expense' && c.isActive && !taken.has(c.id));
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? presetCategory ?? options[0]?.id ?? '');
  const [limit, setLimit] = useState(budget ? minorToInput(budget.limitMinor) : suggestedMinor ? minorToInput(suggestedMinor) : '');
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
        {!budget && suggestedMinor ? <p className="hint">Suggested from what you’ve already spent this month, rounded up so there’s a little room.</p> : null}
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

type EditState = { budget: Budget | null; preset?: string; suggestedMinor?: number };

/** Round a projected spend up to the next GH₵ 50, with a little room. */
function suggestLimit(spentMinor: number, elapsedDays: number, daysInMonth: number): number {
  const projected = elapsedDays > 0 ? Math.round((spentMinor * daysInMonth) / elapsedDays) : spentMinor;
  const step = 5_000;
  return Math.max(step, Math.ceil((projected * 1.1) / step) * step);
}

export function Budgets() {
  const { data, today, currency } = useStore();
  const { category } = useLookups();
  const [month, setMonth] = useState(startOfMonth(today));
  const [editing, setEditing] = useState<EditState | null>(null);

  const monthEnd = addDays(addMonths(month, 1), -1);
  const summary = periodSummary(data.transactions, month, monthEnd < today ? monthEnd : today);
  const spentBy = new Map(summary.expenseByCategory.map((c) => [c.categoryId, c.totalMinor]));
  const budgets = data.budgets.filter((b) => b.period === 'month');
  const totalLimit = budgets.reduce((s, b) => s + b.limitMinor, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentBy.get(b.categoryId) ?? 0), 0);
  const unbudgeted = summary.expenseByCategory.filter((c) => !budgets.some((b) => b.categoryId === c.categoryId));
  const isCurrent = month === startOfMonth(today);
  const daysInMonth = diffDays(monthEnd, month) + 1;
  const elapsed = isCurrent ? Math.min(daysInMonth, diffDays(today, month) + 1) : daysInMonth;
  const daysLeft = isCurrent ? Math.max(0, diffDays(monthEnd, today)) : 0;
  const pace = elapsed / daysInMonth;
  const leftMinor = Math.max(0, totalLimit - totalSpent);
  const perDay = daysLeft > 0 ? Math.round(leftMinor / daysLeft / 100) * 100 : 0;

  const rows = budgets
    .map((b) => {
      const spent = spentBy.get(b.categoryId) ?? 0;
      const ratio = b.limitMinor > 0 ? spent / b.limitMinor : 0;
      const status: 'over' | 'watch' | 'on' = ratio >= 1 ? 'over' : isCurrent && (ratio >= 0.85 || ratio > pace + 0.12) ? 'watch' : 'on';
      const room = b.limitMinor - spent;
      return { b, spent, ratio, status, room };
    })
    .sort((a, c) => c.ratio - a.ratio);

  const headline = !budgets.length
    ? ''
    : !isCurrent
      ? totalSpent > totalLimit
        ? `Finished ${money(totalSpent - totalLimit, currency)} over the limits you set.`
        : `Finished ${money(totalLimit - totalSpent, currency)} under the limits you set.`
      : totalSpent > totalLimit
        ? `${money(totalSpent - totalLimit, currency)} over, with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`
        : daysLeft > 0
          ? `${money(leftMinor, currency)} left, about ${money(perDay, currency)} a day.`
          : `${money(leftMinor, currency)} left on the last day of the month.`;

  return (
    <div className="page">
      <PageHeader title="Budgets" back />
      <div className="month-switch card">
        <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={18} />
        </button>
        <strong>{formatMonth(month)}</strong>
        <button className="icon-btn" aria-label="Next month" disabled={isCurrent} onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="card">
          <Empty visual={{ icon: PieChart, hue: '#B9A3FF' }} title="No budgets yet" action={<Button size="sm" icon={Plus} onClick={() => setEditing({ budget: null })}>Add budget</Button>}>
            Set a monthly limit for food, transport or anything else. Safey compares it with an even pace through the month.
          </Empty>
        </div>
      ) : (
        <>
          <section className="budget-hero">
            <Ring ratio={totalLimit ? totalSpent / totalLimit : 0} />
            <div>
              <div className="label">Budgeted spending</div>
              <div className="title-lg num">{money(totalSpent, currency)}</div>
              <div className="small muted num">of {money(totalLimit, currency)}</div>
              <p className="small" style={{ marginTop: 8 }}>
                {headline}
              </p>
            </div>
            <div className="budget-stats">
              <div>
                <span>Spent</span>
                <strong className="num">{money(totalSpent, currency)}</strong>
              </div>
              <div>
                <span>Left</span>
                <strong className={`num ${leftMinor === 0 && totalSpent > 0 ? 'out' : ''}`}>{money(leftMinor, currency)}</strong>
              </div>
              <div>
                <span>{isCurrent ? 'A day' : 'Pace'}</span>
                <strong className="num">{isCurrent ? money(perDay, currency) : `${Math.round(pace * 100)}%`}</strong>
              </div>
            </div>
          </section>

          <div className="budget-list">
            {rows.map(({ b, spent, ratio, status, room }) => {
              const cat = category(b.categoryId);
              const daily = daysLeft > 0 ? Math.max(0, Math.round(room / daysLeft / 100) * 100) : 0;
              const note =
                status === 'over'
                  ? `${money(-room, currency)} over this limit`
                  : !isCurrent
                    ? `Finished ${money(room, currency)} under`
                    : daysLeft > 0
                      ? `${money(Math.max(0, daily), currency)} a day for ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                      : `${money(Math.max(0, room), currency)} left today`;
              return (
                <button key={b.id} className={`budget-card status-${status}`} onClick={() => setEditing({ budget: b })}>
                  <Tile visual={categoryVisual(cat)} solid />
                  <div className="grow">
                    <div className="row-between">
                      <span className="title">{cat?.name ?? 'Category'}</span>
                      <span className={`status-pill ${status}`}>{status === 'over' ? 'Over' : status === 'watch' ? 'Close' : 'On track'}</span>
                    </div>
                    <div className="pace">
                      <Progress ratio={ratio} />
                      {isCurrent ? <span className="pace-mark" style={{ left: `${Math.min(100, pace * 100)}%` }} title="Even pace for today" /> : null}
                    </div>
                    <div className="budget-meta num">
                      <span className="muted">
                        {money(spent, currency)} of {money(b.limitMinor, currency)}
                      </span>
                      <span className={status === 'over' ? 'out' : 'secondary'}>{note}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {isCurrent ? <p className="hint">The white mark is an even pace for today. Past it means this category is running ahead of the month.</p> : null}
        </>
      )}

      <Button variant="secondary" block icon={Plus} onClick={() => setEditing({ budget: null })}>
        Add Budget
      </Button>

      {unbudgeted.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Spending without a limit</h2>
          </div>
          <div className="card card--flush">
            <div className="list">
              {unbudgeted.map((c) => {
                const suggested = suggestLimit(c.totalMinor, elapsed, daysInMonth);
                return (
                  <button key={c.categoryId} className="list-row" onClick={() => setEditing({ budget: null, preset: c.categoryId, suggestedMinor: suggested })}>
                    <Tile visual={categoryVisual(category(c.categoryId))} />
                    <div className="grow">
                      <div className="title">{category(c.categoryId)?.name ?? 'Other'}</div>
                      <div className="sub">Suggest {money(suggested, currency)} a month</div>
                    </div>
                    <div className="amount num out">{money(c.totalMinor, currency)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {editing ? (
        <BudgetSheet budget={editing.budget} presetCategory={editing.preset} suggestedMinor={editing.suggestedMinor} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
