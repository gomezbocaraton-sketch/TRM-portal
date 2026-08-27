import { createClient } from '@/lib/supabase/server';
import { addTour } from './actions';

export default async function MatterportTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const supabase = await createClient();

  const { data: tours } = await supabase
    .from('matterport_tours')
    .select('*')
    .eq('project_id', projectId)
    .order('scan_date', { ascending: false });

  const addWithId = addTour.bind(null, projectId);

  return (
    <div className="space-y-6">
      <form action={addWithId} className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Add tour</p>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-ink-soft">Tour title</label>
          <input name="title" placeholder="e.g. Framing walkthrough — Aug 2026" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </div>
        <div className="mb-3 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Scan date</label>
            <input type="date" name="scanDate" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Matterport share link</label>
            <input name="url" placeholder="https://my.matterport.com/show/?m=..." className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
        </div>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Save tour</button>
      </form>

      <div className="grid grid-cols-2 gap-4">
        {(tours ?? []).map((t) => (
          <a
            key={t.id}
            href={t.matterport_url}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-card border border-line bg-white hover:border-accent"
          >
            <div className="flex aspect-video items-center justify-center bg-navy-tint">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white">▶</span>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-navy">{t.title}</p>
              <p className="text-xs text-ink-soft">{t.scan_date}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
