import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Banner, Button, Field, MoneyInput, PageHeader, Segmented, Tile } from '@/components/ui';
import { fallbackCategoryId } from '@/domain/categories';
import { minorToInput, parseMoneyInput } from '@/domain/money';
import type { Direction } from '@/domain/types';
import { categoryVisual, sourceVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';

export function TransactionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, today, currency, addTransaction, updateTransaction, deleteTransaction } = useStore();
  const existing = id ? data.transactions.find((t) => t.id === id) : undefined;
  const sources = data.sources.filter((s) => !s.isArchived || s.id === existing?.sourceId);

  const [direction, setDirection] = useState<Direction>(existing?.direction ?? 'expense');
  const [amount, setAmount] = useState(existing ? minorToInput(existing.amountMinor) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [sourceId, setSourceId] = useState(existing?.sourceId ?? sources[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? today);
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  if (id && !existing) {
    return (
      <div className="page">
        <PageHeader title="Transaction" back="/transactions" />
        <Banner tone="warning">This transaction no longer exists.</Banner>
      </div>
    );
  }

  const categories = data.categories.filter((c) => c.direction === direction && (c.isActive || c.id === categoryId));
  const effectiveCategory = categories.some((c) => c.id === categoryId) ? categoryId : (categories[0]?.id ?? fallbackCategoryId(direction));
  const cat = data.categories.find((c) => c.id === effectiveCategory);
  const source = data.sources.find((s) => s.id === sourceId);

  const save = () => {
    const parsed = parseMoneyInput(amount);
    if (!parsed.ok) return setError(parsed.error);
    if (date > today) return setError('That date is in the future. Add upcoming money under Bills & income instead.');
    try {
      const draft = { direction, amountMinor: parsed.minor, categoryId: effectiveCategory, sourceId, date, note };
      if (existing) updateTransaction(existing.id, draft);
      else addTransaction(draft);
      navigate(-1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <div className="page">
      <PageHeader title={existing ? 'Edit Transaction' : 'Add Transaction'} back />
      {sources.length === 0 ? (
        <Banner tone="warning">
          Add an account first so Safey knows where the money moved. <Link className="link" to="/accounts">Add account</Link>
        </Banner>
      ) : null}
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Segmented
          label="Transaction type"
          className="seg--expense"
          value={direction}
          onChange={(d) => {
            setDirection(d);
            setCategoryId('');
          }}
          options={[
            { value: 'expense', label: 'Expense', className: 'is-expense' },
            { value: 'income', label: 'Income', className: 'is-income' },
          ]}
        />
        <Field label="Amount">
          <MoneyInput value={amount} onChange={setAmount} currency={currency} autoFocus={!existing} />
        </Field>
        <Field label="Category">
          <div className="with-tile">
            <Tile visual={categoryVisual(cat)} size={18} />
            <select className="select" value={effectiveCategory} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Account">
          <div className="with-tile">
            {source ? <Tile visual={sourceVisual(source.kind)} size={18} /> : null}
            <select className="select" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Description (optional)">
          <input className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Shoprite, Accra Mall" />
        </Field>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" block disabled={sources.length === 0}>
          Save
        </Button>
        {existing ? (
          <Button
            type="button"
            variant="danger"
            block
            icon={Trash2}
            onClick={() => {
              const removed = deleteTransaction(existing.id);
              navigate('/transactions', { replace: true, state: { deleted: removed } });
            }}
          >
            Delete transaction
          </Button>
        ) : null}
        {existing?.origin === 'csv' ? <p className="hint">Imported from a CSV file. Editing it here won’t change the original file.</p> : null}
      </form>
    </div>
  );
}
