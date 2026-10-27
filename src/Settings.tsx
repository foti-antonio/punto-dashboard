import {
  msg,
  LocalizedError,
  toMessage,
  messageText,
  type Message,
  tr,
  locale,
  numberLabel,
  useLanguage,
  setLanguage,
  type Language,
} from './i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitBranch,
  LockKeyhole,
  RefreshCw,
  CloudUpload,
  Check,
  Download,
  Upload,
  ShieldCheck,
  ExternalLink,
  FolderArchive,
  Play,
  AlertCircle,
  HardDrive,
  Trash2,
  Link2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useApp } from './context';
import { Dialog, Field, SectionHeading } from './components';
import {
  createInitialData,
  demoData,
  equal,
  list,
  stamp,
  validateData,
  parseDataJSON,
  type Data,
  type Settings,
} from './domain';
import { downloadJSON, getValue, putValue } from './storage';
import {
  decryptToken,
  encryptToken,
  verifyRepo,
  prepareSync,
  finishSync,
  getBase,
  type Vault,
  type RepoConfig,
  type SyncPlan,
} from './github';
import { type FormSpec } from './forms';
import { setThemePreference, useTheme } from './theme';
export interface SyncIndicator {
  label: Message;
  status: 'local' | 'dirty' | 'syncing' | 'synced' | 'error' | 'locked';
}
export function SettingsPage({
  visible,
  onIndicator,
  onForm,
}: {
  visible: boolean;
  onIndicator: (s: SyncIndicator) => void;
  onForm: (s: FormSpec) => void;
}) {
  const { data, revision, save, update, toast } = useApp();
  const theme = useTheme();
  const languageState = useLanguage();
  const [vault, setVault] = useState<Vault | null>(null),
    [loaded, setLoaded] = useState(false),
    [token, setToken] = useState(''),
    [setup, setSetup] = useState(false),
    [unlocking, setUnlocking] = useState(false),
    [password, setPassword] = useState(''),
    [error, setError] = useState<Message>(''),
    [busy, setBusy] = useState(false),
    [lastSync, setLastSync] = useState(''),
    [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState<{
      plan: SyncPlan;
      push: boolean;
    } | null>(null),
    [choices, setChoices] = useState<Record<string, 'local' | 'remote'>>({});
  const [restore, setRestore] = useState<{ data: Data; name: string } | null>(
      null,
    ),
    [confirmation, setConfirmation] = useState<'demo' | 'clear' | null>(null),
    [backups, setBackups] = useState<{ date: string; data: Data }[]>([]);
  const running = useRef(false),
    autoStarted = useRef('');
  useEffect(() => {
    let active = true;
    Promise.all([
      getValue<Vault>('vault'),
      getValue<{ date: string; data: Data }[]>('backups'),
    ])
      .then(([v, b]) => {
        if (active) {
          setVault(v ?? null);
          setBackups(b ?? []);
          setLoaded(true);
        }
      })
      .catch((e) => setError(toMessage(e)));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (!loaded) return;
    if (busy) {
      onIndicator({
        label: msg('Sincronizzazione in corso'),
        status: 'syncing',
      });
      return;
    }
    if (error) {
      onIndicator({
        label: msg('Sincronizzazione da verificare'),
        status: 'error',
      });
      return;
    }
    if (!vault) {
      onIndicator({ label: msg('Salvato sul dispositivo'), status: 'local' });
      return;
    }
    getBase(vault.config)
      .then((base) => {
        if (!active) return;
        const changed = !base || !equal(data, base.data);
        setDirty(changed);
        setLastSync(base?.date ?? '');
        onIndicator({
          label: !token
            ? msg('GitHub da sbloccare')
            : changed
              ? msg('Modifiche locali')
              : msg('Sincronizzato'),
          status: !token ? 'locked' : changed ? 'dirty' : 'synced',
        });
      })
      .catch((e) => setError(toMessage(e)));
    return () => {
      active = false;
    };
  }, [data, revision, vault, loaded, token, busy, error, onIndicator]);
  const sync = useCallback(
    async (push: boolean, sessionToken = token, config = vault?.config) => {
      if (!config || !sessionToken || running.current) return;
      running.current = true;
      setBusy(true);
      setError('');
      try {
        const plan = await prepareSync(config, sessionToken);
        if (plan.conflicts.length) {
          setChoices({});
          setConflict({ plan, push });
          return;
        }
        const result = await finishSync(plan, {}, sessionToken, push);
        setDirty(result.dirty);
        toast(
          push
            ? msg('Dati salvati su GitHub.')
            : msg(
                'Aggiornamenti recuperati. Le modifiche locali sono conservate.',
              ),
        );
      } catch (e) {
        setError(toMessage(e));
      } finally {
        setBusy(false);
        running.current = false;
      }
    },
    [token, vault, toast],
  );
  useEffect(() => {
    if (token && vault && autoStarted.current !== token) {
      autoStarted.current = token;
      void sync(false, token, vault.config);
    }
  }, [token, vault, sync]);
  async function resolveConflicts() {
    if (!conflict) return;
    setBusy(true);
    setError('');
    try {
      await finishSync(conflict.plan, choices, token, conflict.push);
      setConflict(null);
      toast(
        msg('Conflitti risolti. Le versioni scelte sono state conservate.'),
      );
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function replaceData(next: Data) {
    setBusy(true);
    setError('');
    try {
      await update(
        (current) => {
          const replacement = structuredClone(next);
          for (const [id, e] of Object.entries(replacement.entities))
            replacement.entities[id] = { ...e, updatedAt: stamp() };
          for (const [id, e] of Object.entries(current.entities))
            if (!Object.hasOwn(replacement.entities, id))
              replacement.entities[id] = {
                ...e,
                deletedAt: stamp(),
                updatedAt: stamp(),
              };
          return replacement;
        },
        { backup: true },
      );
      setBackups((await getValue('backups')) ?? []);
      setRestore(null);
      setConfirmation(null);
      toast(
        msg(
          'Dati aggiornati. Una copia precedente è disponibile nei backup locali.',
        ),
      );
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function readRestore(file: File) {
    setError('');
    try {
      if (file.size > 10000000)
        throw new LocalizedError(msg('Il file supera 10 MB.'));
      const parsed = parseDataJSON(await file.text());
      setRestore({ data: parsed, name: file.name });
    } catch (e) {
      setError(
        msg('Ripristino non disponibile: {message}', { message: toMessage(e) }),
      );
    }
  }
  async function disconnect() {
    setToken('');
    setPassword('');
    autoStarted.current = '';
    await putValue('vault', null);
    setVault(null);
    setError('');
    toast(msg('Collegamento rimosso dal dispositivo. I dati sono conservati.'));
  }
  const settings = data.entities.settings as Settings;
  return (
    <>
      <div hidden={!visible} className="settings-page">
        <section className="panel settings-panel">
          <SectionHeading
            title={tr('Il tuo profilo')}
            description={tr(
              'Un piccolo dettaglio per rendere questo spazio tuo.',
            )}
          />
          <form
            className="profile-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await save({ ...settings, name: String(f.get('name')).trim() });
                toast(msg('Profilo aggiornato.'));
              } catch (err) {
                setError(toMessage(err));
              }
            }}
          >
            <Field label={tr('Come ti chiami?')}>
              <input
                name="name"
                defaultValue={settings.name}
                key={settings.name}
                maxLength={80}
                placeholder={tr('Il tuo nome')}
              />
            </Field>
            <button className="button secondary">{tr('Salva profilo')}</button>
          </form>
          <div className="settings-meta">
            <span>
              {tr('Valuta')} <strong>Euro (EUR)</strong>
            </span>
            <span>
              {tr('Fuso orario')} <strong>Europe/Rome</strong>
            </span>
            <span>
              {tr('Archivio')} <strong>{tr('Questo profilo browser')}</strong>
            </span>
          </div>
        </section>
        <section className="panel settings-panel">
          <SectionHeading title={tr('Lingua')} />
          <div className="language-options">
            <Field label={tr('Lingua dell’interfaccia')}>
              <select
                value={languageState.language}
                onChange={(event) =>
                  setLanguage(event.target.value as Language)
                }
              >
                <option value="en" lang="en">
                  English
                </option>
                <option value="it" lang="it">
                  Italiano
                </option>
              </select>
            </Field>
          </div>
          <p className="form-hint">
            {tr(
              'La lingua viene salvata solo in questo browser, esclusa da backup e sincronizzazione.',
            )}
          </p>
          {languageState.persistenceError && (
            <p className="theme-storage-error" role="status">
              {tr(
                'La preferenza è applicata a questa sessione, ma non è stata memorizzata. Il salvataggio nel browser non è disponibile.',
              )}
            </p>
          )}
        </section>
        <section className="panel settings-panel">
          <SectionHeading title={tr('Aspetto')} />
          <fieldset className="theme-options" aria-describedby="theme-note">
            <legend className="sr-only">{tr('Tema dell’interfaccia')}</legend>
            {(
              [
                ['light', tr('Chiaro'), Sun],
                ['dark', tr('Scuro'), Moon],
                ['system', tr('Sistema'), Monitor],
              ] as const
            ).map(([value, label, Icon]) => (
              <label className="theme-option" key={value}>
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={theme.preference === value}
                  onChange={() => setThemePreference(value)}
                />
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <p className="form-hint" id="theme-note">
            {tr('La preferenza viene salvata solo in questo browser')}
          </p>
          {theme.persistenceError && (
            <p className="theme-storage-error" role="status">
              {tr(
                'La preferenza è applicata a questa sessione, ma non è stata memorizzata. Il salvataggio nel browser non è disponibile.',
              )}
            </p>
          )}
        </section>
        <section className="panel settings-panel">
          <div className="settings-section-title">
            <span className="settings-icon">
              <GitBranch size={24} />
            </span>
            <div>
              <h2>{tr('Il tuo archivio, su GitHub')}</h2>
              <p>
                {tr(
                  'Una repository privata per portare i tuoi dati da un dispositivo all’altro.',
                )}
              </p>
            </div>
            <span className={`badge ${token ? 'green' : ''}`}>
              {vault
                ? token
                  ? tr('Sbloccato')
                  : tr('Da sbloccare')
                : tr('Da collegare')}
            </span>
          </div>
          <p className="settings-explainer">
            {tr(
              'Il salvataggio nel browser è automatico. «Salva su GitHub» conserva una copia completa nella tua repository. Dopo lo sblocco, Punto cerca gli aggiornamenti e confronta le modifiche.',
            )}
          </p>
          {vault ? (
            <>
              <div className="repo-info">
                <GitBranch size={20} />
                <div>
                  <strong>
                    {vault.config.owner}/{vault.config.repo}
                  </strong>
                  <small>
                    {vault.config.branch} · {vault.config.path}
                  </small>
                </div>
                <span className="badge">{tr('Privata')}</span>
              </div>
              {!token ? (
                <form
                  className="unlock-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setUnlocking(true);
                    setError('');
                    try {
                      setToken(await decryptToken(vault, password));
                      setPassword('');
                    } catch (err) {
                      setError(toMessage(err));
                    } finally {
                      setUnlocking(false);
                    }
                  }}
                >
                  <Field label={tr('Password locale')}>
                    <input
                      type="password"
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder={tr('Sblocca il collegamento')}
                    />
                  </Field>
                  <button className="button primary" disabled={unlocking}>
                    <LockKeyhole size={16} />
                    {unlocking ? tr('Sblocco…') : tr('Sblocca GitHub')}
                  </button>
                </form>
              ) : (
                <>
                  <div className="sync-status-box">
                    <span className={`status-dot ${dirty ? 'dirty' : ''}`} />
                    <div>
                      <strong>
                        {busy
                          ? tr('Sincronizzazione in corso…')
                          : dirty
                            ? tr('Ci sono modifiche locali')
                            : tr('Dati sincronizzati')}
                      </strong>
                      <small>
                        {lastSync
                          ? tr('Ultimo confronto: {date}', {
                              date: new Intl.DateTimeFormat(locale(), {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: 'Europe/Rome',
                              }).format(new Date(lastSync)),
                            })
                          : tr('Nessun salvataggio condiviso')}
                      </small>
                    </div>
                  </div>
                  <div className="toolbar-actions">
                    <button
                      className="button primary"
                      onClick={() => sync(true)}
                      disabled={busy || !!conflict}
                    >
                      <CloudUpload size={17} />
                      {busy ? tr('Sincronizzazione…') : tr('Salva su GitHub')}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => sync(false)}
                      disabled={busy || !!conflict}
                    >
                      <RefreshCw size={16} />
                      {tr('Recupera aggiornamenti')}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setToken('');
                        autoStarted.current = '';
                      }}
                      disabled={busy}
                    >
                      <LockKeyhole size={15} />
                      {tr('Blocca')}
                    </button>
                  </div>
                </>
              )}
              <div className="connection-links">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setSetup(true)}
                >
                  {tr('Riconfigura collegamento')}
                </button>
                <button
                  className="text-button muted"
                  disabled={busy}
                  onClick={() =>
                    disconnect().catch((e) => setError(toMessage(e)))
                  }
                >
                  {tr('Scollega da questo dispositivo')}
                </button>
              </div>
            </>
          ) : (
            <div className="connect-callout">
              <ShieldCheck size={29} />
              <div>
                <strong>{tr('I tuoi dati restano tuoi.')}</strong>
                <p>
                  {tr(
                    'Il token è cifrato sul dispositivo. Non viene incluso nelle esportazioni o nei salvataggi GitHub.',
                  )}
                </p>
              </div>
              <button className="button primary" onClick={() => setSetup(true)}>
                <Link2 size={16} />
                {tr('Collega GitHub')}
              </button>
            </div>
          )}
          <div className="privacy-note">
            <HardDrive size={16} />
            <span>
              {tr(
                'La password sblocca solo GitHub. I dati locali rimangono accessibili in questo profilo browser. Cancella i dati del sito solo dopo averli esportati o salvati su GitHub.',
              )}
            </span>
          </div>
        </section>
        <section className="panel settings-panel">
          <SectionHeading
            title={tr('Categorie')}
            description={tr(
              'Un ordine che segue il tuo modo di vivere e lavorare.',
            )}
            action={tr('Aggiungi categoria')}
            onAction={() => onForm({ kind: 'category' })}
          />
          <div className="category-chips">
            {list(data, 'category').map((c) => (
              <button
                key={c.id}
                onClick={() => onForm({ kind: 'category', entity: c })}
              >
                <i style={{ background: c.color }} />
                {c.name}
                <ChevronIcon />
              </button>
            ))}
          </div>
        </section>
        <section className="panel settings-panel">
          <SectionHeading
            title={tr('Porta i tuoi dati con te')}
            description={tr(
              'Esporta una copia completa o ripristina un salvataggio precedente.',
            )}
          />
          <div className="backup-actions">
            <button className="backup-card" onClick={() => downloadJSON(data)}>
              <Download size={23} />
              <strong>{tr('Esporta in JSON')}</strong>
              <span>
                {tr('Tutti i dati e le impostazioni, senza credenziali.')}
              </span>
            </button>
            <label className="backup-card">
              <Upload size={23} />
              <strong>{tr('Ripristina un JSON')}</strong>
              <span>
                {tr('Controlla l’anteprima prima di sostituire i dati.')}
              </span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  if (e.target.files?.[0]) void readRestore(e.target.files[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {backups.length > 0 && (
            <div className="local-backups">
              <h3>{tr('Copie di sicurezza locali')}</h3>
              <p>
                {tr(
                  'Le ultime cinque copie create prima di sostituire i dati.',
                )}
              </p>
              {backups.map((b, i) => (
                <div key={b.date}>
                  <span>
                    {new Intl.DateTimeFormat(locale(), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Europe/Rome',
                    }).format(new Date(b.date))}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => downloadJSON(b.data, `-backup-${i + 1}`)}
                  >
                    {tr('Esporta')}
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      setRestore({
                        data: validateData(b.data),
                        name: tr('Backup locale'),
                      })
                    }
                  >
                    {tr('Ripristina')}
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="form-hint">
            {tr(
              'Per una versione precedente su GitHub, apri la cronologia del file nella repository, scarica il JSON di quel salvataggio e ripristinalo qui.',
            )}
          </p>
        </section>
        <section className="panel settings-panel">
          <SectionHeading
            title={tr('Esplora o riparti')}
            description={tr(
              'Prima di sostituire i dati verrà creata una copia di sicurezza locale.',
            )}
          />
          <div className="data-actions">
            <div>
              <h3>{tr('Esplora con dati dimostrativi')}</h3>
              <p>
                {tr(
                  'Progetti, attività e finanze di esempio per scoprire Punto.',
                )}
              </p>
            </div>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmation('demo')}
            >
              <Play size={15} />
              {tr('Carica demo')}
            </button>
          </div>
          <div className="data-actions">
            <div>
              <h3>{tr('Riparti da uno spazio vuoto')}</h3>
              <p>
                {tr(
                  'Conserva le categorie iniziali e aggiungi i tuoi dati reali.',
                )}
              </p>
            </div>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmation('clear')}
            >
              <Trash2 size={15} />
              {tr('Svuota i dati')}
            </button>
          </div>
        </section>
        {error && (
          <div className="notice error-notice" role="alert">
            <AlertCircle size={19} />
            <div>
              <strong>{tr('Operazione non completata')}</strong>
              <p>{messageText(error)}</p>
            </div>
            <button className="text-button" onClick={() => setError('')}>
              {tr('Chiudi')}
            </button>
          </div>
        )}
      </div>
      {setup && (
        <GitHubSetup
          initial={vault?.config}
          onClose={() => setSetup(false)}
          onConnected={async (v, t) => {
            await putValue('vault', v);
            setVault(v);
            setToken(t);
            setSetup(false);
            setError('');
            autoStarted.current = '';
          }}
        />
      )}
      {conflict && (
        <Dialog
          title={tr('Scegli le versioni da conservare')}
          onClose={() => {
            setConflict(null);
            setError(
              msg(
                'Sincronizzazione annullata: nessuna versione è stata sovrascritta.',
              ),
            );
          }}
          wide
        >
          <p className="muted">
            {tr(
              'Questi elementi sono stati modificati su entrambi i dispositivi. Le modifiche agli altri elementi vengono unite automaticamente.',
            )}
          </p>
          <div className="conflicts">
            {conflict.plan.conflicts.map((c) => (
              <section className="conflict" key={c.id}>
                <h3>
                  {(c.local && 'name' in c.local ? c.local.name : '') ||
                    (c.remote && 'name' in c.remote ? c.remote.name : '') ||
                    c.id}
                </h3>
                <div>
                  {(['local', 'remote'] as const).map((side) => (
                    <label
                      className={choices[c.id] === side ? 'selected' : ''}
                      key={side}
                    >
                      <span>
                        <input
                          type="radio"
                          name={c.id}
                          value={side}
                          checked={choices[c.id] === side}
                          onChange={() =>
                            setChoices({ ...choices, [c.id]: side })
                          }
                        />
                        {side === 'local'
                          ? tr('Su questo dispositivo')
                          : tr('Su GitHub')}
                        {c[side]?.deletedAt && tr(' · Eliminato')}
                      </span>
                      <pre>
                        {c[side]
                          ? JSON.stringify(c[side], null, 2)
                          : tr('Elemento assente')}
                      </pre>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {messageText(error)}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConflict(null)}
            >
              {tr('Annulla')}
            </button>
            <button
              className="button primary"
              disabled={
                busy ||
                Object.keys(choices).length !== conflict.plan.conflicts.length
              }
              onClick={resolveConflicts}
            >
              {busy ? tr('Salvataggio…') : tr('Conferma le versioni scelte')}
            </button>
          </div>
        </Dialog>
      )}
      {restore && (
        <Dialog
          title={tr('Anteprima del ripristino')}
          onClose={() => setRestore(null)}
        >
          <p className="muted">
            {tr('File:')} {restore.name}
          </p>
          <div className="restore-summary">
            {(
              [
                'account',
                'project',
                'task',
                'transaction',
                'forecast',
                'scenario',
              ] as const
            ).map((kind, i) => (
              <div key={kind}>
                <strong>{numberLabel(list(restore.data, kind).length)}</strong>
                <span>
                  {
                    [
                      tr('Conti'),
                      tr('Progetti'),
                      tr('Attività'),
                      tr('Movimenti'),
                      tr('Previsioni'),
                      tr('Scenari'),
                    ][i]
                  }
                </span>
              </div>
            ))}
          </div>
          <div className="notice amber">
            {tr(
              'Questo file sostituirà i dati attuali. Prima verrà conservata una copia di sicurezza locale. Il collegamento GitHub rimane sul dispositivo.',
            )}
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {messageText(error)}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setRestore(null)}
              disabled={busy}
            >
              {tr('Annulla')}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => replaceData(restore.data)}
            >
              {busy ? tr('Ripristino…') : tr('Crea backup e ripristina')}
            </button>
          </div>
        </Dialog>
      )}
      {confirmation && (
        <Dialog
          title={
            confirmation === 'demo'
              ? tr('Esplora Punto con la demo')
              : tr('Riparti da uno spazio vuoto')
          }
          onClose={() => setConfirmation(null)}
        >
          <p>
            {tr(
              'Questa operazione sostituisce tutti i dati attivi sul dispositivo. Prima creerò una copia di sicurezza, recuperabile da questa pagina.',
            )}
          </p>
          <p className="form-hint">
            {tr(
              'Le modifiche raggiungono GitHub solo quando scegli «Salva su GitHub».',
            )}
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {messageText(error)}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setConfirmation(null)}
              disabled={busy}
            >
              {tr('Annulla')}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                replaceData(
                  confirmation === 'demo' ? demoData() : createInitialData(),
                )
              }
            >
              {busy
                ? tr('Salvataggio…')
                : confirmation === 'demo'
                  ? tr('Crea backup e carica demo')
                  : tr('Crea backup e svuota')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function ChevronIcon() {
  return <span className="chip-chevron">↗</span>;
}
function GitHubSetup({
  initial,
  onClose,
  onConnected,
}: {
  initial?: RepoConfig;
  onClose: () => void;
  onConnected: (v: Vault, t: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Message>('');
  return (
    <Dialog
      title={tr('Collega la tua repository privata')}
      onClose={onClose}
      wide
    >
      <div className="setup-guide">
        <div>
          <span>1</span>
          <p>
            <strong>{tr('Crea la repository dei dati')}</strong>
            <br />
            {tr('Su GitHub scegli')} <b>Private</b>
            {tr(', un nome come')} <code>punto-dati</code>{' '}
            {tr(
              'e inizializzala con un README. Usa una repository separata da quella del codice.',
            )}{' '}
            <a href="https://github.com/new" target="_blank" rel="noreferrer">
              {tr('Apri GitHub')} <ExternalLink size={12} />
            </a>
          </p>
        </div>
        <div>
          <span>2</span>
          <p>
            <strong>{tr('Crea un token limitato alla repository')}</strong>
            <br />
            {tr('Scegli')} <b>Fine-grained token → Only select repositories</b>
            {tr(', seleziona la repository dei dati e abilita')}{' '}
            <b>Contents: Read and write</b>
            {tr('. Imposta una scadenza.')}{' '}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
            >
              {tr('Crea token')} <ExternalLink size={12} />
            </a>
          </p>
        </div>
        <div>
          <span>3</span>
          <p>
            <strong>
              {tr('Proteggi il collegamento su questo dispositivo')}
            </strong>
            <br />
            {tr(
              'Incolla il token qui e scegli una password locale di almeno 10 caratteri. La password non viene salvata. Non inserire credenziali in chat.',
            )}
          </p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const f = new FormData(e.currentTarget);
          const token = String(f.get('token')).trim();
          try {
            const config = await verifyRepo(
              {
                owner: String(f.get('owner')).trim(),
                repo: String(f.get('repo')).trim(),
                branch: String(f.get('branch')).trim(),
                path: String(f.get('path')).trim(),
              },
              token,
            );
            const vault = await encryptToken(
              token,
              String(f.get('password')),
              config,
            );
            await onConnected(vault, token);
          } catch (err) {
            setError(toMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field label={tr('Proprietario GitHub')}>
            <input
              name="owner"
              required
              autoComplete="off"
              defaultValue={initial?.owner ?? ''}
              placeholder={tr('il-tuo-username')}
              autoFocus
            />
          </Field>
          <Field label={tr('Nome repository privata')}>
            <input
              name="repo"
              required
              defaultValue={initial?.repo ?? 'punto-dati'}
            />
          </Field>
          <Field
            label={tr('Branch')}
            hint={tr('Vuoto: usa il branch predefinito della repository.')}
          >
            <input
              name="branch"
              defaultValue={initial?.branch ?? ''}
              placeholder="main"
            />
          </Field>
          <Field label={tr('Percorso del file JSON')}>
            <input
              name="path"
              required
              defaultValue={initial?.path ?? 'dashboard.json'}
            />
          </Field>
          <Field label={tr('Token GitHub')} full>
            <input
              type="password"
              name="token"
              required
              autoComplete="off"
              placeholder="github_pat_…"
            />
          </Field>
          <Field label={tr('Password locale (almeno 10 caratteri)')} full>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
          </Field>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            <AlertCircle size={17} />
            {messageText(error)}
          </p>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            {tr('Annulla')}
          </button>
          <button className="button primary" disabled={busy}>
            <ShieldCheck size={17} />
            {busy ? tr('Verifica e cifratura…') : tr('Verifica e collega')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
