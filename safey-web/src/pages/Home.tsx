import { ArrowRight, Bell, CalendarClock, CheckCircle2, FileUp, Plus, Settings, Sparkle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BalanceChart } from '@/components/charts';
import { sortTxns, TxnRow } from '@/components/finance';
import { Button, Empty, Progress, Tile } from '@/components/ui';
import { startOfMonth } from '@/domain/dates';
import { simulate } from '@/domain/engine/simulator';
import { periodSummary } from '@/domain/engine/summary';
import { dueIn, formatShortDate, greeting, initials, money } from '@/lib/format';
import { categoryVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';
import { useBalanceHistory, useFinance, useLookups } from '@/store/useFinance';

function LatestWhatIf() {
  const { data, today } = useStore();
  const { position } = useFinance();
  const latest = data.scenarios[0];
  if (!latest) return null;
  const result = simulate({
    today,
    horizonDays: latest.horizonDays,
    startBalanceMinor: position.totalMinor,
    plannedItems: data.plannedItems,
    transactions: data.transactions,
    scenario: latest.inputs,
  });
  if (result.error) return null;
  const low = result.scenario.lowestCentral.valueMinor;
  const buffer = data.profile?.bufferMinor ?? 0;
  const head = low >= buffer ? 'Looks manageable' : low >= 0 ? 'It’s tight' : 'Looks risky';
  const tone = low >= buffer ? 'in' : low >= 0 ? '' : 'out';
  return (
    <Link to="/future" className="home-whatif">
      <Sparkle size={15} />
      <span className={`small ${tone}`}>{head}</span>
      <span className="ask">{latest.name}</span>
    </Link>
  );
}

function SafeyNoticed() {
  const { visible, coverage } = useFinance();
  const navigate = useNavigate();
  const top = visible[0];
  if (top) {
    return (
      <button className="notice" onClick={() => navigate(`/alerts/${encodeURIComponent(top.fingerprint)}`)}>
        <Tile visual={{ icon: Sparkle, hue: top.severity === 'urgent' ? '#FF4B5C' : '#F4C46B' }} solid />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label" style={{ color: 'var(--text)', fontWeight: 600 }}>
            Safey noticed{visible.length > 1 ? ` · ${visible.length} things` : ''}
          </div>
          <div className="small secondary clamp-2" style={{ marginTop: 2 }}>
            {top.title}. {top.observation}
          </div>
        </div>
        <ArrowRight size={20} />
      </button>
    );
  }
  const message =
    coverage.level === 'none'
      ? 'Add a few records and Safey will start looking ahead for you.'
      : coverage.level === 'sparse'
        ? 'Keep recording for a few more days so warnings can switch on.'
        : 'Nothing needs your attention right now.';
  return (
    <Link className="notice" to="/alerts">
      <Tile visual={{ icon: CheckCircle2, hue: '#73D6AE' }} solid />
      <div style={{ flex: 1 }}>
        <div className="label" style={{ color: 'var(--text)', fontWeight: 600 }}>
          Safey is watching
        </div>
        <div className="small secondary" style={{ marginTop: 2 }}>
          {message}
        </div>
      </div>
      <ArrowRight size={20} />
    </Link>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { data, today, currency } = useStore();
  const { position, visible, expectedIncomeMinor, upcomingBillsMinor, upcoming } = useFinance();
  const history = useBalanceHistory(30);
  const { category } = useLookups();

  const first = history[0]?.valueMinor ?? 0;
  const last = position.totalMinor;
  const delta = first > 0 ? Math.round(((last - first) / first) * 100) : null;

  const month = periodSummary(data.transactions, startOfMonth(today), today);
  const budgets = new Map(data.budgets.filter((b) => b.period === 'month').map((b) => [b.categoryId, b]));
  const monthRows = month.expenseByCategory.slice(0, 5);
  const recent = sortTxns(data.transactions).slice(0, 5);
  const bills = upcoming.filter((o) => o.direction === 'expense').slice(0, 4);
  const name = data.profile?.displayName ?? '';

  return (
    <div className="page page--wide">
      <header className="row-between">
        <Link to="/settings" className="row-between" style={{ justifyContent: 'flex-start' }} aria-label="Profile and settings">
          <span className="avatar">{initials(name)}</span>
          <span>
            <span className="small secondary" style={{ display: 'block' }}>
              {greeting()},
            </span>
            <span className="title-md">{name}</span>
          </span>
        </Link>
        <div className="row-between" style={{ gap: 8 }}>
          <Link to="/transactions/new" className="icon-btn hide-desktop" aria-label="Add transaction">
            <Plus size={19} />
          </Link>
          <Link to="/settings" className="icon-btn hide-desktop" aria-label="Settings">
            <Settings size={19} />
          </Link>
          <Link to="/alerts" className="icon-btn" aria-label={`Early warnings${visible.length ? `, ${visible.length} active` : ''}`}>
            <Bell size={19} />
            {visible.length ? <span className="dot" /> : null}
          </Link>
        </div>
      </header>

      {data.profile?.mode === 'demo' ? (
        <div className="banner banner--warning small">You’re exploring sample data. Start fresh from Settings whenever you’re ready.</div>
      ) : null}

      <div className="home-grid">
        <div className="stack" style={{ gap: 16 }}>
          <Link to="/accounts" className="hero-card" aria-label={`Total balance ${money(last, currency, { exact: true })}`}>
            <div className="label">Total Balance</div>
            {delta !== null && delta !== 0 ? (
              <span className={`chip-delta ${delta < 0 ? 'down' : ''}`}>
                {delta > 0 ? '↗' : '↘'} {delta > 0 ? '+' : ''}
                {delta}%
              </span>
            ) : null}
            <div className="hero-amount num">{money(last, currency, { exact: true })}</div>
            <div className="small" style={{ color: 'rgba(246,243,252,0.65)' }}>
              {delta ? 'vs 30 days ago' : `Across ${position.sources.length} account${position.sources.length === 1 ? '' : 's'}`}
              {upcomingBillsMinor > 0 ? (
                <span className="tiny" style={{ display: 'block', marginTop: 2, color: last >= upcomingBillsMinor ? 'rgba(246,243,252,0.72)' : '#ffb0b7' }}>
                  {last >= upcomingBillsMinor
                    ? `${money(last - upcomingBillsMinor, currency)} left after bills due in 30 days`
                    : `Bills due in 30 days are ${money(upcomingBillsMinor - last, currency)} more than this`}
                </span>
              ) : null}
            </div>
            <div style={{ margin: '8px -6px 0' }}>
              <BalanceChart values={history.map((h) => h.valueMinor)} />
            </div>
          </Link>

          <div className="grid-2">
            <Link to="/bills" className="card card--link stat-card">
              <div className="label">Expected Income</div>
              <div className="value num in">{money(expectedIncomeMinor, currency)}</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                Next 30 days
              </div>
            </Link>
            <Link to="/bills" className="card card--link stat-card">
              <div className="label">Upcoming Bills</div>
              <div className="value num out">{money(upcomingBillsMinor, currency)}</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                Next 30 days
              </div>
            </Link>
          </div>

          <LatestWhatIf />
          <div className="only-mobile">
            <SafeyNoticed />
          </div>

          <div className="section-head">
            <h2>This month</h2>
            <Link className="link" to="/budgets">
              See all ›
            </Link>
          </div>
          <div className="card card--flush">
            {monthRows.length === 0 ? (
              <Empty visual={{ icon: Plus, hue: '#B9A3FF' }} title="No spending recorded this month">
                Add what you spend and Safey will show where it goes.
              </Empty>
            ) : (
              <div className="list">
                {monthRows.map((row) => {
                  const b = budgets.get(row.categoryId);
                  const cat = category(row.categoryId);
                  return (
                    <Link to="/budgets" key={row.categoryId} className="list-row">
                      <Tile visual={categoryVisual(cat)} />
                      <div className="grow">
                        <div className="title">{cat?.name ?? 'Other'}</div>
                        <div className="sub num">
                          {b
                            ? row.totalMinor > b.limitMinor
                              ? `${money(row.totalMinor - b.limitMinor, currency)} over the limit`
                              : `${money(b.limitMinor - row.totalMinor, currency)} left of ${money(b.limitMinor, currency)}`
                            : `${row.count} record${row.count === 1 ? '' : 's'} · no limit`}
                        </div>
                        {b ? (
                          <div style={{ marginTop: 8 }}>
                            <Progress ratio={row.totalMinor / b.limitMinor} />
                          </div>
                        ) : null}
                      </div>
                      <div className="amount num out">{money(row.totalMinor, currency)}</div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="only-desktop">
            <SafeyNoticed />
          </div>

          <div className="section-head">
            <h2>Recent activity</h2>
            <Link className="link" to="/transactions">
              See all ›
            </Link>
          </div>
          <div className="card card--flush">
            {recent.length === 0 ? (
              <Empty
                visual={{ icon: FileUp, hue: '#91B9FF' }}
                title="No records yet"
                action={
                  <div className="row-between">
                    <Button size="sm" icon={Plus} onClick={() => navigate('/transactions/new')}>
                      Add
                    </Button>
                    <Button size="sm" variant="secondary" icon={FileUp} onClick={() => navigate('/import')}>
                      Import CSV
                    </Button>
                  </div>
                }
              >
                Add your first income or expense, or import a statement.
              </Empty>
            ) : (
              <div className="list">
                {recent.map((t) => (
                  <TxnRow key={t.id} t={t} />
                ))}
              </div>
            )}
          </div>

          <div className="section-head">
            <h2>Bills coming up</h2>
            <Link className="link" to="/bills">
              Manage ›
            </Link>
          </div>
          <div className="card card--flush">
            {bills.length === 0 ? (
              <Empty visual={{ icon: CalendarClock, hue: '#F4C46B' }} title="No bills planned">
                Add rent, utilities or school fees so forecasts include them.
              </Empty>
            ) : (
              <div className="list">
                {bills.map((o) => (
                  <Link to="/bills" key={o.key} className="list-row">
                    <Tile visual={categoryVisual(category(data.plannedItems.find((p) => p.id === o.itemId)?.categoryId ?? null))} />
                    <div className="grow">
                      <div className="title">{o.label}</div>
                      <div className="sub">{formatShortDate(o.date)}</div>
                    </div>
                    <span className={`badge ${dueIn(o.date, today).match(/^(Today|[1-3] day)/) ? 'badge--danger' : ''}`}>{dueIn(o.date, today)}</span>
                    <div className="amount num out" style={{ minWidth: 76, textAlign: 'right' }}>
                      {money(o.amountMinor, currency)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
