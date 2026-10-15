import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Vault — Yu-Gi-Oh! Collection Manager",
  description:
    "Track your Yu-Gi-Oh! card collection, check live prices, build decks and scan cards. Free forever.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-16">
            {children}
          </main>
        </AuthProvider>
        <footer className="border-t border-[rgba(255,215,0,0.14)] py-8">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs leading-relaxed text-slate-500">
            <p className="mb-1 font-bold tracking-widest text-[#ffd700]">CARD VAULT</p>
            <p>
              Card data, images and prices by{" "}
              <a href="https://ygoprodeck.com" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
                YGOPRODeck
              </a>
              . Prices are market snapshots, not live quotes.
            </p>
            <p className="mt-1">
              Unofficial fan project. Yu-Gi-Oh! is a trademark of Konami. Your vault and decks are
              private to your account — export JSON backups from My Vault.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
