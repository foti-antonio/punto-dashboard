import {
  emptyData,
  demoData,
  parseMoney,
  euro,
  accountBalance,
  liquidity,
  projectResult,
  validateData,
  list,
  today,
  shiftDate,
  shiftMonth,
  occurrences,
  forecastSeries,
  mergeData,
  resolveMerge,
  equal,
  type Data,
  type Account,
  type Transaction,
  type Forecast,
  type Scenario,
  type Project,
} from '../src/domain';
const ts = '2026-01-01T00:00:00.000Z';
export function fixture(): Data {
  const data = emptyData();
  data.entities.a = {
    id: 'a',
    type: 'account',
    name: 'Lavoro',
    openingCents: 100000,
    openingDate: shiftMonth(today(), -12),
    scope: 'lavoro',
    updatedAt: ts,
  } satisfies Account;
  data.entities.b = {
    ...data.entities.a,
    id: 'b',
    name: 'Personale',
    openingCents: 50000,
    scope: 'personale',
  } as Account;
  data.entities.p = {
    id: 'p',
    type: 'project',
    name: 'Progetto',
    description: '',
    notes: '',
    status: 'attivo',
    scope: 'lavoro',
    startDate: today(),
    endDate: '',
    targetCents: 100000,
    color: '#123456',
    updatedAt: ts,
  } satisfies Project;
  return data;
}
export function transaction(patch: Partial<Transaction> = {}): Transaction {
  return {
    id: 't',
    type: 'transaction',
    name: 'Compenso',
    amountCents: 12345,
    date: today(),
    direction: 'income',
    accountId: 'a',
    toAccountId: '',
    projectId: 'p',
    categoryId: 'category-0',
    scope: 'lavoro',
    forecastKey: '',
    notes: '',
    updatedAt: ts,
    ...patch,
  };
}
export function forecast(patch: Partial<Forecast> = {}): Forecast {
  return {
    id: 'f',
    type: 'forecast',
    name: 'Previsto',
    amountCents: 10000,
    date: today(),
    direction: 'income',
    accountId: 'a',
    projectId: 'p',
    categoryId: '',
    scope: 'lavoro',
    recurrence: 'none',
    endDate: '',
    updatedAt: ts,
    ...patch,
  };
}
