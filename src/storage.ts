import { emptyData, validateData, type Data } from './domain';
export interface StoredState {
  data: Data;
  revision: number;
}
let database: Promise<IDBDatabase> | undefined;
const channel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('punto-data-v1')
    : null;
export function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('punto-dashboard', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('kv');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          'Impossibile aprire l’archivio locale. Controlla i permessi del browser.',
        ),
      );
    request.onblocked = () =>
      reject(new Error('Chiudi le altre schede di Punto e riprova.'));
  }));
}
export async function getValue<T>(key: string): Promise<T | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function putValue(key: string, value: unknown) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function mutateData(
  mutate: (data: Data) => Data,
  expectedRevision?: number,
  options?: { backup?: boolean },
): Promise<StoredState> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.get('state');
    let result: StoredState;
    let error: unknown;
    req.onsuccess = () => {
      try {
        const current: StoredState = req.result ?? {
          data: emptyData(),
          revision: 0,
        };
        if (
          expectedRevision !== undefined &&
          current.revision !== expectedRevision
        )
          throw new Error(
            'I dati sono cambiati in un’altra scheda. Ripeti l’operazione.',
          );
        result = {
          data: validateData(mutate(structuredClone(current.data))),
          revision: current.revision + 1,
        };
        if (options?.backup) {
          const backups = store.get('backups');
          backups.onsuccess = () => {
            store.put(
              [
                { date: new Date().toISOString(), data: current.data },
                ...(backups.result ?? []),
              ].slice(0, 5),
              'backups',
            );
            store.put(result, 'state');
          };
        } else store.put(result, 'state');
      } catch (e) {
        error = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      channel?.postMessage('changed');
      window.dispatchEvent(new Event('punto-data'));
      resolve(result);
    };
    tx.onerror = tx.onabort = () =>
      reject(
        error ?? tx.error ?? new Error('Salvataggio locale non riuscito.'),
      );
  });
}
export async function loadState() {
  return (await getValue<StoredState>('state')) ?? (await mutateData((d) => d));
}
export function subscribe(callback: () => void) {
  const listener = () => callback();
  channel?.addEventListener('message', listener);
  window.addEventListener('punto-data', listener);
  return () => {
    channel?.removeEventListener('message', listener);
    window.removeEventListener('punto-data', listener);
  };
}
export function downloadJSON(data: Data, suffix = '') {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `punto${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
