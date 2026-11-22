import { ChevronRight, Minus, Pencil, Plus, Sparkle, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Field, MoneyInput, PageHeader, Progress, Sheet, Tile } from '@/components/ui';
import { diffDays, formatMonth } from '@/domain/dates';
import { minorToInput, parseMoneyInput } from '@/domain/money';
import { money } from '@/lib/format';
import { GOAL_ICONS, goalVisual } from '@/lib/visuals';
import type { GoalIcon, SavingsGoal } from '@/store/state';
import { useStore } from '@/store/store';

function monthlyNeeded(goal: SavingsGoal, today: string): number | null {
  if (!goal.targetDate) return null;
  const remaining = goal.targetMinor - goal.savedMinor;
  if (remaining <= 0) return 0;
  const months = Math.max(1, Math.ceil(diffDays(goal.targetDate, today) / 30));
  return Math.ceil(remaining / months / 100) * 100;
}

function GoalEditSheet({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const { currency, saveGoal } = useStore();
  const [name, setName] = useState(goal?.name ?? '');
  const [icon, setIcon] = useState<GoalIcon>(goal?.icon ?? 'plane');
  const [target, setTarget] = useState(goal ? minorToInput(goal.targetMinor) : '');
  const [saved, setSaved] = useState(goal ? minorToInput(goal.savedMinor) : '');
  const [date, setDate] = useState(goal?.targetDate ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <Sheet title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const t = parseMoneyInput(target);
          if (!t.ok) return setError(t.error);
          const s = saved.trim() && !/^0+(\.0*)?$/.test(saved.trim()) ? parseMoneyInput(saved) : { ok: true as const, minor: 0 };
          if (!s.ok) return setError(s.error);
          try {
            saveGoal({ id: goal?.id, name, icon, targetMinor: t.minor, savedMinor: s.minor, targetDate: date || null });
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.');
          }
        }}
      >
        <Field label="Goal name">
          <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" autoFocus />
        </Field>
        <div className="field">
          <span>Icon</span>
          <div className="icon-pick">
            {GOAL_ICONS.map((g) => (
              <button type="button" key={g.value} aria-label={g.label} aria-pressed={icon === g.value} onClick={() => setIcon(g.value)}>
                <g.icon size={20} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Target amount">
          <MoneyInput value={target} onChange={setTarget} currency={currency} small />
        </Field>
        <div className="grid-2">
          <Field label="Already saved">
            <MoneyInput value={saved} onChange={setSaved} currency={currency} small />
          </Field>
          <Field label="Target date (optional)">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" block>
          Save goal
        </Button>
      </form>
    </Sheet>
  );
}

function GoalSheet({ goal, onEdit, onClose }: { goal: SavingsGoal; onEdit: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const { today, currency, adjustGoal, deleteGoal } = useStore();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ratio = goal.savedMinor / goal.targetMinor;
  const perMonth = monthlyNeeded(goal, today);

  const apply = (sign: 1 | -1) => {
    const p = parseMoneyInput(amount);
    if (!p.ok) return setError(p.error);
    adjustGoal(goal.id, sign * p.minor);
    setAmount('');
    setError(null);
  };

  return (
    <Sheet title={goal.name} onClose={onClose}>
      <div className="form">
        <div className="card stack">
          <div className="row-between">
            <span className="title-lg num">{money(goal.savedMinor, currency)}</span>
            <span className="badge">{Math.round(ratio * 100)}%</span>
          </div>
          <Progress ratio={ratio} large tone="plain" />
          <div className="small muted num">
            of {money(goal.targetMinor, currency)}
            {goal.targetDate ? ` by ${formatMonth(goal.targetDate)}` : ''}
          </div>
        </div>
        {perMonth ? (
          <div className="banner banner--info">
            <Target size={18} />
            <div>
              Set aside about <strong className="num">{money(perMonth, currency)}</strong> a month to reach this on time.{' '}
              <button
                className="link"
                onClick={() => navigate('/future', { state: { preset: { template: 'recurring_savings', amountMinor: perMonth, frequency: 'monthly' } } })}
              >
                <Sparkle size={13} /> Test it in Future Self
              </button>
            </div>
          </div>
        ) : null}
        <Field label="Update saved amount" hint="This tracks money you’ve set aside. Safey doesn’t move any money.">
          <MoneyInput value={amount} onChange={setAmount} currency={currency} small />
        </Field>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="grid-2">
          <Button icon={Plus} onClick={() => apply(1)}>
            Add
          </Button>
          <Button variant="secondary" icon={Minus} onClick={() => apply(-1)}>
            Take out
          </Button>
        </div>
        <div className="grid-2">
          <Button variant="ghost" icon={Pencil} onClick={onEdit}>
            Edit goal
          </Button>
          <Button
            variant="ghost"
            icon={Trash2}
            style={{ color: '#ff8a95' }}
            onClick={() => {
              deleteGoal(goal.id);
              onClose();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function Goals() {
  const { data, currency } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ goal: SavingsGoal | null } | null>(null);
  const open = data.goals.find((g) => g.id === openId) ?? null;
  const totalSaved = data.goals.reduce((s, g) => s + g.savedMinor, 0);

  return (
    <div className="page">
      <PageHeader title="Goals" />
      {data.goals.length > 0 ? (
        <p className="small secondary">
          <span className="num">{money(totalSaved, currency)}</span> set aside across {data.goals.length} goal{data.goals.length === 1 ? '' : 's'}.
        </p>
      ) : null}
      {data.goals.length === 0 ? (
        <div className="card">
          <Empty visual={{ icon: Target, hue: '#B9A3FF' }} title="Start your first goal">
            An emergency fund, a trip, school fees or a new phone. Track what you set aside and see the monthly pace you need.
          </Empty>
        </div>
      ) : (
        <div className="stack-cards">
          {data.goals.map((g) => {
            const v = goalVisual(g.icon);
            const ratio = g.savedMinor / g.targetMinor;
            return (
              <button key={g.id} className="row-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14, padding: 18 }} onClick={() => setOpenId(g.id)}>
                <span className="row-between" style={{ justifyContent: 'flex-start', gap: 14 }}>
                  <Tile visual={v} solid large />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="title-md" style={{ display: 'block' }}>
                      {g.name}
                    </span>
                    <span className="small muted num">
                      {money(g.targetMinor, currency)}
                      {g.targetDate ? ` • ${formatMonth(g.targetDate)}` : ''}
                    </span>
                  </span>
                  <ChevronRight size={20} className="muted" />
                </span>
                <span className="stack-sm">
                  <span className="small">{Math.round(ratio * 100)}%</span>
                  <Progress ratio={ratio} large tone="plain" />
                  <span className="tiny muted num" style={{ textAlign: 'right' }}>
                    {ratio >= 1 ? 'Goal reached' : `${money(g.savedMinor, currency)} saved`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Button variant="secondary" block icon={Plus} onClick={() => setEditing({ goal: null })}>
        Add Goal
      </Button>

      {open ? (
        <GoalSheet
          goal={open}
          onClose={() => setOpenId(null)}
          onEdit={() => {
            setEditing({ goal: open });
            setOpenId(null);
          }}
        />
      ) : null}
      {editing ? <GoalEditSheet goal={editing.goal} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
