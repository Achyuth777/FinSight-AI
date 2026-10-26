"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  ScanLine,
  Network,
  Layers3,
  Workflow,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { HeroIntelligence } from "@/components/hero-intelligence";
import { Button } from "@/components/ui/button";
export default function Home() {
  const [stage, setStage] = useState(0);
  const reduce = useReducedMotion();
  return (
    <div className="marketing">
      <nav className="marketing-nav">
        <Link href="/" aria-label="FinSight home">
          <Brand />
        </Link>
        <div className="marketing-links">
          <a href="#platform">Platform</a>
          <a href="#methodology">Methodology</a>
          <a href="#workflow">How it works</a>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/overview">
            Open workspace <ArrowUpRight size={16} />
          </Link>
        </Button>
      </nav>
      <main>
        <section className="hero">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="eyebrow">
              <span className="status-dot" /> A NEW STANDARD FOR FINANCIAL INTELLIGENCE
            </span>
            <h1>
              See the pattern.
              <br />
              Understand the risk.
              <br />
              <span>Decide with clarity.</span>
            </h1>
            <p>
              From unusual transactions to explainable decisions.
              <br className="desktop-break" /> Real models, connected evidence, and the human judgment that matters.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/app/overview">
                  Launch the workspace <ArrowRight size={17} />
                </Link>
              </Button>
              <a className="text-link" href="#methodology">
                Under the hood <ChevronRight size={16} />
              </a>
            </div>
            <div className="hero-note">
              OPEN-SOURCE MVP <span>•</span> BUILT FOR TRANSPARENT INVESTIGATIONS
            </div>
          </motion.div>
          <HeroIntelligence />
        </section>
        <div className="principle-strip">
          <span>Built for understanding.</span>
          <span>
            <ScanLine size={18} /> Explainable signals
          </span>
          <span>
            <Network size={18} /> Connected evidence
          </span>
          <span>
            <ShieldCheck size={18} /> Analyst-led decisions
          </span>
        </div>
        <section id="platform" className="marketing-section">
          <div className="section-intro">
            <span className="eyebrow">01 / THE PLATFORM</span>
            <h2>
              From a sea of transactions
              <br />
              to the signals that matter.
            </h2>
            <p>
              One workspace to explore behavior, inspect model results,
              <br />
              and document what you find.
            </p>
          </div>
          <div className="capabilities">
            {[
              {
                icon: ScanLine,
                title: "Look beyond the obvious.",
                text: "Isolation Forest learns transaction patterns and surfaces unusual combinations for review.",
                tag: "TRANSACTION INTELLIGENCE",
                href: "transactions",
              },
              {
                icon: Network,
                title: "Follow the connections.",
                text: "Explore accounts linked by shared devices. Every relationship comes from your dataset.",
                tag: "ENTITY NETWORK",
                href: "network",
              },
              {
                icon: Workflow,
                title: "Give every decision a trail.",
                text: "Keep transaction evidence, analyst notes, and investigation decisions together.",
                tag: "INVESTIGATION CENTER",
                href: "investigations",
              },
            ].map(({ icon: Icon, title, text, tag, href }, i) => (
              <Link className="capability" href={"/app/" + href} key={tag}>
                <div className="capability-icon">
                  <Icon size={28} />
                  <span>0{i + 1}</span>
                </div>
                <span className="eyebrow">{tag}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight className="cap-arrow" size={20} />
              </Link>
            ))}
          </div>
        </section>
        <section className="method-section" id="methodology">
          <div>
            <span className="eyebrow">02 / NO BLACK BOX PROMISES</span>
            <h2>
              A score starts
              <br />
              the conversation.
              <br />
              <span>Evidence moves it forward.</span>
            </h2>
            <p>
              An unusual transaction isn’t automatically fraud. Inspect the
              underlying features, compare against training behavior, and
              evaluate on later transactions.
            </p>
            <Button asChild variant="outline">
              <Link href="/app/laboratory">
                Inside the ML laboratory <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
          <div className="method-card">
            <div className="card-heading">
              <Layers3 size={19} />
              <strong>The detection pipeline</strong>
              <span className="pill">REPRODUCIBLE</span>
            </div>
            {[
              [
                "01",
                "Validate",
                "Typed CSV schema · finite values · unique IDs",
              ],
              ["02", "Learn", "Chronological split · training-only fit"],
              [
                "03",
                "Explain",
                "Anomaly rank · feature deviations · optional SHAP",
              ],
              [
                "04",
                "Evaluate",
                "Held-out precision, recall, ROC-AUC and average precision",
              ],
            ].map(([n, title, text]) => (
              <div className="pipeline-step" key={n}>
                <span>{n}</span>
                <div>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </div>
            ))}
            <div className="method-foot">
              Anomaly percentile ≠ calibrated fraud probability
            </div>
          </div>
        </section>
        <section id="workflow" className="marketing-section">
          <div className="section-intro">
            <span className="eyebrow">03 / YOUR NEXT INVESTIGATION</span>
            <h2>Clarity at every step.</h2>
          </div>
          <div className="workflow-preview">
            <div className="workflow-tabs">
              {[
                "Find the signal",
                "Inspect the evidence",
                "Record the decision",
              ].map((s, i) => (
                <button
                  key={s}
                  className={stage === i ? "selected" : ""}
                  onClick={() => setStage(i)}
                >
                  <span>0{i + 1}</span>
                  {s}
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>
            <div className="workflow-content">
              <span className="pill">INTERACTIVE WALKTHROUGH</span>
              <h3>
                {
                  [
                    "Start with what stands out.",
                    "Understand what changed.",
                    "Leave a clear audit trail.",
                  ][stage]
                }
              </h3>
              <p>
                {
                  [
                    "Filter the review queue by anomaly percentile, amount, merchant, or account. Open a transaction to investigate.",
                    "See the original transaction, its training-relative feature deviations, and linked account activity.",
                    "Open a case, add your observations, and mark it reviewing, cleared, or escalated. Every change is recorded.",
                  ][stage]
                }
              </p>
              <Button asChild>
                <Link
                  href={
                    "/app/" +
                    ["transactions", "network", "investigations"][stage]
                  }
                >
                  Try this in the workspace <ArrowUpRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="architecture">
          <span className="eyebrow">A SMALL, UNDERSTANDABLE STACK</span>
          <div>
            <span>
              Next.js<span>Analyst workspace</span>
            </span>
            <ArrowRight />
            <span>
              FastAPI<span>Workflow orchestration</span>
            </span>
            <ArrowRight />
            <span>
              Python ML<span>Deterministic execution</span>
            </span>
            <ArrowRight />
            <span>
              SQLAlchemy<span>SQLite / PostgreSQL</span>
            </span>
          </div>
        </section>
        <section className="final-cta">
          <span className="eyebrow">MAKE THE SIGNAL VISIBLE</span>
          <h2>Your investigation starts here.</h2>
          <Button asChild>
            <Link href="/app/overview">
              Launch FinSight AI <ArrowUpRight size={18} />
            </Link>
          </Button>
          <p>Load the synthetic dataset or bring your own CSV.</p>
        </section>
      </main>
      <footer>
        <Brand />
        <span>A learning platform for serious ML engineering.</span>
        <span>LOCAL MVP / v0.1</span>
      </footer>
    </div>
  );
}
