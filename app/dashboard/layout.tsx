import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-dashboard-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dashboard-mono",
});

export const metadata: Metadata = {
  title: "AFIE Operations | Live Risk Console",
  description:
    "Real-time fraud evaluation feed, autonomous block metrics, and forensic transaction inspection.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${outfit.variable} ${plexMono.variable} dashboard-root min-h-screen`}
    >
      {children}
    </div>
  );
}
