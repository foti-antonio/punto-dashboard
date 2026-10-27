# Punto

**English** | [Italiano](README.it.md)

A personal dashboard for projects, tasks, and money. Built with React, TypeScript,
and Vite, Punto runs in your browser without an application server, analytics,
or bank connections. English is the default language; Italian is available in settings.

## Features

- Projects, tasks, subtasks, and analytics linked to income and expenses.
- Accounts, transfers, recurring forecasts, and six-month scenarios.
- CSV import with preview and duplicate detection; JSON backup and restore.
- Browser-local data with optional synchronization to a private GitHub repository.
- English and Italian, light/dark/system themes, responsive layout, and a daily Stoic quote.

The demo names, balances, transactions, and the sample
[`examples/movimenti.csv`](examples/movimenti.csv) are fictional examples.
Punto does not provide tax accounting, automatic banking, AI, attachments,
a calendar, or time tracking.

## Run locally with Docker

You need Git, Docker Engine or Docker Desktop, and Docker Compose. Node.js and
npm are not needed on the host: the image builds with Node 22 and serves the
production files through Nginx. With Docker running:

```bash
git clone https://github.com/foti-antonio/punto-dashboard.git
cd punto-dashboard
docker compose up -d --build
```

Open **http://localhost:5173**. Compose binds the port to `127.0.0.1`, so the app
is accessible only from this computer. Stop Vite or another process if it already
uses that port. Nginx applies the security headers in [`nginx.conf`](nginx.conf),
matching [`public/_headers`](public/_headers).

Run these commands from the project directory:

```bash
# Status
docker compose ps

# Logs (Ctrl+C only stops following the logs)
docker compose logs -f --tail=100

# Stop and resume
docker compose stop
docker compose start

# Rebuild after changing or downloading code
docker compose up -d --build

# Validate the configuration
docker compose config --quiet
```

On Linux, prefix Docker commands with `sudo` if your installation requires it.
On a systemd system, `sudo systemctl enable --now docker` enables Docker at boot;
with Docker Desktop, start the application. The `unless-stopped` restart policy
restarts Punto when Docker starts, including after a reboot. A manual stop stays
in effect until you start it again. See Docker's documentation on
[container restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)
and [Linux service and permissions](https://docs.docker.com/engine/install/linux-postinstall/).

There is no database container or Docker data volume: **your data is stored in
your browser**. Keep exactly **http://localhost:5173** and the same browser profile
to reuse data from a Vite session at that address. `http://127.0.0.1:5173`, another
port, and an HTTPS site each have separate storage. Export from the old address
before moving, then import at the new one. Localhost supports the Web Crypto
operations used to protect the GitHub token.

## Local development

Use Node.js **22.12 or later** and npm. Exact dependency versions and a lockfile
are included. From a clean clone:

```bash
git clone https://github.com/foti-antonio/punto-dashboard.git
cd punto-dashboard
npm ci
npm run dev
```

Open **http://localhost:5173**. If the Docker container occupies that port, stop it
with `docker compose stop` first; check the address printed by Vite.
To test, build, and preview production output:

```bash
npm test
npm run build
npm run preview
```

The production build is in `dist/`. Serve **only that directory** on a static
HTTPS host. Fonts are bundled locally. Hash-based navigation does not require
page rewrite rules. For deployment under a subpath, configure `base` in
[`vite.config.ts`](vite.config.ts) and adjust the font and favicon paths; the
existing configuration uses the domain root. Hosts that support `_headers`
read the supplied file; configure equivalent headers on other hosts.

[`.openai/hosting.json`](.openai/hosting.json) preserves the original Sites
integration. Its `project_id` identifies Punto's **original hosting project**;
it is not a credential and does not grant access. Do not reuse it to deploy a
fork: connect a new Sites project and use its identifier. Other static hosts do
not need this manifest.

## First use and local storage

1. In **Settings**, enter your name. In **Settings → Language**, choose English
   or Italiano. Currency remains EUR and the time zone remains Europe/Rome.
2. Add an account with an opening balance and date. Transactions must be on or
   after that date; the opening balance precedes all transactions on that day.
3. Create projects and link tasks, income, and expenses. Project results are the
   difference between recorded income and expenses, without tax-accounting meaning.
4. Record actual transactions in **Finances** and future ones in **Forecasts**.
   Transfers affect both accounts without counting as income or expenses.
5. Try the demo under **Settings → Explore or start again**. Loading the demo or
   clearing data requires confirmation and creates a local backup first.

Changes are saved to IndexedDB before their form closes. If saving fails, the
form stays open with an error. Storage belongs to the browser profile and origin:
changing browser, using a private window, or clearing site data can make your
local copy unavailable. Export regularly or save to your private GitHub repository.

Under **Settings → Appearance**, choose Light, Dark, or System. The default
follows the device, including later system changes. Theme and language choices
are stored separately in `localStorage` (`punto-theme` and `punto-language`) and
update other open tabs. If storage is blocked, the choice applies to the session
and settings show a warning. These preferences are excluded from JSON exports,
backups, restores, demos, and GitHub synchronization.

## Language and formats

Without a valid saved language preference, Punto uses English regardless of the
browser language, including on existing installations. Switching language updates
the interface, accessible text, page title, and description immediately. Dates
and numbers use `en-GB` or `it-IT`; currency and time zone remain EUR and Europe/Rome.
Money inputs use an English decimal point or Italian decimal comma and preserve
the entered amount when language changes, including unfinished input. CSV parsing
keeps its own explicit separator and date-format settings.

Changing language does not translate saved names, notes, categories, or existing
demo data. New initial categories and demos use the selected language; restored
files keep their text. JSON schema, identifiers, statuses, priorities, and internal
scopes stay unchanged. Empty synchronization bases are independent of language.

## Public code and private GitHub synchronization

The [public code repository](https://github.com/foti-antonio/punto-dashboard)
contains the application and examples, not your personal archive. Punto works
locally without a GitHub account. To synchronize devices, create a **separate
private data repository**, for example `YOUR-USERNAME/punto-data`, initialized
with a README and a `main` branch. Never put personal data in the public code
repository. The app checks that the data repository is private.

Configure each device separately:

1. Open **Settings → Connect GitHub**.
2. Create a **fine-grained personal access token** restricted to your data
   repository, with **Contents: Read and write**, the automatically required
   metadata access, and an expiration date. It does not need access to the code repository.
3. Enter your username as owner (replace `YOUR-USERNAME`), repository `punto-data`,
   branch `main`, path `dashboard.json`, your token, and a local password of at
   least 10 characters. Never put tokens in chat, source code, or exported JSON.
4. The browser stores an encrypted token. The password derives an AES-256-GCM key
   using PBKDF2/SHA-256 with 310,000 iterations and a random 16-byte salt. Each
   encryption uses a random 12-byte IV and authenticates the repository configuration.
   The password and decrypted token stay in memory for the session.
5. Unlocking automatically retrieves remote updates. **Save to GitHub** writes
   a complete copy; **Retrieve updates** compares and merges without uploading local changes.
6. Connect a second device to the same repository to retrieve your data and
   settings. Each device may use a different password because it protects that
   device's token.

**Lock** removes the decrypted token from the session. **Disconnect** removes
the encrypted connection from that device; it neither deletes data nor revokes
the GitHub token. Revoke tokens in GitHub settings. If you forget the password,
configure the connection again with a valid token.

**The connection password protects the token, not your data archive.** Local
IndexedDB data remains accessible to that browser profile. Exported JSON and the
JSON in your private repository are also not encrypted by this password.
HTTPS or localhost and Web Crypto are required for token encryption. Requests go
directly from the browser to GitHub's API. Browser data is never incorporated
into the static build.

References: [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
and [personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

## Synchronization and conflicts

Data uses `schemaVersion: 1` and an `entities` map with stable identifiers.
Accounts, categories, projects, tasks, transactions, forecasts, scenarios, and
settings have a type, `id`, `updatedAt`, and optional `deletedAt`. Money is stored
as integer cents. A transfer is one entity representing both sides.

Synchronization compares local data, the last shared base, and the remote file.
Changes to different entities merge automatically. Different changes to the
same entity, including deletions, show both versions and require a choice.
Deleting an account on one device while adding a linked transaction on another
also creates an explicit conflict. Choices must preserve valid references.

There is no last-write-wins rule. GitHub writes include the last-read file SHA;
a remote change requires another comparison. IndexedDB updates are transactions;
BroadcastChannel notifies other tabs, and a revision check protects merges and
restores from concurrent edits. Network failures and expired tokens preserve
local data and the last shared base. Deletion tombstones are not automatically compacted.

## CSV and backups

CSV import supports `;`, `,`, or tab separators, quoted and multiline fields,
BOM, day/month/year dates (also dots or hyphens), ISO year-month-day dates, and
Italian or English amounts. A header row is required. Select the columns,
account, optional category, and amount-sign convention. Ambiguous amounts and
more than two decimal places are reported without silent rounding.

Preview does not write data. Invalid rows remain visible with explanations and
are excluded. Possible duplicates are checked against existing transactions and
within the CSV by date, amount, direction, account, and normalized description.
They are excluded initially and can be included explicitly; the check repeats
before confirmation. Limits are 5 MB and 10,000 rows. Preview displays up to
200 rows but validates all of them. Use the dedicated transfer form for transfers.

**Settings → Export JSON** includes all entities and settings, without tokens,
passwords, GitHub configuration, or local backup copies. Restore validates the
structure and references, shows counts, and asks for confirmation. It preserves
a local IndexedDB copy before replacing data; the last five copies can be
exported or restored. These copies share the same browser storage and do not
replace an external backup. Missing entities are marked deleted and restored
entities are marked changed so the next synchronization recognizes the restore.
You can also recover earlier versions from `dashboard.json` history on GitHub.

## Forecasts

Forecasts can be one-off, weekly, monthly, or annual. Monthly recurrence preserves
the original day, adjusted to the length of each month. The view covers six
calendar months starting with the current month. Current balance includes actual
transactions through today; unrecorded forecasts are added from today onward.
Overdue forecasts show a warning and stay out of the future balance until recorded
or rescheduled.

Each occurrence uses the forecast ID and a stable recurrence index. Changing a
start date does not recreate already recorded occurrences. Recording an occurrence
creates a linked actual transaction and excludes that occurrence from forecasts,
including scenarios; deleting the transaction reopens it. Two active transactions
cannot share an occurrence. Scenarios adjust occurrence dates, amounts, or exclusion
without changing actual transactions or base rules. The table shows up to 150
occurrences, while calculations include the whole horizon.

## Daily quote

The sidebar shows one of 30 short Stoic quotations from Marcus Aurelius, Seneca,
and Epictetus in the selected language. The translations are original, with
[source references](docs/stoic-quotes.md). All devices and both languages share
the same selection for each Europe/Rome day, without consecutive repeats. It
updates while the app is open and when returning to a tab, entirely locally.

## Verification

From a clean clone, run `npm ci`, `npm test`, and `npm run build`.
The [Verify workflow](.github/workflows/check.yml) runs the same checks on pushes
to `main` and pull requests. For Docker, also run `docker compose config --quiet`,
`docker compose up -d --build`, and open `http://localhost:5173`.

Tests cover money, balances, transfers, recurrence, scenarios, CSV validation and
duplicates, three-way merges, conflicts, remote SHA checks, concurrency, network
failures, expired tokens, encryption, IndexedDB, revisions, and backups. React
flows run in a simulated DOM in both languages. Theme and language tests include
persistence, blocked storage, cross-tab updates, keyboard selection, dictionary
coverage, localized demos and quotes, and amount preservation during language changes.

**GitHub tests use simulated responses and device stores. They do not certify
synchronization with a real token.** For changes to synchronization, additionally
use fictional data in a private test repository on two browsers or devices:

- Create and edit linked items, statuses, subtasks, and filters.
- Save and retrieve from both devices, merge distinct changes, and resolve both
  sides of a same-entity conflict.
- Try a network failure and expired token, checking that local data remains available.
- Import the sample CSV, inspect invalid and duplicate rows, then export and restore JSON.
- Check both languages and themes, desktop and 390 px layouts, keyboard navigation,
  menus, charts, forms, and dialog focus in a real browser.

## Source layout

| Path                                                  | Purpose                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `src/domain.ts`                                       | Model, validation, accounts, forecasts, merges, demo data       |
| `src/storage.ts`                                      | IndexedDB, revisions, backups, exports, cross-tab notifications |
| `src/github.ts`                                       | GitHub API, encrypted token vault, synchronization              |
| `src/csv.ts`                                          | CSV parsing and import preview                                  |
| `src/App.tsx`                                         | Navigation and main views                                       |
| `src/forms.tsx`, `src/Import.tsx`, `src/Settings.tsx` | Entry forms, import, settings and data management               |
| `src/components.tsx`, `src/styles.css`                | Accessible components, SVG charts, responsive layout            |
| `src/i18n.ts`, `src/locales/`, `src/MoneyInput.tsx`   | Language preferences, dictionaries, localized money input       |
| `src/quotes.ts`, `src/DailyQuote.tsx`                 | Bilingual quotations and daily selection                        |
| `src/theme.ts`, `src/theme.css`, `index.html`         | Theme preferences, palettes, theme before React loads           |
| `tests/`                                              | Domain, storage, synchronization, and React tests               |

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Use **fictional data only** in issues and
pull requests.

Punto is licensed under the [MIT license](LICENSE), Copyright (c) 2026 Antonio Foti.
The package keeps `"private": true`: this is an application to run or build,
not a package to publish to npm.

Third-party assets retain their own licenses. [DM Sans](public/fonts/DM-Sans-LICENSE.txt)
and [Manrope](public/fonts/Manrope-LICENSE.txt) use the SIL Open Font License.
React, React DOM, Scheduler, and Lucide/Feather icon notices are preserved in
[THIRD-PARTY-NOTICES.txt](public/THIRD-PARTY-NOTICES.txt), also included in production
builds. Stoic translation references are in [docs/stoic-quotes.md](docs/stoic-quotes.md).
