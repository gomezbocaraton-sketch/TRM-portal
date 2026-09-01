import { createClient } from '@/lib/supabase/server';
import { uploadDocument } from './actions';

const CATEGORIES = ['plans', 'permits', 'insurance', 'other'] as const;
const LABELS: Record<string, string> = {
  plans: 'Plans',
  permits: 'Permits',
  insurance: 'Insurance',
  other: 'Other',
};

export default async function DocumentsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false });

  const uploadWithId = uploadDocument.bind(null, projectId);

  // The storage bucket is private, so a plain link won't work — each
  // document needs its own temporary signed URL generated server-side.
  const docsWithUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(d.storage_key, 3600);
      return { ...d, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-6">
      <form action={uploadWithId} className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Upload document</p>
        <div className="mb-3 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Category</label>
            <select name="category" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">File</label>
            <input type="file" name="file" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-soft">Notes (optional)</label>
          <input name="notes" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </div>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Save document</button>
      </form>

      {CATEGORIES.map((cat) => {
        const inCategory = docsWithUrls.filter((d) => d.category === cat);
        return (
          <div key={cat}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{LABELS[cat]}</p>
            {inCategory.length === 0 ? (
              <p className="mb-4 text-xs text-ink-soft">No {LABELS[cat].toLowerCase()} uploaded yet.</p>
            ) : (
              <div className="mb-4 space-y-2">
                {inCategory.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-navy">{d.file_name}</p>
                      <p className="text-xs text-ink-soft">{d.notes ? `${d.notes} · ` : ''}{d.uploaded_at?.slice(0, 10)}</p>
                    </div>
                    {d.signedUrl && (
                      <a
                        href={d.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-accent"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
