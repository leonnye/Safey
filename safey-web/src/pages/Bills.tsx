import { CalendarClock, Check, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Banner, Button, Empty, Field, MoneyInput, PageHeader, Segmented, Sheet, Tile } from '@/components/ui';
import { fallbackCategoryId } from '@/domain/categories';
import { diffDays, formatDate, formatShortDate } from '@/domain/dates';
import { minorToInput, parseMoneyInput } from '@/domain/money';
import type { Direction, Frequency, PlannedItem } from '@/domain/types';
import { dueIn, money } from '@/lib/format';
import { categoryVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';
import { useLookups } from '@/store/useFinance';

type Tab = 'bills' | 'income' | 'done';

function PlannedSheet({ item, direction, onClose }: { item: PlannedItem | null; direction: Direction; onClose: () => void }) {
  const { data, today, currency, savePlannedItem } = useStore();
  const [dir, setDir] = useState<Direction>(item?.direction ?? direction);
  const [label, setLabel] = useState(item?.label ?? '');
  const [amount, setAmount] = useState(item ? minorToInput(item.amountMinor) : '');
  const [dueDate, setDueDate] = useState(item?.dueDate ?? today);
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency ?? 'monthly');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? fallbackCategoryId(dir));
  const [error, setError] = useState<string | null>(null);
  const cats = data.categories.filter((c) => c.direction === dir && c.isActive);
  const effectiveCat = cats.some((c) => c.id === categoryId) ? categoryId : fallbackCategoryId(dir);

  return (
    <Sheet title={item ? 'Edit' : dir === 'expense' ? 'Add bill' : 'Add expected income'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const p = parseMoneyInput(amount);
          if (!p.ok) return setError(p.error);
          try {
            savePlannedItem({ id: item?.id, label, direction: dir, amountMinor: p.minor, dueDate, frequency, categoryId: effectiveCat, isActive: true });
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.');
          }
        }}
      >
        {!item ? (
          <Segmented
            label="Type"
            className="seg--expense"
            value={dir}
            onChange={setDir}
            options={[
              { value: 'expense', label: 'Bill', className: 'is-expense' },
              { value: 'income', label: 'Expected income', className: 'is-income' },
            ]}
          />
        ) : null}
        <Field label="Name">
          <input className="input" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder={dir === 'expense' ? 'e.g. Rent, ECG prepaid' : 'e.g. Client payment'} autoFocus />
        </Field>
        <Field label="Amount">
          <MoneyInput value={amount} onChange={setAmount} currency={currency} small />
        </Field>
        <div className="grid-2">
          <Field label={dir === 'expense' ? 'Due date' : 'Expected on'}>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Repeats">
            <select className="select" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              <option value="once">Once</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </Field>
        </div>
        <Field label="Category">
          <select className="select" value={effectiveCat} onChange={(e) => setCategoryId(e.target.value)}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {dir === 'income' ? <p className="hint">Only add income you have good reason to expect. Forecasts show a lower line in case it doesn’t arrive.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" block>
          Save
        </Button>
      </form>
    </Sheet>
  );
}

function ItemSheet({ item, onEdit, onClose }: { item: PlannedItem; onEdit: () => void; onClose: () => void }) {
  const { data, today, currency, markPlannedDone, deletePlannedItem } = useStore();
  const sources = data.sources.filter((s) => !s.isArchived);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [date, setDate] = useState(item.dueDate < today ? item.dueDate : today);
  const [error, setError] = useState<string | null>(null);
  const isBill = item.direction === 'expense';

  return (
    <Sheet title={item.label} onClose={onClose}>
      <div className="form">
        <div className="card kv" style={{ padding: 0 }}>
          <div>
            <span>Amount</span>
            <span className={isBill ? 'out' : 'in'}>{money(item.amountMinor, currency, { exact: true })}</span>
          </div>
          <div>
            <span>{isBill ? 'Due' : 'Expected'}</span>
            <span>
              {formatDate(item.dueDate)} · {dueIn(item.dueDate, today)}
            </span>
          </div>
          <div>
            <span>Repeats</span>
            <span>{item.frequency === 'once' ? 'Once' : item.frequency === 'weekly' ? 'Every week' : 'Every month'}</span>
          </div>
        </div>
        {sources.length === 0 ? (
          <Banner tone="warning">Add an account to record this.</Banner>
        ) : (
          <>
            <div className="grid-2">
              <Field label={isBill ? 'Paid from' : 'Received into'}>
                <select className="select" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="On">
                <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <Button
              block
              icon={Check}
              onClick={() => {
                try {
                  markPlannedDone(item.id, sourceId, date);
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not save.');
                }
              }}
            >
              {isBill ? 'Mark as paid' : 'Mark as received'}
            </Button>
            <p className="hint">
              This adds {isBill ? 'an expense' : 'an income'} record{item.frequency === 'once' ? '' : ' and moves this to its next date'}.
            </p>
          </>
        )}
        <div className="grid-2">
          <Button variant="secondary" icon={Pencil} onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => {
              deletePlannedItem(item.id);
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

export function Bills() {
  const { data, today, currency } = useStore();
  const { category } = useLookups();
  const [tab, setTab] = useState<Tab>('bills');
  const [open, setOpen] = useState<PlannedItem | null>(null);
  const [editing, setEditing] = useState<{ item: PlannedItem | null } | null>(null);

  const items = data.plannedItems.filter((p) => p.isActive && p.direction === (tab === 'income' ? 'income' : 'expense')).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="page">
      <PageHeader title="Bills" back />
      <Segmented
        label="Bills view"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'bills', label: 'Upcoming' },
          { value: 'income', label: 'Income' },
          { value: 'done', label: 'Paid' },
        ]}
      />

      {tab === 'done' ? (
        data.billPayments.length === 0 ? (
          <div className="card">
            <Empty visual={{ icon: Check, hue: '#73D6AE' }} title="Nothing marked yet">
              When you mark a bill as paid it shows up here.
            </Empty>
          </div>
        ) : (
          <div className="card card--flush">
            <div className="list">
              {data.billPayments.map((p) => (
                <div key={p.id} className="list-row">
                  <Tile visual={{ icon: Check, hue: '#73D6AE' }} />
                  <div className="grow">
                    <div className="title">{p.label}</div>
                    <div className="sub">
                      {p.direction === 'income' ? 'Received' : 'Paid'} {formatDate(p.paidOn)} · due {formatShortDate(p.dueDate)}
                    </div>
                  </div>
                  <div className={`amount num ${p.direction === 'income' ? 'in' : 'out'}`}>{money(p.amountMinor, currency)}</div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : items.length === 0 ? (
        <div className="card">
          <Empty visual={{ icon: tab === 'bills' ? CalendarClock : Wallet, hue: tab === 'bills' ? '#F4C46B' : '#73D6AE' }} title={tab === 'bills' ? 'No upcoming bills' : 'No expected income'}>
            {tab === 'bills' ? 'Add rent, utilities, school fees or loan repayments so Safey can warn you before they collide.' : 'Add payments you expect, like a client invoice or salary, to see them in forecasts.'}
          </Empty>
        </div>
      ) : (
        <div className="stack-cards">
          {items.map((p) => {
            const days = diffDays(p.dueDate, today);
            return (
              <button key={p.id} className="row-card" onClick={() => setOpen(p)} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <span className="tiny muted">{formatShortDate(p.dueDate)}</span>
                <span className="row-between" style={{ justifyContent: 'flex-start', gap: 14 }}>
                  <Tile visual={categoryVisual(category(p.categoryId))} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="title-md" style={{ fontSize: 15, display: 'block' }}>
                      {p.label}
                    </span>
                    <span className={`small num ${p.direction === 'income' ? 'in' : 'out'}`}>{money(p.amountMinor, currency)}</span>
                  </span>
                  <span className={`badge ${days <= 3 ? 'badge--danger' : ''}`}>{dueIn(p.dueDate, today)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {tab !== 'done' ? (
        <Button variant="secondary" block icon={Plus} onClick={() => setEditing({ item: null })}>
          {tab === 'bills' ? 'Add Bill' : 'Add Expected Income'}
        </Button>
      ) : null}

      {open ? (
        <ItemSheet
          item={open}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setEditing({ item: open });
            setOpen(null);
          }}
        />
      ) : null}
      {editing ? <PlannedSheet item={editing.item} direction={tab === 'income' ? 'income' : 'expense'} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
