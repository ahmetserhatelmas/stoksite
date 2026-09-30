"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logout } from "@/actions/auth";
import type { SessionUser } from "@/lib/session";

type Props = {
  user?: SessionUser | null;
  unreadConversations?: number;
  center?: ReactNode;
  actions?: ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ user = null, unreadConversations = 0, center, actions }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Sipariş", badge: 0 },
    ...(user?.role === "admin"
      ? [
          { href: "/yonetim", label: "Stok", badge: 0 },
          { href: "/admin", label: "Admin", badge: 0 },
        ]
      : []),
    { href: "/faturalar", label: "Faturalar", badge: 0 },
    { href: "/mesajlar", label: "Mesajlar", badge: unreadConversations },
    { href: "/panel", label: "Panel", badge: 0 },
  ];

  return (
    <header className="border-b border-black/10 bg-[#2b2b2b] text-white">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 lg:px-4">
        <Link
          href="/"
          className="min-w-0 shrink-0"
          onClick={() => setOpen(false)}
        >
          <p className="truncate text-sm font-bold tracking-wide text-[#d4af37]">
            ASSOS METAL
          </p>
          <p className="truncate text-xs text-white/70">STOK YÖNETİMİ</p>
        </Link>

        {center ? (
          <div className="order-last w-full grow lg:order-none lg:mx-2 lg:max-w-xl">
            {center}
          </div>
        ) : null}

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative rounded-lg px-3 py-2 text-xs font-medium transition ${
                isActive(pathname, link.href)
                  ? "bg-[#d4af37] text-[#1a1a1a]"
                  : "border border-transparent text-white/90 hover:bg-white/10"
              }`}
            >
              {link.label}
              {link.badge > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {link.badge > 9 ? "9+" : link.badge}
                </span>
              ) : null}
            </Link>
          ))}
          {user ? (
            <>
              <span className="px-2 text-xs text-white/60">{user.name}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
                >
                  Çıkış
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/giris"
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                isActive(pathname, "/giris")
                  ? "bg-[#d4af37] text-[#1a1a1a]"
                  : "border border-transparent text-white/90 hover:bg-white/10"
              }`}
            >
              Giriş
            </Link>
          )}
          {actions}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 text-white"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
          >
            {open ? (
              <span className="text-xl leading-none">×</span>
            ) : (
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-3 py-3 md:hidden">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive(pathname, link.href)
                      ? "bg-[#d4af37] text-[#1a1a1a]"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge > 0 ? (
                    <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {link.badge > 9 ? "9+" : link.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <form action={logout}>
                  <button
                    type="submit"
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                  >
                    Çıkış ({user.name})
                  </button>
                </form>
              ) : (
                <Link
                  href="/giris"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  Giriş
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
