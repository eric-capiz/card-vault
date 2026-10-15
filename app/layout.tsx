import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Card Vault — !Yu-Gi-Oh Collection Manager",
  description:
    "Track your !Yu-Gi-Oh card collection, check live prices, build decks and scan cards. Free forever.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-20 sm:px-6">
            {children}
          </main>
        </AuthProvider>
        <footer className="border-t border-white/8 py-10">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs leading-relaxed text-dim sm:px-6">
            <p className="font-display mb-2 text-sm font-bold tracking-[0.3em]">
              <span className="text-foil">CARD VAULT</span>
            </p>
            <p>
              Card data, images and prices by{" "}
              <a
                href="https://ygoprodeck.com"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/20 underline-offset-2 transition hover:text-paper"
              >
                YGOPRODeck
              </a>
              . Prices are market snapshots, not live quotes.
            </p>
            <p className="mt-1">
              Unofficial fan project. !Yu-Gi-Oh is a trademark of Konami. Your vault and decks are
              private to your account — export JSON backups from My Vault.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
