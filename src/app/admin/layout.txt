import { logout } from './actions';

// Wraps every /admin/* page (the dashboard AND every project detail
// tab, since Next.js nests layouts automatically) with one shared
// header. This is the one place a logout button needs to exist.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="flex items-center justify-between border-b border-line bg-white px-8 py-3">
        <div className="flex items-center gap-3">
          <img src="/trm-logo-full.png" alt="TRM Partners" className="h-8 w-auto" />
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Admin
          </span>
        </div>
        <form action={logout}>
          <button className="text-xs font-medium text-ink-soft underline decoration-dotted hover:text-navy">
            Log out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
