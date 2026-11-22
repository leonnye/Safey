import { ArrowRight, Check, ChevronLeft, DollarSign, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/safey-mark-alpha.png';
import { Button, Field, MoneyInput, Tile } from '@/components/ui';
import { currencyInfo, parseMoneyInput } from '@/domain/money';
import type { CurrencyCode, SourceKind } from '@/domain/types';
import { money } from '@/lib/format';
import { SOURCE_KINDS, sourceVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';

function GhanaFlag() {
  return (
    <svg viewBox="0 0 42 42" width="42" height="42" aria-hidden>
      <rect width="42" height="14" fill="#CE1126" />
      <rect y="14" width="42" height="14" fill="#FCD116" />
      <rect y="28" width="42" height="14" fill="#006B3F" />
      <path d="M21 15.2l1.6 4.6h4.9l-4 2.9 1.5 4.7-4-2.9-4 2.9 1.5-4.7-4-2.9h4.9z" fill="#000" />
    </svg>
  );
}

const CURRENCIES: { code: CurrencyCode; title: string }[] = [
  { code: 'GHS', title: 'Ghanaian Cedi (GH₵)' },
  { code: 'USD', title: 'US Dollar (USD)' },
];

const DEFAULT_NAMES: Record<SourceKind, string> = {
  cash: 'Cash',
  mobile_money_manual: 'MTN MoMo Wallet',
  bank_manual: 'Bank account',
  other: 'Savings',
};

export function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [adult, setAdult] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('GHS');
  const [kind, setKind] = useState<SourceKind>('mobile_money_manual');
  const [label, setLabel] = useState(DEFAULT_NAMES.mobile_money_manual);
  const [opening, setOpening] = useState('');
  const [buffer, setBuffer] = useState('200');
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) return setError('Enter the name you want Safey to use.');
      if (!adult) return setError('Safey is for adults. Confirm you are 18 or older to continue.');
    }
    if (step === 3 && opening.trim()) {
      const p = parseMoneyInput(opening);
      if (!p.ok) return setError(p.error);
    }
    if (step === 4) {
      const b = buffer.trim() ? parseMoneyInput(buffer) : { ok: true as const, minor: 0 };
      if (!b.ok) return setError(b.error);
      const o = opening.trim() ? parseMoneyInput(opening) : { ok: true as const, minor: 0 };
      completeOnboarding({
        displayName: name,
        currency,
        bufferMinor: b.minor,
        source: label.trim() ? { label: label.trim(), kind, openingBalanceMinor: o.ok ? o.minor : 0 } : null,
      });
      navigate('/home', { replace: true });
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="onboard">
      <div className="onboard-top">
        {step > 1 ? (
          <button className="icon-btn" aria-label="Back" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft size={20} />
          </button>
        ) : (
          <button className="icon-btn" aria-label="Back to welcome" onClick={() => navigate('/welcome')}>
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="steps" aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <span>{step}/4</span>
      </div>

      <div className="onboard-body">
        {step === 1 && (
          <>
            <div className="auth-brand" style={{ marginTop: 12 }}>
              <img src={logo} alt="" />
              Safey
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 className="title-xl">Welcome</h1>
              <p className="lead" style={{ marginTop: 8 }}>
                Let’s set up your private space.
              </p>
            </div>
            <div className="card stack" style={{ padding: 14 }}>
              <div className="row-between" style={{ justifyContent: 'flex-start' }}>
                <Tile visual={{ icon: Lock, hue: '#B9A3FF' }} size={18} />
                <p className="small secondary">No account, no bank login and no PIN. Everything you enter stays in this browser on this device.</p>
              </div>
            </div>
            <div className="divider-or">your details</div>
            <Field label="What should we call you?">
              <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ama" autoFocus autoComplete="given-name" />
            </Field>
            <label className="check">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />I confirm I am 18 or older.
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="title-xl">What’s your currency?</h1>
            <p className="lead">We’ll use this for all your balances, budgets and forecasts. You can switch later.</p>
            <div className="stack" role="radiogroup" aria-label="Currency">
              {CURRENCIES.map((c) => (
                <button key={c.code} className="option" role="radio" aria-checked={currency === c.code} onClick={() => setCurrency(c.code)}>
                  <span className="flag">{c.code === 'GHS' ? <GhanaFlag /> : <Tile visual={{ icon: DollarSign, hue: '#73D6AE' }} size={20} />}</span>
                  <span className="grow">
                    <span className="title">{c.title}</span>
                    <span className="small muted" style={{ display: 'block' }}>
                      e.g. {money(125050, c.code, { exact: true })}
                    </span>
                  </span>
                  {currency === c.code ? <ArrowRight size={20} /> : null}
                </button>
              ))}
            </div>
            <p className="hint">Switching currency later relabels your amounts. Safey does not convert exchange rates.</p>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="title-xl">Where do you keep your money?</h1>
            <p className="lead">Add one account to start. You can add more later.</p>
            <div className="grid-2">
              {SOURCE_KINDS.map((k) => (
                <button
                  key={k.value}
                  className="option"
                  role="radio"
                  aria-checked={kind === k.value}
                  onClick={() => {
                    setKind(k.value);
                    if (Object.values(DEFAULT_NAMES).includes(label) || !label.trim()) setLabel(DEFAULT_NAMES[k.value]);
                  }}
                  style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <Tile visual={sourceVisual(k.value)} solid />
                  <span className="title">{k.label}</span>
                </button>
              ))}
            </div>
            <Field label="Account name">
              <input className="input" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <Field label="How much is in it today?" hint="Optional. You can update it any time.">
              <MoneyInput value={opening} onChange={setOpening} currency={currency} small />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="title-xl">Your safety buffer</h1>
            <p className="lead">The amount you always want to keep available. Safey warns you early if your plans could take you below it.</p>
            <MoneyInput value={buffer} onChange={setBuffer} currency={currency} label={`Safety buffer in ${currencyInfo(currency).name}`} />
            <div className="card stack" style={{ padding: 14 }}>
              {['Warnings use simple, explained rules, not guesses.', 'Forecasts are estimates from your own records.', 'Nothing leaves this device unless you export it.'].map((t) => (
                <div key={t} className="row-between" style={{ justifyContent: 'flex-start' }}>
                  <Check size={18} color="var(--success)" />
                  <span className="small secondary">{t}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </div>

      <div className="stack">
        <Button block onClick={next} icon={step === 4 ? ShieldCheck : undefined}>
          {step === 4 ? 'Start using Safey' : 'Continue'}
        </Button>
        {step === 3 ? (
          <Button
            variant="ghost"
            block
            onClick={() => {
              setLabel('');
              setOpening('');
              setStep(4);
            }}
          >
            Skip for now
          </Button>
        ) : null}
      </div>
    </div>
  );
}
