import { createClient } from '@/lib/supabase/server';
import { addSubcontractor, addQuote, decideQuote, uploadInvoice, uploadLienWaiver } from './actions';

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string | null
): Promise<string | null> {
  if (!key) return null;
  const { data } = await supabase.storage.from('project-files').createSignedUrl(key, 3600);
  return data?.signedUrl ?? null;
}

// Flags anything expiring within 30 days as a warning, and anything
// already past as expired — the whole point of tracking these dates
// in the first place is catching lapses before they become a problem.
function expiryStatus(dateStr: string | null): 'expired' | 'soon' | 'ok' | null {
  if (!dateStr) return null;
  const days = (new Date(dateStr).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

function ExpiryBadge({ label, dateStr }: { label: string; dateStr: string | null }) {
  const status = expiryStatus(dateStr);
  if (!status) return null;
  const style =
    status === 'expired'
      ? 'bg-red-50 text-red-700'
      : status === 'soon'
      ? 'bg-accent-tint text-accent-deep'
      : 'bg-paper text-ink-soft';
  const text = status === 'expired' ? `${label} expired ${dateStr}` : `${label} expires ${dateStr}`;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{text}</span>;
}

type FlaggedItem = { contractorName: string; label: string; dateStr: string; status: 'expired' | 'soon' };

function buildFlaggedItems(subs: { name: string; insurance_expiry: string | null; license_expiry: string | null }[]): FlaggedItem[] {
  const items: FlaggedItem[] = [];
  for (const sub of subs) {
    const insStatus = expiryStatus(sub.insurance_expiry);
    if (insStatus === 'expired' || insStatus === 'soon') {
      items.push({ contractorName: sub.name, label: 'Insurance', dateStr: sub.insurance_expiry!, status: insStatus });
    }
    const licStatus = expiryStatus(sub.license_expiry);
    if (licStatus === 'expired' || licStatus === 'soon') {
      items.push({ contractorName: sub.name, label: 'License', dateStr: sub.license_expiry!, status: licStatus });
    }
  }
  // Expired items first, then soonest-expiring.
  return items.sort((a, b) => (a.status === b.status ? a.dateStr.localeCompare(b.dateStr) : a.status === 'expired' ? -1 : 1));
}

function ExpiryWarningBanner({ items }: { items: FlaggedItem[] }) {
  if (items.length === 0) return null;
  const hasExpired = items.some((i) => i.status === 'expired');

  return (
    <div className={`rounded-card border p-4 ${hasExpired ? 'border-red-200 bg-red-50' : 'border-accent bg-accent-tint'}`}>
      <p className={`mb-2 text-sm font-semibold ${hasExpired ? 'text-red-700' : 'text-accent-deep'}`}>
        {items.length} document{items.length > 1 ? 's' : ''} {hasExpired ? 'expired or ' : ''}expiring within 30 days
      </p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <p key={i} className="text-xs text-ink">
            <span className="font-semibold">{item.contractorName}</span> — {item.label}{' '}
            {item.status === 'expired' ? 'expired' : 'expires'} {item.dateStr}
          </p>
        ))}
      </div>
    </div>
  );
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
  const flaggedItems = buildFlaggedItems(subsWithUrls);

  return (
    <div className="space-y-6">
      <ExpiryWarningBanner items={flaggedItems} />

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
            <label className="mb-1 block text-xs font-medium text-ink-soft">License expiry</label>
            <input type="date" name="licenseExpiry" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">License file</label>
            <input type="file" name="licenseFile" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Insurance expiry</label>
            <input type="date" name="insuranceExpiry" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
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
              {(sub.insurance_expiry || sub.license_expiry) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <ExpiryBadge label="Insurance" dateStr={sub.insurance_expiry} />
                  <ExpiryBadge label="License" dateStr={sub.license_expiry} />
                </div>
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
                              <input type="file" name="invoiceFile" required className="text-xs" />
                              <button className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-navy">Upload invoice</button>
                            </form>
                          )}

                          {q.invoiceUrl && (
                            <a href={q.invoiceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-navy">
                              View invoice
                            </a>
                          )}

                          {q.invoiceUrl && !q.lien_waiver_file_key && (
                            <form action={uploadLienWaiver.bind(null, projectId, q.id)} className="flex items-center gap-2">
                              <input type="file" name="waiverFile" required className="text-xs" />
                              <button className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-navy">
                                Upload lien waiver
                              </button>
                            </form>
                          )}

                          {q.lien_waiver_file_key && (
                            <span className="rounded-full bg-success-tint px-2.5 py-1 text-xs font-semibold text-success">
                              Lien waiver on file ({q.lien_waiver_received_date})
                            </span>
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
