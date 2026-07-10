import { RegisterForm } from './RegisterForm';

export const metadata = { title: 'Регистрация — CRM-lite' };

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Регистрация
        </h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Создайте аккаунт владельца и свою компанию.
        </p>
        <RegisterForm />
      </div>
    </main>
  );
}