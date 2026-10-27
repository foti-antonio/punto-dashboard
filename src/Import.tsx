import {
  msg,
  LocalizedError,
  toMessage,
  messageText,
  type Message,
  tr,
  useLanguage,
} from './i18n';
import { useMemo, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from './context';
import { Dialog, Field, CategoryOptions } from './components';
import { parseCSV, previewCSV, signature, type CSVMapping } from './csv';
import { euro, list, validateData } from './domain';
export function ImportDialog({ onClose }: { onClose: () => void }) {
  useLanguage();
  const { data, update, toast } = useApp();
  const [text, setText] = useState(''),
    [delimiter, setDelimiter] = useState(';'),
    [filename, setFilename] = useState(''),
    [error, setError] = useState<Message>(''),
    [stage, setStage] = useState(1),
    [includeDuplicates, setIncludeDuplicates] = useState(false),
    [busy, setBusy] = useState(false);
  const [mapping, setMapping] = useState<CSVMapping>({
    date: 0,
    name: 1,
    amount: 2,
    format: 'dmy',
    decimal: ',',
    accountId: list(data, 'account')[0]?.id ?? '',
    categoryId: '',
    scope: 'lavoro',
    direction: 'signed',
  });
  const parsed = useMemo(() => {
    try {
      return { rows: text ? parseCSV(text, delimiter) : [], error: '' };
    } catch (e) {
      return { rows: [], error: toMessage(e) };
    }
  }, [text, delimiter]);
  const preview = useMemo(
    () => (stage === 2 ? previewCSV(parsed.rows, mapping, data) : []),
    [stage, parsed.rows, mapping, data],
  );
  const errors = preview.filter((r) => r.error),
    duplicates = preview.filter((r) => r.duplicate),
    accepted = preview.filter(
      (r) => r.transaction && (!r.duplicate || includeDuplicates),
    );
  const map = (patch: Partial<CSVMapping>) => {
    setMapping({ ...mapping, ...patch });
    setStage(1);
  };
  async function importRows() {
    setBusy(true);
    setError('');
    try {
      if (!accepted.length)
        throw new LocalizedError(msg('Nessuna riga valida da importare.'));
      await update((d) => {
        const existing = new Set(list(d, 'transaction').map(signature));
        for (const r of accepted) {
          const t = r.transaction!;
          if (!includeDuplicates && existing.has(signature(t))) continue;
          d.entities[t.id] = t;
          existing.add(signature(t));
        }
        return validateData(d);
      });
      toast(
        msg('Importazione completata. Le righe non valide sono state escluse.'),
      );
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={tr('Importa movimenti da CSV')} onClose={onClose} wide>
      <div className="import-steps">
        <span className={stage === 1 ? 'selected' : ''}>
          {tr('1. Scegli e configura')}
        </span>
        <ArrowRight size={15} />
        <span className={stage === 2 ? 'selected' : ''}>
          {tr('2. Controlla e conferma')}
        </span>
      </div>
      <p className="muted">
        {tr(
          'Il file deve contenere una riga di intestazioni. L’anteprima non modifica i tuoi dati.',
        )}
      </p>
      <label className="upload-zone">
        <Upload size={25} />
        <strong>{filename || tr('Scegli un file CSV')}</strong>
        <span>{tr('Massimo 5 MB · fino a 10.000 movimenti')}</span>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError('');
            if (file.size > 5000000) {
              setError(msg('Il file supera 5 MB.'));
              return;
            }
            try {
              const content = await file.text();
              setText(content);
              setFilename(file.name);
              setStage(1);
            } catch {
              setError(msg('Impossibile leggere il file.'));
            }
          }}
        />
      </label>
      <div className="form-grid csv-config">
        <Field label={tr('Separatore delle colonne')}>
          <select
            value={delimiter}
            onChange={(e) => {
              setDelimiter(e.target.value);
              setStage(1);
            }}
          >
            <option value=";">{tr('Punto e virgola (;)')}</option>
            <option value=",">{tr('Virgola (,)')}</option>
            <option value="\t">{tr('Tabulazione')}</option>
          </select>
        </Field>
        <Field label={tr('Conto di destinazione')}>
          <select
            value={mapping.accountId}
            onChange={(e) => map({ accountId: e.target.value })}
          >
            <option value="">{tr('Scegli un conto')}</option>
            {list(data, 'account').map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        {parsed.rows.length > 0 && (
          <>
            {(['date', 'name', 'amount'] as const).map((key, i) => (
              <Field
                key={key}
                label={
                  [
                    tr('Colonna della data'),
                    tr('Colonna della descrizione'),
                    tr('Colonna dell’importo'),
                  ][i]
                }
              >
                <select
                  value={mapping[key]}
                  onChange={(e) => map({ [key]: Number(e.target.value) })}
                >
                  {parsed.rows[0].map((header, j) => (
                    <option key={j} value={j}>
                      {header || tr('Colonna {number}', { number: j + 1 })}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <Field label={tr('Formato della data')}>
              <select
                value={mapping.format}
                onChange={(e) =>
                  map({ format: e.target.value as CSVMapping['format'] })
                }
              >
                <option value="dmy">
                  {tr('Giorno/mese/anno · 31/12/2026')}
                </option>
                <option value="ymd">
                  {tr('Anno-mese-giorno · 2026-12-31')}
                </option>
              </select>
            </Field>
            <Field label={tr('Separatore decimale')}>
              <select
                value={mapping.decimal}
                onChange={(e) => map({ decimal: e.target.value as ',' | '.' })}
              >
                <option value=",">{tr('Virgola · 1.234,56')}</option>
                <option value=".">{tr('Punto · 1,234.56')}</option>
              </select>
            </Field>
            <Field label={tr('Interpretazione degli importi')}>
              <select
                value={mapping.direction}
                onChange={(e) =>
                  map({ direction: e.target.value as CSVMapping['direction'] })
                }
              >
                <option value="signed">
                  {tr('Positivo = entrata, negativo = uscita')}
                </option>
                <option value="expense">{tr('Tutti come uscite')}</option>
                <option value="income">{tr('Tutti come entrate')}</option>
              </select>
            </Field>
            <Field label={tr('Categoria')}>
              <select
                value={mapping.categoryId}
                onChange={(e) => map({ categoryId: e.target.value })}
              >
                <CategoryOptions data={data} />
              </select>
            </Field>
          </>
        )}
      </div>
      {(error || parsed.error) && (
        <p className="inline-error" role="alert">
          <AlertCircle size={17} />
          {messageText(error || parsed.error)}
        </p>
      )}
      {stage === 1 && parsed.rows.length > 0 && (
        <div className="table-scroll raw-preview">
          <h3>{tr('Prime righe del file')}</h3>
          <table>
            <thead>
              <tr>
                {parsed.rows[0].map((cell, i) => (
                  <th key={i}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(1, 4).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {stage === 2 && (
        <>
          <div className="import-summary">
            <span>
              <CheckCircle2 size={17} />
              {tr('{count} da importare', { count: accepted.length })}
            </span>
            <span>{tr('{count} non valide', { count: errors.length })}</span>
            <span>
              {tr('{count} possibili duplicati', { count: duplicates.length })}
            </span>
          </div>
          {errors.length > 0 && (
            <p className="notice amber">
              {tr(
                'Le righe non valide saranno escluse. Correggi il file per importarle in seguito.',
              )}
            </p>
          )}
          {duplicates.length > 0 && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeDuplicates}
                onChange={(e) => setIncludeDuplicates(e.target.checked)}
              />
              {tr(
                'Includi anche i possibili duplicati (esclusi per impostazione iniziale)',
              )}
            </label>
          )}
          <div className="table-scroll import-preview">
            <table>
              <thead>
                <tr>
                  <th>{tr('Riga')}</th>
                  <th>{tr('Descrizione')}</th>
                  <th>{tr('Data')}</th>
                  <th className="number">{tr('Importo')}</th>
                  <th>{tr('Esito')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 200).map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.transaction?.name || '—'}</td>
                    <td>{r.transaction?.date || '—'}</td>
                    <td className="number">
                      {r.transaction ? euro(r.transaction.amountCents) : '—'}
                    </td>
                    <td
                      className={
                        r.error
                          ? 'negative'
                          : r.duplicate
                            ? 'warning-text'
                            : 'positive'
                      }
                    >
                      {(r.error && messageText(r.error)) ||
                        (r.duplicate
                          ? tr('Possibile duplicato')
                          : tr('Valida'))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 200 && (
            <p className="form-hint">
              {tr(
                'Mostrate 200 righe; il controllo include tutte le {count} righe.',
                { count: preview.length },
              )}
            </p>
          )}
        </>
      )}
      <div className="dialog-actions">
        <button className="button secondary" onClick={onClose}>
          {tr('Annulla')}
        </button>
        {stage === 1 ? (
          <button
            className="button primary"
            disabled={
              parsed.rows.length < 2 || !!parsed.error || !mapping.accountId
            }
            onClick={() => {
              if (
                new Set([mapping.date, mapping.name, mapping.amount]).size !== 3
              ) {
                setError(msg('Scegli tre colonne diverse.'));
                return;
              }
              setError('');
              setStage(2);
            }}
          >
            {tr('Mostra anteprima')}
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="button primary"
            disabled={busy || !accepted.length}
            onClick={importRows}
          >
            {busy
              ? tr('Importazione…')
              : tr('Conferma {count} movimenti', { count: accepted.length })}
          </button>
        )}
      </div>
    </Dialog>
  );
}
