import { useSyncExternalStore } from 'react';
import { en, enSingular } from './locales/en';
import { it, itSingular, type TranslationKey } from './locales/it';

export type Language = 'en' | 'it';
export type { TranslationKey };
export const LANGUAGE_STORAGE_KEY = 'punto-language';
export const dictionaries = { en, it };
export const singularDictionaries: Record<
  Language,
  Partial<Record<TranslationKey, string>>
> = { en: enSingular, it: itSingular };
interface LanguageState {
  language: Language;
  persistenceError: boolean;
}
let state: LanguageState = { language: 'en', persistenceError: false };
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
const parseLanguage = (value: string | null): Language =>
  value === 'it' ? 'it' : 'en';
export const getLanguage = () => state.language;
export const getLanguageSnapshot = () => state;
export const locale = (language = getLanguage()) =>
  language === 'it' ? 'it-IT' : 'en-GB';
export const decimalSeparator = (language = getLanguage()) =>
  language === 'it' ? ',' : '.';
export const numberLabel = (value: number, language = getLanguage()) =>
  new Intl.NumberFormat(locale(language)).format(value);

type ParametersIn<S extends string> =
  S extends `${string}{${infer P}}${infer Rest}`
    ? P | ParametersIn<Rest>
    : never;
type MessageArgs<K extends TranslationKey> = [
  ParametersIn<(typeof it)[K]>,
] extends [never]
  ? []
  : [parameters: Record<ParametersIn<(typeof it)[K]>, MessageValue>];

export type Message = string | MessageDescriptor;
type MessageValue = string | number | MessageDescriptor;
export interface MessageDescriptor {
  key: TranslationKey;
  parameters?: Record<string, MessageValue>;
}
export function msg<K extends TranslationKey>(
  key: K,
  ...args: MessageArgs<K>
): MessageDescriptor {
  return {
    key,
    parameters: args[0] as Record<string, MessageValue> | undefined,
  };
}
export function messageText(
  message: Message,
  language = getLanguage(),
): string {
  if (typeof message === 'string') return message;
  const { key, parameters } = message;
  const text =
    (parameters?.count === 1 && singularDictionaries[language][key]) ||
    dictionaries[language][key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = parameters?.[name];
    return value === undefined
      ? match
      : typeof value === 'number'
        ? numberLabel(value, language)
        : messageText(value, language);
  });
}
export function translate<K extends TranslationKey>(
  language: Language,
  key: K,
  ...args: MessageArgs<K>
): string {
  return messageText(msg(key, ...args), language);
}
// Keep app-generated diagnostics structured until display, including nested errors.
export class LocalizedError extends Error {
  constructor(readonly detail: MessageDescriptor) {
    super();
    this.name = 'LocalizedError';
    Object.defineProperty(this, 'message', { get: () => messageText(detail) });
  }
}
export function toMessage(error: unknown): Message {
  if (error instanceof LocalizedError) return error.detail;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return msg('Operazione non completata');
}
export function tr<K extends TranslationKey>(key: K, ...args: MessageArgs<K>) {
  return translate(getLanguage(), key, ...args);
}

function apply(language: Language, persistenceError = false) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    if (state.language !== language || !stop)
      document.title = translate(language, 'Punto · Dashboard personale');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        translate(
          language,
          'Punto: uno spazio per i tuoi progetti, le tue attività e la tua tranquillità economica.',
        ),
      );
  }
  if (
    state.language === language &&
    state.persistenceError === persistenceError
  )
    return;
  state = { language, persistenceError };
  listeners.forEach((listener) => listener());
}

// Initialise before loading data so new categories use the saved preference.
export function initializeLanguage() {
  if (stop) return stop;
  if (typeof window === 'undefined') return () => {};
  let language: Language = 'en';
  let persistenceError = false;
  try {
    language = parseLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    persistenceError = true;
  }
  apply(language, persistenceError);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    apply(parseLanguage(event.newValue));
  };
  window.addEventListener('storage', onStorage);
  stop = () => {
    window.removeEventListener('storage', onStorage);
    stop = undefined;
  };
  return stop;
}
export function setLanguage(language: Language) {
  initializeLanguage();
  let persistenceError = false;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      persistenceError = true;
    }
  }
  apply(language, persistenceError);
}
function subscribe(listener: () => void) {
  initializeLanguage();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useLanguage() {
  return useSyncExternalStore(
    subscribe,
    getLanguageSnapshot,
    getLanguageSnapshot,
  );
}
