# Contributing to Punto

Contributions and reports in English or Italian are welcome. See the
[English README](README.md) or [README italiano](README.it.md) for setup and
the data and synchronization model.

## Reports

Describe the expected behavior, what happened, and how to reproduce it. Include
the browser version, operating system, selected language, and relevant error
messages. Use **fictional data only**, including in screenshots, CSV files,
JSON exports, logs, and repository names. Never attach personal financial data,
tokens, passwords, or a copy of your browser storage. Reproduce issues with
the built-in demo or a small synthetic fixture.

## Changes

Keep pull requests focused and explain the problem and resulting behavior.
Preserve browser-local operation, explicit conflict resolution, and the existing
data format. Discuss schema migrations or changes to synchronization behavior
before implementing them. Update both READMEs when user-facing instructions change.
Keep English and Italian UI messages aligned and retain third-party notices.

With Node.js 22.12 or later and npm, run:

```bash
npm ci
npm test
npm run build
docker compose config --quiet
```

Add or update meaningful tests for behavior changes. For UI changes, check both
languages, light and dark themes, keyboard navigation, and desktop and narrow
screens in a browser. For Docker or server configuration changes, also run
`docker compose up -d --build` and check `http://localhost:5173`.

GitHub Actions runs the tests and production build on pull requests and pushes
to `main`. Describe the checks you performed and any limitations in the pull
request. The GitHub tests use simulated responses; they do not prove that a real
token or a particular private repository works.

Contributions are provided under the project's [MIT license](LICENSE).

## In italiano

Sono benvenute segnalazioni e proposte in italiano. Usa **solo dati fittizi**,
anche in schermate, CSV, esportazioni JSON e log: non allegare dati finanziari
personali, token, password o archivi del browser. Descrivi i passaggi per
riprodurre il problema, il risultato atteso e quello osservato.

Mantieni le modifiche mirate, aggiorna entrambi i README e verifica i comandi
indicati sopra. Per modifiche all'interfaccia controlla entrambe le lingue,
i temi, la tastiera e gli schermi piccoli. Per modifiche Docker verifica anche
la build e l'apertura su localhost. Documenta nella pull request i controlli
eseguiti; i test simulati non certificano la sincronizzazione con token reali.
