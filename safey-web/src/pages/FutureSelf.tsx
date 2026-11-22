import { ArrowUp, Bookmark, Sparkle, Target } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ProjectionChart } from '@/components/charts';
import { Button, Field, MoneyInput, PageHeader, Segmented } from '@/components/ui';
import { addDays, formatDate, formatShortDate } from '@/domain/dates';
import { simulate, type SimulationResult, TEMPLATE_LABELS } from '@/domain/engine/simulator';
import { minorToInput, parseMoneyInput } from '@/domain/money';
import type { CurrencyCode, ScenarioInputs, ScenarioTemplate } from '@/domain/types';
import { money } from '@/lib/format';
import { useStore } from '@/store/store';
import { useFinance } from '@/store/useFinance';

type Horizon = '30' | '60' | '90';

interface Draft {
  template: ScenarioTemplate;
  plannedItemId?: string;
  delayDays?: string;
  label?: string;
  amount?: string;
  date?: string;
  frequency?: 'once' | 'weekly' | 'monthly';
  direction?: 'income' | 'expense';
}

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'safey'; kind: 'text'; text: ReactNode; chips?: boolean }
  | { id: number; role: 'safey'; kind: 'form'; draft: Draft; done: boolean }
  | { id: number; role: 'safey'; kind: 'result'; question: string; inputs: ScenarioInputs; horizon: number; result: SimulationResult };

const SUGGESTIONS: { template: ScenarioTemplate; text: string }[] = [
  { template: 'one_off_expense', text: 'Can I afford a big purchase?' },
  { template: 'delayed_income', text: 'What if my income is late?' },
  { template: 'recurring_savings', text: 'Can I save every month?' },
  { template: 'custom_change', text: 'What if my income changes?' },
];

let nextId = 1;
const mid = () => nextId++;

/** Reads a typed question into a starting draft. Deterministic keyword matching, not AI. */
function parseQuestion(text: string): Draft | null {
  const t = text.toLowerCase();
  const amt = t.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*(k\b)?/);
  const amount = amt ? (amt[2] ? String(Number(amt[1]!.replace(/,/g, '')) * 1000) : amt[1]!.replace(/,/g, '')) : undefined;
  const days = t.match(/(\d+)\s*(day|week)/);
  if (/\b(late|delay|delayed|doesn.?t come|does not come)\b/.test(t)) {
    return { template: 'delayed_income', delayDays: days ? String(Number(days[1]) * (days[2] === 'week' ? 7 : 1)) : '14' };
  }
  if (/\b(save|saving|set aside|put away)\b/.test(t)) return { template: 'recurring_savings', amount, frequency: /week/.test(t) ? 'weekly' : 'monthly' };
  if (/\b(earn|extra income|raise|side|more income|less income|lose|lost)\b/.test(t)) {
    return { template: 'custom_change', amount, direction: /\b(less|lose|lost)\b/.test(t) ? 'expense' : 'income', frequency: /week/.test(t) ? 'weekly' : 'monthly' };
  }
  if (/\b(afford|buy|spend|pay|cost|purchase|trip|travel|phone|laptop|wedding|fees)\b/.test(t) || amount) {
    const what = text.match(/(?:afford|buy|for)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z\s]{1,30}?)(?:\s+(?:for|on|in|at|worth)\b|\?|$)/i)?.[1];
    return { template: 'one_off_expense', amount, label: what?.trim() };
  }
  return null;
}

function questionFor(inputs: ScenarioInputs, currency: CurrencyCode, incomeLabel?: string): string {
  switch (inputs.template) {
    case 'delayed_income':
      return `What if ${incomeLabel ?? 'my income'} arrives ${inputs.delayDays} days late?`;
    case 'one_off_expense':
      return `Can I afford ${money(inputs.amountMinor, currency)}${inputs.label ? ` for “${inputs.label}”` : ''} on ${formatShortDate(inputs.date)}?`;
    case 'recurring_savings':
      return `Can I save ${money(inputs.amountMinor, currency)} every ${inputs.frequency === 'weekly' ? 'week' : 'month'}?`;
    case 'custom_change':
      return `What if I ${inputs.direction === 'income' ? 'get an extra' : 'spend an extra'} ${money(inputs.amountMinor, currency)}${inputs.frequency === 'once' ? ' once' : inputs.frequency === 'weekly' ? ' every week' : ' every month'}?`;
  }
}

function ScenarioForm({ draft, onSubmit }: { draft: Draft; onSubmit: (inputs: ScenarioInputs, horizon: number) => void }) {
  const { data, today, currency } = useStore();
  const incomes = data.plannedItems.filter((p) => p.isActive && p.direction === 'income' && p.dueDate > today);
  const [d, setD] = useState<Draft>({
    plannedItemId: incomes[0]?.id,
    delayDays: '14',
    label: '',
    amount: '',
    date: addDays(today, 7),
    frequency: 'monthly',
    direction: 'income',
    ...Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined)),
  } as Draft);
  const [horizon, setHorizon] = useState<Horizon>('60');
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  if (d.template === 'delayed_income' && incomes.length === 0) {
    return (
      <p className="small secondary">
        To test late income, first add a payment you expect under{' '}
        <Link className="link" to="/bills">
          Bills &amp; income
        </Link>
        .
      </p>
    );
  }

  const submit = () => {
    setError(null);
    let inputs: ScenarioInputs;
    if (d.template === 'delayed_income') {
      const n = Number(d.delayDays);
      if (!Number.isInteger(n) || n < 1 || n > 120) return setError('Choose a delay from 1 to 120 days.');
      inputs = { template: 'delayed_income', plannedItemId: d.plannedItemId!, delayDays: n };
    } else {
      const p = parseMoneyInput(d.amount ?? '');
      if (!p.ok) return setError(p.error);
      if (d.template === 'one_off_expense') inputs = { template: 'one_off_expense', amountMinor: p.minor, date: d.date!, label: (d.label ?? '').trim().slice(0, 40) };
      else if (d.template === 'recurring_savings') inputs = { template: 'recurring_savings', amountMinor: p.minor, startDate: d.date!, frequency: d.frequency === 'weekly' ? 'weekly' : 'monthly' };
      else inputs = { template: 'custom_change', label: (d.label ?? '').trim().slice(0, 40), direction: d.direction!, amountMinor: p.minor, startDate: d.date!, frequency: d.frequency! };
    }
    onSubmit(inputs, Number(horizon));
  };

  return (
    <form
      className="form"
      style={{ gap: 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {d.template === 'delayed_income' ? (
        <>
          <Field label="Which payment?">
            <select className="select" value={d.plannedItemId} onChange={(e) => set({ plannedItemId: e.target.value })}>
              {incomes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {money(p.amountMinor, currency)} on {formatShortDate(p.dueDate)}
                </option>
              ))}
            </select>
          </Field>
          <div className="field">
            <span>How many days late?</span>
            <div className="chips">
              {['7', '14', '30'].map((n) => (
                <button type="button" key={n} className="chip" aria-pressed={d.delayDays === n} onClick={() => set({ delayDays: n })}>
                  {n} days
                </button>
              ))}
              <input className="input" style={{ width: 96, minHeight: 40 }} inputMode="numeric" aria-label="Days late" value={d.delayDays} onChange={(e) => set({ delayDays: e.target.value.replace(/\D/g, '') })} />
            </div>
          </div>
        </>
      ) : (
        <>
          {d.template === 'custom_change' ? (
            <Segmented
              label="Direction"
              className="seg--expense"
              value={d.direction!}
              onChange={(v) => set({ direction: v })}
              options={[
                { value: 'income', label: 'Extra money in', className: 'is-income' },
                { value: 'expense', label: 'Extra money out', className: 'is-expense' },
              ]}
            />
          ) : null}
          {d.template !== 'recurring_savings' ? (
            <Field label={d.template === 'one_off_expense' ? 'What is it for?' : 'Label (optional)'}>
              <input className="input" value={d.label} maxLength={40} onChange={(e) => set({ label: e.target.value })} placeholder={d.template === 'one_off_expense' ? 'e.g. New phone, trip to Kumasi' : 'e.g. Weekend shifts'} />
            </Field>
          ) : null}
          <Field label="Amount">
            <MoneyInput value={d.amount ?? ''} onChange={(v) => set({ amount: v })} currency={currency} small />
          </Field>
          <div className="grid-2">
            <Field label={d.template === 'one_off_expense' ? 'When?' : 'Starting'}>
              <input className="input" type="date" min={addDays(today, 1)} value={d.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            {d.template !== 'one_off_expense' ? (
              <Field label="How often?">
                <select className="select" value={d.frequency} onChange={(e) => set({ frequency: e.target.value as Draft['frequency'] })}>
                  {d.template === 'custom_change' ? <option value="once">Once</option> : null}
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </select>
              </Field>
            ) : null}
          </div>
        </>
      )}
      <div className="field">
        <span>Look ahead</span>
        <Segmented
          label="Look ahead"
          value={horizon}
          onChange={setHorizon}
          options={[
            { value: '30', label: '30 days' },
            { value: '60', label: '60 days' },
            { value: '90', label: '90 days' },
          ]}
        />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <Button type="submit" block icon={Sparkle}>
        Show my future
      </Button>
    </form>
  );
}

function ResultCard({ msg }: { msg: Extract<Message, { kind: 'result' }> }) {
  const navigate = useNavigate();
  const { data, currency, saveScenario, saveGoal } = useStore();
  const [saved, setSaved] = useState(false);
  const { result, inputs } = msg;
  const buffer = data.profile?.bufferMinor ?? 0;
  if (result.error) {
    return <p className="small">{result.error}</p>;
  }
  const low = result.scenario.lowestCentral;
  const baseLow = result.baseline.lowestCentral;
  const diff = result.differenceAtEndMinor;
  const endDate = result.scenario.end.date;
  const verdict =
    low.valueMinor >= buffer
      ? { tone: 'in', head: 'Looks manageable.', body: `Your estimated balance stays above your ${money(buffer, currency)} buffer. The lowest point is about ${money(low.valueMinor, currency)} on ${formatDate(low.date)}.` }
      : low.valueMinor >= 0
        ? { tone: '', head: 'It’s tight.', body: `Your estimated balance could dip to ${money(low.valueMinor, currency)} on ${formatDate(low.date)}, below your ${money(buffer, currency)} buffer.` }
        : { tone: 'out', head: 'This looks risky.', body: `Your estimated balance could fall below zero, to ${money(low.valueMinor, currency)}, around ${formatDate(low.date)}.` };

  return (
    <>
      <div className="who">
        <span className="safey-dot">
          <Sparkle size={16} fill="currentColor" />
        </span>
        <div>
          <strong className={verdict.tone}>{verdict.head}</strong> {verdict.body}
        </div>
      </div>
      <div className="kv">
        <div>
          <span>Balance today</span>
          <span>{money(result.baseline.startBalanceMinor, currency)}</span>
        </div>
        <div>
          <span>Lowest point without this</span>
          <span>{money(baseLow.valueMinor, currency)}</span>
        </div>
        <div>
          <span>Lowest point with this</span>
          <span className={low.valueMinor < buffer ? 'out' : ''}>{money(low.valueMinor, currency)}</span>
        </div>
        <div>
          <span>Difference by {formatShortDate(endDate)}</span>
          <span className={diff < 0 ? 'out' : diff > 0 ? 'in' : ''}>
            {diff > 0 ? '+' : diff < 0 ? '−' : ''}
            {money(Math.abs(diff), currency)}
          </span>
        </div>
      </div>
      <ProjectionChart
        currency={currency}
        dates={result.baseline.points.map((p) => p.date)}
        thresholdMinor={buffer}
        series={[
          { label: 'Without this', color: '#B9A3FF', values: result.baseline.points.map((p) => p.centralMinor) },
          { label: 'With this', color: '#8C9CFF', dashed: true, values: result.scenario.points.map((p) => p.centralMinor) },
        ]}
      />
      {!result.scenario.spending ? <p className="hint">Everyday spending isn’t included yet. Record a few more weeks for a fuller picture.</p> : null}
      <details>
        <summary className="link" style={{ cursor: 'pointer' }}>
          How this was worked out
        </summary>
        <ul className="small secondary" style={{ paddingLeft: 18, margin: '8px 0 0', lineHeight: 1.6 }}>
          {[...result.scenarioAssumptions, ...result.scenario.assumptions].map((a) => (
            <li key={a}>{a}</li>
          ))}
          <li>This is an estimate from your records, not a guarantee. Engine {result.engineVersion}.</li>
        </ul>
      </details>
      <div className="row-between" style={{ flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8 }}>
        {inputs.template === 'one_off_expense' ? (
          <Button
            size="sm"
            icon={Target}
            onClick={() => {
              saveGoal({ name: inputs.label || 'Planned purchase', icon: 'gift', targetMinor: inputs.amountMinor, savedMinor: 0, targetDate: inputs.date });
              navigate('/goals');
            }}
          >
            Start a fund for this
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          icon={Bookmark}
          disabled={saved}
          onClick={() => {
            saveScenario({ name: msg.question, inputs, horizonDays: msg.horizon, engineVersion: result.engineVersion });
            setSaved(true);
          }}
        >
          {saved ? 'Saved' : 'Save scenario'}
        </Button>
      </div>
    </>
  );
}

export function FutureSelf() {
  const location = useLocation();
  const { data, today, currency } = useStore();
  const { position } = useFinance();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    const intro: Message = {
      id: mid(),
      role: 'safey',
      kind: 'text',
      chips: true,
      text: 'Hi! Ask me a “what if” and I’ll compare your next few weeks with and without the change, using only your own records.',
    };
    const preset = (location.state as { preset?: { template: 'recurring_savings'; amountMinor: number; frequency: 'weekly' | 'monthly' } } | null)?.preset;
    if (!preset) return [intro];
    return [
      intro,
      { id: mid(), role: 'user', text: `Can I save ${money(preset.amountMinor, data.profile?.defaultCurrency ?? 'GHS')} every month?` },
      { id: mid(), role: 'safey', kind: 'form', done: false, draft: { template: 'recurring_savings', amount: minorToInput(preset.amountMinor), frequency: preset.frequency } },
    ];
  });

  const navigate = useNavigate();
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (messages.length < 2) return;
    const asked = endRef.current?.parentElement?.querySelectorAll('.bubble-user');
    asked?.[asked.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [messages.length]);

  const ask = (question: string, draft: Draft) => {
    setMessages((m) => [...m, { id: mid(), role: 'user', text: question }, { id: mid(), role: 'safey', kind: 'form', draft, done: false }]);
  };

  const run = (formId: number, inputs: ScenarioInputs, horizon: number) => {
    const result = simulate({ today, horizonDays: horizon, startBalanceMinor: position.totalMinor, plannedItems: data.plannedItems, transactions: data.transactions, scenario: inputs });
    const incomeLabel = inputs.template === 'delayed_income' ? data.plannedItems.find((p) => p.id === inputs.plannedItemId)?.label : undefined;
    const question = questionFor(inputs, currency, incomeLabel);
    setMessages((m) => [
      ...m.map((x) => (x.id === formId && x.role === 'safey' && x.kind === 'form' ? { ...x, done: true } : x)),
      { id: mid(), role: 'user', text: question },
      { id: mid(), role: 'safey', kind: 'result', question, inputs, horizon, result },
      { id: mid(), role: 'safey', kind: 'text', chips: true, text: 'Want to try another?' },
    ]);
  };

  const send = () => {
    const q = text.trim();
    if (!q) return;
    setText('');
    const draft = parseQuestion(q);
    if (draft) ask(q, draft);
    else
      setMessages((m) => [
        ...m,
        { id: mid(), role: 'user', text: q },
        { id: mid(), role: 'safey', kind: 'text', chips: true, text: 'I can test four kinds of question: a one-off cost, late income, regular saving, or a change in income or spending. Pick one to start.' },
      ]);
  };

  const lastChips = [...messages].reverse().find((m) => m.role === 'safey' && m.kind === 'text' && m.chips)?.id;

  return (
    <div className="page">
      <PageHeader title="Future Self" />
      {data.transactions.length === 0 ? (
        <div className="banner banner--info small">Add some records first. Answers are only as good as what Safey knows about your money.</div>
      ) : null}
      <div className="chat" aria-live="polite">
        {messages.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="bubble-user">
                {m.text}
              </div>
            );
          }
          if (m.kind === 'text') {
            return (
              <div key={m.id} className="bubble-safey">
                <div className="who">
                  <span className="safey-dot">
                    <Sparkle size={16} fill="currentColor" />
                  </span>
                  <div>{m.text}</div>
                </div>
                {m.chips && m.id === lastChips ? (
                  <div className="chips" style={{ flexWrap: 'wrap' }}>
                    {SUGGESTIONS.map((s) => (
                      <button key={s.template} className="chip" onClick={() => ask(s.text, { template: s.template })}>
                        {s.text}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }
          if (m.kind === 'form') {
            return (
              <div key={m.id} className="bubble-safey" style={m.done ? { opacity: 0.6 } : undefined}>
                <div className="who">
                  <span className="safey-dot">
                    <Sparkle size={16} fill="currentColor" />
                  </span>
                  <div>{m.done ? `${TEMPLATE_LABELS[m.draft.template]}: answered below.` : 'Let’s check the details.'}</div>
                </div>
                {m.done ? null : <ScenarioForm draft={m.draft} onSubmit={(inputs, h) => run(m.id, inputs, h)} />}
              </div>
            );
          }
          return (
            <div key={m.id} className="bubble-safey">
              <ResultCard msg={m} />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a what-if, e.g. can I afford 800 for a phone?" aria-label="Ask Safey a what-if question" />
        <button className="send" type="submit" disabled={!text.trim()} aria-label="Send">
          <ArrowUp size={20} />
        </button>
      </form>
      <p className="hint" style={{ textAlign: 'center' }}>
        Calculated on this device from your records. No AI, no guesses about income you haven’t entered.
      </p>
    </div>
  );
}
