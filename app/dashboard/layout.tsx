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
  title: "AFIE RiskOps Studio",
  description:
    "Enterprise fraud risk operations console — telemetry, event stream, and case investigation.",
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
