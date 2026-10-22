import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'punto-theme';

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  persistenceError: boolean;
}

let state: ThemeState = {
  preference: 'system',
  resolved: 'light',
  persistenceError: false,
};
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
let systemTheme: MediaQueryList | undefined;

function parsePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function apply(preference: ThemePreference, persistenceError = false) {
  const resolved =
    preference === 'system'
      ? systemTheme?.matches
        ? 'dark'
        : 'light'
      : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  if (
    state.preference === preference &&
    state.resolved === resolved &&
    state.persistenceError === persistenceError
  )
    return;
  state = { preference, resolved, persistenceError };
  listeners.forEach((listener) => listener());
}

// Called before React renders, including loading and error screens.
// index.html applies the same preference before the app's assets load.
export function initializeTheme() {
  if (stop) return stop;
  systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)');
  let preference: ThemePreference = 'system';
  let persistenceError = false;
  try {
    preference = parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    persistenceError = true;
  }
  apply(preference, persistenceError);

  const onSystemChange = () => {
    if (state.preference === 'system') apply('system', state.persistenceError);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    apply(parsePreference(event.newValue));
  };
  systemTheme?.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  stop = () => {
    systemTheme?.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
    systemTheme = undefined;
    stop = undefined;
  };
  return stop;
}

export function setThemePreference(preference: ThemePreference) {
  initializeTheme();
  let persistenceError = false;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    persistenceError = true;
  }
  apply(preference, persistenceError);
}

function subscribeTheme(listener: () => void) {
  initializeTheme();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getThemeSnapshot = () => state;
export function useTheme() {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot);
}
