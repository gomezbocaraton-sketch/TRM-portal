import { createClient } from '@/lib/supabase/server';
import { addChangeOrder, updateStatus } from './actions';

export default async function ChangeOrdersTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const supabase = await createClient();

  const { data: cos } = await supabase
    .from('change_orders')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const addWithId = addChangeOrder.bind(null, projectId);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-white p-4 text-xs text-ink-soft">
        There's no client login yet, so change orders can't be e-signed by the
        client directly. Update the status here yourself once you have their
        approval by phone, email, or in person — the "approved by" name is
        just your own record of who signed off.
      </div>

      <form action={addWithId} className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">New change order</p>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-ink-soft">Title</label>
          <input name="title" placeholder="e.g. CO #2 — Upgrade kitchen electrical panel" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-ink-soft">Description</label>
          <textarea name="description" rows={2} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Cost impact ($)</label>
            <input type="number" name="amount" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Date sent</label>
            <input type="date" name="sentDate" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
        </div>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Issue change order</button>
      </form>

      <div className="space-y-3">
        {(cos ?? []).map((co) => {
          const updateWithIds = updateStatus.bind(null, projectId, co.id);
          return (
            <div key={co.id} className="rounded-card border border-line bg-white p-5">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-navy">{co.title}</p>
                  <p className="text-xs text-ink-soft">{co.description}</p>
                </div>
                <p className="shrink-0 text-lg font-medium text-navy">${Number(co.amount ?? 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
                <span><b className="text-ink-soft">Sent:</b> {co.sent_date ?? '—'}</span>
                {co.status === 'signed' ? (
                  <span className="text-ink-soft">
                    <b>Approved:</b> {co.signed_date}{co.signed_by_name ? ` by ${co.signed_by_name}` : ''}
                  </span>
                ) : (
                  <span className="text-ink-soft"><b>Status:</b> {co.status}</span>
                )}
              </div>
              <form action={updateWithIds} className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <select name="status" defaultValue={co.status} className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs">
                  <option value="pending">Pending</option>
                  <option value="signed">Approved</option>
                  <option value="declined">Declined</option>
                </select>
                <input
                  name="approvedBy"
                  defaultValue={co.signed_by_name ?? ''}
                  placeholder="Approved by (name)"
                  className="flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-xs"
                />
                <button className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy">
                  Update
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
