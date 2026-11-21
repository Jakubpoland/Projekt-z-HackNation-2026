import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zasiłkowy Przewodnik Przyszłego Rodzica",
  description: "Jeden przewodnik po zasiłkach w ciąży i po urodzeniu albo przyjęciu dziecka: prawo, okres, kwota, płatnik, dokumenty i ryzyka.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <header className="header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                P
              </span>
              <span>Zasiłkowy Przewodnik Przyszłego Rodzica</span>
            </Link>
            <nav aria-label="Główna">
              <Link href="/">Przewodnik</Link>
              <Link href="/admin">Parametry</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
