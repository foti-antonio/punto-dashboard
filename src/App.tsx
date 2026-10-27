import {
  msg,
  toMessage,
  messageText,
  type Message,
  tr,
  locale,
  numberLabel,
  useLanguage,
} from './i18n';
import { MoneyInput } from './MoneyInput';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  CheckSquare2,
  TrendingUp,
  ChartNoAxesCombined,
  Settings2,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Menu,
  X,
  Check,
  Circle,
  ArrowLeftRight,
  CalendarDays,
  List,
  Columns3,
  Pencil,
  GitBranch,
  HardDrive,
  Archive,
  Download,
  Target,
} from 'lucide-react';
import { useApp } from './context';
import {
  accountBalance,
  liquidity,
  list,
  today,
  shiftMonth,
  shiftDate,
  euro,
  compactEuro,
  dateLabel,
  projectResult,
  forecastSeries,
  occurrences,
  occurrenceDate,
  occurrenceReference,
  newId,
  stamp,
  parseMoney,
  type Scope,
  type Data,
  type Project,
  type Task,
  type Transaction,
  type Occurrence,
  type Scenario,
  type Settings,
} from './domain';
import { EntityForm, type FormSpec } from './forms';
import {
  Dialog,
  Empty,
  SectionHeading,
  LineChart,
  BarChart,
  TransactionTable,
  ProjectIcon,
  Field,
  entityName,
} from './components';
import { SettingsPage, type SyncIndicator } from './Settings';
import { ImportDialog } from './Import';
import { DailyQuote } from './DailyQuote';
type Page =
  | 'overview'
  | 'projects'
  | 'finance'
  | 'tasks'
  | 'forecast'
  | 'analytics'
  | 'settings';
type Period = 'month' | '90days' | 'year' | 'all';
type FilterScope = 'all' | Scope;
const navigation = (): { id: Page; label: string; icon: typeof Wallet }[] => [
  { id: 'overview', label: tr('Panoramica'), icon: LayoutDashboard },
  { id: 'projects', label: tr('Progetti'), icon: FolderKanban },
  { id: 'finance', label: tr('Finanze'), icon: Wallet },
  { id: 'tasks', label: tr('Attività'), icon: CheckSquare2 },
  { id: 'forecast', label: tr('Previsioni'), icon: TrendingUp },
  { id: 'analytics', label: tr('Analisi'), icon: ChartNoAxesCombined },
];
const pageInfo = (): Record<Page, [string, string]> => ({
  overview: [
    tr('Panoramica'),
    tr('Tutto al suo posto. Uno sguardo a ciò che conta.'),
  ],
  projects: [
    tr('Progetti'),
    tr('Dai spazio alle idee, tieni il passo sui risultati.'),
  ],
  finance: [tr('Finanze'), tr('Ogni movimento, una visione più chiara.')],
  tasks: [tr('Attività'), tr('Una cosa alla volta, nella direzione giusta.')],
  forecast: [tr('Previsioni'), tr('Guarda avanti, con più tranquillità.')],
  analytics: [tr('Analisi'), tr('I numeri raccontano come stai andando.')],
  settings: [
    tr('Il tuo spazio'),
    tr('Preferenze, dati e collegamento a GitHub.'),
  ],
});
const statusLabels = (): Record<Project['status'], string> => ({
  idea: tr('Idea'),
  attivo: tr('Attivo'),
  pausa: tr('In pausa'),
  completato: tr('Completato'),
  archiviato: tr('Archiviato'),
});
const priorityLabel = (priority: Task['priority']) =>
  tr(({ alta: 'Alta', media: 'Media', bassa: 'Bassa' } as const)[priority]);
const monthLabel = (date: string) =>
  new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' }).format(
    new Date(date + 'T12:00:00Z'),
  );
export function periodStart(period: Period) {
  const now = today();
  return period === 'month'
    ? now.slice(0, 7) + '-01'
    : period === '90days'
      ? shiftDate(now, -89)
      : period === 'year'
        ? now.slice(0, 4) + '-01-01'
        : '0001-01-01';
}
export function selectTransactions(
  data: Data,
  scope: FilterScope,
  period: Period,
) {
  return list(data, 'transaction')
    .filter(
      (t) =>
        (scope === 'all' || t.scope === scope) &&
        t.date >= periodStart(period) &&
        t.date <= today(),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
    );
}
function total(transactions: Transaction[], direction: 'income' | 'expense') {
  return transactions
    .filter((t) => t.direction === direction)
    .reduce((n, t) => n + t.amountCents, 0);
}
function history(data: Data, scope: FilterScope) {
  return Array.from({ length: 6 }, (_, i) => {
    const date = shiftMonth(today().slice(0, 7) + '-01', i - 5),
      end = i === 5 ? today() : shiftDate(shiftMonth(date, 1), -1);
    return { label: monthLabel(date), value: liquidity(data, scope, end) };
  });
}
export function App() {
  const { language } = useLanguage();
  const { data, toast } = useApp();
  const readPage = () => {
    const hash = location.hash.slice(1);
    return [...navigation().map((n) => n.id), 'settings'].includes(hash)
      ? (hash as Page)
      : 'overview';
  };
  const [page, setPage] = useState<Page>(readPage),
    [scope, setScope] = useState<FilterScope>('all'),
    [period, setPeriod] = useState<Period>('month');
  const [mobileMenu, setMobileMenu] = useState(false),
    [addMenu, setAddMenu] = useState(false),
    [form, setForm] = useState<FormSpec | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [importing, setImporting] = useState(false);
  const [syncIndicator, setSyncIndicator] = useState<SyncIndicator>({
    label: msg('Solo su questo dispositivo'),
    status: 'local',
  });
  const navigate = (p: Page) => {
    location.hash = p;
    setPage(p);
    setMobileMenu(false);
    setAddMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useEffect(() => {
    const listener = () => setPage(readPage());
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    document.title = `${pageInfo()[page][0]} · Punto`;
  }, [page, language]);
  const settings = data.entities.settings as Settings,
    unfinished = list(data, 'task').filter((t) => t.status !== 'done').length;
  const openForm = (spec: FormSpec) => {
    setForm(spec);
    setAddMenu(false);
  };
  const openProject = (p: Project) => setDetail(p.id);
  const project = detail ? (data.entities[detail] as Project) : null;
  const demo = Object.keys(data.entities).some(
    (k) => k.startsWith('demo-') && !data.entities[k].deletedAt,
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {tr('Vai al contenuto')}
      </a>
      {mobileMenu && (
        <div className="sidebar-shade" onClick={() => setMobileMenu(false)} />
      )}
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <a
          className="brand"
          href="#overview"
          onClick={() => navigate('overview')}
          aria-label={tr('Punto, panoramica')}
        >
          <span className="brand-mark">
            p<span>•</span>
          </span>
          <span>
            punto<span className="brand-dot">.</span>
          </span>
        </a>
        <button
          className="icon-button mobile-close"
          aria-label={tr('Chiudi menu')}
          onClick={() => setMobileMenu(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">{tr('IL TUO SPAZIO')}</div>
        <nav aria-label={tr('Navigazione principale')}>
          {navigation().map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {id === 'tasks' && unfinished > 0 && (
                <span className="nav-count">{numberLabel(unfinished)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <DailyQuote />
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={19} />
            <span>{tr('Impostazioni')}</span>
          </button>
          <button className="profile" onClick={() => navigate('settings')}>
            <span className="avatar">
              {settings.name
                ? settings.name.slice(0, 2).toUpperCase()
                : tr('TU')}
            </span>
            <span>
              <strong>{settings.name || tr('Il tuo profilo')}</strong>
              <small>{tr('Il tuo spazio personale')}</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-toggle"
              aria-label={tr('Apri menu')}
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              {tr('Il mio spazio')} <ChevronRight size={13} />
              <strong>{pageInfo()[page][0]}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <button
              className={`sync-indicator ${syncIndicator.status}`}
              onClick={() => navigate('settings')}
              title={tr('Apri le impostazioni di sincronizzazione')}
            >
              <i />
              {messageText(syncIndicator.label)}
            </button>
            <span className="topbar-date">
              {new Intl.DateTimeFormat(locale(), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Europe/Rome',
              }).format(new Date())}
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {page === 'overview'
                  ? tr('IL QUADRO D’INSIEME')
                  : tr('IL TUO SPAZIO, OGNI GIORNO')}
              </p>
              <h1>
                {pageInfo()[page][0]}
                <span className="heading-dot">.</span>
              </h1>
              <p>{pageInfo()[page][1]}</p>
            </div>
            <div className="new-control">
              <button
                className="button primary"
                aria-expanded={addMenu}
                onClick={() => setAddMenu(!addMenu)}
              >
                <Plus size={18} />
                {tr('Aggiungi')}
                <ChevronDown size={15} />
              </button>
              {addMenu && (
                <>
                  <div
                    className="dropdown-dismiss"
                    onClick={() => setAddMenu(false)}
                  />
                  <div
                    className="dropdown"
                    role="group"
                    aria-label={tr('Aggiungi elemento')}
                  >
                    {[
                      {
                        kind: 'transaction',
                        label: tr('Movimento'),
                        icon: Wallet,
                      },
                      {
                        kind: 'project',
                        label: tr('Progetto'),
                        icon: FolderKanban,
                      },
                      {
                        kind: 'task',
                        label: tr('Attività'),
                        icon: CheckSquare2,
                      },
                      {
                        kind: 'forecast',
                        label: tr('Previsione'),
                        icon: TrendingUp,
                      },
                      { kind: 'account', label: tr('Conto'), icon: HardDrive },
                    ].map(({ kind, label, icon: Icon }) => (
                      <button
                        key={kind}
                        onClick={() =>
                          openForm({ kind: kind as FormSpec['kind'] })
                        }
                      >
                        <Icon size={17} />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {demo && (
            <div className="demo-banner">
              <span>
                <span className="tiny-dot" />
                {tr('Stai esplorando dati dimostrativi.')}
              </span>
              <button
                className="text-button"
                onClick={() => navigate('settings')}
              >
                {tr('Gestisci i dati')} <ArrowRight size={14} />
              </button>
            </div>
          )}
          {page !== 'settings' && (
            <div className="filter-bar">
              <div className="scope-switch" aria-label={tr('Ambito')}>
                {(
                  [
                    ['all', tr('Tutto')],
                    ['lavoro', tr('Lavoro')],
                    ['personale', tr('Personale')],
                  ] as const
                ).map(([s, label]) => (
                  <button
                    key={s}
                    aria-pressed={s === scope}
                    className={s === scope ? 'selected' : ''}
                    onClick={() => setScope(s)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {page !== 'forecast' &&
              page !== 'tasks' &&
              page !== 'projects' ? (
                <label className="period-select">
                  <CalendarDays size={16} />
                  <select
                    aria-label={tr('Periodo')}
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                  >
                    <option value="month">{tr('Questo mese')}</option>
                    <option value="90days">{tr('Ultimi 90 giorni')}</option>
                    <option value="year">{tr('Quest’anno')}</option>
                    <option value="all">{tr('Tutto il periodo')}</option>
                  </select>
                </label>
              ) : (
                <span className="filter-caption">
                  {page === 'forecast'
                    ? tr('Orizzonte: prossimi 6 mesi')
                    : scope === 'all'
                      ? tr('Una visione completa')
                      : scope === 'lavoro'
                        ? tr('Il tuo ambito lavorativo')
                        : tr('La tua vita personale')}
                </span>
              )}
            </div>
          )}
          {page === 'overview' && (
            <Overview
              scope={scope}
              period={period}
              navigate={navigate}
              openForm={openForm}
              openProject={openProject}
            />
          )}
          {page === 'projects' && (
            <Projects
              scope={scope}
              openForm={openForm}
              openProject={openProject}
            />
          )}
          {page === 'finance' && (
            <Finance
              scope={scope}
              period={period}
              openForm={openForm}
              onImport={() => setImporting(true)}
            />
          )}
          {page === 'tasks' && <Tasks scope={scope} openForm={openForm} />}
          {page === 'forecast' && (
            <Forecasts scope={scope} openForm={openForm} />
          )}
          {page === 'analytics' && (
            <Analytics
              scope={scope}
              period={period}
              openProject={openProject}
            />
          )}
          <SettingsPage
            visible={page === 'settings'}
            onIndicator={setSyncIndicator}
            onForm={openForm}
          />
          <footer className="page-footer">
            <span>
              <span className="footer-dot" />
              {tr('Un po’ più di chiarezza, ogni giorno.')}
            </span>
            <span>{tr('Fatto per te · EUR · Europe/Rome')}</span>
          </footer>
        </main>
      </div>
      {project && !project.deletedAt && (
        <ProjectDetail
          project={project}
          onClose={() => setDetail(null)}
          openForm={openForm}
        />
      )}
      {form && (
        <EntityForm
          key={form.entity?.id ?? JSON.stringify(form)}
          spec={form}
          onClose={() => setForm(null)}
        />
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </div>
  );
}
function Metric({
  label,
  value,
  hint,
  icon,
  accent = false,
  footer,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div
      className={`metric ${accent ? 'accent' : ''}`}
      role="region"
      aria-label={label}
    >
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-bottom">
        {footer || <span className="metric-hint">{hint}</span>}
      </div>
    </div>
  );
}
function Stats({ scope, period }: { scope: FilterScope; period: Period }) {
  const { data } = useApp();
  const transactions = selectTransactions(data, scope, period),
    income = total(transactions, 'income'),
    expense = total(transactions, 'expense');
  return (
    <div className="metrics-grid">
      <Metric
        label={tr('Disponibilità attuale')}
        value={euro(liquidity(data, scope))}
        hint={tr('Saldo complessivo dei tuoi conti')}
        icon={<Wallet size={19} />}
        accent
      />
      <Metric
        label={tr('Entrate del periodo')}
        value={euro(income)}
        hint={tr('{count} movimenti registrati', {
          count: transactions.filter((t) => t.direction === 'income').length,
        })}
        icon={<ArrowDownLeft size={19} />}
      />
      <Metric
        label={tr('Uscite del periodo')}
        value={euro(expense)}
        hint={tr('{count} movimenti registrati', {
          count: transactions.filter((t) => t.direction === 'expense').length,
        })}
        icon={<ArrowUpRight size={19} />}
      />
      <Metric
        label={tr('Saldo del periodo')}
        value={(income > expense ? '+' : '') + euro(income - expense)}
        hint={tr('Entrate meno uscite')}
        icon={<ArrowLeftRight size={19} />}
        footer={
          <span
            className={`balance-hint ${income - expense < 0 ? 'negative' : ''}`}
          >
            <span className="tiny-dot" />
            {income - expense >= 0
              ? tr('Stai mantenendo l’equilibrio')
              : tr('Uscite superiori alle entrate')}
          </span>
        }
      />
    </div>
  );
}
function Overview({
  scope,
  period,
  navigate,
  openForm,
  openProject,
}: {
  scope: FilterScope;
  period: Period;
  navigate: (p: Page) => void;
  openForm: (s: FormSpec) => void;
  openProject: (p: Project) => void;
}) {
  const { data } = useApp(),
    transactions = selectTransactions(data, scope, period),
    projects = list(data, 'project').filter(
      (p) => p.status === 'attivo' && (scope === 'all' || p.scope === scope),
    ),
    tasks = list(data, 'task')
      .filter(
        (t) =>
          t.status !== 'done' &&
          t.due &&
          (scope === 'all' || t.scope === scope),
      )
      .sort((a, b) => a.due.localeCompare(b.due));
  const prediction = forecastSeries(data, scope),
    hasData = list(data, 'account').length > 0;
  return (
    <>
      <Stats scope={scope} period={period} />
      {!hasData && (
        <div className="welcome-strip">
          <div>
            <span className="eyebrow">{tr('SI PARTE DA QUI')}</span>
            <h3>{tr('Il primo passo è conoscere il punto di partenza.')}</h3>
            <p>
              {tr(
                'Aggiungi il tuo primo conto, oppure esplora l’app con i dati dimostrativi dalle impostazioni.',
              )}
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => openForm({ kind: 'account' })}
          >
            <Plus size={16} />
            {tr('Aggiungi un conto')}
          </button>
        </div>
      )}
      <div className="overview-chart-grid">
        <section className="panel liquidity-panel">
          <SectionHeading
            title={tr('La tua liquidità')}
            description={tr('Il saldo dei tuoi conti negli ultimi sei mesi')}
            action={tr('Esplora le analisi')}
            onAction={() => navigate('analytics')}
          />
          <div className="chart-legend">
            <span>
              <i />
              {tr('Saldo effettivo')}
            </span>
            <span className="chart-period">{tr('Ultimi 6 mesi')}</span>
          </div>
          <LineChart points={history(data, scope)} />
        </section>
        <section className="forecast-teaser">
          <span className="forecast-icon">
            <TrendingUp size={23} strokeWidth={1.5} />
          </span>
          <p className="eyebrow">{tr('UNO SGUARDO AVANTI')}</p>
          <h2>
            {tr('Il futuro,')} <br />
            {tr('un po’ più chiaro.')}
          </h2>
          <p>
            {tr('La tua disponibilità stimata')} <br />
            {tr('tra sei mesi')}
          </p>
          <strong>{euro(prediction[5].value)}</strong>
          <span className="forecast-teaser-hint">
            {tr('In base ai movimenti previsti')}
          </span>
          <button className="text-button" onClick={() => navigate('forecast')}>
            {tr('Vai alle previsioni')}
            <ArrowRight size={17} />
          </button>
          <div className="teaser-decoration" aria-hidden="true">
            <svg viewBox="0 0 260 80">
              <path
                d="M0 77L35 68L65 72L100 45L130 52L165 28L200 35L260 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            </svg>
          </div>
        </section>
      </div>
      <div className="overview-middle">
        <section className="panel">
          <SectionHeading
            title={tr('Progetti in movimento')}
            description={tr('{count} progetti attivi, un passo alla volta', {
              count: projects.length,
            })}
            action={tr('Tutti i progetti')}
            onAction={() => navigate('projects')}
          />
          {projects.length ? (
            <div className="project-rows">
              {projects.slice(0, 3).map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  onClick={() => openProject(p)}
                />
              ))}
            </div>
          ) : (
            <Empty
              title={tr('Spazio alle tue idee')}
              description={tr(
                'Raccogli attività, costi e ricavi in un progetto.',
              )}
              action={tr('Crea un progetto')}
              onAction={() => openForm({ kind: 'project' })}
            />
          )}
        </section>
        <section className="panel">
          <SectionHeading
            title={tr('Le prossime cose da fare')}
            description={tr('Un po’ di ordine nelle tue giornate')}
            action={tr('Tutte le attività')}
            onAction={() => navigate('tasks')}
          />
          {tasks.length ? (
            <div className="upcoming-tasks">
              {tasks.slice(0, 4).map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onEdit={() => openForm({ kind: 'task', entity: t })}
                  compact
                />
              ))}
            </div>
          ) : (
            <Empty
              title={tr('Hai spazio per concentrarti')}
              description={tr(
                'Nessuna attività in scadenza. Aggiungine una quando vuoi.',
              )}
              action={tr('Aggiungi attività')}
              onAction={() => openForm({ kind: 'task' })}
            />
          )}
        </section>
      </div>
      <section className="panel recent-panel">
        <SectionHeading
          title={tr('Ultimi movimenti')}
          description={tr('Le tue entrate e uscite, in ordine')}
          action={tr('Tutti i movimenti')}
          onAction={() => navigate('finance')}
        />
        <TransactionTable
          transactions={transactions}
          data={data}
          onEdit={(t) => openForm({ kind: 'transaction', entity: t })}
          limit={5}
        />
      </section>
    </>
  );
}
function ProjectRow({
  project: p,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  const { data } = useApp(),
    tasks = list(data, 'task').filter((t) => t.projectId === p.id),
    complete = tasks.filter((t) => t.status === 'done').length,
    progress = tasks.length ? (complete / tasks.length) * 100 : 0;
  return (
    <button className="project-row" onClick={onClick}>
      <ProjectIcon color={p.color} />
      <div className="project-row-main">
        <div>
          <strong>{p.name}</strong>
          <span className="badge green">{statusLabels()[p.status]}</span>
        </div>
        <div className="progress-line">
          <span style={{ width: `${progress}%`, background: p.color }} />
        </div>
        <small>
          {tr('{done} di {total} attività completate', {
            done: complete,
            total: tasks.length,
          })}
        </small>
      </div>
      <div className="project-row-result">
        <strong>{euro(projectResult(data, p.id))}</strong>
        <small>{tr('risultato registrato')}</small>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}
function Projects({
  scope,
  openForm,
  openProject,
}: {
  scope: FilterScope;
  openForm: (s: FormSpec) => void;
  openProject: (p: Project) => void;
}) {
  const { data } = useApp();
  const [filter, setFilter] = useState('all'),
    [search, setSearch] = useState('');
  const projects = list(data, 'project').filter(
    (p) =>
      (scope === 'all' || p.scope === scope) &&
      (filter === 'all' ? p.status !== 'archiviato' : p.status === filter) &&
      p.name
        .toLocaleLowerCase(locale())
        .includes(search.toLocaleLowerCase(locale())),
  );
  return (
    <>
      <div className="list-toolbar">
        <div className="tabs small-tabs">
          {[
            ['all', tr('Tutti')],
            ['attivo', tr('Attivi')],
            ['completato', tr('Completati')],
            ['archiviato', tr('Archiviati')],
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? 'selected' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={tr('Cerca un progetto…')}
        />
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => {
            const tasks = list(data, 'task').filter(
                (t) => t.projectId === p.id,
              ),
              done = tasks.filter((t) => t.status === 'done').length,
              result = projectResult(data, p.id);
            return (
              <article className="project-card" key={p.id}>
                <div className="project-card-top">
                  <ProjectIcon color={p.color} />
                  <span
                    className={`badge ${p.status === 'attivo' ? 'green' : ''}`}
                  >
                    {statusLabels()[p.status]}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={tr('Modifica {name}', { name: p.name })}
                    onClick={() => openForm({ kind: 'project', entity: p })}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <button
                  className="project-card-title"
                  onClick={() => openProject(p)}
                >
                  <h2>{p.name}</h2>
                  <p>
                    {p.description ||
                      tr('Il tuo prossimo passo prende forma qui.')}
                  </p>
                </button>
                <div className="project-finance">
                  <span>
                    {tr('Risultato registrato')}
                    <strong>{euro(result)}</strong>
                  </span>
                  <span>
                    {tr('Obiettivo')}
                    <strong>{p.targetCents ? euro(p.targetCents) : '—'}</strong>
                  </span>
                </div>
                <div className="progress-line">
                  <span
                    style={{
                      width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                      background: p.color,
                    }}
                  />
                </div>
                <div className="project-card-bottom">
                  <span>
                    <CheckSquare2 size={14} />
                    {tr('{done}/{total} attività', {
                      done,
                      total: tasks.length,
                    })}
                  </span>
                  <span>
                    <CalendarDays size={14} />
                    {p.endDate ? dateLabel(p.endDate) : tr('Senza scadenza')}
                  </span>
                </div>
              </article>
            );
          })}
          <button
            className="new-project-card"
            onClick={() => openForm({ kind: 'project' })}
          >
            <span>
              <Plus size={25} />
            </span>
            <strong>{tr('Una nuova idea?')}</strong>
            <p>{tr('Crea il tuo prossimo progetto')}</p>
          </button>
        </div>
      ) : (
        <section className="panel">
          <Empty
            title={tr('Il prossimo progetto inizia qui')}
            description={tr(
              'Dai un nome a un’idea e trasformala in passi concreti.',
            )}
            action={tr('Crea progetto')}
            onAction={() => openForm({ kind: 'project' })}
          />
        </section>
      )}
    </>
  );
}
function ProjectDetail({
  project,
  onClose,
  openForm,
}: {
  project: Project;
  onClose: () => void;
  openForm: (s: FormSpec) => void;
}) {
  const { data } = useApp(),
    tasks = list(data, 'task').filter((t) => t.projectId === project.id),
    transactions = list(data, 'transaction')
      .filter((t) => t.projectId === project.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Dialog title={project.name} onClose={onClose} wide>
      <div className="project-detail">
        <div className="detail-intro">
          <span className="badge green">{statusLabels()[project.status]}</span>
          <span>
            {project.scope === 'lavoro' ? tr('Lavoro') : tr('Personale')} ·{' '}
            {dateLabel(project.startDate)}
            {project.endDate && ` → ${dateLabel(project.endDate)}`}
          </span>
          <button
            className="button secondary"
            onClick={() => openForm({ kind: 'project', entity: project })}
          >
            <Pencil size={15} />
            {tr('Modifica')}
          </button>
        </div>
        <p>{project.description}</p>
        <div className="detail-metrics">
          <div>
            <small>{tr('Incassi registrati')}</small>
            <strong>{euro(total(transactions, 'income'))}</strong>
          </div>
          <div>
            <small>{tr('Spese registrate')}</small>
            <strong>{euro(total(transactions, 'expense'))}</strong>
          </div>
          <div>
            <small>{tr('Risultato registrato')}</small>
            <strong>{euro(projectResult(data, project.id))}</strong>
          </div>
          <div>
            <small>{tr('Obiettivo economico')}</small>
            <strong>{euro(project.targetCents)}</strong>
          </div>
        </div>
        <p className="form-hint">
          {tr(
            'Il risultato è la differenza tra incassi e spese registrati. Non è un calcolo fiscale.',
          )}
        </p>
        {project.notes && (
          <div className="notes-block">
            <h3>{tr('Note')}</h3>
            <p>{project.notes}</p>
          </div>
        )}
        <SectionHeading
          title={tr('Attività del progetto')}
          action={tr('Aggiungi attività')}
          onAction={() =>
            openForm({
              kind: 'task',
              defaults: { projectId: project.id, scope: project.scope },
            })
          }
        />
        {tasks.length ? (
          tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onEdit={() => openForm({ kind: 'task', entity: t })}
            />
          ))
        ) : (
          <p className="muted">{tr('Non hai ancora aggiunto attività.')}</p>
        )}
        <SectionHeading
          title={tr('Movimenti collegati')}
          action={tr('Aggiungi movimento')}
          onAction={() =>
            openForm({
              kind: 'transaction',
              defaults: {
                projectId: project.id,
                scope: project.scope,
                accountId: list(data, 'account').find(
                  (a) => a.scope === project.scope,
                )?.id,
              },
            })
          }
        />
        <TransactionTable
          transactions={transactions}
          data={data}
          onEdit={(t) => openForm({ kind: 'transaction', entity: t })}
        />
      </div>
    </Dialog>
  );
}
function Finance({
  scope,
  period,
  openForm,
  onImport,
}: {
  scope: FilterScope;
  period: Period;
  openForm: (s: FormSpec) => void;
  onImport: () => void;
}) {
  const { data } = useApp();
  const [filter, setFilter] = useState('all'),
    [search, setSearch] = useState(''),
    [accountFilter, setAccountFilter] = useState('all');
  const transactions = selectTransactions(data, scope, period).filter(
      (t) =>
        (filter === 'all' || t.direction === filter) &&
        (accountFilter === 'all' ||
          t.accountId === accountFilter ||
          t.toAccountId === accountFilter) &&
        t.name
          .toLocaleLowerCase(locale())
          .includes(search.toLocaleLowerCase(locale())),
    ),
    accounts = list(data, 'account').filter(
      (a) => scope === 'all' || a.scope === scope,
    );
  return (
    <>
      <div className="accounts-grid">
        {accounts.map((a) => (
          <button
            className="account-card"
            onClick={() => openForm({ kind: 'account', entity: a })}
            key={a.id}
          >
            <div>
              <span className="account-icon">
                <Wallet size={20} />
              </span>
              <span>
                {a.name}
                <small>
                  {a.scope === 'lavoro' ? tr('Lavoro') : tr('Personale')}
                </small>
              </span>
              <MoreHorizontal size={18} />
            </div>
            <strong>{euro(accountBalance(data, a.id))}</strong>
            <small>
              {tr('Saldo iniziale')} {euro(a.openingCents)} ·{' '}
              {dateLabel(a.openingDate)}
            </small>
          </button>
        ))}
        <button
          className="add-account"
          onClick={() => openForm({ kind: 'account' })}
        >
          <Plus size={20} />
          {tr('Aggiungi un conto')}
        </button>
      </div>
      <section className="panel">
        <SectionHeading
          title={tr('I tuoi movimenti')}
          description={tr(
            'Gli importi dei trasferimenti non entrano nei ricavi e nei costi.',
          )}
        />
        <div className="finance-actions">
          <div className="tabs small-tabs">
            {[
              ['all', tr('Tutti')],
              ['income', tr('Entrate')],
              ['expense', tr('Uscite')],
              ['transfer', tr('Trasferimenti')],
            ].map(([id, label]) => (
              <button
                key={id}
                className={id === filter ? 'selected' : ''}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <button className="button secondary" onClick={onImport}>
              <Download size={15} />
              {tr('Importa CSV')}
            </button>
            <button
              className="button primary"
              onClick={() => openForm({ kind: 'transaction' })}
            >
              <Plus size={16} />
              {tr('Movimento')}
            </button>
          </div>
        </div>
        <div className="table-filters">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={tr('Cerca un movimento…')}
          />
          <select
            aria-label={tr('Filtra per conto')}
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">{tr('Tutti i conti')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <span>{tr('{count} movimenti', { count: transactions.length })}</span>
        </div>
        <TransactionTable
          transactions={transactions}
          data={data}
          onEdit={(t) => openForm({ kind: 'transaction', entity: t })}
        />
      </section>
    </>
  );
}
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="icon-button"
          aria-label={tr('Svuota ricerca')}
          onClick={() => onChange('')}
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}
function TaskRow({
  task: t,
  onEdit,
  compact = false,
}: {
  task: Task;
  onEdit: () => void;
  compact?: boolean;
}) {
  const { data, save, toast } = useApp();
  const late = t.due && t.due < today() && t.status !== 'done';
  return (
    <div className={`task-row ${t.status === 'done' ? 'done' : ''}`}>
      <button
        className={`task-check ${t.status === 'done' ? 'checked' : ''}`}
        aria-label={tr(
          t.status === 'done' ? 'Riapri {name}' : 'Completa {name}',
          { name: t.name },
        )}
        onClick={() =>
          save({ ...t, status: t.status === 'done' ? 'todo' : 'done' }).catch(
            (e) => toast(toMessage(e)),
          )
        }
      >
        {t.status === 'done' && <Check size={13} />}
      </button>
      <button className="task-main" onClick={onEdit}>
        <strong>{t.name}</strong>
        <small>
          {entityName(data, t.projectId) || tr('Attività generale')}
          {t.subtasks.length > 0 &&
            tr(' · {done}/{total} passi', {
              done: t.subtasks.filter((s) => s.done).length,
              total: t.subtasks.length,
            })}
        </small>
      </button>
      {!compact && (
        <select
          className="task-status-select"
          aria-label={tr('Stato di {name}', { name: t.name })}
          value={t.status}
          onChange={(e) =>
            save({ ...t, status: e.target.value as Task['status'] }).catch(
              (e) => toast(toMessage(e)),
            )
          }
        >
          <option value="todo">{tr('Da fare')}</option>
          <option value="doing">{tr('In corso')}</option>
          <option value="done">{tr('Fatto')}</option>
        </select>
      )}
      <div className="task-meta">
        <span
          className={`priority-dot ${t.priority}`}
          title={tr('Priorità {priority}', {
            priority: priorityLabel(t.priority),
          })}
        />
        <span className={`task-date ${late ? 'late' : ''}`}>
          {t.due === today()
            ? tr('Oggi')
            : t.due === shiftDate(today(), 1)
              ? tr('Domani')
              : dateLabel(t.due)}
        </span>
      </div>
    </div>
  );
}
function Tasks({
  scope,
  openForm,
}: {
  scope: FilterScope;
  openForm: (s: FormSpec) => void;
}) {
  const { data, save, toast } = useApp();
  const [view, setView] = useState('list'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('open');
  const tasks = list(data, 'task')
    .filter(
      (t) =>
        (scope === 'all' || t.scope === scope) &&
        (filter === 'all' || filter === 'done'
          ? filter === 'all' || t.status === 'done'
          : t.status !== 'done') &&
        t.name
          .toLocaleLowerCase(locale())
          .includes(search.toLocaleLowerCase(locale())),
    )
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const changeStatus = (id: string, status: Task['status']) => {
    const t = data.entities[id];
    if (t?.type === 'task')
      save({ ...t, status }).catch((e) => toast(toMessage(e)));
  };
  return (
    <>
      <div className="list-toolbar">
        <div className="tabs small-tabs">
          {[
            ['open', tr('Da completare')],
            ['done', tr('Completate')],
            ['all', tr('Tutte')],
          ].map(([id, label]) => (
            <button
              key={id}
              className={id === filter ? 'selected' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={tr('Cerca un’attività…')}
          />
          <div className="view-switch">
            <button
              aria-label={tr('Vista lista')}
              aria-pressed={view === 'list'}
              className={view === 'list' ? 'selected' : ''}
              onClick={() => setView('list')}
            >
              <List size={18} />
            </button>
            <button
              aria-label={tr('Vista bacheca')}
              aria-pressed={view === 'board'}
              className={view === 'board' ? 'selected' : ''}
              onClick={() => setView('board')}
            >
              <Columns3 size={18} />
            </button>
          </div>
        </div>
      </div>
      {view === 'list' ? (
        <section className="panel">
          <SectionHeading
            title={tr('{count} attività', { count: tasks.length })}
            action={tr('Aggiungi attività')}
            onAction={() => openForm({ kind: 'task' })}
          />
          {tasks.length ? (
            tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onEdit={() => openForm({ kind: 'task', entity: t })}
              />
            ))
          ) : (
            <Empty
              title={tr('Un po’ di spazio libero')}
              description={tr('Non ci sono attività in questa vista.')}
              action={tr('Aggiungi attività')}
              onAction={() => openForm({ kind: 'task' })}
            />
          )}
        </section>
      ) : (
        <div className="kanban">
          {(
            [
              ['todo', tr('Da fare')],
              ['doing', tr('In corso')],
              ['done', tr('Fatto')],
            ] as const
          ).map(([status, label]) => (
            <section
              className={`kanban-column ${status}`}
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                changeStatus(e.dataTransfer.getData('text/plain'), status);
              }}
            >
              <div className="kanban-heading">
                <span className="tiny-dot" />
                <h2>{label}</h2>
                <span>
                  {numberLabel(tasks.filter((t) => t.status === status).length)}
                </span>
                <button
                  className="icon-button"
                  aria-label={tr('Aggiungi in {status}', { status: label })}
                  onClick={() =>
                    openForm({ kind: 'task', defaults: { status } })
                  }
                >
                  <Plus size={17} />
                </button>
              </div>
              {tasks
                .filter((t) => t.status === status)
                .map((t) => (
                  <article
                    className="kanban-card"
                    key={t.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData('text/plain', t.id)
                    }
                  >
                    <div>
                      <span className={`badge priority-${t.priority}`}>
                        {priorityLabel(t.priority)}
                      </span>
                      <button
                        className="icon-button"
                        aria-label={tr('Modifica {name}', { name: t.name })}
                        onClick={() => openForm({ kind: 'task', entity: t })}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                    <button
                      className="kanban-title"
                      onClick={() => openForm({ kind: 'task', entity: t })}
                    >
                      {t.name}
                    </button>
                    <small>
                      {entityName(data, t.projectId) || tr('Attività generale')}
                    </small>
                    {t.subtasks.map((s) => (
                      <label className="subtask" key={s.id}>
                        <input
                          type="checkbox"
                          checked={s.done}
                          onChange={() =>
                            save({
                              ...t,
                              subtasks: t.subtasks.map((sub) =>
                                sub.id === s.id
                                  ? { ...sub, done: !sub.done }
                                  : sub,
                              ),
                            }).catch((e) => toast(toMessage(e)))
                          }
                        />
                        {s.name}
                      </label>
                    ))}
                    <div className="kanban-footer">
                      <span
                        className={
                          t.due && t.due < today() && t.status !== 'done'
                            ? 'late'
                            : ''
                        }
                      >
                        <CalendarDays size={13} />
                        {dateLabel(t.due)}
                      </span>
                      <select
                        aria-label={tr('Stato di {name}', { name: t.name })}
                        value={t.status}
                        onChange={(e) =>
                          changeStatus(t.id, e.target.value as Task['status'])
                        }
                      >
                        <option value="todo">{tr('Da fare')}</option>
                        <option value="doing">{tr('In corso')}</option>
                        <option value="done">{tr('Fatto')}</option>
                      </select>
                    </div>
                  </article>
                ))}
              <button
                className="kanban-add"
                onClick={() => openForm({ kind: 'task', defaults: { status } })}
              >
                <Plus size={16} />
                {tr('Aggiungi attività')}
              </button>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
function Forecasts({
  scope,
  openForm,
}: {
  scope: FilterScope;
  openForm: (s: FormSpec) => void;
}) {
  const { data } = useApp();
  const [scenarioId, setScenarioId] = useState(''),
    [adjustment, setAdjustment] = useState<Occurrence | null>(null);
  const scenarios = list(data, 'scenario'),
    scenario = scenarios.find((s) => s.id === scenarioId),
    base = forecastSeries(data, scope),
    series = forecastSeries(data, scope, scenario),
    now = today(),
    end = shiftDate(shiftMonth(now.slice(0, 7) + '-01', 6), -1);
  const forecasts = list(data, 'forecast'),
    earliest = forecasts.map((f) => f.date).sort()[0] ?? now;
  const upcoming = occurrences(data, earliest, end, scenario).filter(
      (o) => scope === 'all' || o.forecast.scope === scope,
    ),
    overdue = upcoming.filter((o) => o.date < now);
  return (
    <>
      <div className="forecast-toolbar">
        <label className="scenario-picker">
          <SlidersHorizontal size={17} />
          <select
            aria-label={tr('Scenario')}
            value={scenario?.id ?? ''}
            onChange={(e) => setScenarioId(e.target.value)}
          >
            <option value="">{tr('Scenario di base')}</option>
            {scenarios.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="toolbar-actions">
          {scenario && (
            <button
              className="button secondary"
              onClick={() => openForm({ kind: 'scenario', entity: scenario })}
            >
              <Pencil size={15} />
              {tr('Modifica nome')}
            </button>
          )}
          <button
            className="button secondary"
            onClick={() => openForm({ kind: 'scenario' })}
          >
            <Plus size={15} />
            {tr('Crea scenario')}
          </button>
          <button
            className="button primary"
            onClick={() => openForm({ kind: 'forecast' })}
          >
            <Plus size={16} />
            {tr('Previsione')}
          </button>
        </div>
      </div>
      <div className="forecast-summary">
        <div>
          <span className="eyebrow">
            {tr('DISPONIBILITÀ STIMATA A SEI MESI')}
          </span>
          <strong>{euro(series[5].value)}</strong>
          <p>
            {scenario
              ? tr(
                  'Scenario «{name}». Le modifiche non toccano i dati reali.',
                  { name: scenario.name },
                )
              : tr(
                  'Saldo attuale più entrate e uscite future non ancora registrate.',
                )}
          </p>
        </div>
        <div>
          <span>{tr('Variazione prevista')}</span>
          <strong
            className={
              series[5].value - liquidity(data, scope) < 0
                ? 'negative'
                : 'positive'
            }
          >
            {series[5].value - liquidity(data, scope) > 0 ? '+' : ''}
            {euro(series[5].value - liquidity(data, scope))}
          </strong>
        </div>
      </div>
      <section className="panel">
        <SectionHeading
          title={tr('La strada davanti a te')}
          description={tr(
            'Le previsioni sono stime basate sui movimenti pianificati.',
          )}
        />
        <div className="chart-legend">
          <span>
            <i />
            {scenario?.name ?? tr('Scenario di base')}
          </span>
          {scenario && (
            <span>
              <i className="gray" />
              {tr('Scenario di base')}
            </span>
          )}
        </div>
        <LineChart
          points={series.map((p, i) => ({
            ...p,
            secondary: scenario ? base[i].value : undefined,
          }))}
          forecast
          height={250}
        />
        <div className="table-scroll">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>{tr('Mese')}</th>
                {series.map((p) => (
                  <th className="number" key={p.label}>
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{tr('Entrate previste')}</td>
                {series.map((p) => (
                  <td className="number positive" key={p.label}>
                    {euro(p.income)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>{tr('Uscite previste')}</td>
                {series.map((p) => (
                  <td className="number" key={p.label}>
                    {euro(p.expense)}
                  </td>
                ))}
              </tr>
              <tr>
                <th>{tr('Saldo stimato')}</th>
                {series.map((p) => (
                  <th
                    className={`number ${p.value < 0 ? 'negative' : ''}`}
                    key={p.label}
                  >
                    {euro(p.value)}
                  </th>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {overdue.length > 0 && (
        <div className="notice amber">
          <CalendarDays size={18} />
          <span>
            {tr(
              '{count} previsioni sono scadute. Registrale o spostale per aggiornarle; sono escluse dal saldo futuro.',
              { count: overdue.length },
            )}
          </span>
        </div>
      )}
      <section className="panel">
        <SectionHeading
          title={tr('Movimenti pianificati')}
          description={
            scenario
              ? tr(
                  'Seleziona un movimento per cambiare data, importo o escluderlo da questo scenario.',
                )
              : tr(
                  'Registra un movimento effettivo per toglierlo automaticamente dalla previsione.',
                )
          }
        />
        {upcoming.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tr('Movimento')}</th>
                  <th>{tr('Data prevista')}</th>
                  <th>{tr('Ripetizione')}</th>
                  <th className="number">{tr('Importo')}</th>
                  <th>{tr('Azioni')}</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.slice(0, 150).map((o) => (
                  <tr key={o.key}>
                    <td>
                      <button
                        className="transaction-title"
                        onClick={() =>
                          scenario
                            ? setAdjustment(o)
                            : openForm({ kind: 'forecast', entity: o.forecast })
                        }
                      >
                        <span
                          className={`transaction-icon ${o.forecast.direction}`}
                        >
                          {o.forecast.direction === 'income' ? (
                            <ArrowDownLeft size={18} />
                          ) : (
                            <ArrowUpRight size={18} />
                          )}
                        </span>
                        <span>
                          <strong>{o.forecast.name}</strong>
                          <small>
                            {entityName(data, o.forecast.accountId)}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td className={o.date < now ? 'late' : ''}>
                      {dateLabel(o.date)}
                    </td>
                    <td className="muted">
                      {
                        {
                          none: tr('Una volta'),
                          weekly: tr('Settimanale'),
                          monthly: tr('Mensile'),
                          yearly: tr('Annuale'),
                        }[o.forecast.recurrence]
                      }
                    </td>
                    <td
                      className={`number amount ${o.forecast.direction === 'income' ? 'positive' : ''}`}
                    >
                      {o.forecast.direction === 'income' ? '+' : '−'}
                      {euro(o.amountCents)}
                    </td>
                    <td>
                      {scenario ? (
                        <button
                          className="button small secondary"
                          onClick={() => setAdjustment(o)}
                        >
                          {tr('Varia')}
                        </button>
                      ) : (
                        <button
                          className="button small secondary"
                          onClick={() =>
                            openForm({
                              kind: 'transaction',
                              defaults: {
                                name: o.forecast.name,
                                direction: o.forecast.direction,
                                amountCents: o.amountCents,
                                date: today(),
                                accountId: o.forecast.accountId,
                                categoryId: o.forecast.categoryId,
                                projectId: o.forecast.projectId,
                                scope: o.forecast.scope,
                                forecastKey: o.key,
                              },
                            })
                          }
                        >
                          {tr('Registra')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upcoming.length > 150 && (
              <p className="form-hint">
                {tr(
                  'Mostrate le prime 150 occorrenze. Le altre sono incluse nei calcoli.',
                )}
              </p>
            )}
          </div>
        ) : (
          <Empty
            title={tr('Disegna i prossimi mesi')}
            description={tr(
              'Aggiungi entrate e spese attese, anche ricorrenti.',
            )}
            action={tr('Aggiungi previsione')}
            onAction={() => openForm({ kind: 'forecast' })}
          />
        )}
      </section>
      {forecasts.length > 0 && (
        <section className="panel">
          <SectionHeading
            title={tr('Regole delle previsioni')}
            description={tr(
              'Gestisci anche le ricorrenze terminate o già registrate.',
            )}
          />
          <div className="rules-list">
            {forecasts
              .filter((f) => scope === 'all' || f.scope === scope)
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => openForm({ kind: 'forecast', entity: f })}
                >
                  <TrendingUp size={17} />
                  <span>
                    {f.name}
                    <small>
                      {tr('Dal {date}', { date: dateLabel(f.date) })}
                      {f.endDate &&
                        tr(' al {date}', { date: dateLabel(f.endDate) })}
                    </small>
                  </span>
                  <strong>{euro(f.amountCents)}</strong>
                  <Pencil size={15} />
                </button>
              ))}
          </div>
        </section>
      )}
      {scenario && Object.keys(scenario.adjustments).length > 0 && (
        <ScenarioChanges scenario={scenario} />
      )}
      {adjustment && scenario && (
        <AdjustmentForm
          occurrence={adjustment}
          scenario={scenario}
          onClose={() => setAdjustment(null)}
        />
      )}
    </>
  );
}
function ScenarioChanges({ scenario }: { scenario: Scenario }) {
  const { save, toast, data } = useApp();
  return (
    <section className="panel">
      <SectionHeading
        title={tr('Variazioni dello scenario')}
        description={tr(
          'Ripristina una variazione per tornare al movimento di base.',
        )}
      />
      <div className="rules-list">
        {Object.entries(scenario.adjustments).map(([key, a]) => (
          <div className="scenario-change" key={key}>
            <span>
              {entityName(data, occurrenceReference(key).forecastId)} ·{' '}
              {dateLabel(
                occurrenceDate(
                  data.entities[
                    occurrenceReference(key).forecastId
                  ] as import('./domain').Forecast,
                  occurrenceReference(key).index,
                ),
              )}
              <small>
                {a.excluded
                  ? tr('Escluso')
                  : `${a.date ? tr('Nuova data: {date}', { date: dateLabel(a.date) }) : ''}${a.amountCents ? ` · ${euro(a.amountCents)}` : ''}`}
              </small>
            </span>
            <button
              className="text-button"
              onClick={() => {
                const adjustments = { ...scenario.adjustments };
                delete adjustments[key];
                save({ ...scenario, adjustments }).catch((e) =>
                  toast(toMessage(e)),
                );
              }}
            >
              {tr('Ripristina')}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
function AdjustmentForm({
  occurrence: o,
  scenario,
  onClose,
}: {
  occurrence: Occurrence;
  scenario: Scenario;
  onClose: () => void;
}) {
  const { save } = useApp();
  const [error, setError] = useState<Message>('');
  return (
    <Dialog title={tr('Varia questa previsione')} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await save({
              ...scenario,
              adjustments: {
                ...scenario.adjustments,
                [o.key]: {
                  date: String(f.get('date')),
                  amountCents: parseMoney(String(f.get('amount'))),
                  excluded: f.get('excluded') === 'on',
                },
              },
            });
            onClose();
          } catch (err) {
            setError(toMessage(err));
          }
        }}
      >
        <p className="muted">
          {tr('{name} · Solo nello scenario «{scenario}»', {
            name: o.forecast.name,
            scenario: scenario.name,
          })}
        </p>
        <div className="form-grid">
          <Field label={tr('Nuova data')}>
            <input type="date" name="date" required defaultValue={o.date} />
          </Field>
          <Field label={tr('Nuovo importo (€)')}>
            <MoneyInput
              name="amount"
              required
              inputMode="decimal"
              defaultCents={o.amountCents}
            />
          </Field>
          <label className="checkbox-label full">
            <input type="checkbox" name="excluded" />
            {tr('Escludi questo movimento dallo scenario')}
          </label>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {messageText(error)}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {tr('Annulla')}
          </button>
          <button className="button primary">{tr('Salva variazione')}</button>
        </div>
      </form>
    </Dialog>
  );
}
function Analytics({
  scope,
  period,
  openProject,
}: {
  scope: FilterScope;
  period: Period;
  openProject: (p: Project) => void;
}) {
  const { data } = useApp(),
    transactions = selectTransactions(data, scope, period),
    income = total(transactions, 'income'),
    expense = total(transactions, 'expense');
  const categories = [
    ...list(data, 'category'),
    {
      id: '',
      name: tr('Senza categoria'),
      color: 'var(--chart-category-fallback)',
    },
  ]
    .map((c) => ({
      ...c,
      value: transactions
        .filter((t) => t.direction === 'expense' && t.categoryId === c.id)
        .reduce((n, t) => n + t.amountCents, 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  // Include deleted categories in historical analysis too.
  for (const t of transactions.filter(
    (t) =>
      t.direction === 'expense' &&
      t.categoryId &&
      !categories.some((c) => c.id === t.categoryId),
  )) {
    const c = data.entities[t.categoryId];
    if (
      c?.type === 'category' &&
      !categories.some((category) => category.id === c.id)
    )
      categories.push({
        ...c,
        value: transactions
          .filter((v) => v.direction === 'expense' && v.categoryId === c.id)
          .reduce((n, v) => n + v.amountCents, 0),
      });
  }
  const points = Array.from({ length: 6 }, (_, i) => {
    const date = shiftMonth(today().slice(0, 7) + '-01', i - 5),
      ts = transactions.filter((t) => t.date.startsWith(date.slice(0, 7)));
    return {
      label: monthLabel(date),
      income: total(ts, 'income'),
      expense: total(ts, 'expense'),
    };
  });
  const projects = list(data, 'project').filter(
    (p) => scope === 'all' || p.scope === scope,
  );
  let stop = 0;
  const gradient = categories
    .map((c) => {
      const start = stop;
      stop += expense ? (c.value / expense) * 100 : 0;
      return `${c.color} ${start}% ${stop}%`;
    })
    .join(',');
  return (
    <>
      <Stats scope={scope} period={period} />
      <div className="analytics-grid">
        <section className="panel">
          <SectionHeading
            title={tr('Entrate e uscite')}
            description={tr(
              'Distribuzione negli ultimi sei mesi, nel periodo selezionato',
            )}
          />
          <div className="chart-legend">
            <span>
              <i />
              {tr('Entrate')}
            </span>
            <span>
              <i className="sand" />
              {tr('Uscite')}
            </span>
          </div>
          <BarChart points={points} />
        </section>
        <section className="panel">
          <SectionHeading
            title={tr('Dove vanno le tue risorse')}
            description={tr('Spese per categoria nel periodo selezionato')}
          />
          {categories.length ? (
            <>
              <div
                className="donut"
                role="img"
                aria-label={categories
                  .map((c) => `${c.name}: ${euro(c.value)}`)
                  .join('; ')}
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <div>
                  <small>{tr('Uscite totali')}</small>
                  <strong>{compactEuro(expense)}</strong>
                </div>
              </div>
              <div className="category-breakdown">
                {categories.map((c) => (
                  <div key={c.id}>
                    <i style={{ background: c.color }} />
                    <span>{c.name}</span>
                    <strong>{euro(c.value)}</strong>
                    <small>
                      {numberLabel(Math.round((c.value / expense) * 100))}%
                    </small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title={tr('Ogni spesa racconta qualcosa')}
              description={tr(
                'Le spese registrate appariranno qui, divise per categoria.',
              )}
            />
          )}
        </section>
      </div>
      <section className="panel">
        <SectionHeading
          title={tr('Liquidità nel tempo')}
          description={tr(
            'Saldi effettivi alla fine di ciascun mese, fino a oggi',
          )}
        />
        <LineChart points={history(data, scope)} height={245} />
      </section>
      <section className="panel">
        <SectionHeading
          title={tr('I risultati dei tuoi progetti')}
          description={tr(
            'Incassi meno spese registrati nel periodo selezionato; non rappresentano un risultato fiscale.',
          )}
        />
        {projects.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tr('Progetto')}</th>
                  <th className="number">{tr('Incassi')}</th>
                  <th className="number">{tr('Spese')}</th>
                  <th className="number">{tr('Risultato registrato')}</th>
                  <th className="number">{tr('Obiettivo')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const ts = transactions.filter((t) => t.projectId === p.id),
                    inc = total(ts, 'income'),
                    exp = total(ts, 'expense');
                  return (
                    <tr key={p.id}>
                      <td>
                        <button
                          className="transaction-title"
                          onClick={() => openProject(p)}
                        >
                          <ProjectIcon color={p.color} />
                          <strong>{p.name}</strong>
                        </button>
                      </td>
                      <td className="number">{euro(inc)}</td>
                      <td className="number">{euro(exp)}</td>
                      <td
                        className={`number amount ${inc - exp < 0 ? 'negative' : 'positive'}`}
                      >
                        {euro(inc - exp)}
                      </td>
                      <td className="number muted">{euro(p.targetCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={tr('Un obiettivo, numeri più chiari')}
            description={tr(
              'Crea un progetto e collega i suoi movimenti per seguirne i risultati.',
            )}
          />
        )}
      </section>
    </>
  );
}
