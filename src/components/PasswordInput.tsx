'use client';

import { useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  required?: boolean;
  errors?: string[];
};

export function PasswordInput({ label, required, errors, className = '', ...inputProps }: Props) {
  const [visible, setVisible] = useState(false);
  const id = inputProps.id ?? inputProps.name ?? 'password';

  return (
    <div className="flex flex-col gap-1 text-sm">
      {label && (
        <label htmlFor={id} className="text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="text-rose-600"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          {...inputProps}
          id={id}
          name={inputProps.name ?? 'password'}
          type={visible ? 'text' : 'password'}
          required={required}
          aria-invalid={Boolean(errors && errors.length > 0)}
          className={`w-full pr-10 rounded border px-3 py-2 outline-none focus:ring-1 ${
            errors && errors.length > 0
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          } bg-white dark:bg-zinc-950 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {visible ? '🙈' : '👁'}
          </span>
        </button>
      </div>
      {errors && errors.length > 0 && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{errors.join(', ')}</span>
      )}
    </div>
  );
}