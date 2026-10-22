import {
  useEffect,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowRight,
  Plus,
  Folder,
  Inbox,
} from 'lucide-react';
import {
  euro,
  compactEuro,
  dateLabel,
  list,
  type Data,
  type Transaction,
} from './domain';
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const element = ref.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? 'dialog wide' : 'dialog'}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Chiudi finestra"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  full = false,
  hint,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{
              id?: string;
              'aria-describedby'?: string;
            }>,
            { id, ...(hint ? { 'aria-describedby': id + '-hint' } : {}) },
          )
        : children}
      {hint && <small id={id + '-hint'}>{hint}</small>}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={28} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button secondary" onClick={onAction}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
export function SectionHeading({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
export function TransactionTable({
  transactions,
  data,
  onEdit,
  limit,
}: {
  transactions: Transaction[];
  data: Data;
  onEdit: (t: Transaction) => void;
  limit?: number;
}) {
  return (
    <div className="table-scroll">
      <table className="transactions">
        <thead>
          <tr>
            <th>Movimento</th>
            <th>Categoria</th>
            <th>Conto</th>
            <th>Data</th>
            <th className="number">Importo</th>
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, limit).map((t) => {
            const category = data.entities[t.categoryId],
              account = data.entities[t.accountId];
            return (
              <tr key={t.id}>
                <td>
                  <button
                    className="transaction-title"
                    onClick={() => onEdit(t)}
                  >
                    <span className={`transaction-icon ${t.direction}`}>
                      {t.direction === 'income' ? (
                        <ArrowDownLeft size={18} />
                      ) : t.direction === 'expense' ? (
                        <ArrowUpRight size={18} />
                      ) : (
                        <ArrowLeftRight size={18} />
                      )}
                    </span>
                    <span>
                      <strong>{t.name}</strong>
                      <small>
                        {t.scope === 'lavoro' ? 'Lavoro' : 'Personale'}
                        {t.projectId &&
                          data.entities[t.projectId] &&
                          ' · ' +
                            ('name' in data.entities[t.projectId]
                              ? data.entities[t.projectId].name
                              : '')}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="category-label">
                    <i
                      style={{
                        background:
                          category?.type === 'category'
                            ? category.color
                            : '#a4aaa0',
                      }}
                    />
                    {category && 'name' in category
                      ? category.name
                      : t.direction === 'transfer'
                        ? 'Trasferimento'
                        : 'Senza categoria'}
                  </span>
                </td>
                <td className="muted">
                  {account && 'name' in account ? account.name : '—'}
                </td>
                <td className="muted nowrap">{dateLabel(t.date)}</td>
                <td
                  className={`number amount ${t.direction === 'income' ? 'positive' : ''}`}
                >
                  <button onClick={() => onEdit(t)}>
                    {t.direction === 'income'
                      ? '+'
                      : t.direction === 'expense'
                        ? '−'
                        : ''}
                    {euro(t.amountCents)}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <Empty
          title="Nessun movimento"
          description="I movimenti che registri appariranno qui."
        />
      )}
    </div>
  );
}
export interface ChartPoint {
  label: string;
  value: number;
  secondary?: number;
}
export function LineChart({
  points,
  forecast = false,
  height = 230,
  label = 'Andamento della liquidità',
}: {
  points: ChartPoint[];
  forecast?: boolean;
  height?: number;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useRef('fill-' + crypto.randomUUID()).current;
  const w = 900,
    h = height,
    left = 68,
    right = 22,
    top = 28,
    bottom = 34;
  const values = points.flatMap((p) =>
    p.secondary === undefined ? [p.value] : [p.value, p.secondary],
  );
  const rawMin = Math.min(0, ...values),
    rawMax = Math.max(10000, ...values),
    pad = (rawMax - rawMin) * 0.12;
  const min = rawMin < 0 ? rawMin - pad : 0,
    max = rawMax + pad;
  const x = (i: number) =>
    left + i * ((w - left - right) / Math.max(1, points.length - 1));
  const y = (v: number) => top + ((max - v) / (max - min)) * (h - top - bottom);
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`)
    .join(' ');
  const secondary = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.secondary ?? p.value)}`)
    .join(' ');
  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        <title>{label}</title>
        <desc>
          {points.map((p) => `${p.label}: ${euro(p.value)}`).join('; ')}
        </desc>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b936d" stopOpacity=".15" />
            <stop offset="100%" stopColor="#4b936d" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }, (_, i) => {
          const v = min + ((max - min) * i) / 4;
          return (
            <g key={i}>
              <line
                x1={left}
                x2={w - right}
                y1={y(v)}
                y2={y(v)}
                stroke="#e9ece6"
                strokeDasharray="3 5"
              />
              <text x={left - 14} y={y(v) + 4} textAnchor="end">
                {compactEuro(v)}
              </text>
            </g>
          );
        })}
        <path
          d={`${line} L${x(points.length - 1)},${y(min)} L${x(0)},${y(min)} Z`}
          fill={`url(#${uid})`}
        />
        {points.some((p) => p.secondary !== undefined) && (
          <path
            d={secondary}
            fill="none"
            stroke="#b5bdb2"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
        )}
        <path
          d={line}
          fill="none"
          stroke="#347957"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={forecast ? '7 5' : undefined}
        />
        {points.map((p, i) => (
          <g key={i}>
            <text x={x(i)} y={h - 8} textAnchor="middle">
              {p.label}
            </text>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={hover === i ? 5 : 3}
              fill="#347957"
              stroke="white"
              strokeWidth="2"
            />
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r="15"
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${p.label}: ${euro(p.value)}`}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(hover === i ? null : i)}
            />
          </g>
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            <rect
              x={Math.min(w - 160, Math.max(70, x(hover) - 70))}
              y={Math.max(1, y(points[hover].value) - 48)}
              rx="6"
              width="140"
              height="31"
              fill="#1a3328"
            />
            <text
              x={Math.min(w - 90, Math.max(140, x(hover)))}
              y={Math.max(1, y(points[hover].value) - 48) + 20}
              textAnchor="middle"
              fill="white"
              style={{ fill: 'white', fontWeight: 600 }}
            >
              {euro(points[hover].value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
export function BarChart({
  points,
}: {
  points: { label: string; income: number; expense: number }[];
}) {
  const max = Math.max(10000, ...points.flatMap((p) => [p.income, p.expense]));
  return (
    <div
      className="bar-chart"
      role="img"
      aria-label="Entrate e uscite per mese"
    >
      {points.map((p, i) => (
        <div className="bar-column" key={i}>
          <div className="bar-pair">
            <div
              className="bar income-bar"
              style={{ height: `${(p.income / max) * 100}%` }}
              title={`Entrate: ${euro(p.income)}`}
              tabIndex={0}
              aria-label={`${p.label}, entrate ${euro(p.income)}`}
            />
            <div
              className="bar expense-bar"
              style={{ height: `${(p.expense / max) * 100}%` }}
              title={`Uscite: ${euro(p.expense)}`}
              tabIndex={0}
              aria-label={`${p.label}, uscite ${euro(p.expense)}`}
            />
          </div>
          <span>{p.label}</span>
        </div>
      ))}
    </div>
  );
}
export function ProjectIcon({ color = '#347957' }: { color?: string }) {
  return (
    <span className="project-icon" style={{ color, background: color + '15' }}>
      <Folder size={21} strokeWidth={1.6} />
    </span>
  );
}
export function entityName(data: Data, id: string) {
  const entity = data.entities[id];
  return entity && 'name' in entity ? entity.name : '';
}
export function CategoryOptions({ data }: { data: Data }) {
  return (
    <>
      <option value="">Senza categoria</option>
      {list(data, 'category').map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </>
  );
}
