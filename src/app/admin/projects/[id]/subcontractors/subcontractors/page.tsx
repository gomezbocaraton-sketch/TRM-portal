import { createClient } from '@/lib/supabase/server';
import { addSubcontractor, addQuote, decideQuote, uploadInvoice } from './actions';

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string | null
): Promise<string | null> {
  if (!key) return null;
  const { data } = await supabase.storage.from('project-files').createSignedUrl(key, 3600);
  return data?.signedUrl ?? null;
}

export default async function SubcontractorsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const supabase = await createClient();

  const [{ data: subs }, { data: quotes }] = await Promise.all([
    supabase.from('subcontractors').select('*').eq('project_id', projectId).order('name'),
    supabase.from('subcontractor_quotes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
  ]);

  const subsWithUrls = await Promise.all(
    (subs ?? []).map(async (s) => ({
      ...s,
      licenseUrl: await signedUrl(supabase, s.license_file_key),
      insuranceUrl: await signedUrl(supabase, s.insurance_file_key),
    }))
  );

  const quotesWithUrls = await Promise.all(
    (quotes ?? []).map(async (q) => ({
      ...q,
      quoteUrl: await signedUrl(supabase, q.quote_file_key),
      invoiceUrl: await signedUrl(supabase, q.invoice_file_key),
    }))
  );

  const addSubWithId = addSubcontractor.bind(null, projectId);

  return (
    <div className="space-y-6">
      <form action={addSubWithId} className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Add contractor</p>
        <div className="mb-3 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Company name</label>
            <input name="name" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Trade</label>
            <input name="trade" placeholder="e.g. Electrical" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Contact name</label>
            <input name="contactName" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Phone</label>
            <input name="phone" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Email</label>
            <input name="email" type="email" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-4 border-t border-line pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">License number</label>
            <input name="licenseNumber" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">License file</label>
            <input type="file" name="licenseFile" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Insurance expiry</label>
            <input type="date" name="insuranceExpiry" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Insurance certificate</label>
            <input type="file" name="insuranceFile" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
        </div>

        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Add contractor</button>
      </form>

      <div className="space-y-4">
        {subsWithUrls.map((sub) => {
          const subQuotes = quotesWithUrls.filter((q) => q.subcontractor_id === sub.id);
          const addQuoteWithIds = addQuote.bind(null, projectId, sub.id);

          return (
            <div key={sub.id} className="rounded-card border border-line bg-white p-6">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-navy">{sub.name}</p>
                  <p className="text-xs text-ink-soft">
                    {sub.trade}{sub.contact_name ? ` · ${sub.contact_name}` : ''}{sub.phone ? ` · ${sub.phone}` : ''}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  {sub.licenseUrl && (
                    <a href={sub.licenseUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent-deep underline">
                      License
                    </a>
                  )}
                  {sub.insuranceUrl && (
                    <a href={sub.insuranceUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent-deep underline">
                      Insurance
                    </a>
                  )}
                </div>
              </div>
              {sub.insurance_expiry && (
                <p className="mb-4 text-xs text-ink-soft">Insurance expires {sub.insurance_expiry}</p>
              )}

              <div className="border-t border-line pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Quotes</p>
                <div className="mb-3 space-y-2">
                  {subQuotes.length === 0 && (
                    <p className="text-xs text-ink-soft">No quotes yet.</p>
                  )}
                  {subQuotes.map((q) => {
                    const approveWithIds = decideQuote.bind(null, projectId, q.id, 'approved');
                    const rejectWithIds = decideQuote.bind(null, projectId, q.id, 'rejected');
                    const invoiceWithIds = uploadInvoice.bind(null, projectId, q.id);
                    const statusStyle =
                      q.status === 'approved'
                        ? 'bg-success-tint text-success'
                        : q.status === 'rejected'
                        ? 'bg-paper text-ink-soft'
                        : 'bg-accent-tint text-accent-deep';

                    return (
                      <div key={q.id} className="rounded-lg border border-line p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-navy">{q.description || 'Quote'}</p>
                            <p className="text-xs text-ink-soft">
                              ${Number(q.amount).toLocaleString()} · Submitted {q.submitted_date}
                            </p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>
                            {q.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {q.quoteUrl && (
                            <a href={q.quoteUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-navy">
                              View quote
                            </a>
                          )}

                          {q.status === 'pending' && (
                            <>
                              <form action={approveWithIds}>
                                <button className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white">Approve</button>
                              </form>
                              <form action={rejectWithIds}>
                                <button className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-navy">Reject</button>
                              </form>
                            </>
                          )}

                          {q.status === 'approved' && !q.invoiceUrl && (
                            <form action={invoiceWithIds} className="flex items-center gap-2">
                              <input type="file" name="invoiceFile" className="text-xs" />
                              <button className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-navy">Upload invoice</button>
                            </form>
                          )}

                          {q.invoiceUrl && (
                            <a href={q.invoiceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-navy">
                              View invoice
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form action={addQuoteWithIds} className="flex flex-wrap items-center gap-2 rounded-lg bg-paper p-3">
                  <input name="description" placeholder="Description" className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs" />
                  <input type="number" name="amount" placeholder="Amount" className="w-24 rounded-lg border border-line bg-white px-2 py-1.5 text-xs" />
                  <input type="date" name="submittedDate" className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs" />
                  <input type="file" name="quoteFile" className="text-xs" />
                  <button className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">Add quote</button>
                </form>
              </div>
            </div>
          );
        })}

        {subsWithUrls.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-soft">No contractors added yet.</p>
        )}
      </div>
    </div>
  );
}
