export type Scope = 'personale' | 'lavoro';
export type Kind =
  | 'account'
  | 'category'
  | 'project'
  | 'task'
  | 'transaction'
  | 'forecast'
  | 'scenario'
  | 'settings';
export interface Base {
  id: string;
  type: Kind;
  updatedAt: string;
  deletedAt?: string;
}
export interface Account extends Base {
  type: 'account';
  name: string;
  openingCents: number;
  openingDate: string;
  scope: Scope;
}
export interface Category extends Base {
  type: 'category';
  name: string;
  color: string;
}
export interface Project extends Base {
  type: 'project';
  name: string;
  description: string;
  status: 'idea' | 'attivo' | 'pausa' | 'completato' | 'archiviato';
  scope: Scope;
  startDate: string;
  endDate: string;
  targetCents: number;
  notes: string;
  color: string;
}
export interface Task extends Base {
  type: 'task';
  name: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'alta' | 'media' | 'bassa';
  due: string;
  scope: Scope;
  projectId: string;
  notes: string;
  subtasks: { id: string; name: string; done: boolean }[];
}
export interface Transaction extends Base {
  type: 'transaction';
  name: string;
  date: string;
  direction: 'income' | 'expense' | 'transfer';
  amountCents: number;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  projectId: string;
  scope: Scope;
  forecastKey: string;
  notes: string;
}
export interface Forecast extends Base {
  type: 'forecast';
  name: string;
  date: string;
  direction: 'income' | 'expense';
  amountCents: number;
  accountId: string;
  categoryId: string;
  projectId: string;
  scope: Scope;
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly';
  endDate: string;
}
export interface Adjustment {
  date?: string;
  amountCents?: number;
  excluded?: boolean;
}
export interface Scenario extends Base {
  type: 'scenario';
  name: string;
  adjustments: Record<string, Adjustment>;
}
export interface Settings extends Base {
  type: 'settings';
  name: string;
  currency: 'EUR';
  timezone: 'Europe/Rome';
}
export type Entity =
  | Account
  | Category
  | Project
  | Task
  | Transaction
  | Forecast
  | Scenario
  | Settings;
export interface Data {
  schemaVersion: 1;
  entities: Record<string, Entity>;
}
export const colors = [
  '#2f7355',
  '#c98b44',
  '#7474b7',
  '#648ba8',
  '#c8756c',
  '#71816a',
];
export const newId = () => crypto.randomUUID();
export const stamp = () => new Date().toISOString();
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function shiftDate(date: string, days: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function shiftMonth(date: string, count: number) {
  const d = new Date(date + 'T12:00:00Z');
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + count);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export const euro = (cents: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
export const compactEuro = (cents: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
export const dateLabel = (date: string) =>
  date
    ? new Intl.DateTimeFormat('it-IT', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(new Date(date + 'T12:00:00Z'))
    : 'Nessuna scadenza';
export function parseMoney(input: string, decimal = ','): number {
  const value = input.trim().replace(/[€\s\u00a0]/g, '');
  const expression =
    decimal === ','
      ? /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/
      : /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;
  if (!expression.test(value))
    throw new Error('Importo non valido: usa al massimo due decimali.');
  const normalized = value.replaceAll(decimal === ',' ? '.' : ',', '');
  const [whole, fraction = ''] = normalized.replace(/^[+-]/, '').split(decimal);
  const cents =
    (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) *
    (value.startsWith('-') ? -1 : 1);
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > 1e12)
    throw new Error('Importo fuori limite.');
  return cents;
}
export const moneyInput = (cents: number) =>
  (cents / 100).toFixed(2).replace('.', ',');
export function list<T extends Kind>(
  data: Data,
  kind: T,
): Extract<Entity, { type: T }>[] {
  return Object.values(data.entities).filter(
    (e) => e.type === kind && !e.deletedAt,
  ) as Extract<Entity, { type: T }>[];
}
export function emptyData(): Data {
  const entities: Record<string, Entity> = {
    settings: {
      id: 'settings',
      type: 'settings',
      updatedAt: '2026-01-01T00:00:00.000Z',
      name: '',
      currency: 'EUR',
      timezone: 'Europe/Rome',
    },
  };
  [
    'Stipendio e compensi',
    'Casa e utenze',
    'Alimentari',
    'Software e servizi',
    'Trasporti',
    'Tempo libero',
    'Altro',
  ].forEach((name, i) => {
    const id = `category-${i}`;
    entities[id] = {
      id,
      type: 'category',
      name,
      color: colors[i % colors.length],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  });
  return { schemaVersion: 1, entities };
}
export function accountBalance(data: Data, accountId: string, asOf = today()) {
  const account = data.entities[accountId] as Account;
  if (!account || account.deletedAt || account.openingDate > asOf) return 0;
  return list(data, 'transaction')
    .filter((t) => t.date <= asOf)
    .reduce(
      (sum, t) =>
        sum +
        (t.accountId === accountId
          ? t.direction === 'income'
            ? t.amountCents
            : -t.amountCents
          : 0) +
        (t.direction === 'transfer' && t.toAccountId === accountId
          ? t.amountCents
          : 0),
      account.openingCents,
    );
}
export function liquidity(
  data: Data,
  scope: 'all' | Scope = 'all',
  asOf = today(),
) {
  return list(data, 'account')
    .filter((a) => scope === 'all' || a.scope === scope)
    .reduce((sum, a) => sum + accountBalance(data, a.id, asOf), 0);
}
export function projectResult(data: Data, projectId: string) {
  return list(data, 'transaction')
    .filter((t) => t.projectId === projectId && t.date <= today())
    .reduce(
      (sum, t) =>
        sum +
        (t.direction === 'income'
          ? t.amountCents
          : t.direction === 'expense'
            ? -t.amountCents
            : 0),
      0,
    );
}
export interface Occurrence {
  key: string;
  forecast: Forecast;
  date: string;
  amountCents: number;
  originalDate: string;
}
export function occurrenceDate(f: Forecast, index: number) {
  return f.recurrence === 'none'
    ? f.date
    : f.recurrence === 'weekly'
      ? shiftDate(f.date, index * 7)
      : shiftMonth(f.date, index * (f.recurrence === 'yearly' ? 12 : 1));
}
export function occurrenceReference(key: string) {
  const split = key.lastIndexOf('@');
  return {
    forecastId: key.slice(0, split),
    index: Number(key.slice(split + 1)),
  };
}
export function occurrences(
  data: Data,
  start: string,
  end: string,
  scenario?: Scenario,
): Occurrence[] {
  const matched = new Set(
    list(data, 'transaction')
      .map((t) => t.forecastKey)
      .filter(Boolean),
  );
  const result: Occurrence[] = [];
  for (const f of list(data, 'forecast')) {
    for (let index = 0; index < 5000; index++) {
      const originalDate = occurrenceDate(f, index);
      if (f.endDate && originalDate > f.endDate) break;
      const key = `${f.id}@${index}`;
      const adjustment = scenario?.adjustments[key];
      const date = adjustment?.date ?? originalDate;
      if (
        !matched.has(key) &&
        !adjustment?.excluded &&
        date >= start &&
        date <= end
      )
        result.push({
          key,
          forecast: f,
          date,
          amountCents: adjustment?.amountCents ?? f.amountCents,
          originalDate,
        });
      if (f.recurrence === 'none') break;
      if (
        originalDate > end &&
        !Object.keys(scenario?.adjustments ?? {}).some(
          (k) =>
            k.startsWith(`${f.id}@`) && occurrenceReference(k).index > index,
        )
      )
        break;
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export function forecastSeries(
  data: Data,
  scope: 'all' | Scope,
  scenario?: Scenario,
) {
  const start = today();
  let balance = liquidity(data, scope);
  const future = occurrences(
    data,
    start,
    shiftMonth(start.slice(0, 7) + '-01', 6),
    scenario,
  ).filter((o) => scope === 'all' || o.forecast.scope === scope);
  return Array.from({ length: 6 }, (_, index) => {
    const month = shiftMonth(start.slice(0, 7) + '-01', index).slice(0, 7);
    const movements = future.filter((o) => o.date.startsWith(month));
    const income = movements
      .filter((o) => o.forecast.direction === 'income')
      .reduce((n, o) => n + o.amountCents, 0);
    const expense = movements
      .filter((o) => o.forecast.direction === 'expense')
      .reduce((n, o) => n + o.amountCents, 0);
    balance += income - expense;
    return {
      label: new Intl.DateTimeFormat('it-IT', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(month + '-01T12:00:00Z')),
      value: balance,
      income,
      expense,
    };
  });
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
export interface Conflict {
  id: string;
  local?: Entity;
  remote?: Entity;
}
export function mergeData(base: Data | null, local: Data, remote: Data) {
  const entities: Record<string, Entity> = {};
  const conflicts: Conflict[] = [];
  for (const id of new Set([
    ...Object.keys(base?.entities ?? {}),
    ...Object.keys(local.entities),
    ...Object.keys(remote.entities),
  ])) {
    const b = base?.entities[id],
      l = local.entities[id],
      r = remote.entities[id];
    let chosen;
    if (equal(l, r)) chosen = l;
    else if (equal(l, b)) chosen = r;
    else if (equal(r, b)) chosen = l;
    else {
      conflicts.push({ id, local: l, remote: r });
      chosen = l;
    }
    if (chosen) entities[id] = chosen;
  }
  // Concurrent edits to different records can still invalidate a dependency.
  // Surface the changed account/project as an explicit conflict as well.
  const dependencyConflict = (id: string) => {
    if (
      id &&
      !equal(local.entities[id], remote.entities[id]) &&
      !conflicts.some((c) => c.id === id)
    )
      conflicts.push({
        id,
        local: local.entities[id],
        remote: remote.entities[id],
      });
  };
  for (const e of Object.values(entities)) {
    if (e.deletedAt) continue;
    if (e.type === 'transaction' || e.type === 'forecast') {
      const account = entities[e.accountId] as Account | undefined;
      if (
        !account ||
        account.deletedAt ||
        account.scope !== e.scope ||
        account.openingDate > e.date
      ) {
        dependencyConflict(e.accountId);
        dependencyConflict(e.id);
      }
      if (e.type === 'transaction' && e.direction === 'transfer') {
        const target = entities[e.toAccountId] as Account | undefined;
        if (!target || target.deletedAt || target.openingDate > e.date) {
          dependencyConflict(e.toAccountId);
          dependencyConflict(e.id);
        }
      }
      if (
        e.projectId &&
        (entities[e.projectId] as Project | undefined)?.scope !== e.scope
      ) {
        dependencyConflict(e.projectId);
        dependencyConflict(e.id);
      }
    }
    if (
      e.type === 'task' &&
      e.projectId &&
      (entities[e.projectId] as Project | undefined)?.scope !== e.scope
    ) {
      dependencyConflict(e.projectId);
      dependencyConflict(e.id);
    }
  }
  return { data: { schemaVersion: 1 as const, entities }, conflicts };
}
export function resolveMerge(
  data: Data,
  conflicts: Conflict[],
  choices: Record<string, 'local' | 'remote'>,
): Data {
  const result = structuredClone(data);
  for (const c of conflicts) {
    if (!choices[c.id])
      throw new Error('Scegli una versione per ogni conflitto.');
    const choice = c[choices[c.id]];
    if (choice) result.entities[c.id] = choice;
    else
      result.entities[c.id] = {
        ...(c.local ?? c.remote)!,
        deletedAt: stamp(),
        updatedAt: stamp(),
      };
  }
  return validateData(result);
}
export function validateData(input: unknown): Data {
  const bad = (message: string): never => {
    throw new Error(`Dati non validi: ${message}`);
  };
  if (!input || typeof input !== 'object') return bad('file JSON atteso.');
  const data = input as Data;
  if (
    data.schemaVersion !== 1 ||
    !data.entities ||
    typeof data.entities !== 'object' ||
    Array.isArray(data.entities)
  )
    return bad('versione o struttura non supportata.');
  const entries = Object.entries(data.entities);
  if (entries.length > 100000) return bad('troppi elementi.');
  if (Object.keys(data).some((k) => !['schemaVersion', 'entities'].includes(k)))
    return bad('proprietà del file non riconosciuta.');
  const string = (v: unknown) => typeof v === 'string' && v.length <= 100000;
  const amount = (v: unknown) =>
    Number.isSafeInteger(v) && Math.abs(v as number) <= 1e12;
  const date = (v: unknown, optional = false) =>
    string(v) && ((optional && v === '') || validDate(v as string));
  const one = (v: unknown, options: string[]) => options.includes(v as string);
  const fields = (e: Entity, names: string[]) =>
    names.every((k) => string((e as unknown as Record<string, unknown>)[k]));
  const reference = (id: string, type: Kind, optional = true) =>
    (optional && id === '') ||
    (string(id) &&
      Object.hasOwn(data.entities, id) &&
      data.entities[id]?.type === type);
  const allowed: Record<Kind, string[]> = {
    settings: ['name', 'currency', 'timezone'],
    account: ['name', 'openingCents', 'openingDate', 'scope'],
    category: ['name', 'color'],
    project: [
      'name',
      'description',
      'status',
      'scope',
      'startDate',
      'endDate',
      'targetCents',
      'notes',
      'color',
    ],
    task: [
      'name',
      'status',
      'priority',
      'due',
      'scope',
      'projectId',
      'notes',
      'subtasks',
    ],
    transaction: [
      'name',
      'date',
      'direction',
      'amountCents',
      'accountId',
      'toAccountId',
      'categoryId',
      'projectId',
      'scope',
      'forecastKey',
      'notes',
    ],
    forecast: [
      'name',
      'date',
      'direction',
      'amountCents',
      'accountId',
      'categoryId',
      'projectId',
      'scope',
      'recurrence',
      'endDate',
    ],
    scenario: ['name', 'adjustments'],
  };
  for (const [id, e] of entries) {
    if (
      !e ||
      typeof e !== 'object' ||
      !id ||
      id === '__proto__' ||
      e.id !== id ||
      !string(e.updatedAt) ||
      isNaN(Date.parse(e.updatedAt)) ||
      (e.deletedAt !== undefined &&
        (!string(e.deletedAt) || isNaN(Date.parse(e.deletedAt))))
    )
      return bad('identificatore o metadati.');
    if (
      !Object.hasOwn(allowed, e.type) ||
      Object.keys(e).some(
        (k) =>
          ![
            'id',
            'type',
            'updatedAt',
            'deletedAt',
            ...allowed[e.type],
          ].includes(k),
      )
    )
      return bad('proprietà di un elemento non riconosciuta.');
    if (
      ['account', 'project', 'task', 'transaction', 'forecast'].includes(
        e.type,
      ) &&
      !one((e as Account).scope, ['personale', 'lavoro'])
    )
      return bad('ambito.');
    switch (e.type) {
      case 'settings':
        if (
          id !== 'settings' ||
          e.deletedAt ||
          !string(e.name) ||
          e.currency !== 'EUR' ||
          e.timezone !== 'Europe/Rome'
        )
          return bad('impostazioni.');
        break;
      case 'account':
        if (
          !fields(e, ['name']) ||
          !e.name.trim() ||
          !amount(e.openingCents) ||
          !date(e.openingDate)
        )
          return bad('conto.');
        break;
      case 'category':
        if (
          !fields(e, ['name', 'color']) ||
          !e.name.trim() ||
          !/^#[0-9a-f]{6}$/i.test(e.color)
        )
          return bad('categoria.');
        break;
      case 'project':
        if (
          !fields(e, ['name', 'description', 'notes', 'color']) ||
          !e.name.trim() ||
          !/^#[0-9a-f]{6}$/i.test(e.color) ||
          !one(e.status, [
            'idea',
            'attivo',
            'pausa',
            'completato',
            'archiviato',
          ]) ||
          !date(e.startDate) ||
          !date(e.endDate, true) ||
          (e.endDate && e.endDate < e.startDate) ||
          !amount(e.targetCents) ||
          e.targetCents < 0
        )
          return bad('progetto.');
        break;
      case 'task':
        if (
          !fields(e, ['name', 'notes', 'projectId']) ||
          !e.name.trim() ||
          !date(e.due, true) ||
          !one(e.status, ['todo', 'doing', 'done']) ||
          !one(e.priority, ['alta', 'media', 'bassa']) ||
          !reference(e.projectId, 'project') ||
          (!e.deletedAt &&
            e.projectId &&
            (data.entities[e.projectId] as Project).scope !== e.scope) ||
          !Array.isArray(e.subtasks) ||
          !e.subtasks.every(
            (s) =>
              s &&
              string(s.id) &&
              string(s.name) &&
              typeof s.done === 'boolean',
          )
        )
          return bad('attività.');
        break;
      case 'transaction':
      case 'forecast': {
        if (
          !fields(e, ['name', 'accountId', 'categoryId', 'projectId']) ||
          !e.name.trim() ||
          !date(e.date) ||
          !amount(e.amountCents) ||
          e.amountCents <= 0 ||
          !reference(e.accountId, 'account', false) ||
          !reference(e.categoryId, 'category') ||
          !reference(e.projectId, 'project')
        )
          return bad('movimento.');
        const a = data.entities[e.accountId] as Account;
        if (!e.deletedAt && a.deletedAt)
          return bad(
            'un movimento attivo fa riferimento a un conto eliminato. Risolvi il conflitto conservando il conto.',
          );
        if (!e.deletedAt && (e.date < a.openingDate || e.scope !== a.scope))
          return bad(
            'data precedente al saldo iniziale o ambito diverso dal conto.',
          );
        if (
          !e.deletedAt &&
          e.projectId &&
          (data.entities[e.projectId] as Project).scope !== e.scope
        )
          return bad('ambito del progetto diverso dal movimento.');
        if (e.type === 'transaction') {
          if (
            !fields(e, ['forecastKey', 'toAccountId', 'notes']) ||
            !one(e.direction, ['income', 'expense', 'transfer']) ||
            e.date > today() ||
            (e.direction === 'transfer' &&
              (!reference(e.toAccountId, 'account', false) ||
                e.toAccountId === e.accountId ||
                e.projectId ||
                e.categoryId ||
                e.forecastKey ||
                (!e.deletedAt &&
                  e.date <
                    (data.entities[e.toAccountId] as Account).openingDate) ||
                (!e.deletedAt && data.entities[e.toAccountId].deletedAt)))
          )
            return bad(
              'trasferimento o movimento (i movimenti futuri vanno nelle previsioni).',
            );
        } else if (
          !one(e.direction, ['income', 'expense']) ||
          !one(e.recurrence, ['none', 'weekly', 'monthly', 'yearly']) ||
          !date(e.endDate, true) ||
          (e.endDate && e.endDate < e.date)
        )
          return bad('ricorrenza.');
        break;
      }
      case 'scenario':
        if (
          !string(e.name) ||
          !e.name.trim() ||
          !e.adjustments ||
          typeof e.adjustments !== 'object' ||
          Array.isArray(e.adjustments) ||
          !Object.entries(e.adjustments).every(
            ([key, a]) =>
              /^.+@(?:0|[1-9]\d{0,3})$/.test(key) &&
              occurrenceReference(key).index < 5000 &&
              reference(
                occurrenceReference(key).forecastId,
                'forecast',
                false,
              ) &&
              a &&
              typeof a === 'object' &&
              (a.date === undefined || date(a.date)) &&
              (a.amountCents === undefined ||
                (amount(a.amountCents) && a.amountCents > 0)) &&
              (a.excluded === undefined || typeof a.excluded === 'boolean'),
          )
        )
          return bad('scenario.');
        break;
      default:
        return bad('tipo di elemento sconosciuto.');
    }
  }
  if (data.entities.settings?.type !== 'settings')
    return bad('impostazioni mancanti.');
  const keys = list(data, 'transaction')
    .map((t) => t.forecastKey)
    .filter(Boolean);
  if (keys.length !== new Set(keys).size)
    return bad('previsione registrata più di una volta.');
  for (const t of list(data, 'transaction'))
    if (
      t.forecastKey &&
      (!/^.+@(?:0|[1-9]\d{0,3})$/.test(t.forecastKey) ||
        occurrenceReference(t.forecastKey).index >= 5000 ||
        !reference(
          occurrenceReference(t.forecastKey).forecastId,
          'forecast',
          false,
        ))
    )
      return bad('riferimento alla previsione.');
  let integerBudget = 0;
  for (const e of Object.values(data.entities)) {
    if (e.deletedAt) continue;
    if (e.type === 'account') integerBudget += Math.abs(e.openingCents);
    if (e.type === 'transaction') integerBudget += e.amountCents;
    if (e.type === 'forecast')
      integerBudget += e.amountCents * (e.recurrence === 'none' ? 1 : 5000);
    if (e.type === 'scenario')
      for (const adjustment of Object.values(e.adjustments))
        integerBudget += adjustment.amountCents ?? 0;
    if (!Number.isSafeInteger(integerBudget))
      return bad(
        'la somma degli importi supera il limite di precisione in centesimi.',
      );
  }
  return structuredClone(data);
}
export function demoData(): Data {
  const data = emptyData(),
    now = today(),
    month = now.slice(0, 7) + '-01';
  const add = (e: Omit<Entity, 'updatedAt'>) => {
    data.entities[e.id] = { ...e, updatedAt: stamp() } as Entity;
  };
  data.entities.settings = {
    ...data.entities.settings,
    name: 'Antonio',
  } as Settings;
  add({
    id: 'demo-main',
    type: 'account',
    name: 'Conto principale',
    openingCents: 780000,
    openingDate: shiftMonth(month, -5),
    scope: 'lavoro',
  } as Account);
  add({
    id: 'demo-personal',
    type: 'account',
    name: 'Conto personale',
    openingCents: 320000,
    openingDate: shiftMonth(month, -5),
    scope: 'personale',
  } as Account);
  const projects: [string, string, string, number, string][] = [
    [
      'demo-p1',
      'Studio Forma',
      'Un nuovo sito per uno studio di architettura.',
      650000,
      colors[0],
    ],
    [
      'demo-p2',
      'Il mio prodotto digitale',
      'Dall’idea al primo lancio: un passo alla volta.',
      300000,
      colors[2],
    ],
    [
      'demo-p3',
      'Consulenza Acme',
      'Strategia e direzione per il prossimo trimestre.',
      480000,
      colors[1],
    ],
  ];
  projects.forEach(([id, name, description, targetCents, color], i) =>
    add({
      id,
      type: 'project',
      name,
      description,
      status: 'attivo',
      scope: 'lavoro',
      startDate: shiftMonth(month, -2),
      endDate: shiftDate(now, 12 + i * 15),
      targetCents,
      notes: '',
      color,
    } as Project),
  );
  for (let m = -5; m <= 0; m++) {
    const date = shiftMonth(month, m);
    for (const [j, name, amount, direction, category, account] of [
      [
        0,
        'Consulenza mensile',
        270000 + (m + 5) * 13000,
        'income',
        'category-0',
        'demo-main',
      ],
      [1, 'Casa e utenze', 76000, 'expense', 'category-1', 'demo-personal'],
      [2, 'Software e strumenti', 14900, 'expense', 'category-3', 'demo-main'],
      [
        3,
        'Spesa e quotidianità',
        32600 + (m + 5) * 950,
        'expense',
        'category-2',
        'demo-personal',
      ],
    ] as const)
      add({
        id: `demo-t${m}-${j}`,
        type: 'transaction',
        name,
        amountCents: amount,
        direction,
        categoryId: category,
        accountId: account,
        date,
        toAccountId: '',
        scope: account === 'demo-main' ? 'lavoro' : 'personale',
        projectId:
          direction === 'income' ? 'demo-p3' : j === 2 ? 'demo-p2' : '',
        forecastKey: '',
        notes: '',
      } as Transaction);
  }
  [
    'Inviare la proposta definitiva',
    'Rivedere il prototipo',
    'Preparare il piano di lancio',
    'Organizzare le spese del mese',
    'Condividere la prima bozza',
    'Definire gli obiettivi',
  ].forEach((name, i) =>
    add({
      id: `demo-task${i}`,
      type: 'task',
      name,
      status: i < 2 ? 'todo' : i < 5 ? 'doing' : 'done',
      priority: i === 0 ? 'alta' : i === 2 ? 'bassa' : 'media',
      due: shiftDate(now, i - 1),
      scope: i === 3 ? 'personale' : 'lavoro',
      projectId: i === 3 ? '' : projects[i % 3][0],
      notes: '',
      subtasks:
        i === 2
          ? [
              { id: 'sub1', name: 'Scrivere il messaggio', done: true },
              { id: 'sub2', name: 'Scegliere i canali', done: false },
            ]
          : [],
    } as Task),
  );
  for (const [id, name, direction, amountCents, categoryId, accountId] of [
    [
      'demo-f1',
      'Compenso consulenza',
      'income',
      335000,
      'category-0',
      'demo-main',
    ],
    [
      'demo-f2',
      'Casa e utenze',
      'expense',
      76000,
      'category-1',
      'demo-personal',
    ],
    [
      'demo-f3',
      'Abbonamenti e software',
      'expense',
      14900,
      'category-3',
      'demo-main',
    ],
  ] as const)
    add({
      id,
      type: 'forecast',
      name,
      direction,
      amountCents,
      categoryId,
      accountId,
      scope: accountId === 'demo-main' ? 'lavoro' : 'personale',
      date: shiftDate(now, 5),
      recurrence: 'monthly',
      endDate: '',
      projectId: id === 'demo-f1' ? 'demo-p3' : '',
    } as Forecast);
  return validateData(data);
}
