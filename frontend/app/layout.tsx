import "./globals.css";
import "./obsidian.css";
import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
