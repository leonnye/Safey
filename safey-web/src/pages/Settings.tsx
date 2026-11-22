import { CalendarClock, ChevronRight, Download, FileUp, PieChart, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Field, MoneyInput, PageHeader, Segmented, Sheet, Tile } from '@/components/ui';
import { buildJsonExport, buildTransactionsCsv } from '@/domain/export';
import { currencyInfo, minorToInput, parseMoneyInput } from '@/domain/money';
import type { CurrencyCode, Direction } from '@/domain/types';
import { downloadText } from '@/lib/download';
import { initials } from '@/lib/format';
import { categoryVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';

export function Settings() {
  const navigate = useNavigate();
  const { data, today, currency, updateProfile, addCategory, deleteAllData } = useStore();
  const profile = data.profile!;
  const [name, setName] = useState(profile.displayName);
  const [buffer, setBuffer] = useState(minorToInput(profile.bufferMinor));
  const [msg, setMsg] = useState<string | null>(null);
  const [catDir, setCatDir] = useState<Direction>('expense');
  const [catName, setCatName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveProfile = () => {
    const b = /^0+(\.0*)?$/.test(buffer.trim()) || !buffer.trim() ? { ok: true as const, minor: 0 } : parseMoneyInput(buffer);
    if (!b.ok) return setMsg(b.error);
    if (!name.trim()) return setMsg('Enter a name.');
    updateProfile({ displayName: name.trim().slice(0, 40), bufferMinor: b.minor });
    setMsg('Saved.');
  };

  return (
    <div className="page">
      <PageHeader title="Settings" back />
      <div className="card row-between" style={{ justifyContent: 'flex-start', gap: 14 }}>
        <span className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
          {initials(profile.displayName)}
        </span>
        <div>
          <div className="title-md">{profile.displayName}</div>
          <div className="small muted">{profile.mode === 'demo' ? 'Sample data mode' : 'Personal · stored in this browser'}</div>
        </div>
      </div>

      <div className="card card--flush only-mobile">
        <div className="list">
          {[
            { to: '/budgets', label: 'Budgets', icon: PieChart, hue: '#A98CFF' },
            { to: '/bills', label: 'Bills & expected income', icon: CalendarClock, hue: '#F4C46B' },
            { to: '/alerts', label: 'Early warnings', icon: ShieldCheck, hue: '#FF858D' },
            { to: '/import', label: 'Import CSV', icon: FileUp, hue: '#91B9FF' },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="list-row">
              <Tile visual={{ icon: l.icon, hue: l.hue }} size={18} />
              <span className="grow title">{l.label}</span>
              <ChevronRight size={18} className="muted" />
            </Link>
          ))}
        </div>
      </div>

      <section className="card stack">
        <h2 className="title-md">Currency</h2>
        <Segmented<CurrencyCode>
          label="Currency"
          value={currency}
          onChange={(c) => updateProfile({ defaultCurrency: c })}
          options={[
            { value: 'GHS', label: 'GH₵ Cedi' },
            { value: 'USD', label: '$ Dollar' },
          ]}
        />
        <p className="hint">Amounts are saved and shown in {currencyInfo(currency).name}s. Switching relabels your records; it does not convert exchange rates.</p>
      </section>

      <section className="card stack">
        <h2 className="title-md">Profile</h2>
        <Field label="Name">
          <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Safety buffer" hint="Warnings tell you when your plans could take you below this.">
          <MoneyInput value={buffer} onChange={setBuffer} currency={currency} small />
        </Field>
        {msg ? <p className="small secondary">{msg}</p> : null}
        <Button variant="secondary" onClick={saveProfile}>
          Save profile
        </Button>
      </section>

      <section className="card stack">
        <h2 className="title-md">Categories</h2>
        <Segmented
          label="Category type"
          value={catDir}
          onChange={setCatDir}
          options={[
            { value: 'expense', label: 'Expenses' },
            { value: 'income', label: 'Income' },
          ]}
        />
        <div className="chips" style={{ flexWrap: 'wrap' }}>
          {data.categories
            .filter((c) => c.direction === catDir && c.isActive)
            .map((c) => {
              const v = categoryVisual(c);
              return (
                <span key={c.id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <v.icon size={14} color={v.hue} />
                  {c.name}
                </span>
              );
            })}
        </div>
        <form
          className="row-between"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              addCategory(catName, catDir);
              setCatName('');
              setCatError(null);
            } catch (err) {
              setCatError(err instanceof Error ? err.message : 'Could not add.');
            }
          }}
        >
          <input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category name" maxLength={40} />
          <Button type="submit" variant="secondary" icon={Plus} disabled={!catName.trim()}>
            Add
          </Button>
        </form>
        {catError ? <p className="error-text">{catError}</p> : null}
      </section>

      <section className="card stack">
        <h2 className="title-md">Your data</h2>
        <p className="small secondary">Everything is stored in this browser only. Export a copy any time.</p>
        <div className="grid-2">
          <Button variant="secondary" icon={Download} onClick={() => downloadText(`safey-transactions-${today}.csv`, buildTransactionsCsv(data.transactions, data.categories, data.sources), 'text/csv')}>
            CSV
          </Button>
          <Button variant="secondary" icon={Download} onClick={() => downloadText(`safey-backup-${today}.json`, buildJsonExport(data, new Date().toISOString()), 'application/json')}>
            Full backup
          </Button>
        </div>
        <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>
          {profile.mode === 'demo' ? 'Leave sample data and start fresh' : 'Delete all data'}
        </Button>
      </section>

      <p className="hint" style={{ textAlign: 'center' }}>
        Safey gives estimates and explanations, not financial advice. It never asks for your PIN or OTP.
      </p>

      {confirmDelete ? (
        <Sheet title="Delete everything?" onClose={() => setConfirmDelete(false)}>
          <div className="form">
            <p className="secondary">This permanently removes your profile, accounts, transactions, budgets, bills and goals from this browser. Export a backup first if you might need it.</p>
            <Button
              variant="danger"
              block
              icon={Trash2}
              onClick={() => {
                deleteAllData();
                navigate('/welcome', { replace: true });
              }}
            >
              Yes, delete everything
            </Button>
            <Button variant="secondary" block onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
