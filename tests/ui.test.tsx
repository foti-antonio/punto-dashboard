// @vitest-environment jsdom
import React, { useState } from 'react';
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import {
  render,
  screen,
  within,
  cleanup,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { App } from '../src/App';
import { Context } from '../src/context';
import { initializeTheme, setThemePreference } from '../src/theme';
import {
  emptyData,
  demoData,
  validateData,
  stamp,
  today,
  shiftDate,
  euro,
  type Data,
  type Entity,
} from '../src/domain';
beforeAll(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
let stopTheme: (() => void) | undefined;
beforeEach(() => {
  location.hash = '#overview';
  localStorage.clear();
  stopTheme = initializeTheme();
});
afterEach(() => {
  cleanup();
  stopTheme?.();
  vi.restoreAllMocks();
});
let latest: Data;
function Harness({ initial = emptyData() }: { initial?: Data }) {
  const [data, setData] = useState(initial);
  latest = data;
  const update = async (fn: (d: Data) => Data) =>
    setData((previous) => validateData(fn(structuredClone(previous))));
  return (
    <Context.Provider
      value={{
        data,
        revision: 1,
        update,
        save: async (e: Entity) =>
          update((d) => {
            d.entities[e.id] = { ...e, updatedAt: stamp() };
            return d;
          }),
        remove: async (id) =>
          update((d) => {
            d.entities[id] = { ...d.entities[id], deletedAt: stamp() };
            return d;
          }),
        toast: vi.fn(),
      }}
    >
      <App />
    </Context.Provider>
  );
}
async function add(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(
    screen.getByRole('button', { name: 'Aggiungi', exact: true }),
  );
  await user.click(
    within(screen.getByRole('group', { name: 'Aggiungi elemento' })).getByRole(
      'button',
      { name: label, exact: true },
    ),
  );
  return within(screen.getByRole('dialog'));
}
describe('percorsi utente nei componenti React', () => {
  it('cambia tema con mouse e tastiera senza modificare dati o sincronizzazione', async () => {
    const user = userEvent.setup();
    render(<Harness initial={demoData()} />);
    await user.click(
      screen.getByRole('button', { name: 'Impostazioni', exact: true }),
    );
    await screen.findByRole('button', { name: 'Salvato sul dispositivo' });
    const before = latest;
    const sync = screen.getByTitle('Apri le impostazioni di sincronizzazione');
    const syncBefore = sync.outerHTML;
    const radios = within(
      screen.getByRole('group', { name: 'Tema dell’interfaccia' }),
    );
    expect((radios.getByLabelText('Sistema') as HTMLInputElement).checked).toBe(
      true,
    );
    await user.click(radios.getByLabelText('Scuro'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('punto-theme')).toBe('dark');
    await user.keyboard('{ArrowLeft}');
    expect((radios.getByLabelText('Chiaro') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect((radios.getByLabelText('Sistema') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(latest).toBe(before);
    expect(sync.outerHTML).toBe(syncBefore);
  });

  it('segnala la preferenza non memorizzata e conserva la scelta durante la navigazione', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole('button', { name: 'Impostazioni', exact: true }),
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    await user.click(screen.getByLabelText('Scuro'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('status').textContent).toContain(
      'non è stata memorizzata',
    );
    await user.click(
      screen.getByRole('button', { name: 'Panoramica', exact: true }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Impostazioni', exact: true }),
    );
    expect((screen.getByLabelText('Scuro') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'non è stata memorizzata',
    );
  });

  it('mantiene il tema locale quando sostituisce i dati con la demo', async () => {
    const user = userEvent.setup();
    setThemePreference('dark');
    render(<Harness />);
    await user.click(
      screen.getByRole('button', { name: 'Impostazioni', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Carica demo' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Crea backup e carica demo',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('punto-theme')).toBe('dark');
    expect(JSON.stringify(latest)).not.toContain('punto-theme');
  });

  it('crea conto, progetto, attività e movimento e aggiorna panoramica e analisi', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Panoramica.' })).toBeTruthy();
    let dialog = await add(user, 'Conto');
    await user.type(dialog.getByLabelText('Nome'), 'Conto test');
    await user.clear(dialog.getByLabelText('Saldo iniziale (€)'));
    await user.type(dialog.getByLabelText('Saldo iniziale (€)'), '1000,00');
    await user.click(
      dialog.getByRole('button', { name: 'Salva', exact: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    dialog = await add(user, 'Progetto');
    await user.type(dialog.getByLabelText('Nome'), 'Progetto test');
    await user.type(
      dialog.getByLabelText('Descrizione'),
      'Una prima iniziativa',
    );
    await user.click(
      dialog.getByRole('button', { name: 'Salva', exact: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    dialog = await add(user, 'Attività');
    await user.type(dialog.getByLabelText('Nome'), 'Consegna test');
    await user.selectOptions(
      dialog.getByLabelText('Progetto'),
      Object.values(latest.entities).find((e) => e.type === 'project')!.id,
    );
    await user.type(dialog.getByLabelText('Scadenza'), today());
    await user.click(
      dialog.getByRole('button', { name: 'Salva', exact: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Consegna test')).toBeTruthy();
    dialog = await add(user, 'Movimento');
    await user.type(dialog.getByLabelText('Descrizione'), 'Acconto test');
    await user.selectOptions(dialog.getByLabelText('Tipo'), 'income');
    await user.type(dialog.getByLabelText('Importo (€)'), '123,45');
    await user.selectOptions(
      dialog.getByLabelText('Progetto'),
      Object.values(latest.entities).find((e) => e.type === 'project')!.id,
    );
    await user.click(
      dialog.getByRole('button', { name: 'Salva', exact: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      within(
        screen.getByRole('region', { name: 'Disponibilità attuale' }),
      ).getByText(/1123,45/),
    ).toBeTruthy();
    expect(screen.getByText('Acconto test')).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Completa Consegna test' }),
    );
    expect(screen.queryByText('Consegna test')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'Analisi', exact: true }),
    );
    expect(screen.getByRole('heading', { name: 'Analisi.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Progetto test' })).toBeTruthy();
    expect(screen.getAllByText(/123,45/).length).toBeGreaterThan(0);
  }, 15000);
  it('registra un trasferimento aggiornando i conti e lasciando invariato il totale', async () => {
    const user = userEvent.setup();
    render(<Harness initial={demoData()} />);
    const before = Object.values(latest.entities).filter(
      (e) => e.type === 'transaction',
    ).length;
    const dialog = await add(user, 'Movimento');
    await user.type(dialog.getByLabelText('Descrizione'), 'Trasferimento test');
    await user.selectOptions(dialog.getByLabelText('Tipo'), 'transfer');
    await user.type(dialog.getByLabelText('Importo (€)'), '50,00');
    await user.selectOptions(
      dialog.getByLabelText('Al conto'),
      'demo-personal',
    );
    await user.click(
      dialog.getByRole('button', { name: 'Salva', exact: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const transactions = Object.values(latest.entities).filter(
      (e) => e.type === 'transaction',
    );
    expect(transactions.length).toBe(before + 1);
    expect(transactions.at(-1)).toMatchObject({
      direction: 'transfer',
      amountCents: 5000,
      projectId: '',
      categoryId: '',
    });
  });
  it('registra una previsione e la rimuove dalla lista delle occorrenze', async () => {
    const user = userEvent.setup();
    const initial = demoData();
    for (const [id, e] of Object.entries(initial.entities))
      if (e.type === 'forecast' && id !== 'demo-f1') e.deletedAt = stamp();
    const f = initial.entities['demo-f1'];
    if (f.type === 'forecast') {
      f.recurrence = 'none';
      f.date = shiftDate(today(), 2);
    }
    render(<Harness initial={initial} />);
    await user.click(
      screen.getByRole('button', { name: 'Previsioni', exact: true }),
    );
    expect(
      screen.getByRole('button', { name: 'Registra', exact: true }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Registra', exact: true }),
    );
    const dialog = within(screen.getByRole('dialog'));
    await user.click(
      dialog.getByRole('button', { name: 'Salva', exact: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.queryByRole('button', { name: 'Registra', exact: true }),
    ).toBeNull();
    expect(
      Object.values(latest.entities).some(
        (e) => e.type === 'transaction' && e.forecastKey.startsWith('demo-f1@'),
      ),
    ).toBe(true);
  });
  it('raggiunge tutte le sezioni e presenta finestre con nome accessibile', async () => {
    const user = userEvent.setup();
    render(<Harness initial={demoData()} />);
    for (const label of [
      'Progetti',
      'Finanze',
      'Attività',
      'Previsioni',
      'Analisi',
    ]) {
      await user.click(
        screen.getByRole('button', { name: new RegExp(`^${label}( \\d+)?$`) }),
      );
      expect(screen.getByRole('heading', { name: label + '.' })).toBeTruthy();
    }
    await user.click(
      screen.getByRole('button', { name: 'Impostazioni', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Collega GitHub' }));
    expect(
      screen.getByRole('dialog', { name: 'Collega la tua repository privata' }),
    ).toBeTruthy();
  });
  it('controlla un CSV senza scrivere dati prima della conferma e scarta errori e duplicati', async () => {
    const user = userEvent.setup();
    render(<Harness initial={demoData()} />);
    const count = Object.values(latest.entities).filter(
      (e) => e.type === 'transaction' && !e.deletedAt,
    ).length;
    await user.click(
      screen.getByRole('button', { name: 'Finanze', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Importa CSV' }));
    const dialog = within(
      screen.getByRole('dialog', { name: 'Importa movimenti da CSV' }),
    );
    const content = `Data;Descrizione;Importo\n${today().split('-').reverse().join('/')};Test CSV;-12,34\n${today().split('-').reverse().join('/')};Test CSV;-12,34\n31/02/2026;Data errata;-10,00`;
    const file = new File([content], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => content });
    await user.upload(dialog.getByLabelText(/Scegli un file CSV/), file);
    await user.click(dialog.getByRole('button', { name: 'Mostra anteprima' }));
    expect(dialog.getByText('1 da importare')).toBeTruthy();
    expect(dialog.getByText('1 non valide')).toBeTruthy();
    expect(dialog.getByText('1 possibili duplicati')).toBeTruthy();
    expect(
      Object.values(latest.entities).filter(
        (e) => e.type === 'transaction' && !e.deletedAt,
      ),
    ).toHaveLength(count);
    await user.click(
      dialog.getByRole('button', { name: 'Conferma 1 movimenti' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      Object.values(latest.entities).filter(
        (e) => e.type === 'transaction' && !e.deletedAt,
      ),
    ).toHaveLength(count + 1);
  });
  it('raggruppa le spese storiche una sola volta anche se la categoria è stata eliminata', async () => {
    const user = userEvent.setup(),
      initial = demoData();
    const existing = Object.values(initial.entities).find(
      (e) =>
        e.type === 'transaction' &&
        e.categoryId === 'category-3' &&
        e.date.startsWith(today().slice(0, 7)),
    )!;
    initial.entities.extra = { ...existing, id: 'extra' };
    initial.entities['category-3'].deletedAt = stamp();
    render(<Harness initial={initial} />);
    await user.click(
      screen.getByRole('button', { name: 'Analisi', exact: true }),
    );
    const graph = screen.getByRole('img', { name: /Software e servizi/ });
    expect(
      graph.getAttribute('aria-label')!.match(/Software e servizi/g) || [],
    ).toHaveLength(1);
  });
});
