import type { Metadata, Viewport } from "next";
import "./globals.css";
import Offline from "@/components/Offline";

export const metadata: Metadata = {
  title: "Keelson — Safety management systems for small commercial vessels",
  description:
    "Build and keep the safety management system Transport Canada requires on small commercial vessels. Find your class and deadline, draft your SMS manual, and keep drills, familiarization and incident records offline on your phone.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1113" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        {children}
        <Offline />
      </body>
    </html>
  );
}
