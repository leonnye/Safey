export const ENGINE_VERSION = 'engine-1.0.0';

/**
 * PROVISIONAL defaults. The PRD leaves thresholds, coverage minimums and the forecast
 * horizon to be validated with Ghana-based users; change them here, not in screens.
 */
export const PROVISIONAL = {
  coverage: {
    windowDays: 30,
    minActiveDaysForPartial: 4,
    minActiveDaysForGood: 10,
    staleAfterDays: 14,
  },
  spending: {
    historyWeeks: 8,
    minRecordedWeeksForRate: 3,
  },
  projection: {
    defaultHorizonDays: 30,
    allowedHorizons: [30, 60, 90],
  },
  warnings: {
    lowFunds: { horizonDays: 30 },
    billCluster: { windowDays: 7, minBills: 2, shareOfBalancePercent: 50 },
    categorySpend: {
      minPriorWeeks: 4,
      ratioPercent: 150,
      minDifferenceMinor: 5_000,
    },
    budget: { nearLimitPercent: 80 },
    stale: { afterDays: 14 },
  },
} as const;
