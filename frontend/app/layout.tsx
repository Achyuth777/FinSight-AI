import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// Geist for interface text, Geist Mono for figures and identifiers. The landing page and the workspace share them.
// next/font self-hosts both, so the running app makes no request to Google.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

// One italic serif word for the occasional non-operational headline (sign-in, first use). Never used in tables or controls.
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-serif", display: "swap" });

export const viewport: Viewport = { themeColor: "#05060b", colorScheme: "dark" };

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
    <html lang="en" className={sans.variable + " " + mono.variable + " " + serif.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
