"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Kategoriler" },
  { href: "/yonetim", label: "Stok Yönetimi" },
  { href: "/faturalar", label: "Faturalar" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 sm:gap-3"
          onClick={() => setOpen(false)}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f] text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm">
            AM
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#1e3a5f] sm:text-lg">
              Stok Yönetimi
            </p>
            <p className="truncate text-xs text-slate-500">Assos Metal</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex md:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 hover:text-[#1e3a5f] ${
                pathname === link.href
                  ? "bg-slate-100 text-[#1e3a5f]"
                  : "text-slate-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
        >
          {open ? (
            <span className="text-xl leading-none">×</span>
          ) : (
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          )}
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-100 px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-3 text-sm font-medium transition ${
                    pathname === link.href
                      ? "bg-slate-100 text-[#1e3a5f]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
