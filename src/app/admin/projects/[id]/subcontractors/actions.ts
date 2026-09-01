'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function uploadIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File | null,
  pathPrefix: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const path = `${pathPrefix}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('project-files').upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

export async function addSubcontractor(projectId: number, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Please add a contractor name.');

  const licenseFile = formData.get('licenseFile') as File | null;
  const insuranceFile = formData.get('insuranceFile') as File | null;

  const licenseKey = await uploadIfPresent(supabase, licenseFile, `${projectId}/subcontractors/license`);
  const insuranceKey = await uploadIfPresent(supabase, insuranceFile, `${projectId}/subcontractors/insurance`);

  const { error } = await supabase.from('subcontractors').insert({
    project_id: projectId,
    name,
    trade: String(formData.get('trade') ?? ''),
    contact_name: String(formData.get('contactName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    license_number: String(formData.get('licenseNumber') ?? ''),
    license_file_key: licenseKey,
    insurance_expiry: formData.get('insuranceExpiry') || null,
    insurance_file_key: insuranceKey,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}/subcontractors`);
}

export async function addQuote(projectId: number, subcontractorId: number, formData: FormData) {
  const supabase = await createClient();
  const amount = parseFloat(String(formData.get('amount') ?? '0'));
  if (!amount) throw new Error('Please enter a quote amount.');

  const quoteFile = formData.get('quoteFile') as File | null;
  const quoteKey = await uploadIfPresent(supabase, quoteFile, `${projectId}/subcontractors/quotes`);

  const { error } = await supabase.from('subcontractor_quotes').insert({
    project_id: projectId,
    subcontractor_id: subcontractorId,
    description: String(formData.get('description') ?? ''),
    amount,
    quote_file_key: quoteKey,
    submitted_date: String(formData.get('submittedDate') || new Date().toISOString().slice(0, 10)),
    status: 'pending',
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}/subcontractors`);
}

export async function decideQuote(
  projectId: number,
  quoteId: number,
  status: 'approved' | 'rejected'
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subcontractor_quotes')
    .update({ status, decided_date: new Date().toISOString().slice(0, 10) })
    .eq('id', quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}/subcontractors`);
}

export async function uploadInvoice(projectId: number, quoteId: number, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get('invoiceFile') as File | null;
  if (!file || file.size === 0) throw new Error('Please choose a file.');

  const path = `${projectId}/subcontractors/invoices/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('project-files').upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase
    .from('subcontractor_quotes')
    .update({ invoice_file_key: path })
    .eq('id', quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}/subcontractors`);
}
