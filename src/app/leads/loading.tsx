export default function Loading() {
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-6 animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"
          />
        ))}
      </div>
    </main>
  );
}