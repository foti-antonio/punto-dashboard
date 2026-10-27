// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyQuote } from '../src/DailyQuote';
import { getDailyQuote } from '../src/quotes';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function expectToday() {
  const quote = getDailyQuote();
  const figure = screen.getByRole('figure', {
    name: 'Daily Stoic quote',
  });
  expect(within(figure).getByText(`«${quote.text}»`)).toBeTruthy();
  expect(within(figure).getByText(quote.author).title).toBe(quote.reference);
  expect(figure.querySelector('blockquote')?.getAttribute('cite')).toBe(
    quote.source,
  );
  expect(within(figure).queryByRole('button')).toBeNull();
}

describe('riquadro della citazione', () => {
  it('mostra testo, autore e riferimento senza scrivere dati o usare la rete', () => {
    const fetch = vi.spyOn(window, 'fetch');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<DailyQuote />);
    expectToday();
    act(() => vi.advanceTimersByTime(60_000));
    expectToday();
    expect(fetch).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([
    '2026-01-31T22:59:30Z',
    '2026-03-28T22:59:30Z',
    '2026-03-29T21:59:30Z',
    '2026-10-24T21:59:30Z',
    '2026-10-25T22:59:30Z',
  ])('aggiorna entro un minuto dalla mezzanotte: %s', (instant) => {
    vi.setSystemTime(new Date(instant));
    render(<DailyQuote />);
    const previous = getDailyQuote();
    act(() => vi.advanceTimersByTime(60_000));
    expectToday();
    expect(screen.queryByText(`«${previous.text}»`)).toBeNull();
  });

  it('non cambia citazione durante i salti dell’ora legale e solare', () => {
    for (const instant of ['2026-03-29T00:59:30Z', '2026-10-25T00:59:30Z']) {
      vi.setSystemTime(new Date(instant));
      const { unmount } = render(<DailyQuote />);
      const previous = getDailyQuote();
      act(() => vi.advanceTimersByTime(60_000));
      expectToday();
      expect(screen.getByText(`«${previous.text}»`)).toBeTruthy();
      unmount();
    }
  });

  it('recupera subito il giorno corrente al ritorno nella scheda dopo più giorni', () => {
    render(<DailyQuote />);
    const previous = getDailyQuote();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByText(`«${previous.text}»`)).toBeTruthy();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expectToday();
    expect(screen.queryByText(`«${previous.text}»`)).toBeNull();
  });

  it.each(['focus', 'pageshow'])(
    'aggiorna alla riattivazione tramite %s',
    (event) => {
      render(<DailyQuote />);
      vi.setSystemTime(new Date('2026-10-25T23:00:00Z'));
      act(() => window.dispatchEvent(new Event(event)));
      expectToday();
    },
  );

  it('rimuove timer e listener anche con il doppio montaggio di StrictMode', () => {
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(
      <StrictMode>
        <DailyQuote />
      </StrictMode>,
    );
    expect(vi.getTimerCount()).toBe(1);
    removeDocument.mockClear();
    removeWindow.mockClear();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(removeDocument).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    expect(removeWindow).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith('pageshow', expect.any(Function));
  });
});
