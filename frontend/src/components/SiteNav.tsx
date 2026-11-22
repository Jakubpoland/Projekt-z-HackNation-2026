"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Wstęp" },
  { href: "/przewodnik", label: "Kalkulator" },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <nav aria-label="Główna">
      {LINKS.map((item) => (
        <Link key={item.href} href={item.href} aria-current={path === item.href ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
