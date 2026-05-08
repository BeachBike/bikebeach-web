import type { ReactNode } from 'react';

interface PageHeadProps {
  eyebrow?: string;
  title: ReactNode;
  sub?: string;
  actions?: ReactNode;
}

export function PageHead({ eyebrow, title, sub, actions }: PageHeadProps) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
      <div>
        {eyebrow && (
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-clay">
            {eyebrow}
          </div>
        )}
        <div
          className="display-tight leading-[0.95]"
          style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}
        >
          {title}
        </div>
        {sub && (
          <div className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-ink-2">
            {sub}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

type KpiTone = 'clay' | 'cream' | 'ink';

interface KpiProps {
  tone?: KpiTone;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

const KPI_TONE: Record<KpiTone, string> = {
  clay: 'bg-clay text-cream',
  cream: 'bg-cream-2 text-ink',
  ink: 'bg-ink text-cream',
};

export function Kpi({ tone = 'cream', label, value, sub }: KpiProps) {
  return (
    <div
      className={`flex min-h-[140px] flex-col justify-between rounded-lg p-6 ${KPI_TONE[tone]}`}
    >
      <span className="text-xs font-bold uppercase tracking-wide opacity-85">
        {label}
      </span>
      <div>
        <div className="display-tight mt-1.5 text-[54px] leading-none">
          {value}
        </div>
        {sub && (
          <div className="mt-1 text-[13px] font-medium opacity-85">{sub}</div>
        )}
      </div>
    </div>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-sand bg-cream p-6 ${className}`}
    >
      {children}
    </div>
  );
}

type BtnTone = 'ink' | 'clay' | 'sea';

interface BtnProps {
  tone?: BtnTone;
  ghost?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

const BTN_TONE: Record<BtnTone, string> = {
  ink: 'bg-ink text-cream',
  clay: 'bg-clay text-cream',
  sea: 'bg-sea text-cream',
};

export function Btn({
  tone = 'ink',
  ghost,
  icon,
  children,
  onClick,
  type = 'button',
  disabled,
}: BtnProps) {
  const base =
    'inline-flex items-center gap-2 rounded-full px-[18px] py-3 text-sm font-semibold transition-transform disabled:cursor-not-allowed disabled:opacity-60';
  const filled = `${BTN_TONE[tone]} shadow-card hover:-translate-y-px`;
  const ghostStyle =
    'border-[1.5px] border-ink text-ink hover:bg-cream-2';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${ghost ? ghostStyle : filled}`}
    >
      {icon}
      {children}
    </button>
  );
}

type AlertTone = 'amber' | 'red' | 'sea' | 'green';

interface AlertItemProps {
  tone: AlertTone;
  title: string;
  detail?: string;
}

const ALERT_TONE: Record<AlertTone, { bg: string; fg: string; dot: string }> = {
  amber: { bg: 'bg-[#F4E8C9]', fg: 'text-[#735517]', dot: 'bg-warning' },
  red: { bg: 'bg-[#F1D6CA]', fg: 'text-clay-d', dot: 'bg-clay' },
  sea: { bg: 'bg-[#CFE0E0]', fg: 'text-sea-d', dot: 'bg-sea' },
  green: { bg: 'bg-[#E5EFE3]', fg: 'text-[#2c5d39]', dot: 'bg-success' },
};

export function AlertItem({ tone, title, detail }: AlertItemProps) {
  const t = ALERT_TONE[tone];
  return (
    <div
      className={`flex items-center gap-3.5 rounded-sm px-4 py-3.5 ${t.bg} ${t.fg}`}
    >
      <span className={`size-2.5 shrink-0 rounded-full ${t.dot}`} />
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        {detail && (
          <div className="mt-0.5 text-xs opacity-80">{detail}</div>
        )}
      </div>
    </div>
  );
}
