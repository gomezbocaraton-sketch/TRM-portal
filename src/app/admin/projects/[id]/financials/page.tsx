import { createClient } from '@/lib/supabase/server';
import { recordPayment, addScheduleItem } from './actions';

export default async function FinancialsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const supabase = await createClient();

  const [{ data: adjustedValue }, { data: payments }, { data: schedule }] = await Promise.all([
    supabase.rpc('project_adjusted_contract_value', { p_project_id: projectId }),
    supabase.from('payments').select('*').eq('project_id', projectId).order('payment_date', { ascending: false }),
    supabase.from('payment_schedule').select('*').eq('project_id', projectId).order('due_date'),
  ]);

  const contractValue = Number(adjustedValue ?? 0);
  const totalReceived = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = contractValue - totalReceived;

  const recordWithId = recordPayment.bind(null, projectId);
  const scheduleWithId = addScheduleItem.bind(null, projectId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Contract value" value={contractValue} />
        <SummaryCard label="Total received" value={totalReceived} tone="success" />
        <SummaryCard label="Balance due" value={balanceDue} tone="accent" />
      </div>

      <form action={recordWithId} className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Record payment</p>
        <div className="mb-3 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Amount ($)</label>
            <input type="number" name="amount" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Date</label>
            <input type="date" name="paymentDate" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Method</label>
            <input name="method" placeholder="Check, wire, ACH..." className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Reference</label>
            <input name="reference" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
        </div>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Record payment</button>
      </form>

      <div className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Payment history</p>
        <div className="space-y-2">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="flex justify-between border-b border-line py-2 text-sm last:border-0">
              <span className="text-ink-soft">{p.payment_date} &middot; {p.method}</span>
              <span className="font-semibold text-success">${Number(p.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <form action={scheduleWithId} className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Add scheduled payment</p>
        <div className="mb-3 grid grid-cols-3 gap-4">
          <input name="description" placeholder="Description" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <input type="number" name="amount" placeholder="Amount" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <input type="date" name="dueDate" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </div>
        <button className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-navy">Add to schedule</button>
      </form>

      <div className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Payment schedule</p>
        <div className="space-y-2">
          {(schedule ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
              <span className="text-ink-soft">{s.due_date} &middot; {s.description}</span>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === 'paid' ? 'bg-success-tint text-success' : 'bg-accent-tint text-accent-deep'}`}>
                  {s.status}
                </span>
                <span className="font-semibold text-navy">${Number(s.amount).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'accent' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'accent' ? 'text-accent-deep' : 'text-navy';
  return (
    <div className="rounded-card border border-line bg-white p-5">
      <p className="mb-1 text-xs text-ink-soft">{label}</p>
      <p className={`text-2xl font-medium ${color}`}>${value.toLocaleString()}</p>
    </div>
  );
}
