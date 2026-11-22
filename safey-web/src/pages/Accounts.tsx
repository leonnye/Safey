import { Archive, ArchiveRestore, FileUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, MoneyInput, PageHeader, Sheet, Tile } from '@/components/ui';
import { recordedPosition, sourceBalance } from '@/domain/engine/summary';
import { minorToInput, parseMoneyInput } from '@/domain/money';
import type { FinancialSource, SourceKind } from '@/domain/types';
import { money } from '@/lib/format';
import { SOURCE_KINDS, sourceKindLabel, sourceVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';
import { useFinance } from '@/store/useFinance';

function AccountSheet({ source, onClose }: { source: FinancialSource | null; onClose: () => void }) {
  const { today, currency, saveSource, setSourceArchived } = useStore();
  const [label, setLabel] = useState(source?.label ?? '');
  const [kind, setKind] = useState<SourceKind>(source?.kind ?? 'cash');
  const [opening, setOpening] = useState(source ? minorToInput(source.openingBalanceMinor) : '');
  const [date, setDate] = useState(source?.openingDate ?? today);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const parsed = opening.trim() ? parseMoneyInput(opening) : { ok: true as const, minor: 0 };
    if (!parsed.ok && !/^0+(\.0*)?$/.test(opening.trim())) return setError(parsed.error);
    try {
      saveSource({ id: source?.id, label, kind, openingBalanceMinor: parsed.ok ? parsed.minor : 0, openingDate: date });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <Sheet title={source ? 'Edit account' : 'Add account'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid-2" role="radiogroup" aria-label="Account type">
          {SOURCE_KINDS.map((k) => (
            <button type="button" key={k.value} className="option" role="radio" aria-checked={kind === k.value} onClick={() => setKind(k.value)}>
              <Tile visual={sourceVisual(k.value)} solid size={18} />
              <span className="title small">{k.label}</span>
            </button>
          ))}
        </div>
        <Field label="Name">
          <input className="input" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. MTN MoMo Wallet" autoFocus />
        </Field>
        <Field label="Balance" hint="What was in this account on the date below. Records from that date onward adjust it.">
          <MoneyInput value={opening} onChange={setOpening} currency={currency} small />
        </Field>
        <Field label="Balance as of">
          <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" block>
          Save account
        </Button>
        {source ? (
          <Button
            type="button"
            variant="secondary"
            block
            icon={source.isArchived ? ArchiveRestore : Archive}
            onClick={() => {
              setSourceArchived(source.id, !source.isArchived);
              onClose();
            }}
          >
            {source.isArchived ? 'Restore account' : 'Archive account'}
          </Button>
        ) : null}
      </form>
    </Sheet>
  );
}

export function Accounts() {
  const navigate = useNavigate();
  const { data, today, currency } = useStore();
  const { position } = useFinance();
  const [editing, setEditing] = useState<FinancialSource | null | 'new'>(null);
  const active = data.sources.filter((s) => !s.isArchived);
  const archived = data.sources.filter((s) => s.isArchived);
  const total = recordedPosition(data.sources, data.transactions, today).totalMinor;

  return (
    <div className="page">
      <PageHeader
        title="Accounts"
        action={
          <Button size="sm" variant="secondary" icon={FileUp} onClick={() => navigate('/import')}>
            Import
          </Button>
        }
      />
      <div className="card card--glow" style={{ padding: 20 }}>
        <div className="label">Total Balance</div>
        <div className="hero-amount num">{money(total, currency, { exact: true })}</div>
        <div className="small muted">
          Across {position.sources.length} account{position.sources.length === 1 ? '' : 's'}, from your records up to today
        </div>
      </div>

      <div className="section-head">
        <h2>My Accounts</h2>
      </div>
      <div className="stack-cards">
        {active.map((s) => {
          const b = sourceBalance(s, data.transactions, today);
          return (
            <button key={s.id} className="row-card" onClick={() => setEditing(s)}>
              <Tile visual={sourceVisual(s.kind)} solid />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="title-md" style={{ fontSize: 15 }}>
                  {s.label}
                </div>
                <div className="tiny muted">{sourceKindLabel(s.kind)}</div>
              </div>
              <div className={`num ${b.balanceMinor < 0 ? 'out' : ''}`} style={{ fontWeight: 600 }}>
                {money(b.balanceMinor, currency, { exact: true })}
              </div>
            </button>
          );
        })}
        {active.length === 0 ? <p className="small muted">No accounts yet. Add cash, Mobile Money or a bank account to start.</p> : null}
      </div>
      <Button variant="secondary" block icon={Plus} onClick={() => setEditing('new')}>
        Add Account
      </Button>

      {archived.length > 0 ? (
        <details className="card">
          <summary>
            Archived accounts <span className="badge">{archived.length}</span>
          </summary>
          <div className="stack-cards">
            {archived.map((s) => (
              <button key={s.id} className="row-card" onClick={() => setEditing(s)}>
                <Tile visual={sourceVisual(s.kind)} />
                <div style={{ flex: 1 }}>{s.label}</div>
                <span className="tiny muted">Not counted in totals</span>
              </button>
            ))}
          </div>
        </details>
      ) : null}

      <p className="hint">Safey doesn’t connect to banks or Mobile Money. Balances come from what you enter and import.</p>

      {editing ? <AccountSheet source={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
