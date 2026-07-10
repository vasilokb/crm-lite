import { LoginForm } from './LoginForm';

export const metadata = { title: 'Вход — CRM-lite' };

type SP = { from?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? '/dashboard';
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Вход
        </h1>
        <LoginForm from={from} />
      </div>
    </main>
  );
}