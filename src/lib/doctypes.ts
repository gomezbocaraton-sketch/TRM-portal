/** Document types by revenue category.
 *
 *  When a document is added to a job, the type list is built from the
 *  categories present on that job's approved quote — a plumbing-only
 *  job never offers a Fire Alarm form — plus the universal set.
 */
export const DOC_TYPES: Record<string, string[]> = {
  "Applications & Filings": [
    "PW1 \u2014 Plan/Work Application",
    "PW1A \u2014 Schedule A",
    "PW2 \u2014 Work Permit Application",
    "PW3 \u2014 Cost Affidavit",
    "TR1 \u2014 Technical Report",
    "Signed & Sealed Plans",
    "Zoning Diagram",
    "Owner's Authorization / LAA",
    "Property Deed",
    "Existing Certificate of Occupancy",
    "DOB NOW Job Number Confirmation",
    "Objection Sheet / Plan Exam Comments",
    "Plan Approval Letter",
  ],
  "Work Permits": [
    "PW2 \u2014 Work Permit Application",
    "Contractor Insurance Certificate",
    "Workers' Comp Certificate",
    "GC License / Tracking Number",
    "Issued Permit / Placard",
    "Site Safety Plan",
  ],
  "Sign-Offs": [
    "PW7 \u2014 Request for Letter of Completion",
    "TR1 Progress Inspection Sign-off",
    "Final Inspection Report",
    "Letter of Completion",
    "Certificate of Occupancy",
    "Electrical Sign-off (ECB)",
    "Plumbing Final Inspection",
  ],
  "Post Approval Amendments": [
    "PAA Application (PW1 Amendment)",
    "Revised Signed & Sealed Plans",
    "Amended Cost Affidavit (PW3)",
    "PAA Approval Letter",
  ],
  "Project Coordination": [
    "Scope of Work",
    "Meeting Notes / Site Report",
    "Correspondence \u2014 DOB",
    "Correspondence \u2014 Client",
    "Schedule / Milestone Plan",
  ],
  "Inspections & Surveys": [
    "Site Inspection Report",
    "Matterport Scan Link",
    "Existing Conditions Survey",
    "Photo Documentation",
    "FDNY Inspection Request",
    "Special Assessment Report",
  ],
  "Registrations & Records": [
    "GC Registration Certificate",
    "Architect / Engineer Registration",
    "DOB Records Search Result",
    "OER Filing Receipt",
    "OER Letter of Completion",
    "Business Tax Receipt",
    "Insurance Certificate",
  ],
  "Out-of-State Filings": [
    "Local Permit Application",
    "Municipal Plan Review Comments",
    "Zoning Approval",
    "Certificate of Occupancy",
    "Health Department Approval",
    "Local Business License",
  ],
  "Construction Scope": [
    "Scope of Work / Proposal",
    "Shop Drawings",
    "Product Data / Cut Sheets",
    "Material Invoice",
    "Progress Photos",
    "Punch List",
    "Client Acceptance / Sign-off",
  ],
};

/** Always offered, whatever the job contains. */
export const UNIVERSAL_DOC_TYPES: string[] = [
  "Signed Quote / Contract",
  "Deposit Receipt",
  "Invoice",
  "Payment Receipt",
  "Change Order",
  "Other",
];

export function docTypesFor(categories: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of categories)
    for (const t of DOC_TYPES[c] || [])
      if (!seen.has(t)) { seen.add(t); out.push(t); }
  for (const t of UNIVERSAL_DOC_TYPES)
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  return out;
}
