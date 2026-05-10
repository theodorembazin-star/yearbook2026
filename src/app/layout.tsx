import type { Metadata, Viewport } from "next";
import Grain from "@/components/Grain";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yearbook 2026 — Souvenirs collectifs",
  description:
    "Un yearbook collaboratif et chronologique. Chacun ajoute ses photos, on les trie par date et par personne, et on co-édite la mise en page.",
  // Forces the iOS Safari status-bar overlay to render dark when the page
  // is added to the home screen.
  appleWebApp: {
    statusBarStyle: "black-translucent",
  },
};

// Black browser chrome on mobile (address bar / status bar tint).
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        {/* Grain sits BEFORE children so photos and dialogs paint on top
            of it — keeping their colors untouched while the canvas and
            the aurora gain the printed-paper texture. */}
        <Grain />
        {children}
      </body>
    </html>
  );
}
