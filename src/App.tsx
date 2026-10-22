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
  Leaf,
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
  moneyInput,
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
const navigation: { id: Page; label: string; icon: typeof Wallet }[] = [
  { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
  { id: 'projects', label: 'Progetti', icon: FolderKanban },
  { id: 'finance', label: 'Finanze', icon: Wallet },
  { id: 'tasks', label: 'Attività', icon: CheckSquare2 },
  { id: 'forecast', label: 'Previsioni', icon: TrendingUp },
  { id: 'analytics', label: 'Analisi', icon: ChartNoAxesCombined },
];
const pageInfo: Record<Page, [string, string]> = {
  overview: ['Panoramica', 'Tutto al suo posto. Uno sguardo a ciò che conta.'],
  projects: ['Progetti', 'Dai spazio alle idee, tieni il passo sui risultati.'],
  finance: ['Finanze', 'Ogni movimento, una visione più chiara.'],
  tasks: ['Attività', 'Una cosa alla volta, nella direzione giusta.'],
  forecast: ['Previsioni', 'Guarda avanti, con più tranquillità.'],
  analytics: ['Analisi', 'I numeri raccontano come stai andando.'],
  settings: ['Il tuo spazio', 'Preferenze, dati e collegamento a GitHub.'],
};
const statusLabels: Record<Project['status'], string> = {
  idea: 'Idea',
  attivo: 'Attivo',
  pausa: 'In pausa',
  completato: 'Completato',
  archiviato: 'Archiviato',
};
const monthLabel = (date: string) =>
  new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'UTC' }).format(
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
  const { data, toast } = useApp();
  const readPage = () => {
    const hash = location.hash.slice(1);
    return [...navigation.map((n) => n.id), 'settings'].includes(hash)
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
    label: 'Solo su questo dispositivo',
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
    document.title = `${pageInfo[page][0]} · Punto`;
  }, [page]);
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
        Vai al contenuto
      </a>
      {mobileMenu && (
        <div className="sidebar-shade" onClick={() => setMobileMenu(false)} />
      )}
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <a
          className="brand"
          href="#overview"
          onClick={() => navigate('overview')}
          aria-label="Punto, panoramica"
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
          aria-label="Chiudi menu"
          onClick={() => setMobileMenu(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">IL TUO SPAZIO</div>
        <nav aria-label="Navigazione principale">
          {navigation.map(({ id, label, icon: Icon }) => (
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
                <span className="nav-count">{unfinished}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <Leaf size={18} />
            </span>
            <strong>
              Piccoli passi.
              <br />
              Una visione più grande.
            </strong>
            <p>
              Il tuo futuro si costruisce
              <br />
              un giorno alla volta.
            </p>
            <span className="note-decoration" aria-hidden="true">
              ↗
            </span>
          </div>
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={19} />
            <span>Impostazioni</span>
          </button>
          <button className="profile" onClick={() => navigate('settings')}>
            <span className="avatar">
              {settings.name ? settings.name.slice(0, 2).toUpperCase() : 'TU'}
            </span>
            <span>
              <strong>{settings.name || 'Il tuo profilo'}</strong>
              <small>Il tuo spazio personale</small>
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
              aria-label="Apri menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Il mio spazio <ChevronRight size={13} />
              <strong>{pageInfo[page][0]}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <button
              className={`sync-indicator ${syncIndicator.status}`}
              onClick={() => navigate('settings')}
              title="Apri le impostazioni di sincronizzazione"
            >
              <i />
              {syncIndicator.label}
            </button>
            <span className="topbar-date">
              {new Intl.DateTimeFormat('it-IT', {
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
                  ? `IL QUADRO D’INSIEME`
                  : 'IL TUO SPAZIO, OGNI GIORNO'}
              </p>
              <h1>
                {pageInfo[page][0]}
                <span className="heading-dot">.</span>
              </h1>
              <p>{pageInfo[page][1]}</p>
            </div>
            <div className="new-control">
              <button
                className="button primary"
                aria-expanded={addMenu}
                onClick={() => setAddMenu(!addMenu)}
              >
                <Plus size={18} />
                Aggiungi
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
                    aria-label="Aggiungi elemento"
                  >
                    {[
                      { kind: 'transaction', label: 'Movimento', icon: Wallet },
                      {
                        kind: 'project',
                        label: 'Progetto',
                        icon: FolderKanban,
                      },
                      { kind: 'task', label: 'Attività', icon: CheckSquare2 },
                      {
                        kind: 'forecast',
                        label: 'Previsione',
                        icon: TrendingUp,
                      },
                      { kind: 'account', label: 'Conto', icon: HardDrive },
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
                Stai esplorando dati dimostrativi.
              </span>
              <button
                className="text-button"
                onClick={() => navigate('settings')}
              >
                Gestisci i dati <ArrowRight size={14} />
              </button>
            </div>
          )}
          {page !== 'settings' && (
            <div className="filter-bar">
              <div className="scope-switch" aria-label="Ambito">
                {(
                  [
                    ['all', 'Tutto'],
                    ['lavoro', 'Lavoro'],
                    ['personale', 'Personale'],
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
                    aria-label="Periodo"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                  >
                    <option value="month">Questo mese</option>
                    <option value="90days">Ultimi 90 giorni</option>
                    <option value="year">Quest’anno</option>
                    <option value="all">Tutto il periodo</option>
                  </select>
                </label>
              ) : (
                <span className="filter-caption">
                  {page === 'forecast'
                    ? 'Orizzonte: prossimi 6 mesi'
                    : scope === 'all'
                      ? 'Una visione completa'
                      : scope === 'lavoro'
                        ? 'Il tuo ambito lavorativo'
                        : 'La tua vita personale'}
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
              Un po’ più di chiarezza, ogni giorno.
            </span>
            <span>Fatto per te · EUR · Europe/Rome</span>
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
        label="Disponibilità attuale"
        value={euro(liquidity(data, scope))}
        hint="Saldo complessivo dei tuoi conti"
        icon={<Wallet size={19} />}
        accent
      />
      <Metric
        label="Entrate del periodo"
        value={euro(income)}
        hint={`${transactions.filter((t) => t.direction === 'income').length} movimenti registrati`}
        icon={<ArrowDownLeft size={19} />}
      />
      <Metric
        label="Uscite del periodo"
        value={euro(expense)}
        hint={`${transactions.filter((t) => t.direction === 'expense').length} movimenti registrati`}
        icon={<ArrowUpRight size={19} />}
      />
      <Metric
        label="Saldo del periodo"
        value={(income > expense ? '+' : '') + euro(income - expense)}
        hint="Entrate meno uscite"
        icon={<ArrowLeftRight size={19} />}
        footer={
          <span
            className={`balance-hint ${income - expense < 0 ? 'negative' : ''}`}
          >
            <span className="tiny-dot" />
            {income - expense >= 0
              ? 'Stai mantenendo l’equilibrio'
              : 'Uscite superiori alle entrate'}
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
            <span className="eyebrow">SI PARTE DA QUI</span>
            <h3>Il primo passo è conoscere il punto di partenza.</h3>
            <p>
              Aggiungi il tuo primo conto, oppure esplora l’app con i dati
              dimostrativi dalle impostazioni.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => openForm({ kind: 'account' })}
          >
            <Plus size={16} />
            Aggiungi un conto
          </button>
        </div>
      )}
      <div className="overview-chart-grid">
        <section className="panel liquidity-panel">
          <SectionHeading
            title="La tua liquidità"
            description="Il saldo dei tuoi conti negli ultimi sei mesi"
            action="Esplora le analisi"
            onAction={() => navigate('analytics')}
          />
          <div className="chart-legend">
            <span>
              <i />
              Saldo effettivo
            </span>
            <span className="chart-period">Ultimi 6 mesi</span>
          </div>
          <LineChart points={history(data, scope)} />
        </section>
        <section className="forecast-teaser">
          <span className="forecast-icon">
            <TrendingUp size={23} strokeWidth={1.5} />
          </span>
          <p className="eyebrow">UNO SGUARDO AVANTI</p>
          <h2>
            Il futuro,
            <br />
            un po’ più chiaro.
          </h2>
          <p>
            La tua disponibilità stimata
            <br />
            tra sei mesi
          </p>
          <strong>{euro(prediction[5].value)}</strong>
          <span className="forecast-teaser-hint">
            In base ai movimenti previsti
          </span>
          <button className="text-button" onClick={() => navigate('forecast')}>
            Vai alle previsioni
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
            title="Progetti in movimento"
            description={`${projects.length} progetti attivi, un passo alla volta`}
            action="Tutti i progetti"
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
              title="Spazio alle tue idee"
              description="Raccogli attività, costi e ricavi in un progetto."
              action="Crea un progetto"
              onAction={() => openForm({ kind: 'project' })}
            />
          )}
        </section>
        <section className="panel">
          <SectionHeading
            title="Le prossime cose da fare"
            description="Un po’ di ordine nelle tue giornate"
            action="Tutte le attività"
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
              title="Hai spazio per concentrarti"
              description="Nessuna attività in scadenza. Aggiungine una quando vuoi."
              action="Aggiungi attività"
              onAction={() => openForm({ kind: 'task' })}
            />
          )}
        </section>
      </div>
      <section className="panel recent-panel">
        <SectionHeading
          title="Ultimi movimenti"
          description="Le tue entrate e uscite, in ordine"
          action="Tutti i movimenti"
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
          <span className="badge green">{statusLabels[p.status]}</span>
        </div>
        <div className="progress-line">
          <span style={{ width: `${progress}%`, background: p.color }} />
        </div>
        <small>
          {complete} di {tasks.length} attività completate
        </small>
      </div>
      <div className="project-row-result">
        <strong>{euro(projectResult(data, p.id))}</strong>
        <small>risultato registrato</small>
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
      p.name.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it')),
  );
  return (
    <>
      <div className="list-toolbar">
        <div className="tabs small-tabs">
          {[
            ['all', 'Tutti'],
            ['attivo', 'Attivi'],
            ['completato', 'Completati'],
            ['archiviato', 'Archiviati'],
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
          placeholder="Cerca un progetto…"
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
                    {statusLabels[p.status]}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Modifica ${p.name}`}
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
                    {p.description || 'Il tuo prossimo passo prende forma qui.'}
                  </p>
                </button>
                <div className="project-finance">
                  <span>
                    Risultato registrato<strong>{euro(result)}</strong>
                  </span>
                  <span>
                    Obiettivo
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
                    {done}/{tasks.length} attività
                  </span>
                  <span>
                    <CalendarDays size={14} />
                    {p.endDate ? dateLabel(p.endDate) : 'Senza scadenza'}
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
            <strong>Una nuova idea?</strong>
            <p>Crea il tuo prossimo progetto</p>
          </button>
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Il prossimo progetto inizia qui"
            description="Dai un nome a un’idea e trasformala in passi concreti."
            action="Crea progetto"
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
          <span className="badge green">{statusLabels[project.status]}</span>
          <span>
            {project.scope === 'lavoro' ? 'Lavoro' : 'Personale'} ·{' '}
            {dateLabel(project.startDate)}
            {project.endDate && ` → ${dateLabel(project.endDate)}`}
          </span>
          <button
            className="button secondary"
            onClick={() => openForm({ kind: 'project', entity: project })}
          >
            <Pencil size={15} />
            Modifica
          </button>
        </div>
        <p>{project.description}</p>
        <div className="detail-metrics">
          <div>
            <small>Incassi registrati</small>
            <strong>{euro(total(transactions, 'income'))}</strong>
          </div>
          <div>
            <small>Spese registrate</small>
            <strong>{euro(total(transactions, 'expense'))}</strong>
          </div>
          <div>
            <small>Risultato registrato</small>
            <strong>{euro(projectResult(data, project.id))}</strong>
          </div>
          <div>
            <small>Obiettivo economico</small>
            <strong>{euro(project.targetCents)}</strong>
          </div>
        </div>
        <p className="form-hint">
          Il risultato è la differenza tra incassi e spese registrati. Non è un
          calcolo fiscale.
        </p>
        {project.notes && (
          <div className="notes-block">
            <h3>Note</h3>
            <p>{project.notes}</p>
          </div>
        )}
        <SectionHeading
          title="Attività del progetto"
          action="Aggiungi attività"
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
          <p className="muted">Non hai ancora aggiunto attività.</p>
        )}
        <SectionHeading
          title="Movimenti collegati"
          action="Aggiungi movimento"
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
        t.name.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it')),
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
                <small>{a.scope === 'lavoro' ? 'Lavoro' : 'Personale'}</small>
              </span>
              <MoreHorizontal size={18} />
            </div>
            <strong>{euro(accountBalance(data, a.id))}</strong>
            <small>
              Saldo iniziale {euro(a.openingCents)} · {dateLabel(a.openingDate)}
            </small>
          </button>
        ))}
        <button
          className="add-account"
          onClick={() => openForm({ kind: 'account' })}
        >
          <Plus size={20} />
          Aggiungi un conto
        </button>
      </div>
      <section className="panel">
        <SectionHeading
          title="I tuoi movimenti"
          description="Gli importi dei trasferimenti non entrano nei ricavi e nei costi."
        />
        <div className="finance-actions">
          <div className="tabs small-tabs">
            {[
              ['all', 'Tutti'],
              ['income', 'Entrate'],
              ['expense', 'Uscite'],
              ['transfer', 'Trasferimenti'],
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
              Importa CSV
            </button>
            <button
              className="button primary"
              onClick={() => openForm({ kind: 'transaction' })}
            >
              <Plus size={16} />
              Movimento
            </button>
          </div>
        </div>
        <div className="table-filters">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cerca un movimento…"
          />
          <select
            aria-label="Filtra per conto"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">Tutti i conti</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <span>{transactions.length} movimenti</span>
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
          aria-label="Svuota ricerca"
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
        aria-label={`${t.status === 'done' ? 'Riapri' : 'Completa'} ${t.name}`}
        onClick={() =>
          save({ ...t, status: t.status === 'done' ? 'todo' : 'done' }).catch(
            (e) => toast(e.message),
          )
        }
      >
        {t.status === 'done' && <Check size={13} />}
      </button>
      <button className="task-main" onClick={onEdit}>
        <strong>{t.name}</strong>
        <small>
          {entityName(data, t.projectId) || 'Attività generale'}
          {t.subtasks.length > 0 &&
            ` · ${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length} passi`}
        </small>
      </button>
      {!compact && (
        <select
          className="task-status-select"
          aria-label={`Stato di ${t.name}`}
          value={t.status}
          onChange={(e) =>
            save({ ...t, status: e.target.value as Task['status'] }).catch(
              (e) => toast(e.message),
            )
          }
        >
          <option value="todo">Da fare</option>
          <option value="doing">In corso</option>
          <option value="done">Fatto</option>
        </select>
      )}
      <div className="task-meta">
        <span
          className={`priority-dot ${t.priority}`}
          title={`Priorità ${t.priority}`}
        />
        <span className={`task-date ${late ? 'late' : ''}`}>
          {t.due === today()
            ? 'Oggi'
            : t.due === shiftDate(today(), 1)
              ? 'Domani'
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
        t.name.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it')),
    )
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const changeStatus = (id: string, status: Task['status']) => {
    const t = data.entities[id];
    if (t?.type === 'task')
      save({ ...t, status }).catch((e) => toast(e.message));
  };
  return (
    <>
      <div className="list-toolbar">
        <div className="tabs small-tabs">
          {[
            ['open', 'Da completare'],
            ['done', 'Completate'],
            ['all', 'Tutte'],
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
            placeholder="Cerca un’attività…"
          />
          <div className="view-switch">
            <button
              aria-label="Vista lista"
              aria-pressed={view === 'list'}
              className={view === 'list' ? 'selected' : ''}
              onClick={() => setView('list')}
            >
              <List size={18} />
            </button>
            <button
              aria-label="Vista bacheca"
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
            title={`${tasks.length} attività`}
            action="Aggiungi attività"
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
              title="Un po’ di spazio libero"
              description="Non ci sono attività in questa vista."
              action="Aggiungi attività"
              onAction={() => openForm({ kind: 'task' })}
            />
          )}
        </section>
      ) : (
        <div className="kanban">
          {(
            [
              ['todo', 'Da fare'],
              ['doing', 'In corso'],
              ['done', 'Fatto'],
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
                <span>{tasks.filter((t) => t.status === status).length}</span>
                <button
                  className="icon-button"
                  aria-label={`Aggiungi in ${label}`}
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
                        {t.priority}
                      </span>
                      <button
                        className="icon-button"
                        aria-label={`Modifica ${t.name}`}
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
                      {entityName(data, t.projectId) || 'Attività generale'}
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
                            }).catch((e) => toast(e.message))
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
                        aria-label={`Stato di ${t.name}`}
                        value={t.status}
                        onChange={(e) =>
                          changeStatus(t.id, e.target.value as Task['status'])
                        }
                      >
                        <option value="todo">Da fare</option>
                        <option value="doing">In corso</option>
                        <option value="done">Fatto</option>
                      </select>
                    </div>
                  </article>
                ))}
              <button
                className="kanban-add"
                onClick={() => openForm({ kind: 'task', defaults: { status } })}
              >
                <Plus size={16} />
                Aggiungi attività
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
            aria-label="Scenario"
            value={scenario?.id ?? ''}
            onChange={(e) => setScenarioId(e.target.value)}
          >
            <option value="">Scenario di base</option>
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
              Modifica nome
            </button>
          )}
          <button
            className="button secondary"
            onClick={() => openForm({ kind: 'scenario' })}
          >
            <Plus size={15} />
            Crea scenario
          </button>
          <button
            className="button primary"
            onClick={() => openForm({ kind: 'forecast' })}
          >
            <Plus size={16} />
            Previsione
          </button>
        </div>
      </div>
      <div className="forecast-summary">
        <div>
          <span className="eyebrow">DISPONIBILITÀ STIMATA A SEI MESI</span>
          <strong>{euro(series[5].value)}</strong>
          <p>
            {scenario
              ? `Scenario «${scenario.name}». Le modifiche non toccano i dati reali.`
              : 'Saldo attuale più entrate e uscite future non ancora registrate.'}
          </p>
        </div>
        <div>
          <span>Variazione prevista</span>
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
          title="La strada davanti a te"
          description="Le previsioni sono stime basate sui movimenti pianificati."
        />
        <div className="chart-legend">
          <span>
            <i />
            {scenario?.name ?? 'Scenario di base'}
          </span>
          {scenario && (
            <span>
              <i className="gray" />
              Scenario di base
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
                <th>Mese</th>
                {series.map((p) => (
                  <th className="number" key={p.label}>
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Entrate previste</td>
                {series.map((p) => (
                  <td className="number positive" key={p.label}>
                    {euro(p.income)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Uscite previste</td>
                {series.map((p) => (
                  <td className="number" key={p.label}>
                    {euro(p.expense)}
                  </td>
                ))}
              </tr>
              <tr>
                <th>Saldo stimato</th>
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
            {overdue.length} previsioni sono scadute. Registrale o spostale per
            aggiornarle; sono escluse dal saldo futuro.
          </span>
        </div>
      )}
      <section className="panel">
        <SectionHeading
          title="Movimenti pianificati"
          description={
            scenario
              ? 'Seleziona un movimento per cambiare data, importo o escluderlo da questo scenario.'
              : 'Registra un movimento effettivo per toglierlo automaticamente dalla previsione.'
          }
        />
        {upcoming.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Movimento</th>
                  <th>Data prevista</th>
                  <th>Ripetizione</th>
                  <th className="number">Importo</th>
                  <th>Azioni</th>
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
                          none: 'Una volta',
                          weekly: 'Settimanale',
                          monthly: 'Mensile',
                          yearly: 'Annuale',
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
                          Varia
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
                          Registra
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upcoming.length > 150 && (
              <p className="form-hint">
                Mostrate le prime 150 occorrenze. Le altre sono incluse nei
                calcoli.
              </p>
            )}
          </div>
        ) : (
          <Empty
            title="Disegna i prossimi mesi"
            description="Aggiungi entrate e spese attese, anche ricorrenti."
            action="Aggiungi previsione"
            onAction={() => openForm({ kind: 'forecast' })}
          />
        )}
      </section>
      {forecasts.length > 0 && (
        <section className="panel">
          <SectionHeading
            title="Regole delle previsioni"
            description="Gestisci anche le ricorrenze terminate o già registrate."
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
                      Dal {dateLabel(f.date)}
                      {f.endDate && ` al ${dateLabel(f.endDate)}`}
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
        title="Variazioni dello scenario"
        description="Ripristina una variazione per tornare al movimento di base."
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
                  ? 'Escluso'
                  : `${a.date ? `Nuova data: ${dateLabel(a.date)}` : ''}${a.amountCents ? ` · ${euro(a.amountCents)}` : ''}`}
              </small>
            </span>
            <button
              className="text-button"
              onClick={() => {
                const adjustments = { ...scenario.adjustments };
                delete adjustments[key];
                save({ ...scenario, adjustments }).catch((e) =>
                  toast(e.message),
                );
              }}
            >
              Ripristina
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
  const [error, setError] = useState('');
  return (
    <Dialog title="Varia questa previsione" onClose={onClose}>
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
            setError((err as Error).message);
          }
        }}
      >
        <p className="muted">
          {o.forecast.name} · Solo nello scenario «{scenario.name}»
        </p>
        <div className="form-grid">
          <Field label="Nuova data">
            <input type="date" name="date" required defaultValue={o.date} />
          </Field>
          <Field label="Nuovo importo (€)">
            <input
              name="amount"
              required
              inputMode="decimal"
              defaultValue={moneyInput(o.amountCents)}
            />
          </Field>
          <label className="checkbox-label full">
            <input type="checkbox" name="excluded" />
            Escludi questo movimento dallo scenario
          </label>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="button primary">Salva variazione</button>
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
      name: 'Senza categoria',
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
            title="Entrate e uscite"
            description="Distribuzione negli ultimi sei mesi, nel periodo selezionato"
          />
          <div className="chart-legend">
            <span>
              <i />
              Entrate
            </span>
            <span>
              <i className="sand" />
              Uscite
            </span>
          </div>
          <BarChart points={points} />
        </section>
        <section className="panel">
          <SectionHeading
            title="Dove vanno le tue risorse"
            description="Spese per categoria nel periodo selezionato"
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
                  <small>Uscite totali</small>
                  <strong>{compactEuro(expense)}</strong>
                </div>
              </div>
              <div className="category-breakdown">
                {categories.map((c) => (
                  <div key={c.id}>
                    <i style={{ background: c.color }} />
                    <span>{c.name}</span>
                    <strong>{euro(c.value)}</strong>
                    <small>{Math.round((c.value / expense) * 100)}%</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="Ogni spesa racconta qualcosa"
              description="Le spese registrate appariranno qui, divise per categoria."
            />
          )}
        </section>
      </div>
      <section className="panel">
        <SectionHeading
          title="Liquidità nel tempo"
          description="Saldi effettivi alla fine di ciascun mese, fino a oggi"
        />
        <LineChart points={history(data, scope)} height={245} />
      </section>
      <section className="panel">
        <SectionHeading
          title="I risultati dei tuoi progetti"
          description="Incassi meno spese registrati nel periodo selezionato; non rappresentano un risultato fiscale."
        />
        {projects.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Progetto</th>
                  <th className="number">Incassi</th>
                  <th className="number">Spese</th>
                  <th className="number">Risultato registrato</th>
                  <th className="number">Obiettivo</th>
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
            title="Un obiettivo, numeri più chiari"
            description="Crea un progetto e collega i suoi movimenti per seguirne i risultati."
          />
        )}
      </section>
    </>
  );
}
