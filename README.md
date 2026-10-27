# Punto

Una dashboard personale per progetti, attività e risorse economiche, con inglese predefinito e italiano selezionabile. Applicazione statica React + TypeScript + Vite: nessun server applicativo, nessun servizio di analisi o collegamento bancario.

## Avvio locale con Docker

Richiede Docker Engine e Docker Compose. Non serve installare Node.js o avviare npm sul computer: l’immagine compila l’app con Node 22 e distribuisce i soli file di produzione tramite Nginx.

Dalla directory del progetto, abilita Docker all’avvio del computer (una sola volta) e costruisci e avvia Punto:

```bash
sudo systemctl enable --now docker
sudo docker compose up -d --build
```

Apri **http://localhost:5173**. La porta è pubblicata soltanto su `127.0.0.1`, quindi l’app è accessibile solo da questo PC. Libera la porta se è già occupata da Vite o da un altro processo. Nginx applica gli stessi header di sicurezza di `public/_headers`, riportati in `nginx.conf`.

Con `restart: unless-stopped`, Punto riparte quando si avvia Docker, anche dopo un riavvio del computer. Un arresto manuale rimane valido anche dopo il riavvio; per riattivarlo usa `sudo docker compose start`. Non servono database o volumi Docker: i dati restano nel browser.

Comandi da eseguire nella directory del progetto:

```bash
# Stato
sudo docker compose ps

# Log (Ctrl+C interrompe solo la visualizzazione)
sudo docker compose logs -f --tail=100

# Arresto manuale
sudo docker compose stop

# Ripresa dopo un arresto manuale
sudo docker compose start

# Aggiornamento dopo aver modificato o scaricato il codice
sudo docker compose up -d --build

# Validazione della configurazione
docker compose config --quiet
```

Il normale utilizzo richiede soltanto il browser. Le modifiche al codice richiedono una nuova build; dipendenze, build locali, Git e file di ambiente sono esclusi dal contesto tramite `.dockerignore`. I comandi usano `sudo` senza modificare i gruppi dell’utente.

Mantieni esattamente **http://localhost:5173** per riutilizzare i dati del normale avvio Vite sulla stessa origine e nello stesso profilo browser. `http://127.0.0.1:5173`, una porta diversa o un sito HTTPS hanno archivi distinti: se cambi indirizzo, esporta prima i dati dal vecchio e importali nel nuovo. Su localhost è disponibile anche Web Crypto per la cifratura del collegamento GitHub.

Riferimenti: [riavvio automatico dei container](https://docs.docker.com/engine/containers/start-containers-automatically/), [servizio e permessi Docker su Linux](https://docs.docker.com/engine/install/linux-postinstall/).

## Sviluppo da un clone pulito

Richiede Node.js **22.12 o successivo** e npm. Dipendenze esatte e `package-lock.json` sono inclusi.

```bash
git clone git@github.com:foti-antonio/punto-dashboard.git
cd punto-dashboard
npm ci
npm run dev
```

Apri l’indirizzo locale mostrato da Vite. Per verificare e costruire la versione di produzione:

```bash
npm test
npm run build
npm run preview
```

La build è in `dist/`: puoi pubblicare **solo quella directory** su qualunque hosting statico HTTPS. I font sono inclusi e non richiedono servizi esterni. Per un sottopercorso, imposta `base` in `vite.config.ts` e adatta i percorsi dei font e della favicon; l’impostazione predefinita usa la radice del dominio. La navigazione usa hash, quindi non servono regole di riscrittura delle pagine.

Il manifest Sites è [`.openai/hosting.json`](.openai/hosting.json). Quando trasferisci il codice a un nuovo progetto Sites, sostituisci l’identità del progetto seguendo la procedura di Sites; per altri hosting il manifest non serve. Il file `_headers` è utilizzato dagli hosting compatibili; sugli altri configura gli stessi header nelle impostazioni del provider.

## Primo utilizzo

1. In **Settings → Language** puoi scegliere **Italiano**; le indicazioni seguenti usano le etichette italiane. In **Impostazioni** inserisci il tuo nome. La valuta è EUR e il fuso è Europe/Rome.
2. Aggiungi un **conto**, con saldo iniziale e data di partenza. I movimenti successivi devono essere dalla stessa data in avanti. Il saldo iniziale è precedente a tutti i movimenti di quella giornata.
3. Crea un progetto e collega attività, incassi e spese. Il risultato del progetto è la differenza tra i movimenti registrati e non ha significato fiscale.
4. Registra i movimenti reali in **Finanze** e quelli futuri in **Previsioni**. I trasferimenti aggiornano entrambi i conti senza entrare nelle entrate o nelle uscite.
5. Puoi provare dati dimostrativi in **Impostazioni → Esplora o riparti**. La demo sostituisce i dati attivi soltanto dopo conferma e crea una copia locale. **Svuota i dati** permette di iniziare da zero allo stesso modo.

Ogni modifica viene salvata in IndexedDB prima di chiudere il relativo modulo. Se il salvataggio fallisce, la finestra rimane aperta con l’errore. La persistenza dipende dal profilo browser e dall’origine: localhost, sito pubblicato e altro hosting hanno archivi distinti. Cambiare browser, usare una finestra privata o cancellare i dati del sito può rendere indisponibile la copia locale. Esporta i dati o salvali su GitHub prima di spostarti.

In **Impostazioni → Aspetto** scegli **Chiaro**, **Scuro** o **Sistema**. Il cambio è immediato; al primo accesso Punto segue il tema del dispositivo, inclusi i suoi cambiamenti. La preferenza è salvata in `localStorage` con chiave `punto-theme` e aggiorna le altre schede aperte. Se il browser impedisce il salvataggio, viene applicata alla sessione con un avviso. Il tema è separato dai dati: esportazioni, backup, ripristino, demo e sincronizzazione GitHub non lo modificano.

## Lingua e formati

Punto parte in **English**, anche su un’installazione esistente senza preferenza salvata. In **Settings → Language** (oppure **Impostazioni → Lingua**) scegli **English / Italiano**. Il cambio è immediato, aggiorna le altre schede aperte, i testi accessibili, il titolo e la descrizione della pagina. La scelta viene salvata in `localStorage` con chiave `punto-language`; se il browser blocca lo storage, resta valida nella sessione e appare un avviso nelle impostazioni. Un valore assente o non valido usa l’inglese, indipendentemente dalla lingua del browser.

Date e numeri seguono `en-GB` o `it-IT`. La valuta resta **EUR** e il fuso **Europe/Rome**. Nei moduli monetari il punto è decimale in inglese e la virgola in italiano; cambiando lingua con un modulo aperto vengono convertiti insieme separatori decimali e delle migliaia, conservando il significato degli importi digitati, anche incompleti. Il CSV mantiene sempre le proprie opzioni esplicite di separatore e formato della data.

La preferenza è locale ed esclusa da esportazioni, backup e sincronizzazione GitHub. Cambiarla non modifica nomi, note, descrizioni, categorie o demo già salvati. Nuove demo e categorie iniziali vengono create nella lingua selezionata; un ripristino conserva i testi del file. Schema JSON, identificativi, stati, priorità e ambiti interni restano invariati. Le strutture vuote usate come base della sincronizzazione sono indipendenti dalla lingua.

## Repository separate e GitHub

- **Codice privato:** https://github.com/foti-antonio/punto-dashboard
- **Dati privati:** https://github.com/foti-antonio/punto-dati
- File dati: `dashboard.json`, branch `main`.

La repository dei dati è stata creata senza dati personali. La configurazione in app verifica che sia privata; puoi usare anche una repository privata diversa. Il collegamento si configura separatamente su ogni dispositivo:

1. Apri **Impostazioni → Collega GitHub**.
2. Crea su GitHub un **fine-grained personal access token** limitato alla sola repository dei dati. Concedi **Contents: Read and write**, oltre ai metadati richiesti automaticamente, e imposta una scadenza. Non serve concedere accesso alla repository del codice.
3. Nel modulo dell’app inserisci proprietario `foti-antonio`, repository `punto-dati`, branch `main`, percorso `dashboard.json`, token e una password locale di almeno 10 caratteri. Non inserire token in chat, nel codice o nei JSON esportati.
4. La password deriva una chiave AES-256-GCM con PBKDF2/SHA-256 (310.000 iterazioni, salt casuale di 16 byte). Ogni cifratura usa un IV casuale di 12 byte e lega la configurazione tramite dati autenticati. Solo il token cifrato viene conservato nel browser; password e token decifrato rimangono in memoria per la sessione.
5. Dopo lo sblocco l’app recupera automaticamente gli aggiornamenti. **Salva su GitHub** pubblica la copia completa; **Recupera aggiornamenti** confronta e incorpora i dati senza pubblicare le modifiche locali.
6. Sul secondo dispositivo configura il collegamento alla stessa repository e sbloccalo per recuperare dati e impostazioni. La password può essere diversa, perché protegge il token del singolo dispositivo.

**Blocca** rimuove il token decifrato dalla sessione. **Scollega** rimuove la configurazione cifrata dal dispositivo; non cancella i dati né revoca il token su GitHub. Per revocarlo usa le impostazioni di GitHub. Se dimentichi la password, riconfigura il collegamento con un token valido. I dati locali non sono cifrati dalla password di collegamento e rimangono accessibili al profilo browser.

HTTPS (oppure localhost) e Web Crypto sono necessari per cifrare il collegamento. Le richieste vanno direttamente dal browser alle API GitHub. Il sito pubblico contiene solo l’interfaccia e i dati dimostrativi inclusi nel codice: i dati reali non sono inseriti negli asset pubblicati.

Riferimenti: [Contents API](https://docs.github.com/en/rest/repos/contents), [fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

## Sincronizzazione e conflitti

Il file ha `schemaVersion: 1` e una mappa `entities`, indicizzata da identificatori stabili. Ogni entità ha tipo, `id`, `updatedAt` e un eventuale `deletedAt`. I tipi sono conti, categorie, progetti, attività, movimenti, previsioni, scenari e impostazioni. Gli importi sono interi in centesimi. I trasferimenti sono singoli elementi che rappresentano entrambe le parti del movimento.

La sincronizzazione confronta la copia locale, l’ultima copia condivisa e il file remoto. Modifiche a entità diverse vengono unite; modifiche differenti alla stessa entità mostrano entrambe le versioni, incluse le eliminazioni, e richiedono una scelta per ogni conflitto. Anche la cancellazione di un conto su un dispositivo e un nuovo movimento collegato sull’altro producono un conflitto esplicito. Le scelte devono mantenere validi i riferimenti: per conservare un movimento occorre conservare il conto collegato.

Non viene usato un criterio «vince l’ultima data». Le scritture GitHub includono lo SHA del file letto: se la versione remota cambia, il salvataggio fallisce e richiede un nuovo confronto. Gli aggiornamenti locali sono transazioni IndexedDB e le schede aperte si notificano tramite BroadcastChannel; una revisione protegge i confronti e i ripristini da modifiche contemporanee. Errori di rete e token scaduti conservano dati locali e ultima base condivisa. Le eliminazioni rimangono come tombstone e non vengono compattate automaticamente.

## CSV e backup

L’importatore supporta separatori `;`, `,` o tab, campi tra virgolette, righe multiple, BOM, date `GG/MM/AAAA` (anche punti o trattini) oppure `AAAA-MM-GG`, e importi italiani o inglesi. Richiede una riga di intestazioni. Scegli le colonne, il conto, una categoria facoltativa e l’interpretazione del segno. Importi con più di due decimali o separatori ambigui sono segnalati, senza arrotondamenti silenziosi.

L’anteprima non scrive dati. Le righe errate sono escluse e restano visibili con il motivo. I possibili duplicati sono confrontati per data, importo, direzione, conto e descrizione normalizzata, sia contro i dati presenti sia all’interno del CSV. Sono esclusi inizialmente e si possono includere esplicitamente. Il controllo viene ripetuto prima della conferma. Limiti: 5 MB, 10.000 righe; l’anteprima mostra fino a 200 righe, ma le controlla tutte. Per i trasferimenti usa il modulo dedicato, così non vengono importati come costi o ricavi.

L’esportazione JSON include tutte le entità e le impostazioni, senza token, password, configurazione GitHub o copie locali. Il ripristino valida struttura e riferimenti, mostra i conteggi e richiede conferma. Prima della sostituzione conserva una copia IndexedDB; le ultime cinque copie si possono esportare o ripristinare. Le entità assenti dal file vengono marcate eliminate e quelle ripristinate risultano modificate, così il ripristino viene riconosciuto nella successiva sincronizzazione. Per recuperare versioni precedenti usa anche la cronologia di `dashboard.json` su GitHub.

## Previsioni

Ricorrenze singole, settimanali, mensili e annuali; le date mensili conservano il giorno originale, adattandolo alla lunghezza del mese. La vista mostra sei mesi di calendario, dal mese corrente. Il saldo attuale include i movimenti effettivi fino a oggi; le previsioni non registrate vengono aggiunte dal giorno corrente. I movimenti scaduti restano nella lista con un avviso e sono esclusi dal saldo futuro finché non vengono registrati o spostati.

Ogni occorrenza è identificata da previsione e indice stabile della ricorrenza: modificare la data di partenza non fa ricomparire le occorrenze già registrate. **Registra** apre un movimento effettivo collegato: dopo la conferma, quell’occorrenza viene esclusa dalla previsione, anche negli scenari. Eliminare il movimento effettivo riapre l’occorrenza. Una stessa occorrenza non può avere due movimenti attivi collegati. Gli scenari salvano variazioni per occorrenza (data, importo, esclusione) e non cambiano movimenti reali o regole di base. La tabella mostra fino a 150 occorrenze, ma i calcoli includono tutte quelle nell’orizzonte.

## Citazione del giorno

La barra laterale mostra una breve citazione stoica nella lingua selezionata con il nome
dell’autore e il riferimento tradotti. Le 30 citazioni di Marco Aurelio, Seneca ed Epitteto sono traduzioni
proprie, con [riferimenti ai testi originali](docs/stoic-quotes.md). La selezione è
uguale nelle due lingue e su tutti i dispositivi nella stessa giornata di `Europe/Rome`, cambia
ogni giorno senza ripetizioni consecutive e si aggiorna anche lasciando l’app
aperta o tornando nella scheda. Funziona interamente in locale, senza API o
impostazioni aggiuntive.

## Verifica

`npm test` verifica importi e saldi, trasferimenti, ricorrenze e date, riconciliazione, scenari, CSV errati e duplicati, merge a tre vie e conflitti, SHA e race, recupero dopo errori di rete e token scaduti, cifratura, persistenza IndexedDB, revisioni e backup. Include percorsi React in entrambe le lingue con DOM simulato: creazione collegata di conto/progetto/attività/movimento, aggiornamento di panoramica e analisi, trasferimenti, registrazione previsioni e navigazione. I test del tema coprono avvio prima di React, valori non validi, persistenza, cambiamenti del sistema, eventi tra schede, storage bloccato e selezione da tastiera senza modificare i dati.

I test della lingua coprono default inglese, preferenza persistente e storage bloccato, eventi tra schede, completezza dei dizionari, citazioni e demo localizzate, errori già aperti, importi durante il cambio lingua e opzioni CSV invariate. Verificano inoltre che la lingua non modifichi i dati esportati o sincronizzati.

La build TypeScript deve passare. I temi sono stati verificati in Chromium con dati demo sulle sette pagine a 1440 e 390 px, inclusi menu, grafici, moduli, finestre, contrasto, avvio scuro e aggiornamento tra due schede. I test GitHub usano risposte simulate e due archivi di dispositivo; non equivalgono a una prova interattiva con token reale. Prima di inserire dati importanti, completa questa verifica con la demo su due browser/dispositivi:

- Creare e modificare elementi, cambiare stati e sottoattività; controllare i filtri.
- Salvare e recuperare da due dispositivi, unire elementi diversi e scegliere entrambe le opzioni di un conflitto sullo stesso elemento.
- Provare un errore di rete e un token scaduto; verificare che la copia locale rimanga disponibile.
- Importare `examples/movimenti.csv`, controllare righe errate e duplicati, confermare e provare esportazione/ripristino.
- Controllare moduli, menu, tabelle e grafici a 390 px e su desktop, navigazione da tastiera e focus delle finestre.

## Struttura

- `src/domain.ts`: modello, validazione, conti, previsioni, merge e dati demo.
- `src/storage.ts`: IndexedDB, revisioni, backup, esportazione e notifiche tra schede.
- `src/github.ts`: API GitHub, vault cifrato e sincronizzazione.
- `src/csv.ts`: parsing e anteprima dell’importazione.
- `src/App.tsx`: navigazione e moduli principali.
- `src/forms.tsx`, `src/Import.tsx`, `src/Settings.tsx`: inserimento, importazione e gestione dati.
- `src/components.tsx`, `src/styles.css`: componenti accessibili, grafici SVG e layout adattivo.
- `src/i18n.ts`, `src/locales/`: lingua locale, hook reattivo, messaggi tipizzati, parametri e dizionari.
- `src/MoneyInput.tsx`: input monetari che conservano il valore al cambio lingua.
- `src/quotes.ts`: raccolta bilingue con identità e ordine giornaliero comuni.
- `src/theme.ts`, `src/theme.css`: preferenza locale e palette; `index.html` applica il tema prima del caricamento di React.
- `tests/`: test di dominio, persistenza, sincronizzazione e percorsi React.

I font DM Sans e Manrope sono distribuiti con licenza SIL Open Font License, inclusa in `public/fonts/`. Le icone provengono da Lucide. Non sono inclusi contabilità fiscale, banche automatiche, AI, allegati, calendario o rilevazione ore.
