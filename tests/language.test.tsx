// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  initializeLanguage,
  setLanguage,
  getLanguage,
  getLanguageSnapshot,
  useLanguage,
  LANGUAGE_STORAGE_KEY,
  tr,
  translate,
  dictionaries,
  singularDictionaries,
  msg,
  messageText,
  LocalizedError,
  numberLabel,
  type Language,
} from '../src/i18n';
import {
  createInitialData,
  emptyData,
  demoData,
  validateData,
  parseDataJSON,
  parseMoney,
  moneyInput,
  euro,
  dateLabel,
} from '../src/domain';
import { downloadJSON } from '../src/storage';
import { getDailyQuote, QUOTES_BY_LANGUAGE } from '../src/quotes';

let stop: () => void;
beforeEach(() => {
  localStorage.clear();
  document.head.innerHTML = '<meta name="description" content="">';
  stop = initializeLanguage();
});
afterEach(() => {
  cleanup();
  stop();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function Probe() {
  const state = useLanguage();
  return (
    <p>
      {state.language}:{String(state.persistenceError)}:{tr('Impostazioni')}
    </p>
  );
}
function storage(
  language: string | null,
  key: string | null = LANGUAGE_STORAGE_KEY,
  storageArea = localStorage,
) {
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', { key, newValue: language, storageArea }),
    ),
  );
}

describe('local language preference', () => {
  it('defaults to English independently of browser language, and updates metadata', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('it-IT');
    expect(getLanguage()).toBe('en');
    expect(tr('Impostazioni')).toBe('Settings');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Punto · Personal dashboard');
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toContain('projects');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });
  it('persists a choice, updates subscribers and restores it on the next initialisation', () => {
    render(<Probe />);
    act(() => setLanguage('it'));
    expect(screen.getByText('it:false:Impostazioni')).toBeTruthy();
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('it');
    expect(document.documentElement.lang).toBe('it');
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toContain('progetti');
    cleanup();
    stop();
    stop = initializeLanguage();
    expect(getLanguage()).toBe('it');
  });
  it.each(['fr', '', 'IT', 'null'])(
    'falls back to English for invalid stored preference %s',
    (value) => {
      stop();
      localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
      stop = initializeLanguage();
      expect(getLanguage()).toBe('en');
    },
  );
  it('handles other tabs, deletion and clear without echoing storage writes', () => {
    render(<Probe />);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    storage('it');
    expect(screen.getByText('it:false:Impostazioni')).toBeTruthy();
    storage('en', 'punto-theme');
    expect(getLanguage()).toBe('it');
    storage('en', LANGUAGE_STORAGE_KEY, sessionStorage);
    expect(getLanguage()).toBe('it');
    storage(null);
    expect(screen.getByText('en:false:Settings')).toBeTruthy();
    storage('it');
    storage(null, null);
    expect(getLanguage()).toBe('en');
    storage('unknown');
    expect(getLanguage()).toBe('en');
    expect(write).not.toHaveBeenCalled();
  });
  it('keeps the choice for the session when writes fail and recovers on a later save', () => {
    render(<Probe />);
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('blocked');
      });
    act(() => setLanguage('it'));
    expect(screen.getByText('it:true:Impostazioni')).toBeTruthy();
    expect(initializeLanguage()).toBe(stop);
    expect(getLanguage()).toBe('it');
    write.mockRestore();
    act(() => setLanguage('en'));
    expect(screen.getByText('en:false:Settings')).toBeTruthy();
  });
  it('starts in English with a warning if localStorage itself is inaccessible', () => {
    stop();
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    stop = initializeLanguage();
    expect(getLanguageSnapshot()).toEqual({
      language: 'en',
      persistenceError: true,
    });
    setLanguage('it');
    expect(getLanguageSnapshot()).toEqual({
      language: 'it',
      persistenceError: true,
    });
  });
  it('removes listeners when stopped and leaves the theme preference untouched', () => {
    localStorage.setItem('punto-theme', 'dark');
    setLanguage('it');
    stop();
    storage('en');
    expect(getLanguage()).toBe('it');
    expect(localStorage.getItem('punto-theme')).toBe('dark');
  });
});

describe('messages, formats and data compatibility', () => {
  it('has complete, nonempty dictionaries with matching parameter names', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(
      Object.keys(dictionaries.it).sort(),
    );
    const parameters = (s: string) =>
      [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(
      dictionaries.it,
    ) as (keyof typeof dictionaries.it)[]) {
      expect(dictionaries.en[key].trim(), key).not.toBe('');
      expect(parameters(dictionaries.en[key]), key).toEqual(
        parameters(dictionaries.it[key]),
      );
    }
    expect(
      translate('en', 'Modifica {name}', { name: 'Casa {name} <test>' }),
    ).toBe('Edit Casa {name} <test>');
  });
  it('localises nested errors and pending notifications without repeating the operation', () => {
    const error = new LocalizedError(
      msg('Dati non validi: {message}', { message: msg('conto.') }),
    );
    const notification = msg('Modifiche salvate sul dispositivo.');
    expect(error.message).toBe('Invalid data: account.');
    setLanguage('it');
    expect(error.message).toBe('Dati non validi: conto.');
    expect(messageText(notification)).toBe(
      'Modifiche salvate sul dispositivo.',
    );
    expect(() => parseDataJSON('{')).toThrow('File JSON non valido.');
    setLanguage('en');
    expect(() => parseDataJSON('{')).toThrow('Invalid JSON file.');
  });
  it.each<Language>(['en', 'it'])(
    'formats money, numbers and dates and parses amounts in %s',
    (language) => {
      setLanguage(language);
      const english = language === 'en';
      expect(numberLabel(123456)).toBe(english ? '123,456' : '123.456');
      expect(euro(12345678)).toContain(english ? '123,456.78' : '123.456,78');
      expect(dateLabel('2026-02-17')).toBe(english ? '17 Feb' : '17 feb');
      expect(moneyInput(-123456)).toBe(english ? '-1234.56' : '-1234,56');
      expect(parseMoney(english ? '1,234.56' : '1.234,56')).toBe(123456);
      expect(parseMoney(moneyInput(-9))).toBe(-9);
      expect(parseMoney('1.234,56', ',')).toBe(123456);
      expect(parseMoney('1,234.56', '.')).toBe(123456);
    },
  );
  it('localises only new demo and initial data, preserving schema, IDs and internal values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
    const english = demoData('en'),
      italian = demoData('it');
    expect(english.entities['category-0'].name).toBe('Salary and fees');
    expect(italian.entities['category-0'].name).toBe('Stipendio e compensi');
    expect(english.entities['demo-main'].name).toBe('Main account');
    expect(italian.entities['demo-main'].name).toBe('Conto principale');
    const stripText = (data: typeof english) =>
      Object.values(data.entities).map((entity) => {
        const { name, ...rest } = entity;
        if ('description' in rest) rest.description = '';
        if ('subtasks' in rest)
          rest.subtasks = rest.subtasks.map((s) => ({ ...s, name: '' }));
        return rest;
      });
    expect(stripText(english)).toEqual(stripText(italian));
    expect(validateData(english)).toEqual(english);
    expect(validateData(italian)).toEqual(italian);
    const before = JSON.stringify(italian);
    const emptyBefore = emptyData();
    setLanguage('en');
    expect(emptyData()).toEqual(emptyBefore);
    expect(Object.keys(emptyData().entities)).toEqual(['settings']);
    expect(Object.keys(createInitialData().entities)).toHaveLength(8);
    expect(JSON.stringify(italian)).toBe(before);
    expect(before).not.toMatch(/punto-language|"language"/);
  });
  it('keeps daily quote IDs, sources and ordering identical in both languages', () => {
    expect(QUOTES_BY_LANGUAGE.en).toHaveLength(30);
    expect(QUOTES_BY_LANGUAGE.en.map((q) => q.source)).toEqual(
      QUOTES_BY_LANGUAGE.it.map((q) => q.source),
    );
    expect(new Set(QUOTES_BY_LANGUAGE.en.map((q) => q.author))).toEqual(
      new Set(['Marcus Aurelius', 'Seneca', 'Epictetus']),
    );
    for (let i = 0; i < 370; i++) {
      const day = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
      const en = getDailyQuote(day, 'en'),
        it = getDailyQuote(day, 'it');
      expect(en.id).toBe(it.id);
      expect(en.source).toBe(it.source);
      expect(en.text).not.toBe(it.text);
      expect(en.reference).not.toBe(it.reference);
    }
  });
});

it('exports the same data in both languages, excluding the local preference', async () => {
  const blobs: Blob[] = [];
  const revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL(blob: Blob) {
        blobs.push(blob);
        return 'blob:punto-test';
      }
      static revokeObjectURL = revoke;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const original = demoData('it');
  const before = JSON.stringify(original);
  downloadJSON(original);
  setLanguage('it');
  downloadJSON(original);
  const contents = await Promise.all(
    blobs.map(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsText(blob);
        }),
    ),
  );
  expect(contents).toHaveLength(2);
  expect(contents[0]).toBe(contents[1]);
  expect(JSON.parse(contents[0])).toEqual(original);
  expect(contents[0]).not.toMatch(/punto-language|"language"/);
  expect(JSON.stringify(original)).toBe(before);
});

it('uses singular and plural count messages in both languages', () => {
  expect(translate('en', '{count} movimenti registrati', { count: 1 })).toBe(
    '1 recorded transaction',
  );
  expect(translate('en', '{count} movimenti registrati', { count: 2 })).toBe(
    '2 recorded transactions',
  );
  expect(translate('it', 'Conferma {count} movimenti', { count: 1 })).toBe(
    'Conferma 1 movimento',
  );
  expect(Object.keys(singularDictionaries.en).sort()).toEqual(
    Object.keys(singularDictionaries.it).sort(),
  );
  for (const language of ['en', 'it'] as const)
    for (const [key, text] of Object.entries(singularDictionaries[language])) {
      expect([...text!.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()).toEqual(
        [...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
      );
    }
});
