import { jsPDF } from "jspdf";
import { FIRM } from "./constants";
import { money2, fdate } from "./money";
import { LOGO_LOCKUP_DATA_URL } from "./logo";

export type PdfLine = {
  name: string;
  category: string;
  qty: number;
  unit_price: number;
  discount: number;
};

export type PdfQuote = {
  number: string;
  created_at?: string | null;
  valid_days?: number | null;
  project?: string | null;
  notes?: string | null;
  subtotal: number;
  discount: number;
  net: number;
  fee_amount: number;
  total: number;
  client: {
    name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    addr1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  lines: PdfLine[];
};

const INK: [number, number, number] = [27, 30, 51];
const GREY: [number, number, number] = [110, 116, 140];
const RULE: [number, number, number] = [198, 202, 216];
const NAVY: [number, number, number] = [40, 43, 98];
const ORANGE: [number, number, number] = [210, 96, 58];
const FOOTER_Y = 742;

/** Builds the quote PDF. Runs on the server, so the same document is
 *  used by the download route and by the email attachment. */
export function buildQuotePdf(q: PdfQuote): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612;
  const M = 52;
  let y = 54;

  // ── letterhead ──
  try {
    doc.addImage(LOGO_LOCKUP_DATA_URL, "PNG", M, y - 16, 152, 90);
  } catch {
    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...NAVY);
    doc.text(FIRM.legal, M, y + 20);
  }
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GREY);
  doc.text(FIRM.addr, M, y + 86);
  doc.text(FIRM.city, M, y + 97);
  doc.text(`${FIRM.phone}  ·  ${FIRM.email}`, M, y + 108);

  doc.setFont("helvetica", "bold").setFontSize(19).setTextColor(...NAVY);
  doc.text("QUOTE", W - M, y, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...INK);
  doc.text(`No. ${q.number}`, W - M, y + 16, { align: "right" });
  doc.setTextColor(...GREY);
  const issued = q.created_at || new Date().toISOString();
  doc.text(`Issued ${fdate(issued)}`, W - M, y + 28, { align: "right" });
  const exp = new Date(issued);
  exp.setDate(exp.getDate() + (q.valid_days || 30));
  doc.text(`Valid through ${fdate(exp.toISOString())}`, W - M, y + 40, { align: "right" });

  y += 124;
  doc.setDrawColor(...NAVY).setLineWidth(1.4).line(M, y, W - M, y);
  doc.setDrawColor(...ORANGE).setLineWidth(2.6).line(M, y + 3.4, M + 92, y + 3.4);
  y += 22;

  // ── prepared for ──
  const c = q.client || {};
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...ORANGE);
  doc.text("PREPARED FOR", M, y);
  doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(...INK);
  doc.text(c.company || c.name || "—", M, y + 15);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...GREY);
  let ly = y + 27;
  const addr = [c.city, c.state, c.zip].filter(Boolean).join(", ");
  [c.name, c.addr1, addr, c.email, c.phone]
    .filter((s): s is string => Boolean(s))
    .forEach((s) => { doc.text(s, M, ly); ly += 11; });

  if (q.project) {
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...ORANGE);
    doc.text("PROJECT", W / 2 + 10, y);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...INK);
    doc.text(doc.splitTextToSize(q.project, W / 2 - M - 10), W / 2 + 10, y + 14);
  }
  y = Math.max(ly, y + 62) + 14;

  // ── line table ──
  const cQ = M + 286, cR = M + 330, cD = M + 404, cA = W - M;
  doc.setFillColor(234, 236, 243).rect(M, y - 11, W - 2 * M, 20, "F");
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...GREY);
  doc.text("SERVICE", M + 6, y + 2);
  doc.text("QTY", cQ + 22, y + 2, { align: "right" });
  doc.text("RATE", cR + 56, y + 2, { align: "right" });
  doc.text("DISC", cD + 40, y + 2, { align: "right" });
  doc.text("AMOUNT", cA - 6, y + 2, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal").setFontSize(9);
  for (const l of q.lines) {
    if (y > FOOTER_Y - 60) { doc.addPage(); y = 60; }
    const amt = l.qty * l.unit_price * (1 - (l.discount || 0) / 100);
    doc.setTextColor(...INK).setFontSize(9);
    doc.text(doc.splitTextToSize(l.name, 262)[0], M + 6, y);
    doc.setFontSize(7.5).setTextColor(...GREY);
    doc.text(l.category, M + 6, y + 10);
    doc.setFontSize(9).setTextColor(...INK);
    doc.text(String(l.qty), cQ + 22, y, { align: "right" });
    doc.text(money2(l.unit_price), cR + 56, y, { align: "right" });
    if (l.discount) {
      doc.setTextColor(...ORANGE);
      doc.text(`${l.discount}%`, cD + 40, y, { align: "right" });
    } else {
      doc.setTextColor(...GREY);
      doc.text("—", cD + 40, y, { align: "right" });
    }
    doc.setTextColor(...INK);
    doc.text(money2(amt), cA - 6, y, { align: "right" });
    y += 15;
    doc.setDrawColor(224, 227, 238).setLineWidth(0.5).line(M, y, W - M, y);
    y += 13;
  }

  // ── totals ──
  if (y > FOOTER_Y - 110) { doc.addPage(); y = 60; }
  y += 6;
  const tx = W - M, lx = W - M - 190;
  const row = (label: string, val: string, bold = false, color = bold ? INK : GREY) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(...color);
    doc.text(label, lx, y);
    doc.text(val, tx, y, { align: "right" });
    y += bold ? 18 : 14;
  };
  row("Subtotal", money2(q.subtotal));
  if (q.discount > 0) row("Discounts", "-" + money2(q.discount), false, ORANGE);
  row("Net", money2(q.net));
  if (q.fee_amount > 0) row("Online payment fee (3%)", money2(q.fee_amount));
  y += 3;
  doc.setDrawColor(...NAVY).setLineWidth(1.2).line(lx, y - 9, tx, y - 9);
  y += 6;
  row("TOTAL", money2(q.total), true, NAVY);

  if (q.notes) {
    y += 14;
    doc.setFont("helvetica", "normal").setFontSize(9);
    const noteLines = doc.splitTextToSize(q.notes, W - 2 * M) as string[];
    // Only break to a new page if the block genuinely will not fit above the footer.
    if (y + 13 + noteLines.length * 12 > FOOTER_Y - 26) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...ORANGE);
    doc.text("NOTES", M, y);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...INK);
    y += 13;
    for (const t of noteLines) { doc.text(t, M, y); y += 12; }
  }

  // Footer on every page, with page numbers once there is more than one.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...ORANGE).setLineWidth(1).line(M, FOOTER_Y - 14, W - M, FOOTER_Y - 14);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GREY);
    doc.text(`Quote ${q.number} · ${FIRM.name} · ${FIRM.phone} · ${FIRM.email}`, M, FOOTER_Y);
    doc.text(
      "Municipal filing fees, DOB/DOT permit fees and third-party expenses are billed separately unless stated above.",
      M, FOOTER_Y + 10
    );
    if (pages > 1) {
      doc.text(`Page ${i} of ${pages}`, W - M, FOOTER_Y, { align: "right" });
    }
  }
  return doc;
}

export function quotePdfBuffer(q: PdfQuote): Buffer {
  return Buffer.from(buildQuotePdf(q).output("arraybuffer"));
}

export function quotePdfFilename(q: PdfQuote): string {
  const who = (q.client.company || q.client.name || "client")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `Quote-${q.number}-${who}.pdf`;
}
