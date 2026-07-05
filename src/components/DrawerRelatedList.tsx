import Link from 'next/link';
import { Badge } from './Badge';

export type RelatedItem = {
  label: string;
  href: string;
  count: number;
  empty?: boolean;
};

export function DrawerRelatedList({
  title,
  items,
  context,
}: {
  title: string;
  items: RelatedItem[];
  context: 'inside-drawer' | 'list';
}) {
  if (items.length === 0) return null;
  return (
    <section className="px-6 py-4">
      <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => {
          const inner = (
            <Badge variant="open">
              {it.label}: {it.count}
            </Badge>
          );
          if (context === 'inside-drawer') {
            return (
              <li key={`${it.label}-${it.href}`}>
                <a
                  href={it.href}
                  className="inline-flex hover:opacity-80"
                >
                  {inner}
                </a>
              </li>
            );
          }
          return (
            <li key={`${it.label}-${it.href}`}>
              <Link href={it.href} className="inline-flex hover:opacity-80">
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}