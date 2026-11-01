import "./landing.css";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Nav } from "@/components/landing/nav";
import { PIN_QUERY } from "@/components/landing/pin";
import { Closing, Evidence, Film, Footer, Models, Statement, Trace } from "@/components/landing/sections";

export const viewport = { themeColor: "#05060b", colorScheme: "dark" as const };

// The public page has its own type system, loaded for this route only so the workspace keeps IBM Plex.
// Display and body: Geist. Labels and figures: Geist Mono. One italic serif word per headline: Instrument Serif.
const sans = Geist({ subsets: ["latin"], variable: "--lp-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--lp-mono", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--lp-serif", display: "swap" });

// Chooses the pinned or the flow layout before first paint, so a wide screen never flashes the flow layout.
const layoutSwitch = `document.documentElement.dataset.lp=matchMedia(${JSON.stringify(PIN_QUERY)}).matches?"pin":"flow"`;

export default function Home() {
  return (
    <div className={`lp ${sans.variable} ${mono.variable} ${serif.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: layoutSwitch }} />
      <a href="#main" className="lp-skip">Skip to content</a>
      <Nav />
      <main id="main">
        <Film />
        <Statement />
        <Trace />
        <Models />
        <Evidence />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
