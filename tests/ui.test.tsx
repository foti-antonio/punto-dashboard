// @vitest-environment jsdom
import {
  tr,
  setLanguage,
  initializeLanguage,
  type Language,
} from '../src/i18n';
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
  act,
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
  createInitialData,
  moneyInput,
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
let stopLanguage: (() => void) | undefined;
let stopTheme: (() => void) | undefined;
beforeEach(() => {
  location.hash = '#overview';
  localStorage.clear();
  stopTheme = initializeTheme();
  stopLanguage = initializeLanguage();
});
afterEach(() => {
  cleanup();
  stopTheme?.();
  stopLanguage?.();
  vi.restoreAllMocks();
});
let latest: Data;
function Harness({ initial = createInitialData() }: { initial?: Data }) {
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
    screen.getByRole('button', { name: tr('Aggiungi'), exact: true }),
  );
  await user.click(
    within(
      screen.getByRole('group', { name: tr('Aggiungi elemento') }),
    ).getByRole('button', { name: label, exact: true }),
  );
  return within(screen.getByRole('dialog'));
}
describe.each<Language>(['en', 'it'])(
  'percorsi utente nei componenti React (%s)',
  (language) => {
    beforeEach(() => setLanguage(language));
    it('mostra la citazione giornaliera anche nel menu mobile', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const quote = screen.getByRole('figure', {
        name: tr('Citazione stoica del giorno'),
      });
      const original = quote.textContent;
      expect(quote.closest('aside')).toBeTruthy();
      expect(screen.queryByText('Piccoli passi.')).toBeNull();
      await user.click(screen.getByRole('button', { name: tr('Apri menu') }));
      expect(quote.closest('aside')?.classList.contains('mobile-open')).toBe(
        true,
      );
      expect(quote.textContent).toBe(original);
      await user.click(screen.getByRole('button', { name: tr('Chiudi menu') }));
      expect(quote.closest('aside')?.classList.contains('mobile-open')).toBe(
        false,
      );
    });

    it('cambia tema con mouse e tastiera senza modificare dati o sincronizzazione', async () => {
      const user = userEvent.setup();
      render(<Harness initial={demoData()} />);
      await user.click(
        screen.getByRole('button', { name: tr('Impostazioni'), exact: true }),
      );
      await screen.findByRole('button', {
        name: tr('Salvato sul dispositivo'),
      });
      const before = latest;
      const sync = screen.getByTitle(
        tr('Apri le impostazioni di sincronizzazione'),
      );
      const syncBefore = sync.outerHTML;
      const radios = within(
        screen.getByRole('group', { name: tr('Tema dell’interfaccia') }),
      );
      expect(
        (radios.getByLabelText(tr('Sistema')) as HTMLInputElement).checked,
      ).toBe(true);
      await user.click(radios.getByLabelText(tr('Scuro')));
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(localStorage.getItem('punto-theme')).toBe('dark');
      await user.keyboard('{ArrowLeft}');
      expect(
        (radios.getByLabelText(tr('Chiaro')) as HTMLInputElement).checked,
      ).toBe(true);
      expect(document.documentElement.dataset.theme).toBe('light');
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(
        (radios.getByLabelText(tr('Sistema')) as HTMLInputElement).checked,
      ).toBe(true);
      expect(latest).toBe(before);
      expect(sync.outerHTML).toBe(syncBefore);
    });

    it('segnala la preferenza non memorizzata e conserva la scelta durante la navigazione', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(
        screen.getByRole('button', { name: tr('Impostazioni'), exact: true }),
      );
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage blocked');
      });
      await user.click(screen.getByLabelText(tr('Scuro')));
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(screen.getByRole('status').textContent).toContain(
        tr(
          'La preferenza è applicata a questa sessione, ma non è stata memorizzata. Il salvataggio nel browser non è disponibile.',
        ),
      );
      await user.click(
        screen.getByRole('button', { name: tr('Panoramica'), exact: true }),
      );
      await user.click(
        screen.getByRole('button', { name: tr('Impostazioni'), exact: true }),
      );
      expect(
        (screen.getByLabelText(tr('Scuro')) as HTMLInputElement).checked,
      ).toBe(true);
      expect(screen.getByRole('status').textContent).toContain(
        tr(
          'La preferenza è applicata a questa sessione, ma non è stata memorizzata. Il salvataggio nel browser non è disponibile.',
        ),
      );
    });

    it('mantiene il tema locale quando sostituisce i dati con la demo', async () => {
      const user = userEvent.setup();
      setThemePreference('dark');
      render(<Harness />);
      await user.click(
        screen.getByRole('button', { name: tr('Impostazioni'), exact: true }),
      );
      await user.click(screen.getByRole('button', { name: tr('Carica demo') }));
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: tr('Crea backup e carica demo'),
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
      expect(
        screen.getByRole('heading', { name: tr('Panoramica') + '.' }),
      ).toBeTruthy();
      let dialog = await add(user, tr('Conto'));
      await user.type(dialog.getByLabelText(tr('Nome')), 'Conto test');
      await user.clear(dialog.getByLabelText(tr('Saldo iniziale (€)')));
      await user.type(
        dialog.getByLabelText(tr('Saldo iniziale (€)')),
        moneyInput(100000),
      );
      await user.click(
        dialog.getByRole('button', { name: tr('Salva'), exact: true }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      dialog = await add(user, tr('Progetto'));
      await user.type(dialog.getByLabelText(tr('Nome')), 'Progetto test');
      await user.type(
        dialog.getByLabelText(tr('Descrizione')),
        'Una prima iniziativa',
      );
      await user.click(
        dialog.getByRole('button', { name: tr('Salva'), exact: true }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      dialog = await add(user, tr('Attività'));
      await user.type(dialog.getByLabelText(tr('Nome')), 'Consegna test');
      await user.selectOptions(
        dialog.getByLabelText(tr('Progetto')),
        Object.values(latest.entities).find((e) => e.type === 'project')!.id,
      );
      await user.type(dialog.getByLabelText(tr('Scadenza')), today());
      await user.click(
        dialog.getByRole('button', { name: tr('Salva'), exact: true }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByText('Consegna test')).toBeTruthy();
      dialog = await add(user, tr('Movimento'));
      await user.type(dialog.getByLabelText(tr('Descrizione')), 'Acconto test');
      await user.selectOptions(dialog.getByLabelText(tr('Tipo')), 'income');
      await user.type(
        dialog.getByLabelText(tr('Importo (€)')),
        moneyInput(12345),
      );
      await user.selectOptions(
        dialog.getByLabelText(tr('Progetto')),
        Object.values(latest.entities).find((e) => e.type === 'project')!.id,
      );
      await user.click(
        dialog.getByRole('button', { name: tr('Salva'), exact: true }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(
        within(
          screen.getByRole('region', { name: tr('Disponibilità attuale') }),
        ).getByText(euro(112345).replace(/\s/g, ' ')),
      ).toBeTruthy();
      expect(screen.getByText('Acconto test')).toBeTruthy();
      await user.click(
        screen.getByRole('button', {
          name: tr('Completa {name}', { name: 'Consegna test' }),
        }),
      );
      expect(screen.queryByText('Consegna test')).toBeNull();
      await user.click(
        screen.getByRole('button', { name: tr('Analisi'), exact: true }),
      );
      expect(
        screen.getByRole('heading', { name: tr('Analisi') + '.' }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Progetto test' }),
      ).toBeTruthy();
      expect(
        screen.getAllByText(euro(12345).replace(/\s/g, ' ')).length,
      ).toBeGreaterThan(0);
    }, 15000);
    it('registra un trasferimento aggiornando i conti e lasciando invariato il totale', async () => {
      const user = userEvent.setup();
      render(<Harness initial={demoData()} />);
      const before = Object.values(latest.entities).filter(
        (e) => e.type === 'transaction',
      ).length;
      const dialog = await add(user, tr('Movimento'));
      await user.type(
        dialog.getByLabelText(tr('Descrizione')),
        'Trasferimento test',
      );
      await user.selectOptions(dialog.getByLabelText(tr('Tipo')), 'transfer');
      await user.type(
        dialog.getByLabelText(tr('Importo (€)')),
        moneyInput(5000),
      );
      await user.selectOptions(
        dialog.getByLabelText(tr('Al conto')),
        'demo-personal',
      );
      await user.click(
        dialog.getByRole('button', { name: tr('Salva'), exact: true }),
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
        screen.getByRole('button', { name: tr('Previsioni'), exact: true }),
      );
      expect(
        screen.getByRole('button', { name: tr('Registra'), exact: true }),
      ).toBeTruthy();
      await user.click(
        screen.getByRole('button', { name: tr('Registra'), exact: true }),
      );
      const dialog = within(screen.getByRole('dialog'));
      await user.click(
        dialog.getByRole('button', { name: tr('Salva'), exact: true }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(
        screen.queryByRole('button', { name: tr('Registra'), exact: true }),
      ).toBeNull();
      expect(
        Object.values(latest.entities).some(
          (e) =>
            e.type === 'transaction' && e.forecastKey.startsWith('demo-f1@'),
        ),
      ).toBe(true);
    });
    it('raggiunge tutte le sezioni e presenta finestre con nome accessibile', async () => {
      const user = userEvent.setup();
      render(<Harness initial={demoData()} />);
      for (const label of [
        tr('Progetti'),
        tr('Finanze'),
        tr('Attività'),
        tr('Previsioni'),
        tr('Analisi'),
      ]) {
        await user.click(
          screen.getByRole('button', {
            name: new RegExp(`^${label}( \\d+)?$`),
          }),
        );
        expect(screen.getByRole('heading', { name: label + '.' })).toBeTruthy();
      }
      await user.click(
        screen.getByRole('button', { name: tr('Impostazioni'), exact: true }),
      );
      await user.click(
        screen.getByRole('button', { name: tr('Collega GitHub') }),
      );
      expect(
        screen.getByRole('dialog', {
          name: tr('Collega la tua repository privata'),
        }),
      ).toBeTruthy();
    });
    it('controlla un CSV senza scrivere dati prima della conferma e scarta errori e duplicati', async () => {
      const user = userEvent.setup();
      render(<Harness initial={demoData()} />);
      const count = Object.values(latest.entities).filter(
        (e) => e.type === 'transaction' && !e.deletedAt,
      ).length;
      await user.click(
        screen.getByRole('button', { name: tr('Finanze'), exact: true }),
      );
      await user.click(screen.getByRole('button', { name: tr('Importa CSV') }));
      const dialog = within(
        screen.getByRole('dialog', { name: tr('Importa movimenti da CSV') }),
      );
      const content = `Data;Descrizione;Importo\n${today().split('-').reverse().join('/')};Test CSV;-12,34\n${today().split('-').reverse().join('/')};Test CSV;-12,34\n31/02/2026;Data errata;-10,00`;
      const file = new File([content], 'test.csv', { type: 'text/csv' });
      Object.defineProperty(file, 'text', { value: async () => content });
      await user.upload(
        dialog.getByLabelText(new RegExp(tr('Scegli un file CSV'))),
        file,
      );
      await user.click(
        dialog.getByRole('button', { name: tr('Mostra anteprima') }),
      );
      expect(
        dialog.getByText(tr('{count} da importare', { count: 1 })),
      ).toBeTruthy();
      expect(
        dialog.getByText(tr('{count} non valide', { count: 1 })),
      ).toBeTruthy();
      expect(
        dialog.getByText(tr('{count} possibili duplicati', { count: 1 })),
      ).toBeTruthy();
      expect(
        Object.values(latest.entities).filter(
          (e) => e.type === 'transaction' && !e.deletedAt,
        ),
      ).toHaveLength(count);
      await user.click(
        dialog.getByRole('button', {
          name: tr('Conferma {count} movimenti', { count: 1 }),
        }),
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
        screen.getByRole('button', { name: tr('Analisi'), exact: true }),
      );
      const graph = screen.getByRole('img', {
        name: new RegExp(tr('Software e servizi')),
      });
      expect(
        graph
          .getAttribute('aria-label')!
          .match(new RegExp(tr('Software e servizi'), 'g')) || [],
      ).toHaveLength(1);
    });
  },
);

function changeLanguageFromAnotherTab(language: Language) {
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'punto-language',
        newValue: language,
        storageArea: localStorage,
      }),
    ),
  );
}
describe('cambio lingua nell’app', () => {
  it('starts an existing Italian workspace in English, persists selection and leaves saved data untouched', async () => {
    const user = userEvent.setup();
    const original = demoData('it');
    render(<Harness initial={original} />);
    expect(screen.getByRole('heading', { name: 'Overview.' })).toBeTruthy();
    const quote = screen.getByRole('figure', { name: 'Daily Stoic quote' });
    const quoteText = quote.textContent;
    await user.click(
      screen.getByRole('button', { name: 'Settings', exact: true }),
    );
    await screen.findByRole('button', { name: 'Saved on this device' });
    const before = JSON.stringify(latest);
    const reference = latest;
    await user.selectOptions(screen.getByLabelText('Interface language'), 'it');
    expect(document.title).toBe('Il tuo spazio · Punto');
    expect(document.documentElement.lang).toBe('it');
    expect(localStorage.getItem('punto-language')).toBe('it');
    expect(
      screen.getByRole('figure', { name: 'Citazione stoica del giorno' })
        .textContent,
    ).not.toBe(quoteText);
    expect(latest).toBe(reference);
    expect(JSON.stringify(latest)).toBe(before);
    expect(latest.entities['demo-main'].name).toBe('Conto principale');
    changeLanguageFromAnotherTab('en');
    expect(document.title).toBe('Your space · Punto');
    expect(screen.getByLabelText('Interface language')).toHaveProperty(
      'value',
      'en',
    );
    expect(quote.textContent).toBe(quoteText);
    changeLanguageFromAnotherTab('en');
    expect(document.title).toBe('Your space · Punto');
    expect(latest).toBe(reference);
  });

  it('shows an unsaved-language warning and keeps the session choice while navigating', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole('button', { name: 'Settings', exact: true }),
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await user.selectOptions(screen.getByLabelText('Interface language'), 'it');
    expect(screen.getByRole('status').textContent).toContain(
      'non è stata memorizzata',
    );
    await user.click(
      screen.getByRole('button', { name: 'Panoramica', exact: true }),
    );
    expect(screen.getByRole('heading', { name: 'Panoramica.' })).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Impostazioni', exact: true }),
    );
    expect(screen.getByLabelText('Lingua dell’interfaccia')).toHaveProperty(
      'value',
      'it',
    );
    expect(screen.getByRole('status').textContent).toContain(
      'non è stata memorizzata',
    );
  });

  it.each([
    ['Conto', 'Saldo iniziale (€)', 'account', 'openingCents'],
    ['Progetto', 'Obiettivo economico (€)', 'project', 'targetCents'],
    ['Movimento', 'Importo (€)', 'transaction', 'amountCents'],
    ['Previsione', 'Importo (€)', 'forecast', 'amountCents'],
  ] as const)(
    'preserves an amount and user text in an open %s form across tab language changes',
    async (label, field, kind, amountField) => {
      const user = userEvent.setup();
      render(<Harness initial={demoData('it')} />);
      const dialog = await add(user, tr(label));
      const name = dialog.getByLabelText(
        tr(
          kind === 'transaction' || kind === 'forecast'
            ? 'Descrizione'
            : 'Nome',
        ),
      );
      await user.type(name, 'Testo utente invariato');
      const input = dialog.getByLabelText(tr(field));
      await user.clear(input);
      await user.type(input, '1,234.56');
      changeLanguageFromAnotherTab('it');
      expect(input).toHaveProperty('value', '1.234,56');
      expect(name).toHaveProperty('value', 'Testo utente invariato');
      expect(dialog.getByLabelText(field)).toBe(input);
      changeLanguageFromAnotherTab('en');
      expect(input).toHaveProperty('value', '1,234.56');
      await user.click(
        dialog.getByRole('button', { name: 'Save', exact: true }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      const saved = Object.values(latest.entities).find(
        (e) => e.name === 'Testo utente invariato',
      );
      expect(saved).toMatchObject({ type: kind, [amountField]: 123456 });
    },
  );

  it('keeps an ambiguous grouped amount intact when switching from Italian to English', async () => {
    setLanguage('it');
    const user = userEvent.setup();
    render(<Harness initial={demoData('it')} />);
    const dialog = await add(user, 'Movimento');
    await user.type(
      dialog.getByLabelText('Descrizione'),
      'Importo raggruppato',
    );
    const input = dialog.getByLabelText('Importo (€)');
    await user.type(input, '1.234');
    changeLanguageFromAnotherTab('en');
    expect(input).toHaveProperty('value', '1,234');
    await user.click(dialog.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      Object.values(latest.entities).find(
        (e) => e.name === 'Importo raggruppato',
      ),
    ).toMatchObject({ amountCents: 123400 });
  });

  it('translates an existing validation error and preserves incomplete input', async () => {
    const user = userEvent.setup();
    render(<Harness initial={demoData()} />);
    const before = JSON.stringify(latest);
    const dialog = await add(user, 'Transaction');
    await user.type(dialog.getByLabelText('Description'), 'Invalid amount');
    const amount = dialog.getByLabelText('Amount (€)');
    await user.type(amount, '1.234'); // Three decimal places in English: invalid.
    await user.click(dialog.getByRole('button', { name: 'Save', exact: true }));
    expect(dialog.getByRole('alert').textContent).toContain('Invalid amount');
    changeLanguageFromAnotherTab('it');
    expect(amount).toHaveProperty('value', '1,234');
    expect(dialog.getByRole('alert').textContent).toContain(
      'Importo non valido',
    );
    await user.click(
      dialog.getByRole('button', { name: 'Salva', exact: true }),
    );
    expect(JSON.stringify(latest)).toBe(before);
    await user.clear(amount);
    await user.type(amount, '12,');
    changeLanguageFromAnotherTab('en');
    expect(amount).toHaveProperty('value', '12.');
    await user.type(amount, '34');
    await user.click(dialog.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      Object.values(latest.entities).find((e) => e.name === 'Invalid amount'),
    ).toMatchObject({ amountCents: 1234 });
  });

  it('preserves the amount in a scenario adjustment when the language changes', async () => {
    const user = userEvent.setup();
    const initial = demoData();
    initial.entities.scenario = {
      id: 'scenario',
      type: 'scenario',
      name: 'My scenario',
      updatedAt: stamp(),
      adjustments: {},
    };
    render(<Harness initial={initial} />);
    await user.click(
      screen.getByRole('button', { name: 'Forecasts', exact: true }),
    );
    await user.selectOptions(screen.getByLabelText('Scenario'), 'scenario');
    await user.click(
      screen.getAllByRole('button', { name: 'Adjust', exact: true })[0],
    );
    const dialog = within(screen.getByRole('dialog'));
    const amount = dialog.getByLabelText('New amount (€)');
    await user.clear(amount);
    await user.type(amount, '12.34');
    changeLanguageFromAnotherTab('it');
    expect(amount).toHaveProperty('value', '12,34');
    await user.click(dialog.getByRole('button', { name: 'Salva variazione' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(latest.entities.scenario.type).toBe('scenario');
    if (latest.entities.scenario.type === 'scenario')
      expect(
        Object.values(latest.entities.scenario.adjustments)[0].amountCents,
      ).toBe(1234);
  });

  it('keeps explicit CSV separators across language changes and translates preview errors', async () => {
    const user = userEvent.setup();
    render(<Harness initial={demoData()} />);
    const before = JSON.stringify(latest);
    await user.click(
      screen.getByRole('button', { name: 'Finances', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Import CSV' }));
    const dialog = within(screen.getByRole('dialog'));
    const content = `Date;Name;Amount\n${today()};CSV user text;1.234,56\ninvalid;Bad date;10,00`;
    const file = new File([content], 'data.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => content });
    await user.upload(dialog.getByLabelText(/Choose a CSV file/), file);
    await user.selectOptions(dialog.getByLabelText('Date format'), 'ymd');
    await user.click(dialog.getByRole('button', { name: 'Show preview' }));
    expect(dialog.getByText('Invalid date.')).toBeTruthy();
    changeLanguageFromAnotherTab('it');
    expect(dialog.getByLabelText('Separatore decimale')).toHaveProperty(
      'value',
      ',',
    );
    expect(dialog.getByLabelText('Separatore delle colonne')).toHaveProperty(
      'value',
      ';',
    );
    expect(dialog.getByText('Data non valida.')).toBeTruthy();
    expect(dialog.getByText('CSV user text')).toBeTruthy();
    expect(JSON.stringify(latest)).toBe(before);
    await user.click(
      dialog.getByRole('button', {
        name: tr('Conferma {count} movimenti', { count: 1 }),
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      Object.values(latest.entities).find((e) => e.name === 'CSV user text'),
    ).toMatchObject({ amountCents: 123456 });
  });
});
