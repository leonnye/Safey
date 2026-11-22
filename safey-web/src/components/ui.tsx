import { AlertCircle, ChevronLeft, Info, type LucideIcon, TriangleAlert, X } from 'lucide-react';
import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { currencyInfo } from '@/domain/money';
import type { CurrencyCode } from '@/domain/types';
import type { Visual } from '@/lib/visuals';

export function PageHeader({ title, back, action }: { title: string; back?: string | true; action?: ReactNode }) {
  const navigate = useNavigate();
  if (!back) {
    return (
      <header className="page-header page-header--left">
        <h1>{title}</h1>
        <div>{action}</div>
      </header>
    );
  }
  return (
    <header className="page-header">
      <button className="icon-btn" aria-label="Back" onClick={() => (back === true ? navigate(-1) : navigate(back))}>
        <ChevronLeft size={20} />
      </button>
      <h1>{title}</h1>
      <div style={{ justifySelf: 'end' }}>{action}</div>
    </header>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  block,
  size,
  icon: Icon,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; block?: boolean; size?: 'sm'; icon?: LucideIcon }) {
  return (
    <button className={`btn btn--${variant} ${block ? 'btn--block' : ''} ${size ? `btn--${size}` : ''} ${className}`} {...rest}>
      {Icon ? <Icon size={size ? 16 : 18} /> : null}
      {children}
    </button>
  );
}

export function Tile({ visual, size = 20, solid, large }: { visual: Visual; size?: number; solid?: boolean; large?: boolean }) {
  const Icon = visual.icon;
  return (
    <span className={`tile ${solid ? 'tile--solid' : ''} ${large ? 'tile--lg' : ''}`} style={{ '--hue': visual.hue } as CSSProperties} aria-hidden>
      <Icon size={size} />
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
  label,
}: {
  value: T;
  options: { value: T; label: string; className?: string }[];
  onChange: (v: T) => void;
  className?: string;
  label: string;
}) {
  return (
    <div className={`seg ${className}`} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={o.className} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
      {error ? <span className="error-text">{error}</span> : null}
    </label>
  );
}

export function MoneyInput({
  value,
  onChange,
  currency,
  small,
  autoFocus,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: CurrencyCode;
  small?: boolean;
  autoFocus?: boolean;
  label?: string;
}) {
  const id = useId();
  return (
    <div className={`money-input ${small ? 'sm' : ''}`}>
      <span className="cur" aria-hidden>
        {currencyInfo(currency).symbol}
      </span>
      <input
        id={id}
        aria-label={label ?? `Amount in ${currencyInfo(currency).name}`}
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      />
    </div>
  );
}

export function Progress({ ratio, large, tone }: { ratio: number; large?: boolean; tone?: 'auto' | 'plain' }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const state = tone === 'plain' ? '' : ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : '';
  return (
    <div className={`progress ${large ? 'progress--lg' : ''} ${state}`} role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger'; children: ReactNode }) {
  const Icon = tone === 'danger' ? AlertCircle : tone === 'warning' ? TriangleAlert : Info;
  return (
    <div className={`banner banner--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ visual, title, children, action }: { visual: Visual; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Tile visual={visual} size={26} />
      <h3 className="title-md">{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Toast({ message, actionLabel, onAction, onDone }: { message: string; actionLabel?: string; onAction?: () => void; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [onDone]);
  return createPortal(
    <div className="toast" role="status">
      <span>{message}</span>
      {actionLabel ? (
        <button
          className="link"
          onClick={() => {
            onAction?.();
            onDone();
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
