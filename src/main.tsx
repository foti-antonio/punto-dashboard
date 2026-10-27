import {
  msg,
  LocalizedError,
  toMessage,
  messageText,
  type Message,
  tr,
  useLanguage,
  initializeLanguage,
} from './i18n';
import React, { useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadState, mutateData, subscribe, type StoredState } from './storage';
import { type Data, type Entity, stamp } from './domain';
import { Context } from './context';
import { initializeTheme } from './theme';
import './styles.css';
initializeTheme();
initializeLanguage();
function Root() {
  useLanguage();
  const [state, setState] = useState<StoredState>();
  const [error, setError] = useState<Message>('');
  const [message, setMessage] = useState<Message>('');
  useEffect(() => {
    let active = true;
    const reload = () =>
      loadState()
        .then((s) => {
          if (active) setState(s);
        })
        .catch((e) => {
          if (active) setError(toMessage(e));
        });
    reload();
    const off = subscribe(reload);
    return () => {
      active = false;
      off();
    };
  }, []);
  useEffect(() => {
    if (message) {
      const id = setTimeout(() => setMessage(''), 6500);
      return () => clearTimeout(id);
    }
  }, [message]);
  const update = async (
    fn: (data: Data) => Data,
    options?: { backup?: boolean },
  ) => {
    const saved = await mutateData(fn, undefined, options);
    setState(saved);
  };
  if (error)
    return (
      <main className="fatal">
        <h1>{tr('Il tuo archivio non è disponibile')}</h1>
        <p>{messageText(error)}</p>
        <button onClick={() => location.reload()}>{tr('Riprova')}</button>
      </main>
    );
  if (!state)
    return (
      <main className="loading">
        <span className="brand-mark">
          p<span>•</span>
        </span>
        <p>{tr('Apro il tuo spazio…')}</p>
      </main>
    );
  return (
    <Context.Provider
      value={{
        ...state,
        update,
        save: async (entity) =>
          update((d) => {
            if (
              d.entities[entity.id] &&
              (d.entities[entity.id].updatedAt !== entity.updatedAt ||
                d.entities[entity.id].deletedAt)
            )
              throw new LocalizedError(
                msg(
                  'Questo elemento è cambiato in un’altra scheda o durante il confronto GitHub. Chiudi e riapri il modulo per usare la versione aggiornata.',
                ),
              );
            d.entities[entity.id] = { ...entity, updatedAt: stamp() };
            return d;
          }),
        remove: async (id, expectedUpdatedAt) =>
          update((d) => {
            const entity = d.entities[id];
            if (!entity || entity.type === 'settings')
              throw new LocalizedError(msg('Elemento non eliminabile.'));
            if (expectedUpdatedAt && entity.updatedAt !== expectedUpdatedAt)
              throw new LocalizedError(
                msg(
                  'Questo elemento è stato modificato. Chiudi e riapri il modulo prima di eliminarlo.',
                ),
              );
            if (
              entity.type === 'account' &&
              Object.values(d.entities).some(
                (e) =>
                  !e.deletedAt &&
                  ((e.type === 'transaction' &&
                    (e.accountId === id || e.toAccountId === id)) ||
                    (e.type === 'forecast' && e.accountId === id)),
              )
            )
              throw new LocalizedError(
                msg(
                  'Il conto ha movimenti collegati: conserva il conto per mantenere i saldi.',
                ),
              );
            d.entities[id] = {
              ...entity,
              deletedAt: stamp(),
              updatedAt: stamp(),
            };
            return d;
          }),
        toast: setMessage,
      }}
    >
      <App />
      {message && (
        <div className="toast" role="status">
          <span>{messageText(message)}</span>
          <button
            className="icon-button"
            aria-label={tr('Chiudi notifica')}
            onClick={() => setMessage('')}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
function FatalError() {
  useLanguage();
  return (
    <main className="fatal">
      <h1>{tr('Qualcosa non ha funzionato')}</h1>
      <p>
        {tr(
          'I dati già salvati sono nel browser. Ricarica la pagina per riprovare.',
        )}
      </p>
      <button onClick={() => location.reload()}>{tr('Ricarica')}</button>
    </main>
  );
}
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <FatalError /> : this.props.children;
  }
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
);
