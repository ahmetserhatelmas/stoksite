import Link from "next/link";

const links = [
  { href: "/", label: "Kategoriler" },
  { href: "/yonetim", label: "Stok Yönetimi" },
  { href: "/faturalar", label: "Faturalar" },
];

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a5f] text-sm font-bold text-white">
            AM
          </div>
          <div>
            <p className="text-lg font-bold text-[#1e3a5f]">Stok Yönetimi</p>
            <p className="text-xs text-slate-500">Assos Metal</p>
          </div>
        </Link>
        <nav className="flex gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-[#1e3a5f]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
