import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDailyQuote, STOIC_QUOTES } from '../src/quotes';

afterEach(() => vi.useRealTimers());

describe('citazioni stoiche giornaliere', () => {
  it('include almeno 30 testi distinti dei tre autori, con opera e fonte', () => {
    expect(STOIC_QUOTES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(STOIC_QUOTES.map((quote) => quote.id)).size).toBe(
      STOIC_QUOTES.length,
    );
    expect(new Set(STOIC_QUOTES.map((quote) => quote.text)).size).toBe(
      STOIC_QUOTES.length,
    );
    expect(new Set(STOIC_QUOTES.map((quote) => quote.author))).toEqual(
      new Set(['Marco Aurelio', 'Seneca', 'Epitteto']),
    );
    for (const quote of STOIC_QUOTES) {
      expect(quote.text.trim().length).toBeGreaterThan(0);
      expect(quote.text.length).toBeLessThanOrEqual(150);
      expect(quote.reference).toMatch(
        /^(Pensieri|Lettere a Lucilio|Manuale), /,
      );
      expect(new URL(quote.source).protocol).toBe('https:');
    }
  });

  it('mantiene la stessa citazione per l’intero giorno di Roma e dopo un nuovo caricamento', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T22:00:00Z'));
    const morning = getDailyQuote();
    expect(morning).toEqual(getDailyQuote('2026-10-23'));
    vi.setSystemTime(new Date('2026-10-23T21:59:59.999Z'));
    expect(getDailyQuote()).toEqual(morning);
    vi.resetModules();
    const reloaded = await import('../src/quotes');
    expect(reloaded.getDailyQuote()).toEqual(morning);
    vi.setSystemTime(new Date('2026-10-23T22:00:00Z'));
    expect(getDailyQuote().id).not.toBe(morning.id);
  });

  it.each([
    ['2026-01-31T22:59:59Z', '2026-01-31T23:00:00Z'],
    ['2026-12-31T22:59:59Z', '2026-12-31T23:00:00Z'],
    ['2028-02-28T22:59:59Z', '2028-02-28T23:00:00Z'],
    ['2028-02-29T22:59:59Z', '2028-02-29T23:00:00Z'],
    ['2026-03-28T22:59:59Z', '2026-03-28T23:00:00Z'],
    ['2026-03-29T21:59:59Z', '2026-03-29T22:00:00Z'],
    ['2026-10-24T21:59:59Z', '2026-10-24T22:00:00Z'],
    ['2026-10-25T22:59:59Z', '2026-10-25T23:00:00Z'],
  ])('cambia solo alla mezzanotte di Roma: %s → %s', (before, after) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(before));
    const previous = getDailyQuote();
    vi.setSystemTime(new Date(after));
    expect(getDailyQuote().id).not.toBe(previous.id);
  });

  it.each([
    ['2026-03-29T00:59:59Z', '2026-03-29T01:00:00Z', '2026-03-29'],
    ['2026-10-25T00:59:59Z', '2026-10-25T01:00:00Z', '2026-10-25'],
  ])(
    'non cambia al passaggio dell’ora legale o solare: %s',
    (before, after, day) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(before));
      const previous = getDailyQuote();
      vi.setSystemTime(new Date(after));
      expect(getDailyQuote()).toEqual(previous);
      expect(getDailyQuote()).toEqual(getDailyQuote(day));
    },
  );

  it('non ripete mai due giorni consecutivi, anche ai confini dei cicli', () => {
    // Include migliaia di confini, anni bisestili e giorni prima dell’epoca Unix.
    let previous = '';
    const start = Date.parse('1969-01-01T00:00:00Z');
    for (let day = 0; day < 40_000; day++) {
      const date = new Date(start + day * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const quote = getDailyQuote(date);
      expect(quote.id, date).not.toBe(previous);
      previous = quote.id;
    }
  });

  it('mostra tutta la raccolta una volta per ciclo, variando l’ordine tra cicli', () => {
    const count = STOIC_QUOTES.length;
    const sequence = (cycle: number) =>
      Array.from(
        { length: count },
        (_, index) =>
          getDailyQuote(
            new Date((cycle * count + index) * 86_400_000)
              .toISOString()
              .slice(0, 10),
          ).id,
      );
    const first = sequence(690);
    const second = sequence(691);
    expect(new Set(first).size).toBe(count);
    expect(new Set(second)).toEqual(new Set(first));
    expect(second).not.toEqual(first);
    expect(second[0]).not.toBe(first.at(-1));
  });
});
