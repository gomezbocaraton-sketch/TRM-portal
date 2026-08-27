import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/financials', label: 'Financials' },
  { href: '/profitability', label: 'Profitability' },
  { href: '/changeorders', label: 'Change Orders' },
  { href: '/documents', label: 'Documents' },
  { href: '/matterport', label: 'Matterport' },
  { href: '/dailylog', label: 'Daily Log' },
];

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, client_name')
    .eq('id', id)
    .single();

  if (!project) notFound();

  return (
    <main className="mx-auto max-w-4xl px-8 py-10">
      <Link href="/admin" className="mb-2 inline-block text-sm text-ink-soft hover:text-navy">
        &larr; Projects
      </Link>
      <h1 className="mb-1 text-2xl font-medium text-navy">{project.name}</h1>
      <p className="mb-6 text-sm text-ink-soft">Client: {project.client_name}</p>

      <div className="mb-8 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-line">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/admin/projects/${id}${tab.href}`}
            className="shrink-0 px-3 py-2.5 text-sm font-medium text-ink-soft hover:text-navy"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </main>
  );
}
