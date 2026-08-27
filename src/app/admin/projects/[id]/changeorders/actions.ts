'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addChangeOrder(projectId: number, formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Please add a title.');

  const { error } = await supabase.from('change_orders').insert({
    project_id: projectId,
    title,
    description: String(formData.get('description') ?? ''),
    amount: parseFloat(String(formData.get('amount') ?? '0')) || null,
    sent_date: String(formData.get('sentDate') || new Date().toISOString().slice(0, 10)),
    status: 'pending',
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}/changeorders`);
  revalidatePath(`/admin/projects/${projectId}/financials`);
  revalidatePath(`/admin/projects/${projectId}/profitability`);
}

// Client e-signing isn't built yet (no client login in this phase).
// This is plain admin record-keeping: you update the status yourself
// when you have a verbal/email approval from the client, rather than
// pretending an admin click is a client's signature. The `signed_date`
// and `signed_by_name` columns already exist for when real client
// e-signing is built later.
export async function updateStatus(projectId: number, changeOrderId: number, formData: FormData) {
  const supabase = await createClient();
  const status = String(formData.get('status'));
  const approvedBy = String(formData.get('approvedBy') ?? '').trim();

  const updates: Record<string, unknown> = { status };
  if (status === 'signed') {
    updates.signed_date = new Date().toISOString().slice(0, 10);
    updates.signed_by_name = approvedBy || null;
  } else {
    updates.signed_date = null;
    updates.signed_by_name = null;
  }

  const { error } = await supabase.from('change_orders').update(updates).eq('id', changeOrderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}/changeorders`);
  revalidatePath(`/admin/projects/${projectId}/financials`);
  revalidatePath(`/admin/projects/${projectId}/profitability`);
}
