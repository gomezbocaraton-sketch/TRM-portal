import { createClient } from '@/lib/supabase/server';
import { updateProjectInfo, updateDocumentDates, uploadEstimateOrContract } from './actions';

export default async function OverviewTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const supabase = await createClient();

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) return null;

  const updateInfoWithId = updateProjectInfo.bind(null, projectId);
  const updateDatesWithId = updateDocumentDates.bind(null, projectId);
  const uploadEstimate = uploadEstimateOrContract.bind(null, projectId, 'estimate');
  const uploadContract = uploadEstimateOrContract.bind(null, projectId, 'contract');

  // Bucket is private — generate a signed URL for whichever files exist.
  const estimateUrl = project.estimate_file_key
    ? (await supabase.storage.from('project-files').createSignedUrl(project.estimate_file_key, 3600)).data
        ?.signedUrl
    : null;
  const contractUrl = project.contract_file_key
    ? (await supabase.storage.from('project-files').createSignedUrl(project.contract_file_key, 3600)).data
        ?.signedUrl
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Client information</p>
        <form action={updateInfoWithId} className="grid grid-cols-2 gap-4">
          <Field label="Client name" name="clientName" defaultValue={project.client_name} />
          <Field label="Entity name" name="entityName" defaultValue={project.client_entity_name} />
          <Field label="Address" name="address" defaultValue={project.address} full />
          <Field label="Phone" name="phone" defaultValue={project.client_phone} />
          <Field label="Email" name="email" defaultValue={project.client_email} />
          <Field
            label="Contract value ($)"
            name="contractValue"
            type="number"
            defaultValue={project.contract_value}
          />
          <div className="col-span-2 flex justify-end">
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              Save changes
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-card border border-line bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-navy">Documents</p>

        <form action={updateDatesWithId} className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-line p-4">
          <p className="col-span-2 text-sm font-medium text-navy">Key dates</p>
          <Field label="Estimate sent" name="estimateSent" type="date" defaultValue={project.estimate_sent_date} />
          <Field label="Estimate accepted" name="estimateAccepted" type="date" defaultValue={project.estimate_accepted_date} />
          <Field label="Contract sent" name="contractSent" type="date" defaultValue={project.contract_sent_date} />
          <Field label="Contract signed" name="contractSigned" type="date" defaultValue={project.contract_signed_date} />
          <div className="col-span-2 flex justify-end">
            <button className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy">
              Save dates
            </button>
          </div>
        </form>

        <div className="mb-4 rounded-lg border border-line p-4">
          <p className="mb-2 text-sm font-medium text-navy">Estimate file</p>
          <form action={uploadEstimate} className="flex items-center gap-2">
            <input type="file" name="file" className="text-xs" />
            <button className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy">
              Upload
            </button>
            {estimateUrl && (
              <a href={estimateUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-deep underline">
                View file
              </a>
            )}
          </form>
        </div>

        <div className="rounded-lg border border-line p-4">
          <p className="mb-2 text-sm font-medium text-navy">Contract file</p>
          <form action={uploadContract} className="flex items-center gap-2">
            <input type="file" name="file" className="text-xs" />
            <button className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy">
              Upload
            </button>
            {contractUrl && (
              <a href={contractUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-deep underline">
                View file
              </a>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  full = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-ink-soft">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
      />
    </div>
  );
}
