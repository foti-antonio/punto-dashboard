// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  getThemeSnapshot,
  initializeTheme,
  setThemePreference,
  THEME_STORAGE_KEY,
} from '../src/theme';

let dispose: (() => void) | undefined;
let media: MediaQueryList;
function changeSystem(dark: boolean) {
  Object.defineProperty(media, 'matches', { configurable: true, value: dark });
  media.dispatchEvent(new Event('change'));
}
function expectTheme(preference: string, resolved: string) {
  expect(getThemeSnapshot()).toMatchObject({ preference, resolved });
  expect(document.documentElement.dataset.theme).toBe(resolved);
  expect(document.documentElement.style.colorScheme).toBe(resolved);
}
function storage(value: string | null, key: string | null = THEME_STORAGE_KEY) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
}
beforeEach(() => {
  localStorage.clear();
  media = Object.assign(new EventTarget(), {
    matches: false,
  }) as MediaQueryList;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
});
afterEach(() => {
  dispose?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('preferenza locale del tema', () => {
  it.each([false, true])(
    'segue il sistema al primo accesso (scuro: %s)',
    (dark) => {
      changeSystem(dark);
      dispose = initializeTheme();
      expectTheme('system', dark ? 'dark' : 'light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    },
  );

  it.each(['', 'DARK', 'invalid', 'null', '{"theme":"dark"}'])(
    'tratta il valore non valido %s come Sistema',
    (value) => {
      localStorage.setItem(THEME_STORAGE_KEY, value);
      changeSystem(true);
      dispose = initializeTheme();
      expectTheme('system', 'dark');
    },
  );

  it.each(['light', 'dark', 'system'] as const)(
    'ricorda %s dopo un nuovo avvio',
    (value) => {
      dispose = initializeTheme();
      setThemePreference(value);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(value);
      dispose();
      changeSystem(true);
      dispose = initializeTheme();
      expectTheme(value, value === 'system' ? 'dark' : value);
    },
  );

  it('reagisce ai cambiamenti del sistema solo in modalità Sistema', () => {
    dispose = initializeTheme();
    changeSystem(true);
    expectTheme('system', 'dark');
    setThemePreference('light');
    changeSystem(false);
    changeSystem(true);
    expectTheme('light', 'light');
    setThemePreference('dark');
    changeSystem(false);
    expectTheme('dark', 'dark');
    setThemePreference('system');
    expectTheme('system', 'light');
  });

  it('aggiorna dalle altre schede e gestisce rimozioni, valori errati e clear', () => {
    dispose = initializeTheme();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    storage('dark');
    expectTheme('dark', 'dark');
    storage('light');
    expectTheme('light', 'light');
    changeSystem(true);
    storage('system');
    expectTheme('system', 'dark');
    storage('light');
    storage('invalid');
    expectTheme('system', 'dark');
    storage('light');
    storage(null);
    expectTheme('system', 'dark');
    storage('light');
    storage(null, null);
    expectTheme('system', 'dark');
    expect(write).not.toHaveBeenCalled();
  });

  it('ignora altri dati e sessionStorage', () => {
    dispose = initializeTheme();
    storage('dark', 'other-key');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: THEME_STORAGE_KEY,
        newValue: 'dark',
        storageArea: sessionStorage,
      }),
    );
    expectTheme('system', 'light');
  });

  it('applica la scelta alla sessione se il salvataggio fallisce e permette di riprovare', () => {
    dispose = initializeTheme();
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
    setThemePreference('dark');
    expectTheme('dark', 'dark');
    expect(getThemeSnapshot().persistenceError).toBe(true);
    setThemePreference('system');
    changeSystem(true);
    expectTheme('system', 'dark');
    expect(getThemeSnapshot().persistenceError).toBe(true);
    write.mockRestore();
    setThemePreference('system');
    expect(getThemeSnapshot().persistenceError).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('funziona anche quando l’accesso a localStorage genera SecurityError', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    changeSystem(true);
    dispose = initializeTheme();
    expectTheme('system', 'dark');
    setThemePreference('light');
    expectTheme('light', 'light');
    expect(getThemeSnapshot().persistenceError).toBe(true);
  });

  it('inizializza una sola volta e rimuove i listener alla chiusura', () => {
    const add = vi.spyOn(media, 'addEventListener');
    dispose = initializeTheme();
    initializeTheme();
    expect(add).toHaveBeenCalledTimes(1);
    dispose();
    changeSystem(true);
    storage('dark');
    expectTheme('system', 'light');
  });
});

describe('tema prima del caricamento dell’app', () => {
  const html = readFileSync('index.html', 'utf8');
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  it.each([
    [null, false, 'light'],
    [null, true, 'dark'],
    ['invalid', true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['system', true, 'dark'],
  ])(
    'applica %s con sistema scuro %s prima di React',
    (value, dark, expected) => {
      if (value) localStorage.setItem(THEME_STORAGE_KEY, value);
      changeSystem(Boolean(dark));
      runInNewContext(bootstrap, { document, localStorage, window });
      expect(document.documentElement.dataset.theme).toBe(expected);
      expect(document.documentElement.style.colorScheme).toBe(expected);
      dispose = initializeTheme();
      expect(getThemeSnapshot().resolved).toBe(expected);
    },
  );

  it('usa il sistema anche se localStorage è bloccato prima del rendering', () => {
    changeSystem(true);
    runInNewContext(bootstrap, {
      document,
      window,
      get localStorage() {
        throw new Error('Access denied');
      },
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
