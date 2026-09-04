"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/quotes/new", label: "New Quote" },
  { href: "/quotes",     label: "Quotes"    },
  { href: "/jobs",       label: "Jobs"      },
  { href: "/clients",    label: "Clients"   },
  { href: "/catalog",    label: "Catalog"   },
];

export default function NavTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-0.5">
      {TABS.map((t) => {
        const active =
          t.href === "/quotes"
            ? path === "/quotes"
            : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3.5 pb-3 pt-4 text-sm font-medium transition ${
              active
                ? "border-orange text-ink"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
