import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel px-5 py-14 text-center">
      <p className="font-display text-lg text-ink-2">That job doesn&rsquo;t exist</p>
      <p className="mt-1.5 text-sm text-ink-3">It may have been deleted.</p>
      <Link href="/jobs" className="btn mt-5 inline-flex">Back to jobs</Link>
    </div>
  );
}
