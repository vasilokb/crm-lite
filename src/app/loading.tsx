export default function Loading() {
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          ))}
        </div>
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </main>
  );
}