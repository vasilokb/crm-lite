import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { NavHeader } from '@/components/NavHeader';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CRM-lite',
  description: 'Локальная CRM-lite для агентства выставочных стендов',
};

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: ReactNode;
  modal: ReactNode;
}>) {
  // Безопасное чтение сессии: на /login, /register, /invite сессии нет → null → рендерим без данных.
  let user: { name?: string | null; email?: string | null } | undefined;
  let activeOrgId: string | null | undefined;
  let memberships:
    | {
        organizationId: string;
        role: 'owner' | 'member';
        organization: { id: string; name: string };
      }[]
    | undefined;

  try {
    const session = await auth();
    if (session?.user) {
      const u = session.user as { id?: string; name?: string | null; email?: string | null };
      user = { name: u.name, email: u.email };

      if (u.id) {
        const rows = await prisma.membership.findMany({
          where: { userId: u.id, status: 'active' },
          include: { organization: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        });
        memberships = rows.map((m) => ({
          organizationId: m.organizationId,
          role: m.role as 'owner' | 'member',
          organization: m.organization,
        }));

        // activeOrganizationId из session-callback (auth.ts)
        activeOrgId = (session.user as { activeOrganizationId?: string | null })
          .activeOrganizationId;
      }
    }
  } catch {
    // /login, /register, /invite без сессии — рендерим «гостевой» NavHeader
  }

  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <NavHeader
          user={user}
          activeOrgId={activeOrgId}
          memberships={memberships}
        />
        <main className="min-h-[calc(100vh-57px)]">{children}</main>
        {modal}
      </body>
    </html>
  );
}