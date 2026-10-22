import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { fixture, transaction } from './fixtures';
import { type Data } from '../src/domain';
let storage: typeof import('../src/storage');
beforeAll(async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('BroadcastChannel', undefined);
  storage = await import('../src/storage');
});
beforeEach(async () => {
  await storage.putValue('state', { data: fixture(), revision: 1 });
});
describe('archivio IndexedDB', () => {
  it('conserva modifiche concorrenti a elementi diversi della stessa banca dati', async () => {
    await Promise.all([
      storage.mutateData((d) => {
        d.entities.t = transaction();
        return d;
      }),
      storage.mutateData((d) => {
        d.entities.other = transaction({ id: 'other', name: 'Altro' });
        return d;
      }),
    ]);
    const stored = await storage.loadState();
    expect(stored.data.entities.t).toBeDefined();
    expect(stored.data.entities.other).toBeDefined();
    expect(stored.revision).toBe(3);
  });
  it('annulla la transazione se la validazione fallisce', async () => {
    const before = await storage.loadState();
    await expect(
      storage.mutateData((d) => {
        d.entities.t = transaction({ amountCents: 1.5 });
        return d;
      }),
    ).rejects.toThrow();
    expect(await storage.loadState()).toEqual(before);
  });
  it('non sovrascrive una revisione più recente', async () => {
    await storage.mutateData((d) => d);
    await expect(storage.mutateData(() => fixture(), 1)).rejects.toThrow(
      /scheda/,
    );
    expect((await storage.loadState()).revision).toBe(2);
  });
  it('conserva le ultime cinque copie prima del ripristino', async () => {
    for (let i = 0; i < 7; i++)
      await storage.mutateData((d) => d, undefined, { backup: true });
    const copies =
      await storage.getValue<{ date: string; data: Data }[]>('backups');
    expect(copies).toHaveLength(5);
    expect(copies![0].data).toEqual(fixture());
  });
  it('crea backup e sostituisce i dati nella stessa transazione', async () => {
    await storage.mutateData((d) => {
      d.entities.t = transaction();
      return d;
    });
    const previous = await storage.loadState();
    await storage.mutateData(
      (d) => {
        delete d.entities.t;
        return d;
      },
      undefined,
      { backup: true },
    );
    const copies =
      await storage.getValue<{ date: string; data: Data }[]>('backups');
    expect(copies![0].data).toEqual(previous.data);
    expect((await storage.loadState()).data.entities.t).toBeUndefined();
    const before = await storage.getValue('backups');
    await expect(
      storage.mutateData(
        (d) => {
          d.entities.t = transaction({ amountCents: 1.5 });
          return d;
        },
        undefined,
        { backup: true },
      ),
    ).rejects.toThrow();
    expect(await storage.getValue('backups')).toEqual(before);
  });
});
