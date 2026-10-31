import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Notebook",
  description: "Your own notebooks — chapters, pages, notes, files, and highlights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
