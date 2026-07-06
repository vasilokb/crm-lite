type Accent = 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber';

const ACCENTS: Record<Accent, { bg: string; border: string; label: string }> = {
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-950/30',  border: 'border-indigo-200 dark:border-indigo-900', label: 'text-indigo-700 dark:text-indigo-300' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-950/30',      border: 'border-blue-200 dark:border-blue-900',     label: 'text-blue-700 dark:text-blue-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900', label: 'text-emerald-700 dark:text-emerald-300' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-950/30',      border: 'border-rose-200 dark:border-rose-900',     label: 'text-rose-700 dark:text-rose-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30',    border: 'border-amber-200 dark:border-amber-900',   label: 'text-amber-700 dark:text-amber-300' },
};

type Props = {
  label: string;
  value: string | number;
  accent?: Accent;
};

export function KpiCard({ label, value, accent = 'indigo' }: Props) {
  const a = ACCENTS[accent];
  return (
    <div className={`rounded border ${a.border} ${a.bg} p-4`}>
      <div className={`text-xs font-medium uppercase tracking-wide ${a.label}`}>{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}