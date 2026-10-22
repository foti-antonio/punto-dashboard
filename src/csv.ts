import {
  parseMoney,
  validDate,
  newId,
  stamp,
  list,
  today,
  type Data,
  type Transaction,
  type Scope,
} from './domain';
export function parseCSV(input: string, delimiter = ';'): string[][] {
  const rows: string[][] = [],
    row: string[] = [];
  let cell = '',
    quoted = false,
    closed = false;
  const text = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted) {
        quoted = false;
        closed = true;
      } else if (cell === '' && !closed) quoted = true;
      else
        throw new Error(`Virgolette non valide alla riga ${rows.length + 1}.`);
    } else if (
      !quoted &&
      (char === delimiter || char === '\r' || char === '\n')
    ) {
      row.push(cell);
      cell = '';
      closed = false;
      if (char !== delimiter) {
        if (row.some((c) => c.trim())) rows.push([...row]);
        row.length = 0;
        if (char === '\r' && text[i + 1] === '\n') i++;
      }
    } else {
      if (closed && !/\s/.test(char))
        throw new Error('Carattere inatteso dopo le virgolette.');
      if (!closed) cell += char;
    }
  }
  if (quoted) throw new Error('Virgolette non chiuse nel CSV.');
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  if (!rows.length || rows.length > 10001)
    throw new Error('Il CSV è vuoto o supera 10.000 righe.');
  return rows;
}
export interface CSVMapping {
  date: number;
  name: number;
  amount: number;
  format: 'dmy' | 'ymd';
  decimal: ',' | '.';
  accountId: string;
  categoryId: string;
  scope: Scope;
  direction: 'signed' | 'income' | 'expense';
}
export interface CSVRow {
  line: number;
  transaction?: Transaction;
  error?: string;
  duplicate: boolean;
}
export function csvDate(input: string, format: CSVMapping['format']) {
  let result = input.trim();
  if (format === 'dmy') {
    const parts = result.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if (!parts) throw new Error('Data attesa: giorno/mese/anno.');
    result = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  if (!validDate(result)) throw new Error('Data non valida.');
  return result;
}
export function previewCSV(
  rows: string[][],
  mapping: CSVMapping,
  data: Data,
): CSVRow[] {
  const signatures = new Set(list(data, 'transaction').map(signature));
  return rows.slice(1).map((cells, index) => {
    try {
      const date = csvDate(cells[mapping.date] ?? '', mapping.format);
      if (date > today())
        throw new Error(
          'Data futura: usa le previsioni per i movimenti attesi.',
        );
      const signed = parseMoney(cells[mapping.amount] ?? '', mapping.decimal);
      const name = (cells[mapping.name] ?? '').trim();
      if (!name) throw new Error('Descrizione mancante.');
      if (!signed) throw new Error('Importo nullo.');
      const account = data.entities[mapping.accountId];
      if (account?.type !== 'account' || account.deletedAt)
        throw new Error('Scegli un conto.');
      if (date < account.openingDate)
        throw new Error('Data precedente al saldo iniziale del conto.');
      const transaction: Transaction = {
        id: newId(),
        type: 'transaction',
        updatedAt: stamp(),
        name,
        date,
        direction:
          mapping.direction === 'signed'
            ? signed < 0
              ? 'expense'
              : 'income'
            : mapping.direction,
        amountCents: Math.abs(signed),
        accountId: mapping.accountId,
        toAccountId: '',
        categoryId: mapping.categoryId,
        scope: account.scope,
        projectId: '',
        forecastKey: '',
        notes: '',
      };
      const sig = signature(transaction),
        duplicate = signatures.has(sig);
      signatures.add(sig);
      return { line: index + 2, transaction, duplicate };
    } catch (e) {
      return { line: index + 2, error: (e as Error).message, duplicate: false };
    }
  });
}
export function signature(t: Transaction) {
  return JSON.stringify([
    t.date,
    t.amountCents,
    t.direction,
    t.accountId,
    t.name.trim().toLocaleLowerCase('it'),
  ]);
}
