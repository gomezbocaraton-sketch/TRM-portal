export const money = (n: number) =>
  "$" + Math.round(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const money2 = (n: number) =>
  "$" + (n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export const fdate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-US",
        { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
    : "—";

export type LineLike = { qty: number; unit_price: number; discount: number };

export function totals(lines: LineLike[], applyFee: boolean, rate = 0.03) {
  let subtotal = 0, discount = 0;
  for (const l of lines) {
    const gross = (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
    subtotal += gross;
    discount += gross * (Number(l.discount) || 0) / 100;
  }
  const net = subtotal - discount;
  const fee = applyFee ? net * rate : 0;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    subtotal: round(subtotal), discount: round(discount), net: round(net),
    fee: round(fee), total: round(net + fee),
  };
}
