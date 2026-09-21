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
  title: "Mission Control · AFIE",
  description:
    "AFIE mission control — telemetric HUD, ingress matrix, and incident inspector for pre-settlement fraud ops.",
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
