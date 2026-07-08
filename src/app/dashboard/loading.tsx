export default function Loading() {
  return (
    <main className="p-6 max-w-6xl mx-auto">
      {/* Заголовок */}
      <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-40 mb-6 animate-pulse" />

      {/* 4 KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
          >
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20 animate-pulse" />
            <div className="mt-3 h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-24 animate-pulse" />
          </div>
        ))}
      </section>

      {/* 2 графика (h-72 — как в page.tsx) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 h-72"
          >
            <div className="h-full w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </section>

      {/* 2 summary-блока */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2"
          >
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 animate-pulse" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </section>

      {/* 2 операционных списка */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2"
          >
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 animate-pulse" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
