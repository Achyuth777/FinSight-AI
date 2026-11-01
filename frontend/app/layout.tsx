import "./globals.css";
import "./obsidian.css";
import "./instrument.css";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

// Direction B (Instrument): Plex Sans for text, Plex Mono for figures and IDs.
// next/font self-hosts both, so the running app makes no request to Google.
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#0b0e13", colorScheme: "dark" };

export const metadata: Metadata = {
  title: "FinSight AI — See the signal.",
  description:
    "Explainable anomaly detection and financial investigation. A local ML engineering sandbox.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable + " " + mono.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
