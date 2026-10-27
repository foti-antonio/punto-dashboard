import { messageText } from '../src/i18n';
import { describe, it, expect } from 'vitest';
import { parseCSV, previewCSV, csvDate, type CSVMapping } from '../src/csv';
import { fixture, transaction } from './fixtures';
import { today, shiftDate } from '../src/domain';
const date = today().split('-').reverse().join('/');
const mapping: CSVMapping = {
  date: 0,
  name: 1,
  amount: 2,
  format: 'dmy',
  decimal: ',',
  accountId: 'a',
  categoryId: '',
  scope: 'lavoro',
  direction: 'signed',
};
describe('importazione CSV', () => {
  it('gestisce BOM, CRLF, virgolette, separatori e righe multiple', () => {
    expect(
      parseCSV(
        '\uFEFFdata;descrizione;importo\r\n01/01/2026;"Una; descrizione ""citata""\ncontinua";10,00\r\n',
      ),
    ).toEqual([
      ['data', 'descrizione', 'importo'],
      ['01/01/2026', 'Una; descrizione "citata"\ncontinua', '10,00'],
    ]);
  });
  it('segnala virgolette non chiuse', () =>
    expect(() => parseCSV('a;b\n"non chiuso;1')).toThrow());
  it('rifiuta date inesistenti e supporta ISO', () => {
    expect(() => csvDate('31/02/2026', 'dmy')).toThrow();
    expect(csvDate('9/2/2028', 'dmy')).toBe('2028-02-09');
    expect(csvDate('2028-02-29', 'ymd')).toBe('2028-02-29');
  });
  it('mostra errori e duplicati senza modificare l’archivio', () => {
    const data = fixture();
    data.entities.t = transaction({ name: 'Compenso', amountCents: 10000 });
    const before = JSON.stringify(data);
    const rows = parseCSV(
      `Data;Descrizione;Importo\n${date};Compenso;100,00\n${date};Spesa;-1.234,56\n31/02/2026;Errore;10,00\n${date};Spesa;-1.234,56`,
    );
    const result = previewCSV(rows, mapping, data);
    expect(result[0].duplicate).toBe(true);
    expect(result[1].transaction?.amountCents).toBe(123456);
    expect(result[1].transaction?.direction).toBe('expense');
    expect(messageText(result[2].error!)).toContain('date');
    expect(result[3].duplicate).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });
  it('rifiuta date future e precedenti al saldo iniziale', () => {
    const d = fixture();
    const rows = [
      ['Data', 'Descrizione', 'Importo'],
      [shiftDate(today(), 1), 'Futuro', '100,00'],
      ['2000-01-01', 'Passato', '100,00'],
    ];
    const result = previewCSV(rows, { ...mapping, format: 'ymd' }, d);
    expect(result.every((r) => r.error)).toBe(true);
  });
});
