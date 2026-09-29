import { ReactNode, useEffect, useState } from 'react';
import { PiCaretLeftBold as ArrowLeft, PiQuestionFill as HelpCircle } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';

/**
 * Screen primitives shared by the batch-3 pages.
 *
 * Every screen in the requirement documents is built from the same handful of
 * shapes — a back bar, underline tabs, pill tabs, a countdown, a card section
 * and an empty state. Defining them once keeps 20 screens visually identical
 * and each page file short enough to read.
 */

/* ── Header ──────────────────────────────────────────────────────── */

interface ScreenHeaderProps {
  title: string;
  /** Rendered on the right of the bar — help icon, filter pill, etc. */
  right?: ReactNode;
  /** Optional second row: tabs, filters. */
  children?: ReactNode;
  /** `media` makes the bar transparent for screens with a coloured hero. */
  variant?: 'default' | 'media';
  onBack?: () => void;
}

export const ScreenHeader = ({
  title,
  right,
  children,
  variant = 'default',
  onBack,
}: ScreenHeaderProps) => {
  const navigate = useNavigate();
  const media = variant === 'media';

  return (
    <header
      className={`sticky top-0 z-20 ${
        media ? 'bg-transparent' : 'bg-white border-b border-line'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-14">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          aria-label="Back"
          className={`p-1 -ml-1 ${media ? 'text-white' : 'text-ink'}`}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className={`text-base font-bold flex-1 truncate ${media ? 'text-white' : 'text-ink'}`}>
          {title}
        </h1>
        {right}
      </div>
      {children}
    </header>
  );
};

/** Circular help button — appears on most screens in the documents. */
export const HelpButton = ({ onClick, light = false }: { onClick?: () => void; light?: boolean }) => (
  <button
    onClick={onClick}
    aria-label="Help"
    className={`w-8 h-8 rounded-full flex items-center justify-center ${
      light ? 'text-white/90' : 'text-ink-muted'
    }`}
  >
    <HelpCircle className="w-5 h-5" />
  </button>
);

/* ── Tabs ────────────────────────────────────────────────────────── */

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  badge?: string;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  /** `light` for tabs on a coloured hero. */
  tone?: 'dark' | 'light';
  className?: string;
}

/** Underline tabs — the primary navigation shape in the documents. */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  tone = 'dark',
  className = '',
}: TabBarProps<T>) {
  const light = tone === 'light';

  return (
    <div className={`flex items-center gap-5 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map(({ key, label, badge }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`relative shrink-0 pb-2.5 pt-1 text-[15px] transition-colors ${
              isActive
                ? light
                  ? 'text-white font-bold'
                  : 'text-ink font-bold'
                : light
                  ? 'text-white/60 font-medium'
                  : 'text-ink-faint font-medium'
            }`}
          >
            {label}
            {badge && (
              <span className="absolute -top-1 -right-5 h-4 px-1 rounded-full bg-status-live text-white text-[9px] font-bold flex items-center">
                {badge}
              </span>
            )}
            {isActive && (
              <span
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full ${
                  light ? 'bg-white' : 'bg-black text-white'
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface PillTabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  tone?: 'dark' | 'light';
  className?: string;
}

/** Rounded pill tabs — filters and sub-tabs. */
export function PillTabs<T extends string>({
  tabs,
  active,
  onChange,
  tone = 'dark',
  className = '',
}: PillTabsProps<T>) {
  const light = tone === 'light';

  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`shrink-0 h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? light
                  ? 'bg-white text-ink'
                  : 'bg-black text-white'
                : light
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-sunken text-ink-soft'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Countdown ───────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');

/** `07:23:59`, or `05d 07:32:53` past a day. */
export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${pad(days)}d ${clock}` : clock;
}

interface CountdownPillProps {
  /** ISO timestamp the countdown runs to. */
  to?: string | null;
  tone?: 'dark' | 'light' | 'accent';
  className?: string;
}

/**
 * Ticking countdown to a reset time. Every ranking and reward screen in the
 * documents shows one. Renders nothing when there's no target, rather than a
 * fake `00:00:00`.
 */
export const CountdownPill = ({ to, tone = 'accent', className = '' }: CountdownPillProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!to) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [to]);

  if (!to) return null;
  const target = new Date(to).getTime();
  if (Number.isNaN(target)) return null;

  const tones = {
    dark: 'bg-black/35 text-white',
    light: 'bg-white/20 text-white',
    accent: 'bg-accent-50 text-accent-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-bold tabular-nums ${tones[tone]} ${className}`}
    >
      ⏰ {formatCountdown(target - now)}
    </span>
  );
};

/* ── Layout helpers ──────────────────────────────────────────────── */

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes the inner padding, for lists that manage their own rows. */
  flush?: boolean;
}

export const SectionCard = ({
  title,
  subtitle,
  right,
  children,
  className = '',
  flush = false,
}: SectionCardProps) => (
  <section className={`bg-white rounded-card ${flush ? '' : 'p-4'} ${className}`}>
    {(title || right) && (
      <div className={`flex items-start justify-between gap-2 ${flush ? 'px-4 pt-4 pb-2' : 'mb-3'}`}>
        <div className="min-w-0">
          {title && <h2 className="font-bold text-ink">{title}</h2>}
          {subtitle && <p className="text-[11px] text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
    )}
    {children}
  </section>
);

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, hint, action, className = '' }: EmptyStateProps) => (
  <div className={`text-center px-8 py-16 ${className}`}>
    {icon && (
      <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-4 text-ink-ghost">
        {icon}
      </div>
    )}
    <p className="text-base font-semibold text-ink mb-1">{title}</p>
    {hint && <p className="text-sm text-ink-muted leading-relaxed">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/**
 * Shown where a screen is complete but its endpoint isn't built yet.
 *
 * Deliberately explicit: an empty screen with no explanation reads as a bug,
 * and inventing placeholder numbers would be worse than saying nothing.
 */
export const PendingApiNotice = ({ section, what }: { section: string; what: string }) => (
  <div className="mx-3 my-3 rounded-card bg-surface-sunken px-4 py-3">
    <p className="text-[13px] text-ink-soft leading-relaxed">
      <span className="font-semibold">{what}</span> appears here once the API is connected.
      The contract is specified in <span className="font-mono text-[12px]">BACKEND-GUIDE.md</span>{' '}
      {section} — no frontend change is needed when it ships.
    </p>
  </div>
);

/** Stat cell used across the agent, streamer and creator dashboards. */
export const StatCell = ({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  highlight?: boolean;
}) => (
  <div className={`p-3 rounded-xl ${highlight ? 'bg-surface-sunken' : ''}`}>
    <p className="text-[11px] text-ink-muted">{label}</p>
    <p className="text-xl font-bold text-ink tabular-nums mt-0.5">{value}</p>
    {hint && <p className="text-[10px] text-ink-faint mt-0.5">{hint}</p>}
  </div>
);
