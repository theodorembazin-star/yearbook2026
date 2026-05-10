import type { Metadata } from "next";
import Grain from "@/components/Grain";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yearbook 2026 — Souvenirs collectifs",
  description:
    "Un yearbook collaboratif et chronologique. Chacun ajoute ses photos, on les trie par date et par personne, et on co-édite la mise en page.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        {children}
        <Grain />
      </body>
    </html>
  );
}
