# Citazioni stoiche del giorno

La raccolta in `src/quotes.ts` contiene 30 citazioni con traduzioni italiane e inglesi proprie di brevi
passi greci e latini di pubblico dominio, dieci per autore. Le frasi sono estratti
del passo indicato, non traduzioni dell’intero capitolo. La punteggiatura è
adattata alla lettura autonoma; non sono riprese traduzioni moderne. Le versioni inglesi mantengono il contenuto
degli estratti italiani; nomi degli autori e titoli delle opere seguono la lingua
selezionata nelle impostazioni.
Ogni voce conserva un identificatore, l’autore, il riferimento all’opera e il
collegamento al testo originale. Il riferimento è disponibile anche passando
il puntatore sul nome dell’autore nel riquadro.

## Fonti e riscontro dei passi

Per Marco Aurelio è stata controllata la numerazione di libro e capitolo del
[testo greco di Perseus, edizione J. H. Leopold, Teubner, 1908](https://github.com/PerseusDL/canonical-greekLit/blob/master/data/tlg0562/tlg001/tlg0562.tlg001.perseus-grc2.xml).
Nell’XML i capitoli sono identificati da `div` con `subtype="book"` e
`subtype="chapter"`. La tabella riporta il segmento greco tradotto o il suo inizio.

| ID       | Pensieri, libro e capitolo | Segmento originale                                                         |
| -------- | -------------------------- | -------------------------------------------------------------------------- |
| ma-4-3   | IV, 3                      | οὐδαμοῦ γὰρ οὔτε ἡσυχιώτερον οὔτε ἀπραγμονέστερον … ἢ εἰς τὴν ἑαυτοῦ ψυχήν |
| ma-4-17  | IV, 17                     | ἕως ζῇς, ἕως ἔξεστιν, ἀγαθὸς γενοῦ                                         |
| ma-4-23  | IV, 23                     | Πᾶν μοι συναρμόζει ὃ σοὶ εὐάρμοστόν ἐστιν, ὦ κόσμε                         |
| ma-5-16  | V, 16                      | βάπτεται γὰρ ὑπὸ τῶν φαντασιῶν ἡ ψυχή                                      |
| ma-6-6   | VI, 6                      | Ἄριστος τρόπος τοῦ ἀμύνεσθαι τὸ μὴ ἐξομοιοῦσθαι                            |
| ma-6-54  | VI, 54                     | Τὸ τῷ σμήνει μὴ συμφέρον οὐδὲ τῇ μελίσσῃ συμφέρει                          |
| ma-7-59  | VII, 59                    | Ἔνδον σκάπτε, ἔνδον ἡ πηγὴ τοῦ ἀγαθοῦ                                      |
| ma-8-36  | VIII, 36                   | οὔτε τὸ μέλλον οὔτε τὸ παρῳχηκὸς βαρεῖ σε, ἀλλ’ ἀεὶ τὸ παρόν               |
| ma-9-5   | IX, 5                      | Ἀδικεῖ πολλάκις ὁ μὴ ποιῶν τι, οὐ μόνον ὁ ποιῶν τι                         |
| ma-12-17 | XII, 17                    | Εἰ μὴ καθήκει, μὴ πράξῃς· εἰ μὴ ἀληθές ἐστι, μὴ εἴπῃς                      |

Per Seneca sono stati confrontati i testi latini delle _Epistulae morales ad
Lucilium_ su The Latin Library: [libro I](https://www.thelatinlibrary.com/sen/seneca.ep1.shtml),
[libro II](https://www.thelatinlibrary.com/sen/seneca.ep2.shtml) e
[libro III](https://www.thelatinlibrary.com/sen/seneca.ep3.shtml).
I riferimenti italiani indicano lettera e paragrafo, non il numero del libro.
Sono state scelte parole di Seneca, evitando le massime che nelle lettere sono
esplicitamente citazioni di Epicuro o di altri autori. In 2, 6 la frase scelta è
il commento di Seneca alla citazione di Epicuro presente nel paragrafo precedente.

| ID      | Lettere a Lucilio, lettera e paragrafo | Segmento originale                                          |
| ------- | -------------------------------------- | ----------------------------------------------------------- |
| se-1-1  | 1, 1                                   | vindica te tibi … collige et serva                          |
| se-1-3  | 1, 3                                   | Dum differtur vita transcurrit                              |
| se-2-6  | 2, 6                                   | non qui parum habet, sed qui plus cupit, pauper est         |
| se-3-2  | 3, 2                                   | Tu vero omnia cum amico delibera, sed de ipso prius         |
| se-6-5  | 6, 5                                   | longum iter est per praecepta, breve et efficax per exempla |
| se-7-8  | 7, 8                                   | cum his versare qui te meliorem facturi sunt                |
| se-13-4 | 13, 4                                  | saepius opinione quam re laboramus                          |
| se-16-3 | 16, 3                                  | animum format et fabricat                                   |
| se-20-2 | 20, 2                                  | facere docet philosophia, non dicere                        |
| se-23-8 | 23, 8                                  | constituendum est quid velimus et in eo perseverandum       |

Per Epitteto è stato consultato il [testo greco del Manuale su Wikisource](https://el.wikisource.org/wiki/Εγχειρίδιον),
raccolta del suo insegnamento tramandata da Arriano. Le sezioni greche αʹ, δʹ,
ecc. corrispondono ai capitoli 1, 4, ecc.; quando presente, il secondo numero è
il paragrafo. La frase di 8 è tratta dalla prima parte del capitolo, prima della
conseguenza conclusiva «e vivrai serenamente».

| ID      | Manuale, capitolo e paragrafo | Segmento originale                                                          |
| ------- | ----------------------------- | --------------------------------------------------------------------------- |
| ep-1-1  | 1, 1                          | Τῶν ὄντων τὰ μέν ἐστιν ἐφ’ ἡμῖν, τὰ δὲ οὐκ ἐφ’ ἡμῖν                         |
| ep-4    | 4                             | Ὅταν ἅπτεσθαί τινος ἔργου μέλλῃς, ὑπομίμνῃσκε σεαυτόν, ὁποῖόν ἐστι τὸ ἔργον |
| ep-5    | 5                             | Ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα, ἀλλὰ τὰ περὶ τῶν πραγμάτων δόγματα  |
| ep-6    | 6                             | Ἐπὶ μηδενὶ ἐπαρθῇς ἀλλοτρίῳ προτερήματι                                     |
| ep-8    | 8                             | Μὴ ζήτει τὰ γινόμενα γίνεσθαι ὡς θέλεις, ἀλλὰ θέλε τὰ γινόμενα ὡς γίνεται   |
| ep-10   | 10                            | Ἐφ’ ἑκάστου τῶν προσπιπτόντων … τίνα δύναμιν ἔχεις πρὸς τὴν χρῆσιν αὐτοῦ    |
| ep-12-2 | 12, 2                         | ἄρξαι τοιγαροῦν ἀπὸ τῶν σμικρῶν                                             |
| ep-20   | 20                            | ἂν γὰρ ἅπαξ χρόνου καὶ διατριβῆς τύχῃς, ῥᾷον κρατήσεις σεαυτοῦ              |
| ep-33-2 | 33, 2                         | σιωπὴ τὸ πολὺ ἔστω ἢ λαλείσθω τὰ ἀναγκαῖα καὶ δι’ ὀλίγων                    |
| ep-46-1 | 46, 1                         | μηδὲ λάλει τὸ πολὺ … περὶ τῶν θεωρημάτων, ἀλλὰ ποίει τὸ ἀπὸ τῶν θεωρημάτων  |

## Selezione e aggiornamento

Il giorno corrente proviene da `today()`, già usato dalla dashboard con il fuso
`Europe/Rome`. La data civile ISO viene numerata usando una mezzanotte UTC
fittizia: non si dividono intervalli di tempo locale per 24 ore, perché le giornate
del cambio dell’ora durano 23 o 25 ore.

I giorni sono raggruppati in cicli di 30, allineati all’epoca Unix. Un mescolamento
Fisher–Yates usa Mulberry32 con seme derivato dal numero del ciclo. Ogni ciclo
contiene tutte le citazioni una volta. Se la prima coincidesse con l’ultima del
ciclo precedente, vengono scambiate le prime due. Con almeno tre citazioni
l’ultima rimane invariata: basta quindi ricostruire il ciclo precedente senza
ricorsione. Questo garantisce assenza di ripetizioni consecutive anche ai
confini dei cicli. L’ordine cambia tra cicli e non dipende da browser, dispositivo,
storage, lingua o rete. La scelta avviene prima della localizzazione: le due lingue
condividono gli stessi identificativi, fonti e ordine della raccolta. Cambiare raccolta, ordine delle voci o algoritmo può cambiare
l’associazione tra date e citazioni: evitare aggiornamenti di questi elementi
durante una giornata se si vuole preservare la citazione già mostrata.

`DailyQuote` controlla la data ogni minuto, al ritorno della scheda visibile, al
focus della finestra e su `pageshow` (anche al ripristino dalla cache di navigazione).
Timer e listener vengono rimossi allo smontaggio. La selezione avviene interamente
nel bundle locale; i collegamenti alle fonti sono metadati e non vengono richiesti
in rete dal componente. Il riquadro non modifica né salva dati personali.

## Verifiche automatiche

`tests/quotes.test.ts` verifica raccolta e metadati, stabilità anche dopo una nuova
importazione del modulo, confini di mese/anno, anno bisestile, mezzanotte di Roma
con ora legale e solare, copertura della raccolta e assenza di ripetizioni
consecutive su 40.000 giorni. `tests/daily-quote.test.tsx` verifica il controllo
entro un minuto dalla mezzanotte, la ripresa senza tick intermedi, gli eventi di
riattivazione, la rimozione dei listener in StrictMode e l’assenza di richieste
HTTP e scritture in localStorage. Il test di integrazione in `tests/ui.test.tsx`
controlla il riquadro nella sidebar e l’apertura/chiusura del menu mobile.

`tests/language.test.tsx` controlla che le due raccolte abbiano le stesse fonti e
che una data selezioni lo stesso identificativo in entrambe le lingue. I test
dell’interfaccia verificano il cambio del testo a parità di giorno, senza scrivere
nei dati dell’utente.
