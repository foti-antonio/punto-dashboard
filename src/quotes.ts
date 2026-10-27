import { getLanguage, type Language } from './i18n';
import { today } from './domain';

export interface StoicQuote {
  readonly id: string;
  readonly text: string;
  readonly author:
    'Marco Aurelio' | 'Seneca' | 'Epitteto' | 'Marcus Aurelius' | 'Epictetus';
  readonly reference: string;
  readonly source: string;
}

const meditations =
  'https://github.com/PerseusDL/canonical-greekLit/blob/master/data/tlg0562/tlg001/tlg0562.tlg001.perseus-grc2.xml';
const letters = 'https://www.thelatinlibrary.com/sen/seneca.ep';
const handbook = 'https://el.wikisource.org/wiki/Εγχειρίδιον';

// Traduzioni proprie di brevi passi originali, non aforismi di attribuzione incerta.
// Riferimenti e criteri editoriali: docs/stoic-quotes.md.
export const STOIC_QUOTES = [
  {
    id: 'ma-4-3',
    text: 'In nessun luogo trovi un rifugio più quieto che nella tua anima.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, IV, 3',
    source: meditations,
  },
  {
    id: 'ma-4-17',
    text: 'Finché vivi, finché puoi, diventa buono.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, IV, 17',
    source: meditations,
  },
  {
    id: 'ma-4-23',
    text: 'È in armonia con me tutto ciò che è in armonia con te, o cosmo.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, IV, 23',
    source: meditations,
  },
  {
    id: 'ma-5-16',
    text: 'L’anima si colora dei pensieri che coltivi.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, V, 16',
    source: meditations,
  },
  {
    id: 'ma-6-6',
    text: 'Il modo migliore di difenderti è non diventare simile a chi ti offende.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, VI, 6',
    source: meditations,
  },
  {
    id: 'ma-6-54',
    text: 'Ciò che non giova allo sciame non giova neppure all’ape.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, VI, 54',
    source: meditations,
  },
  {
    id: 'ma-7-59',
    text: 'Scava dentro di te: dentro è la fonte del bene.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, VII, 59',
    source: meditations,
  },
  {
    id: 'ma-8-36',
    text: 'Non ti pesa il futuro né il passato, ma sempre il presente.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, VIII, 36',
    source: meditations,
  },
  {
    id: 'ma-9-5',
    text: 'Spesso commette ingiustizia anche chi non agisce, non solo chi agisce.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, IX, 5',
    source: meditations,
  },
  {
    id: 'ma-12-17',
    text: 'Se non è giusto, non farlo; se non è vero, non dirlo.',
    author: 'Marco Aurelio',
    reference: 'Pensieri, XII, 17',
    source: meditations,
  },
  {
    id: 'se-1-1',
    text: 'Riprendi possesso di te: raccogli e custodisci il tuo tempo.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 1, 1',
    source: letters + '1.shtml',
  },
  {
    id: 'se-1-3',
    text: 'Mentre rimandiamo, la vita corre via.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 1, 3',
    source: letters + '1.shtml',
  },
  {
    id: 'se-2-6',
    text: 'Non è povero chi ha poco, ma chi desidera di più.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 2, 6',
    source: letters + '1.shtml',
  },
  {
    id: 'se-3-2',
    text: 'Rifletti su tutto con un amico, ma prima rifletti su di lui.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 3, 2',
    source: letters + '1.shtml',
  },
  {
    id: 'se-6-5',
    text: 'Lunga è la via dei precetti, breve ed efficace quella degli esempi.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 6, 5',
    source: letters + '1.shtml',
  },
  {
    id: 'se-7-8',
    text: 'Frequenta chi ti renderà migliore.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 7, 8',
    source: letters + '1.shtml',
  },
  {
    id: 'se-13-4',
    text: 'Soffriamo più spesso per ciò che immaginiamo che per la realtà.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 13, 4',
    source: letters + '2.shtml',
  },
  {
    id: 'se-16-3',
    text: 'La filosofia forma e modella l’animo.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 16, 3',
    source: letters + '2.shtml',
  },
  {
    id: 'se-20-2',
    text: 'La filosofia insegna ad agire, non a parlare.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 20, 2',
    source: letters + '2.shtml',
  },
  {
    id: 'se-23-8',
    text: 'Occorre decidere che cosa vogliamo e perseverare.',
    author: 'Seneca',
    reference: 'Lettere a Lucilio, 23, 8',
    source: letters + '3.shtml',
  },
  {
    id: 'ep-1-1',
    text: 'Alcune cose dipendono da noi, altre non dipendono da noi.',
    author: 'Epitteto',
    reference: 'Manuale, 1, 1',
    source: handbook + '#αʹ',
  },
  {
    id: 'ep-4',
    text: 'Prima di intraprendere un’azione, ricorda a te stesso di che azione si tratta.',
    author: 'Epitteto',
    reference: 'Manuale, 4',
    source: handbook + '#δʹ',
  },
  {
    id: 'ep-5',
    text: 'A turbare gli uomini non sono le cose, ma i giudizi sulle cose.',
    author: 'Epitteto',
    reference: 'Manuale, 5',
    source: handbook + '#εʹ',
  },
  {
    id: 'ep-6',
    text: 'Non vantarti di un pregio che appartiene a un altro.',
    author: 'Epitteto',
    reference: 'Manuale, 6',
    source: handbook + '#στʹ',
  },
  {
    id: 'ep-8',
    text: 'Non chiedere che le cose accadano come vuoi; desiderale come accadono.',
    author: 'Epitteto',
    reference: 'Manuale, 8',
    source: handbook + '#ηʹ',
  },
  {
    id: 'ep-10',
    text: 'A ogni evento, cerca in te la capacità di affrontarlo.',
    author: 'Epitteto',
    reference: 'Manuale, 10',
    source: handbook + '#ιʹ',
  },
  {
    id: 'ep-12-2',
    text: 'Comincia dunque dalle piccole cose.',
    author: 'Epitteto',
    reference: 'Manuale, 12, 2',
    source: handbook + '#ιβʹ',
  },
  {
    id: 'ep-20',
    text: 'Se ti concedi tempo e una pausa, ti sarà più facile dominare te stesso.',
    author: 'Epitteto',
    reference: 'Manuale, 20',
    source: handbook + '#κʹ',
  },
  {
    id: 'ep-33-2',
    text: 'Taci per lo più, oppure di’ ciò che è necessario, in poche parole.',
    author: 'Epitteto',
    reference: 'Manuale, 33, 2',
    source: handbook + '#λγʹ',
  },
  {
    id: 'ep-46-1',
    text: 'Non parlare molto dei principi: mettili in pratica.',
    author: 'Epitteto',
    reference: 'Manuale, 46, 1',
    source: handbook + '#μστʹ',
  },
] as const satisfies readonly StoicQuote[];

type QuoteId = (typeof STOIC_QUOTES)[number]['id'];
const englishTexts = {
  'ma-4-3': 'Nowhere can you find a quieter refuge than in your own soul.',
  'ma-4-17': 'While you live, while you can, become good.',
  'ma-4-23':
    'Whatever is in harmony with you, O universe, is in harmony with me.',
  'ma-5-16': 'The soul takes on the colour of the thoughts you cultivate.',
  'ma-6-6': 'The best defence is not to become like the person who wrongs you.',
  'ma-6-54': 'What does not benefit the swarm does not benefit the bee.',
  'ma-7-59': 'Dig within yourself: within is the source of goodness.',
  'ma-8-36':
    'It is neither the future nor the past that weighs on you, but always the present.',
  'ma-9-5':
    'Often, the person who does nothing also acts unjustly, not only the one who acts.',
  'ma-12-17':
    'If it is not right, do not do it; if it is not true, do not say it.',
  'se-1-1': 'Take possession of yourself again: gather and guard your time.',
  'se-1-3': 'While we put things off, life slips away.',
  'se-2-6':
    'The poor person is not the one who has little, but the one who wants more.',
  'se-3-2': 'Consider everything with a friend, but first consider the friend.',
  'se-6-5':
    'The road through rules is long; the road through examples is short and effective.',
  'se-7-8': 'Spend time with those who will make you better.',
  'se-13-4': 'We suffer more often from what we imagine than from reality.',
  'se-16-3': 'Philosophy forms and shapes the soul.',
  'se-20-2': 'Philosophy teaches us to act, not to talk.',
  'se-23-8': 'We must decide what we want and persevere.',
  'ep-1-1': 'Some things depend on us; others do not.',
  'ep-4':
    'Before you undertake an action, remind yourself what kind of action it is.',
  'ep-5':
    'People are disturbed not by things, but by their judgements about things.',
  'ep-6': 'Do not boast of a virtue that belongs to someone else.',
  'ep-8':
    'Do not ask for events to happen as you wish; wish for them as they happen.',
  'ep-10': 'With every event, look within yourself for the ability to face it.',
  'ep-12-2': 'Begin, then, with small things.',
  'ep-20':
    'If you allow yourself time and a pause, you will find it easier to master yourself.',
  'ep-33-2':
    'Be silent for the most part, or say what is necessary in few words.',
  'ep-46-1': 'Do not talk much about principles: put them into practice.',
} satisfies Record<QuoteId, string>;
const englishAuthors = {
  'Marco Aurelio': 'Marcus Aurelius',
  Seneca: 'Seneca',
  Epitteto: 'Epictetus',
} as const;
export const QUOTES_BY_LANGUAGE: Record<Language, readonly StoicQuote[]> = {
  it: STOIC_QUOTES,
  en: STOIC_QUOTES.map((quote) => ({
    ...quote,
    text: englishTexts[quote.id],
    author: englishAuthors[quote.author],
    reference: quote.reference
      .replace('Pensieri', 'Meditations')
      .replace('Lettere a Lucilio', 'Letters to Lucilius')
      .replace('Manuale', 'Handbook'),
  })),
};

function shuffledQuotes(cycle: number) {
  const quotes = [...STOIC_QUOTES];
  let seed = cycle ^ 0x73746f61;
  // Mulberry32: stessa sequenza su ogni dispositivo, senza stato persistente.
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = quotes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [quotes[i], quotes[j]] = [quotes[j], quotes[i]];
  }
  return quotes;
}

/** La data è un giorno di calendario ISO, nel fuso Europe/Rome per default. */
export function getDailyQuote(
  date = today(),
  language: Language = getLanguage(),
): StoicQuote {
  // UTC serve solo a numerare i giorni civili: nessun intervallo locale di 24 ore,
  // che salterebbe o ripeterebbe giorni durante il cambio dell’ora.
  const day = Math.floor(Date.parse(date + 'T00:00:00Z') / 86_400_000);
  const count = STOIC_QUOTES.length;
  const cycle = Math.floor(day / count);
  const quotes = shuffledQuotes(cycle);
  // Lo scambio coinvolge solo i primi due elementi (raccolta >= 3): l’ultimo
  // del ciclo precedente resta invariato, quindi non occorre ricorsione.
  if (quotes[0].id === shuffledQuotes(cycle - 1)[count - 1].id) {
    [quotes[0], quotes[1]] = [quotes[1], quotes[0]];
  }
  const selected = quotes[day - cycle * count];
  return QUOTES_BY_LANGUAGE[language].find(
    (quote) => quote.id === selected.id,
  )!;
}
