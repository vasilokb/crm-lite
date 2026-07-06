import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM-lite",
  description: "Локальная CRM-lite для агентства выставочных стендов",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: ReactNode;
  modal: ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <nav className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-zinc-50">
              CRM-lite
            </Link>
            <Link href="/leads"         className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">Лиды</Link>
            <Link href="/accounts"      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">Компании</Link>
            <Link href="/contacts"      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">Контакты</Link>
            <Link href="/opportunities" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">Сделки</Link>
          </nav>
        </header>
        <main className="min-h-[calc(100vh-57px)]">{children}</main>
        {modal}
      </body>
    </html>
  );
}