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
  moneyInput,
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
const labels: Record<FormKind, string> = {
  transaction: 'movimento',
  account: 'conto',
  project: 'progetto',
  task: 'attività',
  forecast: 'previsione',
  category: 'categoria',
  scenario: 'scenario',
};
export function EntityForm({
  spec,
  onClose,
}: {
  spec: FormSpec;
  onClose: () => void;
}) {
  const { data, save, remove, toast } = useApp();
  const { kind, entity } = spec;
  const value = { ...entity, ...spec.defaults } as Record<string, unknown>;
  const initial = (key: string, fallback = '') =>
    String(value[key] ?? fallback);
  const [error, setError] = useState(''),
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
  const getMoney = (key: string) =>
    value[key] === undefined ? '' : moneyInput(Number(value[key]));
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
      if (!base.name) throw new Error('Scrivi un nome.');
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
          throw new Error(
            'Aggiungi prima un conto per registrare i movimenti.',
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
          ? 'Modifiche salvate sul dispositivo.'
          : 'Elemento aggiunto e salvato sul dispositivo.',
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteEntity() {
    setBusy(true);
    try {
      await remove(entity!.id, entity!.updatedAt);
      toast('Elemento eliminato.');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const projectSelect = (
    <Field label="Progetto">
      <select
        name="projectId"
        defaultValue={initial('projectId')}
        key={effectiveScope}
      >
        <option value="">Nessun progetto</option>
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
    <Field label="Ambito">
      <select
        name="scope"
        value={scope}
        onChange={(e) => setScope(e.target.value as Scope)}
      >
        <option value="lavoro">Lavoro</option>
        <option value="personale">Personale</option>
      </select>
    </Field>
  );
  return (
    <Dialog
      title={`${entity ? 'Modifica' : kind === 'task' || kind === 'forecast' || kind === 'category' ? 'Nuova' : 'Nuovo'} ${labels[kind]}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="entity-form">
        <div className="form-grid">
          <Field label={hasMoney ? 'Descrizione' : 'Nome'} full>
            <input
              name="name"
              autoFocus
              required
              maxLength={150}
              defaultValue={initial('name')}
              placeholder={
                kind === 'project'
                  ? 'A cosa stai lavorando?'
                  : kind === 'task'
                    ? 'Cosa devi fare?'
                    : kind === 'account'
                      ? 'Es. Conto principale'
                      : 'Dai un nome chiaro'
              }
            />
          </Field>
          {kind === 'account' && (
            <>
              {scopeSelect}
              <Field
                label="Saldo iniziale (€)"
                hint="Il saldo alla data di partenza, prima dei movimenti."
              >
                <input
                  name="openingCents"
                  inputMode="decimal"
                  defaultValue={getMoney('openingCents') || '0,00'}
                  required
                />
              </Field>
              <Field label="Data del saldo iniziale">
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
            <Field label="Colore">
              <input
                type="color"
                name="color"
                defaultValue={initial('color', colors[0])}
              />
            </Field>
          )}
          {kind === 'project' && (
            <>
              <Field label="Descrizione" full>
                <textarea
                  name="description"
                  defaultValue={initial('description')}
                  rows={2}
                  placeholder="Il contesto, l’idea, il risultato che vuoi ottenere."
                />
              </Field>
              {scopeSelect}
              <Field label="Stato">
                <select
                  name="status"
                  defaultValue={initial('status', 'attivo')}
                >
                  <option value="idea">Idea</option>
                  <option value="attivo">Attivo</option>
                  <option value="pausa">In pausa</option>
                  <option value="completato">Completato</option>
                  <option value="archiviato">Archiviato</option>
                </select>
              </Field>
              <Field label="Data di inizio">
                <input
                  type="date"
                  name="startDate"
                  defaultValue={initial('startDate', today())}
                  required
                />
              </Field>
              <Field label="Data obiettivo">
                <input
                  type="date"
                  name="endDate"
                  defaultValue={initial('endDate')}
                />
              </Field>
              <Field label="Obiettivo economico (€)">
                <input
                  name="targetCents"
                  inputMode="decimal"
                  defaultValue={getMoney('targetCents') || '0,00'}
                />
              </Field>
              <Field label="Colore">
                <select name="color" defaultValue={initial('color', colors[0])}>
                  {colors.map((c, i) => (
                    <option key={c} value={c}>
                      {
                        [
                          'Verde bosco',
                          'Ocra',
                          'Lavanda',
                          'Azzurro',
                          'Terracotta',
                          'Salvia',
                        ][i]
                      }
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Note" full>
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
              <Field label="Stato">
                <select name="status" defaultValue={initial('status', 'todo')}>
                  <option value="todo">Da fare</option>
                  <option value="doing">In corso</option>
                  <option value="done">Fatto</option>
                </select>
              </Field>
              <Field label="Priorità">
                <select
                  name="priority"
                  defaultValue={initial('priority', 'media')}
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="bassa">Bassa</option>
                </select>
              </Field>
              <Field label="Scadenza">
                <input type="date" name="due" defaultValue={initial('due')} />
              </Field>
              <Field
                label="Sottoattività"
                full
                hint="Una per riga. Inizia con [x] per indicare quelle completate."
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
                  placeholder="[ ] Prima cosa da fare"
                />
              </Field>
              <Field label="Note" full>
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
              <Field label="Tipo">
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="expense">Uscita</option>
                  <option value="income">Entrata</option>
                  {kind === 'transaction' && !initial('forecastKey') && (
                    <option value="transfer">Trasferimento</option>
                  )}
                </select>
              </Field>
              <Field label="Importo (€)">
                <input
                  name="amountCents"
                  inputMode="decimal"
                  defaultValue={getMoney('amountCents')}
                  placeholder="0,00"
                  required
                />
              </Field>
              <Field label="Data">
                <input
                  type="date"
                  name="date"
                  min={account?.openingDate}
                  max={kind === 'transaction' ? today() : undefined}
                  defaultValue={initial('date', today())}
                  required
                />
              </Field>
              <Field label={direction === 'transfer' ? 'Dal conto' : 'Conto'}>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Scegli un conto
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.scope === 'lavoro' ? 'Lavoro' : 'Personale'}
                    </option>
                  ))}
                </select>
              </Field>
              {!accounts.length && (
                <p className="inline-error full">
                  Aggiungi un conto dalla sezione Finanze prima di registrare un
                  movimento.
                </p>
              )}
              {direction === 'transfer' ? (
                <Field label="Al conto">
                  <select
                    name="toAccountId"
                    required
                    defaultValue={initial('toAccountId')}
                  >
                    <option value="">Scegli la destinazione</option>
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
                  <Field label="Categoria">
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
                  <Field label="Ripetizione">
                    <select
                      name="recurrence"
                      defaultValue={initial('recurrence', 'none')}
                    >
                      <option value="none">Una sola volta</option>
                      <option value="weekly">Ogni settimana</option>
                      <option value="monthly">Ogni mese</option>
                      <option value="yearly">Ogni anno</option>
                    </select>
                  </Field>
                  <Field label="Fine ricorrenza (facoltativa)">
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={initial('endDate')}
                    />
                  </Field>
                </>
              )}
              {kind === 'transaction' && (
                <Field label="Note" full>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={initial('notes')}
                  />
                </Field>
              )}
              {initial('forecastKey') && (
                <p className="form-hint full">
                  Questo movimento è collegato a una previsione: dopo il
                  salvataggio, la relativa occorrenza non sarà più conteggiata.
                </p>
              )}
            </>
          )}
          {kind === 'scenario' && (
            <p className="form-hint full">
              Lo scenario parte dalle previsioni di base. Potrai cambiare
              importi e date dei singoli movimenti senza modificare i dati
              reali.
            </p>
          )}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            <AlertCircle size={17} />
            {error}
          </p>
        )}
        {deleting && (
          <div className="delete-confirm">
            <p>
              Eliminare questo elemento? I riferimenti storici saranno
              conservati per la sincronizzazione.
            </p>
            <button
              className="button danger"
              disabled={busy}
              type="button"
              onClick={deleteEntity}
            >
              Conferma eliminazione
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setDeleting(false)}
            >
              Annulla
            </button>
          </div>
        )}
        <div className="dialog-actions">
          {entity && (
            <button
              type="button"
              className="icon-button delete-button"
              aria-label="Elimina elemento"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="button secondary" type="button" onClick={onClose}>
            Annulla
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={busy || (hasMoney && !accounts.length)}
          >
            <Save size={16} />
            {busy ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
