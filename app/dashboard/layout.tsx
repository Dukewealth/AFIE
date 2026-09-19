import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dashboard-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dashboard-mono",
});

export const metadata: Metadata = {
  title: "Incident Command · AFIE Fraud Operations",
  description:
    "Mission-critical fraud operations console — live stream, incident deep-dive, and rule tuning.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${plexSans.variable} ${plexMono.variable} dashboard-root min-h-screen`}
    >
      {children}
    </div>
  );
}
