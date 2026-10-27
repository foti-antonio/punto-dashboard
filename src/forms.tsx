import {
  msg,
  LocalizedError,
  toMessage,
  messageText,
  type Message,
  tr,
  useLanguage,
} from './i18n';
import { MoneyInput } from './MoneyInput';
import { useState, type FormEvent } from 'react';
import { AlertCircle, Trash2, Save } from 'lucide-react';
import { useApp } from './context';
import { Dialog, Field, CategoryOptions } from './components';
import {
  colors,
  list,
  newId,
  stamp,
  today,
  parseMoney,
  type Kind,
  type Entity,
  type Scope,
  type Account,
  type Project,
  type Task,
  type Transaction,
  type Forecast,
  type Category,
  type Scenario,
} from './domain';
export type FormKind = Exclude<Kind, 'settings'>;
export interface FormSpec {
  kind: FormKind;
  entity?: Entity;
  defaults?: Partial<Transaction | Task | Forecast>;
}
const formTitles = {
  transaction: ['Nuovo movimento', 'Modifica movimento'],
  account: ['Nuovo conto', 'Modifica conto'],
  project: ['Nuovo progetto', 'Modifica progetto'],
  task: ['Nuova attività', 'Modifica attività'],
  forecast: ['Nuova previsione', 'Modifica previsione'],
  category: ['Nuova categoria', 'Modifica categoria'],
  scenario: ['Nuovo scenario', 'Modifica scenario'],
} as const;
export function EntityForm({
  spec,
  onClose,
}: {
  spec: FormSpec;
  onClose: () => void;
}) {
  useLanguage();
  const { data, save, remove, toast } = useApp();
  const { kind, entity } = spec;
  const value = { ...entity, ...spec.defaults } as Record<string, unknown>;
  const initial = (key: string, fallback = '') =>
    String(value[key] ?? fallback);
  const [error, setError] = useState<Message>(''),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false);
  const accounts = list(data, 'account');
  const [accountId, setAccountId] = useState(
    initial('accountId', accounts[0]?.id ?? ''),
  );
  const [scope, setScope] = useState<Scope>(
    initial('scope', 'lavoro') as Scope,
  );
  const [direction, setDirection] = useState(initial('direction', 'expense'));
  const account = data.entities[accountId] as Account | undefined;
  const effectiveScope =
    kind === 'transaction' || kind === 'forecast'
      ? (account?.scope ?? 'lavoro')
      : scope;
  const hasMoney = kind === 'transaction' || kind === 'forecast';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const str = (k: string) => String(form.get(k) ?? '').trim();
    const cents = (k: string, optional = false) =>
      parseMoney(str(k) || (optional ? '0' : ''));
    try {
      const base = {
        id: entity?.id ?? newId(),
        type: kind,
        updatedAt: entity?.updatedAt ?? stamp(),
        name: str('name'),
      };
      if (!base.name) throw new LocalizedError(msg('Scrivi un nome.'));
      let next: Entity;
      if (kind === 'account')
        next = {
          ...base,
          type: kind,
          openingCents: cents('openingCents', true),
          openingDate: str('openingDate'),
          scope,
        } as Account;
      else if (kind === 'category')
        next = { ...base, type: kind, color: str('color') } as Category;
      else if (kind === 'project')
        next = {
          ...base,
          type: kind,
          description: str('description'),
          notes: str('notes'),
          startDate: str('startDate'),
          endDate: str('endDate'),
          targetCents: cents('targetCents', true),
          status: str('status'),
          scope,
          color: str('color'),
        } as Project;
      else if (kind === 'task') {
        const original = entity?.type === 'task' ? entity.subtasks : [];
        const subtasks = str('subtasks')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((line, i) => {
            const done = /^\[x\]\s*/i.test(line),
              name = line.replace(/^\[(x| )\]\s*/i, '');
            return {
              id: original.find((s) => s.name === name)?.id ?? newId() + i,
              name,
              done,
            };
          });
        next = {
          ...base,
          type: kind,
          status: str('status'),
          priority: str('priority'),
          due: str('due'),
          scope,
          projectId: str('projectId'),
          notes: str('notes'),
          subtasks,
        } as Task;
      } else if (kind === 'scenario')
        next = {
          ...base,
          type: kind,
          adjustments: entity?.type === 'scenario' ? entity.adjustments : {},
        } as Scenario;
      else {
        if (!account)
          throw new LocalizedError(
            msg('Aggiungi prima un conto per registrare i movimenti.'),
          );
        const common = {
          ...base,
          amountCents: cents('amountCents'),
          date: str('date'),
          direction,
          accountId,
          categoryId: direction === 'transfer' ? '' : str('categoryId'),
          projectId: direction === 'transfer' ? '' : str('projectId'),
          scope: effectiveScope,
        };
        next =
          kind === 'transaction'
            ? ({
                ...common,
                type: kind,
                toAccountId: direction === 'transfer' ? str('toAccountId') : '',
                forecastKey: initial('forecastKey'),
                notes: str('notes'),
              } as Transaction)
            : ({
                ...common,
                type: 'forecast',
                recurrence: str('recurrence'),
                endDate: str('endDate'),
              } as Forecast);
      }
      await save(next);
      toast(
        entity
          ? msg('Modifiche salvate sul dispositivo.')
          : msg('Elemento aggiunto e salvato sul dispositivo.'),
      );
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteEntity() {
    setBusy(true);
    try {
      await remove(entity!.id, entity!.updatedAt);
      toast(msg('Elemento eliminato.'));
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const projectSelect = (
    <Field label={tr('Progetto')}>
      <select
        name="projectId"
        defaultValue={initial('projectId')}
        key={effectiveScope}
      >
        <option value="">{tr('Nessun progetto')}</option>
        {list(data, 'project')
          .filter(
            (p) =>
              p.scope === effectiveScope &&
              (p.status !== 'archiviato' || p.id === initial('projectId')),
          )
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
    </Field>
  );
  const scopeSelect = (
    <Field label={tr('Ambito')}>
      <select
        name="scope"
        value={scope}
        onChange={(e) => setScope(e.target.value as Scope)}
      >
        <option value="lavoro">{tr('Lavoro')}</option>
        <option value="personale">{tr('Personale')}</option>
      </select>
    </Field>
  );
  return (
    <Dialog title={tr(formTitles[kind][entity ? 1 : 0])} onClose={onClose}>
      <form onSubmit={submit} className="entity-form">
        <div className="form-grid">
          <Field label={hasMoney ? tr('Descrizione') : tr('Nome')} full>
            <input
              name="name"
              autoFocus
              required
              maxLength={150}
              defaultValue={initial('name')}
              placeholder={
                kind === 'project'
                  ? tr('A cosa stai lavorando?')
                  : kind === 'task'
                    ? tr('Cosa devi fare?')
                    : kind === 'account'
                      ? tr('Es. Conto principale')
                      : tr('Dai un nome chiaro')
              }
            />
          </Field>
          {kind === 'account' && (
            <>
              {scopeSelect}
              <Field
                label={tr('Saldo iniziale (€)')}
                hint={tr(
                  'Il saldo alla data di partenza, prima dei movimenti.',
                )}
              >
                <MoneyInput
                  name="openingCents"
                  inputMode="decimal"
                  defaultCents={Number(value.openingCents ?? 0)}
                  required
                />
              </Field>
              <Field label={tr('Data del saldo iniziale')}>
                <input
                  type="date"
                  name="openingDate"
                  max={today()}
                  defaultValue={initial('openingDate', today())}
                  required
                />
              </Field>
            </>
          )}
          {kind === 'category' && (
            <Field label={tr('Colore')}>
              <input
                type="color"
                name="color"
                defaultValue={initial('color', colors[0])}
              />
            </Field>
          )}
          {kind === 'project' && (
            <>
              <Field label={tr('Descrizione')} full>
                <textarea
                  name="description"
                  defaultValue={initial('description')}
                  rows={2}
                  placeholder={tr(
                    'Il contesto, l’idea, il risultato che vuoi ottenere.',
                  )}
                />
              </Field>
              {scopeSelect}
              <Field label={tr('Stato')}>
                <select
                  name="status"
                  defaultValue={initial('status', 'attivo')}
                >
                  <option value="idea">{tr('Idea')}</option>
                  <option value="attivo">{tr('Attivo')}</option>
                  <option value="pausa">{tr('In pausa')}</option>
                  <option value="completato">{tr('Completato')}</option>
                  <option value="archiviato">{tr('Archiviato')}</option>
                </select>
              </Field>
              <Field label={tr('Data di inizio')}>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={initial('startDate', today())}
                  required
                />
              </Field>
              <Field label={tr('Data obiettivo')}>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={initial('endDate')}
                />
              </Field>
              <Field label={tr('Obiettivo economico (€)')}>
                <MoneyInput
                  name="targetCents"
                  inputMode="decimal"
                  defaultCents={Number(value.targetCents ?? 0)}
                />
              </Field>
              <Field label={tr('Colore')}>
                <select name="color" defaultValue={initial('color', colors[0])}>
                  {colors.map((c, i) => (
                    <option key={c} value={c}>
                      {
                        [
                          tr('Verde bosco'),
                          tr('Ocra'),
                          tr('Lavanda'),
                          tr('Azzurro'),
                          tr('Terracotta'),
                          tr('Salvia'),
                        ][i]
                      }
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tr('Note')} full>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={initial('notes')}
                />
              </Field>
            </>
          )}
          {kind === 'task' && (
            <>
              {scopeSelect}
              {projectSelect}
              <Field label={tr('Stato')}>
                <select name="status" defaultValue={initial('status', 'todo')}>
                  <option value="todo">{tr('Da fare')}</option>
                  <option value="doing">{tr('In corso')}</option>
                  <option value="done">{tr('Fatto')}</option>
                </select>
              </Field>
              <Field label={tr('Priorità')}>
                <select
                  name="priority"
                  defaultValue={initial('priority', 'media')}
                >
                  <option value="alta">{tr('Alta')}</option>
                  <option value="media">{tr('Media')}</option>
                  <option value="bassa">{tr('Bassa')}</option>
                </select>
              </Field>
              <Field label={tr('Scadenza')}>
                <input type="date" name="due" defaultValue={initial('due')} />
              </Field>
              <Field
                label={tr('Sottoattività')}
                full
                hint={tr(
                  'Una per riga. Inizia con [x] per indicare quelle completate.',
                )}
              >
                <textarea
                  name="subtasks"
                  rows={3}
                  defaultValue={
                    entity?.type === 'task'
                      ? entity.subtasks
                          .map((s) => `${s.done ? '[x]' : '[ ]'} ${s.name}`)
                          .join('\n')
                      : ''
                  }
                  placeholder={tr('[ ] Prima cosa da fare')}
                />
              </Field>
              <Field label={tr('Note')} full>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={initial('notes')}
                />
              </Field>
            </>
          )}
          {hasMoney && (
            <>
              <Field label={tr('Tipo')}>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="expense">{tr('Uscita')}</option>
                  <option value="income">{tr('Entrata')}</option>
                  {kind === 'transaction' && !initial('forecastKey') && (
                    <option value="transfer">{tr('Trasferimento')}</option>
                  )}
                </select>
              </Field>
              <Field label={tr('Importo (€)')}>
                <MoneyInput
                  name="amountCents"
                  inputMode="decimal"
                  defaultCents={
                    value.amountCents === undefined
                      ? undefined
                      : Number(value.amountCents)
                  }
                  required
                />
              </Field>
              <Field label={tr('Data')}>
                <input
                  type="date"
                  name="date"
                  min={account?.openingDate}
                  max={kind === 'transaction' ? today() : undefined}
                  defaultValue={initial('date', today())}
                  required
                />
              </Field>
              <Field
                label={direction === 'transfer' ? tr('Dal conto') : tr('Conto')}
              >
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {tr('Scegli un conto')}
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ·{' '}
                      {a.scope === 'lavoro' ? tr('Lavoro') : tr('Personale')}
                    </option>
                  ))}
                </select>
              </Field>
              {!accounts.length && (
                <p className="inline-error full">
                  {tr(
                    'Aggiungi un conto dalla sezione Finanze prima di registrare un movimento.',
                  )}
                </p>
              )}
              {direction === 'transfer' ? (
                <Field label={tr('Al conto')}>
                  <select
                    name="toAccountId"
                    required
                    defaultValue={initial('toAccountId')}
                  >
                    <option value="">{tr('Scegli la destinazione')}</option>
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <option value={a.id} key={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </Field>
              ) : (
                <>
                  <Field label={tr('Categoria')}>
                    <select
                      name="categoryId"
                      defaultValue={initial('categoryId')}
                    >
                      <CategoryOptions data={data} />
                    </select>
                  </Field>
                  {projectSelect}
                </>
              )}
              {kind === 'forecast' && (
                <>
                  <Field label={tr('Ripetizione')}>
                    <select
                      name="recurrence"
                      defaultValue={initial('recurrence', 'none')}
                    >
                      <option value="none">{tr('Una sola volta')}</option>
                      <option value="weekly">{tr('Ogni settimana')}</option>
                      <option value="monthly">{tr('Ogni mese')}</option>
                      <option value="yearly">{tr('Ogni anno')}</option>
                    </select>
                  </Field>
                  <Field label={tr('Fine ricorrenza (facoltativa)')}>
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={initial('endDate')}
                    />
                  </Field>
                </>
              )}
              {kind === 'transaction' && (
                <Field label={tr('Note')} full>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={initial('notes')}
                  />
                </Field>
              )}
              {initial('forecastKey') && (
                <p className="form-hint full">
                  {tr(
                    'Questo movimento è collegato a una previsione: dopo il salvataggio, la relativa occorrenza non sarà più conteggiata.',
                  )}
                </p>
              )}
            </>
          )}
          {kind === 'scenario' && (
            <p className="form-hint full">
              {tr(
                'Lo scenario parte dalle previsioni di base. Potrai cambiare importi e date dei singoli movimenti senza modificare i dati reali.',
              )}
            </p>
          )}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            <AlertCircle size={17} />
            {messageText(error)}
          </p>
        )}
        {deleting && (
          <div className="delete-confirm">
            <p>
              {tr(
                'Eliminare questo elemento? I riferimenti storici saranno conservati per la sincronizzazione.',
              )}
            </p>
            <button
              className="button danger"
              disabled={busy}
              type="button"
              onClick={deleteEntity}
            >
              {tr('Conferma eliminazione')}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setDeleting(false)}
            >
              {tr('Annulla')}
            </button>
          </div>
        )}
        <div className="dialog-actions">
          {entity && (
            <button
              type="button"
              className="icon-button delete-button"
              aria-label={tr('Elimina elemento')}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="button secondary" type="button" onClick={onClose}>
            {tr('Annulla')}
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={busy || (hasMoney && !accounts.length)}
          >
            <Save size={16} />
            {busy ? tr('Salvataggio…') : tr('Salva')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
