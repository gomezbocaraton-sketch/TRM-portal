import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadQuoteForPdf } from "@/app/(app)/quotes/actions";
import { quotePdfBuffer, quotePdfFilename } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const quote = await loadQuoteForPdf(id);
  if (!quote) return new NextResponse("Not found", { status: 404 });

  const pdf = quotePdfBuffer(quote);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quotePdfFilename(quote)}"`,
      "Cache-Control": "no-store",
    },
  });
}
