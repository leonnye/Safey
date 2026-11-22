import { Link } from 'react-router-dom';
import type { Transaction } from '@/domain/types';
import { relativeDay, signedMoney } from '@/lib/format';
import { categoryVisual } from '@/lib/visuals';
import { useStore } from '@/store/store';
import { useLookups } from '@/store/useFinance';
import { Tile } from './ui';

export function TxnRow({ t }: { t: Transaction }) {
  const { today, currency } = useStore();
  const { category, categoryName, sourceLabel } = useLookups();
  const cat = category(t.categoryId);
  const title = t.note || categoryName(t.categoryId);
  return (
    <Link to={`/transactions/${t.id}`} className="list-row" aria-label={`${title}, ${t.direction === 'income' ? 'money in' : 'money out'} ${signedMoney(t.amountMinor, t.direction, currency)}, ${relativeDay(t.date, today)}`}>
      <Tile visual={categoryVisual(cat)} />
      <div className="grow">
        <div className="title">{title}</div>
        <div className="sub">
          {relativeDay(t.date, today)} • {t.note ? categoryName(t.categoryId) : sourceLabel(t.sourceId)}
          {t.origin === 'csv' ? ' • Imported' : ''}
        </div>
      </div>
      <div className={`amount num ${t.direction === 'income' ? 'in' : 'out'}`}>{signedMoney(t.amountMinor, t.direction, t.currency)}</div>
    </Link>
  );
}

export function sortTxns(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
