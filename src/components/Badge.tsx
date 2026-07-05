type Variant =
  | 'won'
  | 'lost'
  | 'open'
  | 'new'
  | 'processed'
  | 'converted'
  | 'site'
  | 'email'
  | 'phone'
  | 'referral'
  | 'manual'
  | 'qualification'
  | 'proposal'
  | 'negotiation';

const COLORS: Record<Variant, { bg: string; fg: string; border: string }> = {
  won:           { bg: 'bg-emerald-100 dark:bg-emerald-950/40', fg: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
  lost:          { bg: 'bg-rose-100 dark:bg-rose-950/40',       fg: 'text-rose-700 dark:text-rose-300',       border: 'border-rose-300 dark:border-rose-800' },
  open:          { bg: 'bg-indigo-100 dark:bg-indigo-950/40',   fg: 'text-indigo-700 dark:text-indigo-300',   border: 'border-indigo-300 dark:border-indigo-800' },
  new:           { bg: 'bg-indigo-100 dark:bg-indigo-950/40',   fg: 'text-indigo-700 dark:text-indigo-300',   border: 'border-indigo-300 dark:border-indigo-800' },
  processed:     { bg: 'bg-amber-100 dark:bg-amber-950/40',     fg: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-300 dark:border-amber-800' },
  converted:     { bg: 'bg-slate-200 dark:bg-slate-800',        fg: 'text-slate-700 dark:text-slate-300',     border: 'border-slate-300 dark:border-slate-700' },
  site:          { bg: 'bg-slate-100 dark:bg-slate-900',        fg: 'text-slate-700 dark:text-slate-300',     border: 'border-slate-300 dark:border-slate-700' },
  email:         { bg: 'bg-blue-100 dark:bg-blue-950/40',       fg: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-300 dark:border-blue-800' },
  phone:         { bg: 'bg-slate-100 dark:bg-slate-900',        fg: 'text-slate-700 dark:text-slate-300',     border: 'border-slate-300 dark:border-slate-700' },
  referral:      { bg: 'bg-violet-100 dark:bg-violet-950/40',   fg: 'text-violet-700 dark:text-violet-300',   border: 'border-violet-300 dark:border-violet-800' },
  manual:        { bg: 'bg-zinc-100 dark:bg-zinc-900',          fg: 'text-zinc-700 dark:text-zinc-300',       border: 'border-zinc-300 dark:border-zinc-700' },
  qualification: { bg: 'bg-blue-100 dark:bg-blue-950/40',       fg: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-300 dark:border-blue-800' },
  proposal:      { bg: 'bg-sky-100 dark:bg-sky-950/40',         fg: 'text-sky-700 dark:text-sky-300',         border: 'border-sky-300 dark:border-sky-800' },
  negotiation:   { bg: 'bg-cyan-100 dark:bg-cyan-950/40',       fg: 'text-cyan-700 dark:text-cyan-300',       border: 'border-cyan-300 dark:border-cyan-800' },
};

export function Badge({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const c = COLORS[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.fg} ${c.border}`}
    >
      {children}
    </span>
  );
}