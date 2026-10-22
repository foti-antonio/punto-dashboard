import { describe, it, expect } from 'vitest';
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
import { fixture, transaction, forecast } from './fixtures';
const ts = '2026-01-01T00:00:00.000Z';
describe('importi e saldi', () => {
  it('usa centesimi esatti e separatori italiani o inglesi', () => {
    expect(parseMoney('1.234,56 €')).toBe(123456);
    expect(parseMoney('-0,09')).toBe(-9);
    expect(parseMoney('1,234.56', '.')).toBe(123456);
    expect(parseMoney('0,10') + parseMoney('0,20')).toBe(30);
    expect(euro(30)).toContain('0,30');
  });
  it.each([
    '1,005',
    '1.2,00',
    '1,2,3',
    'Infinity',
    '12e3',
    '',
    '1.000.000.000.000,00',
  ])('rifiuta valori ambigui o fuori limite: %s', (input) =>
    expect(() => parseMoney(input)).toThrow(),
  );
  it('conteggia i saldi iniziali dalla data del conto', () => {
    const d = fixture();
    expect(liquidity(d)).toBe(150000);
    expect(accountBalance(d, 'a', shiftMonth(today(), -13))).toBe(0);
  });
  it('registra trasferimenti tra ambiti senza costi o ricavi', () => {
    const d = fixture();
    d.entities.t = transaction({
      direction: 'transfer',
      amountCents: 20000,
      toAccountId: 'b',
      categoryId: '',
      projectId: '',
    });
    validateData(d);
    expect(accountBalance(d, 'a')).toBe(80000);
    expect(accountBalance(d, 'b')).toBe(70000);
    expect(liquidity(d)).toBe(150000);
    expect(liquidity(d, 'lavoro')).toBe(80000);
    expect(projectResult(d, 'p')).toBe(0);
  });
  it('collega incassi e costi al progetto, ignorando eliminazioni', () => {
    const d = fixture();
    d.entities.t = transaction();
    d.entities.exp = transaction({
      id: 'exp',
      direction: 'expense',
      amountCents: 2345,
    });
    expect(projectResult(d, 'p')).toBe(10000);
    d.entities.exp.deletedAt = ts;
    expect(projectResult(d, 'p')).toBe(12345);
  });
  it('rifiuta conti uguali nei trasferimenti, importi frazionari e dati incompleti', () => {
    const d = fixture();
    d.entities.t = transaction({
      direction: 'transfer',
      toAccountId: 'a',
      projectId: '',
      categoryId: '',
    });
    expect(() => validateData(d)).toThrow();
    d.entities.t = transaction({ amountCents: 12.5 });
    expect(() => validateData(d)).toThrow();
    expect(() => validateData({ schemaVersion: 2, entities: {} })).toThrow();
  });
  it('blocca movimenti futuri, prima del saldo iniziale o con ambito errato', () => {
    for (const patch of [
      { date: shiftDate(today(), 1) },
      { date: shiftMonth(today(), -13) },
      { scope: 'personale' },
    ]) {
      const d = fixture();
      d.entities.t = transaction(patch as Partial<Transaction>);
      expect(() => validateData(d)).toThrow();
    }
  });
  it('la demo rispetta lo schema', () => {
    const d = demoData();
    expect(validateData(d)).toEqual(d);
    expect(list(d, 'project')).toHaveLength(3);
    expect(liquidity(d)).toBeGreaterThan(0);
  });
});
describe('ricorrenze, scenari e riconciliazione', () => {
  it('mantiene il giorno originale e gestisce febbraio e anni bisestili', () => {
    expect(shiftMonth('2028-01-31', 1)).toBe('2028-02-29');
    expect(shiftMonth('2028-01-31', 2)).toBe('2028-03-31');
    expect(shiftMonth('2028-02-29', 12)).toBe('2029-02-28');
  });
  it('genera ricorrenze con fine inclusiva', () => {
    const d = fixture();
    d.entities.f = forecast({
      date: '2028-01-31',
      recurrence: 'monthly',
      endDate: '2028-03-31',
    });
    const os = occurrences(d, '2028-01-01', '2028-12-31');
    expect(os.map((o) => o.date)).toEqual([
      '2028-01-31',
      '2028-02-29',
      '2028-03-31',
    ]);
  });
  it('genera ricorrenze settimanali', () => {
    const d = fixture();
    d.entities.f = forecast({
      recurrence: 'weekly',
      endDate: shiftDate(today(), 14),
    });
    expect(occurrences(d, today(), shiftDate(today(), 30))).toHaveLength(3);
  });
  it('sottrae la previsione effettivamente registrata una volta sola', () => {
    const d = fixture();
    d.entities.f = forecast({ recurrence: 'monthly' });
    const before = forecastSeries(d, 'all');
    d.entities.t = transaction({ amountCents: 10000, forecastKey: 'f@0' });
    validateData(d);
    expect(occurrences(d, today(), today())).toHaveLength(0);
    expect(forecastSeries(d, 'all')[5].value).toBe(before[5].value);
    d.entities.dup = transaction({ id: 'dup', forecastKey: 'f@0' });
    expect(() => validateData(d)).toThrow(/più di una/);
  });
  it('sposta incassi e cambia spese senza modificare la base', () => {
    const d = fixture();
    d.entities.f = forecast({
      direction: 'expense',
      date: shiftDate(today(), 3),
    });
    const original = structuredClone(d);
    const key = 'f@0';
    const s: Scenario = {
      id: 's',
      type: 'scenario',
      name: 'Alternativo',
      updatedAt: ts,
      adjustments: {
        [key]: { date: shiftDate(today(), 15), amountCents: 20000 },
      },
    };
    const os = occurrences(d, today(), shiftDate(today(), 20), s);
    expect(os[0].date).toBe(shiftDate(today(), 15));
    expect(os[0].amountCents).toBe(20000);
    expect(equal(d, original)).toBe(true);
  });
  it('include un incasso spostato da oltre l’orizzonte al suo interno', () => {
    const d = fixture();
    const later = shiftMonth(today(), 8);
    d.entities.f = forecast({ date: later, recurrence: 'monthly' });
    const s: Scenario = {
      id: 's',
      type: 'scenario',
      name: 'Anticipo',
      updatedAt: ts,
      adjustments: { ['f@2']: { date: today() } },
    };
    expect(occurrences(d, today(), shiftDate(today(), 1), s)).toHaveLength(1);
  });
  it('esclude le occorrenze annullate nello scenario', () => {
    const d = fixture();
    d.entities.f = forecast();
    const s: Scenario = {
      id: 's',
      type: 'scenario',
      name: 'Ridotto',
      updatedAt: ts,
      adjustments: { ['f@0']: { excluded: true } },
    };
    expect(occurrences(d, today(), shiftDate(today(), 10), s)).toHaveLength(0);
  });
  it('mantiene riconciliata un’occorrenza anche dopo lo spostamento della data di base', () => {
    const d = fixture();
    d.entities.f = forecast();
    d.entities.t = transaction({ forecastKey: 'f@0' });
    d.entities.f.date = shiftDate(today(), 10);
    expect(occurrences(d, today(), shiftDate(today(), 20))).toHaveLength(0);
  });
});
describe('confronto a tre vie', () => {
  it('unisce modifiche a elementi diversi senza conflitti', () => {
    const base = fixture(),
      local = structuredClone(base),
      remote = structuredClone(base);
    (local.entities.a as Account).name = 'Locale';
    (remote.entities.b as Account).name = 'Remoto';
    const result = mergeData(base, local, remote);
    expect(result.conflicts).toHaveLength(0);
    expect((result.data.entities.a as Account).name).toBe('Locale');
    expect((result.data.entities.b as Account).name).toBe('Remoto');
  });
  it('rende esplicito il conflitto sullo stesso elemento', () => {
    const base = fixture(),
      local = structuredClone(base),
      remote = structuredClone(base);
    (local.entities.a as Account).name = 'Uno';
    (remote.entities.a as Account).name = 'Due';
    const result = mergeData(base, local, remote);
    expect(result.conflicts).toHaveLength(1);
    expect(() => resolveMerge(result.data, result.conflicts, {})).toThrow();
    const resolved = resolveMerge(result.data, result.conflicts, {
      a: 'remote',
    });
    expect((resolved.entities.a as Account).name).toBe('Due');
  });
  it('non fa ricomparire elementi eliminati quando l’altro dispositivo non li ha modificati', () => {
    const base = fixture(),
      local = structuredClone(base);
    local.entities.a.deletedAt = ts;
    const result = mergeData(base, local, base);
    expect(result.conflicts).toHaveLength(0);
    expect(result.data.entities.a.deletedAt).toBe(ts);
  });
  it('presenta eliminazione contro modifica come conflitto', () => {
    const base = fixture(),
      local = structuredClone(base),
      remote = structuredClone(base);
    local.entities.a.deletedAt = ts;
    (remote.entities.a as Account).name = 'Modificato';
    const result = mergeData(base, local, remote);
    expect(result.conflicts.map((c) => c.id)).toContain('a');
  });
  it('non nasconde un nuovo movimento quando l’altro dispositivo elimina il suo conto', () => {
    const base = fixture(),
      local = structuredClone(base),
      remote = structuredClone(base);
    local.entities.a.deletedAt = ts;
    remote.entities.t = transaction();
    const result = mergeData(base, local, remote);
    expect(result.conflicts.map((c) => c.id)).toContain('a');
    expect(() =>
      resolveMerge(result.data, result.conflicts, { a: 'local', t: 'remote' }),
    ).toThrow(/conto eliminato/);
    expect(() =>
      resolveMerge(result.data, result.conflicts, { a: 'remote', t: 'remote' }),
    ).not.toThrow();
  });
  it('riconosce impostazioni equivalenti anche con chiavi in ordine diverso', () => {
    expect(equal({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });
});
