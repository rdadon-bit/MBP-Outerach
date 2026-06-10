import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBP Origination",
  description: "Outbound borrower origination engine — Max Benjamin Partners",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/borrowers", label: "Borrowers" },
  { href: "/import", label: "Import" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-navy text-white">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <div>
              <span className="font-semibold tracking-wide">MBP</span>
              <span className="text-gold ml-2 text-sm tracking-widest uppercase">Origination</span>
            </div>
            <nav className="flex gap-6 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-gold-light transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
