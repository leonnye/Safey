import { BellOff, CalendarClock, ChevronRight, Clock, EyeOff, type LucideIcon, PieChart, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Banner, Button, Empty, PageHeader, Tile } from '@/components/ui';
import { addDays, formatDate, formatShortDate } from '@/domain/dates';
import type { Insight, NextStepAction } from '@/domain/engine/warnings';
import { useStore } from '@/store/store';
import { useFinance } from '@/store/useFinance';

function look(i: Insight): { tone: string; icon: LucideIcon } {
  switch (i.ruleId) {
    case 'low_projected_funds':
      return { tone: i.severity === 'urgent' ? 'tone-urgent' : 'tone-attention', icon: TrendingDown };
    case 'bill_cluster':
      return { tone: 'tone-attention', icon: CalendarClock };
    case 'budget_progress':
      return { tone: i.severity === 'urgent' ? 'tone-urgent' : 'tone-budget', icon: PieChart };
    case 'category_spend_above_usual':
      return { tone: 'tone-attention', icon: TrendingUp };
    default:
      return { tone: 'tone-info', icon: Clock };
  }
}

const TONE_HUE: Record<string, string> = {
  'tone-urgent': '#FF4B5C',
  'tone-attention': '#F29A5B',
  'tone-budget': '#A98CFF',
  'tone-info': '#91B9FF',
};

function periodText(i: Insight) {
  return i.period.start === i.period.end ? formatShortDate(i.period.start) : `${formatShortDate(i.period.start)} – ${formatShortDate(i.period.end)}`;
}

export function Alerts() {
  const navigate = useNavigate();
  const { warnings, visible, coverage } = useFinance();
  const hidden = warnings.insights.filter((i) => !visible.includes(i));

  return (
    <div className="page">
      <PageHeader title="Early warnings" back />
      <p className="small secondary">Safey checks your records with simple, explained rules and tells you early, before things become a problem.</p>

      {visible.length === 0 ? (
        <div className="card">
          <Empty visual={{ icon: ShieldCheck, hue: '#73D6AE' }} title="All clear for now">
            {coverage.level === 'none' || coverage.level === 'sparse'
              ? 'Some checks need a few more days of records before they can run.'
              : 'Nothing in your records needs attention right now.'}
          </Empty>
        </div>
      ) : (
        <div className="stack-cards">
          {visible.map((i) => {
            const l = look(i);
            return (
              <button key={i.fingerprint} className={`alert-card ${l.tone}`} onClick={() => navigate(`/alerts/${encodeURIComponent(i.fingerprint)}`)}>
                <Tile visual={{ icon: l.icon, hue: TONE_HUE[l.tone]! }} solid size={19} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{i.title}</h3>
                  <p className="small secondary" style={{ marginTop: 4 }}>
                    {i.observation}
                  </p>
                  <p className="tiny muted" style={{ marginTop: 8 }}>
                    {periodText(i)}
                  </p>
                </div>
                <ChevronRight size={20} className="muted" style={{ alignSelf: 'center' }} />
              </button>
            );
          })}
        </div>
      )}

      {warnings.suppressed.length > 0 ? (
        <details className="card">
          <summary>
            Waiting for more data <span className="badge">{warnings.suppressed.length}</span>
          </summary>
          <div className="stack">
            {warnings.suppressed.map((s) => (
              <div key={s.ruleId}>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div className="small muted">{s.reason}</div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {hidden.length > 0 ? (
        <details className="card">
          <summary>
            Dismissed or snoozed <span className="badge">{hidden.length}</span>
          </summary>
          <div className="list">
            {hidden.map((i) => (
              <Link key={i.fingerprint} className="list-row" to={`/alerts/${encodeURIComponent(i.fingerprint)}`}>
                <EyeOff size={18} className="muted" />
                <div className="grow">
                  <div className="title">{i.title}</div>
                  <div className="sub">{periodText(i)}</div>
                </div>
              </Link>
            ))}
          </div>
        </details>
      ) : null}

      <p className="hint">{coverage.description}</p>
    </div>
  );
}

const ACTION_ROUTES: Record<NextStepAction, string> = {
  open_plan: '/bills',
  open_activity: '/transactions',
  add_record: '/transactions/new',
  open_simulator: '/future',
  open_sources: '/accounts',
};

export function AlertDetail() {
  const { fingerprint = '' } = useParams();
  const navigate = useNavigate();
  const { data, today, setInsightState } = useStore();
  const { warnings } = useFinance();
  const insight = warnings.insights.find((i) => i.fingerprint === fingerprint);

  if (!insight) {
    return (
      <div className="page">
        <PageHeader title="Warning" back="/alerts" />
        <Banner>This warning no longer applies. Your records have changed since it was shown.</Banner>
      </div>
    );
  }
  const l = look(insight);
  const state = data.insightStates.find((s) => s.fingerprint === insight.fingerprint);
  const isHidden = state && (state.status === 'dismissed' || (state.snoozedUntil !== null && state.snoozedUntil > today));
  const route = insight.ruleId === 'budget_progress' ? '/budgets' : ACTION_ROUTES[insight.nextStep.action];

  return (
    <div className="page">
      <PageHeader title="Early warning" back="/alerts" />
      <div className={`alert-card ${l.tone}`} style={{ cursor: 'default' }}>
        <Tile visual={{ icon: l.icon, hue: TONE_HUE[l.tone]! }} solid size={19} />
        <div>
          <h3 style={{ fontSize: 18 }}>{insight.title}</h3>
          <p className="secondary" style={{ marginTop: 6, lineHeight: 1.5 }}>
            {insight.observation}
          </p>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {formatDate(insight.period.start)}
            {insight.period.end !== insight.period.start ? ` – ${formatDate(insight.period.end)}` : ''}
          </p>
        </div>
      </div>

      {insight.evidence.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Why Safey thinks this</h2>
          </div>
          <div className="card kv" style={{ padding: 0 }}>
            {insight.evidence.map((e) => (
              <div key={e.label}>
                <span>{e.label}</span>
                <span>{e.value}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="card stack">
        <div>
          <div className="label">Based on</div>
          <p className="small" style={{ marginTop: 4 }}>
            {insight.dataBasis}
          </p>
        </div>
        <div>
          <div className="label">Keep in mind</div>
          <p className="small" style={{ marginTop: 4 }}>
            {insight.caveat}
          </p>
        </div>
        <div>
          <div className="label">The rule</div>
          <p className="small" style={{ marginTop: 4 }}>
            {insight.ruleDescription} <span className="muted">({insight.ruleId} v{insight.ruleVersion})</span>
          </p>
        </div>
      </div>

      <Button block onClick={() => navigate(route)}>
        {insight.nextStep.label}
      </Button>
      {isHidden ? (
        <Button variant="secondary" block onClick={() => setInsightState(insight.fingerprint, null)}>
          Show this again
        </Button>
      ) : (
        <div className="grid-2">
          <Button
            variant="secondary"
            icon={BellOff}
            onClick={() => {
              setInsightState(insight.fingerprint, 'snoozed', addDays(today, 7));
              navigate('/alerts');
            }}
          >
            Snooze 7 days
          </Button>
          <Button
            variant="secondary"
            icon={EyeOff}
            onClick={() => {
              setInsightState(insight.fingerprint, 'dismissed');
              navigate('/alerts');
            }}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
