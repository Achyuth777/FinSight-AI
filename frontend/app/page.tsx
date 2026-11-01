import "./landing.css";
import { Nav } from "@/components/landing/nav";
import { Closing, Evidence, Footer, Hero, Models, Product, Workflow } from "@/components/landing/sections";

export default function Home() {
  return (
    <div className="lp">
      <a href="#main" className="lp-skip">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <Product />
        <Workflow />
        <Models />
        <Evidence />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
