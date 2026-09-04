export const FIRM = {
  name: "Code Consultation NYC",
  legal: "Code Consultation NYC Inc",
  addr: "30-10 41st Avenue",
  city: "Long Island City, NY 11101",
  phone: "(917) 396-2088",
  email: "codeconsultationnyc@gmail.com",
};

/** The 3% online payment fee — carried on 107 of the 131 historical
 *  Square line items, so it defaults on. */
export const FEE_RATE = 0.03;

export const DISCOUNTS = [
  { value: 0,  label: "None" },
  { value: 10, label: "10%" },
  { value: 20, label: "20%" },
  { value: 30, label: "30%" },
  { value: 40, label: "Friends & Family 40%" },
] as const;

export const CATEGORIES = [
  "Applications & Filings",
  "Work Permits",
  "Sign-Offs",
  "Post Approval Amendments",
  "Project Coordination",
  "Inspections & Surveys",
  "Registrations & Records",
  "Out-of-State Filings",
  "Construction Scope",
] as const;

export const STAGES = [
  { value: "todo",      label: "Not started",    weight: 0    },
  { value: "prep",      label: "Preparing",      weight: 0.3  },
  { value: "filed",     label: "Filed with DOB", weight: 0.6  },
  { value: "objection", label: "Objections",     weight: 0.5  },
  { value: "approved",  label: "Approved",       weight: 0.85 },
  { value: "done",      label: "Complete",       weight: 1    },
] as const;
