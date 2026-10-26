import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  CircleDot,
  Fingerprint,
  GitBranch,
  Radar,
  ShieldAlert,
} from "lucide-react";

/** A clearly labeled, illustrative product preview—not live fraud data. */
export function HeroIntelligence() {
  return (
    <div className="intel-preview" aria-label="Illustrative FinSight intelligence workspace preview">
      <div className="intel-preview-header">
        <div className="intel-preview-title"><span className="preview-product-icon"><Radar size={16} /></span><span>Intelligence overview</span><span className="preview-product-caption">/ DEMO</span></div>
        <div className="preview-status"><i /> SYSTEM PREVIEW</div>
      </div>
      <div className="intel-preview-body">
        <div className="preview-heading">
          <div>
            <div className="preview-overline">SIGNAL ANALYSIS <span> / 001</span></div>
            <h3>One signal. The bigger picture.</h3>
            <p>Investigate the relationships behind unusual activity.</p>
          </div>
          <span className="preview-meta">ILLUSTRATIVE DATA</span>
        </div>
        <div className="preview-graph">
          <div className="graph-grid" aria-hidden="true" />
          <div className="graph-corner graph-corner-top">ENTITY RELATIONSHIPS <span>·</span> LIVE VIEW CONCEPT</div>
          <svg viewBox="0 0 600 288" role="img" aria-label="Diagram of an account connected to transactions, a device, and other accounts">
            <defs>
              <linearGradient id="edge-highlight" x1="0" x2="1"><stop stopColor="#a8d5cb"/><stop offset="1" stopColor="#d5f78b"/></linearGradient>
            </defs>
            <path d="M298 142 C228 142 216 67 143 67 M298 142 C230 142 213 235 121 235 M298 142 C393 142 384 67 468 67 M298 142 C375 142 394 235 490 235" fill="none" stroke="#4a515e" strokeWidth="1.5"/>
            <path className="preview-edge-active" d="M298 142 C375 142 394 235 490 235" fill="none" stroke="url(#edge-highlight)" strokeWidth="2.2" strokeDasharray="6 7"/>
            <circle cx="298" cy="142" r="53" fill="#111821" stroke="#4c5864" strokeWidth="1.5" />
            <circle cx="298" cy="142" r="41" fill="#d5f78b" />
            <text x="298" y="150" fill="#111618" textAnchor="middle" fontSize="21" fontWeight="700" fontFamily="Arial, sans-serif">AC</text>
            {[[143,67],[121,235],[468,67]].map(([x,y], i)=><g key={i}><circle cx={x} cy={y} r="26" fill="#1b222b" stroke="#66707b"/><circle cx={x} cy={y} r="4" fill="#c7d1d7"/></g>)}
            <circle cx="490" cy="235" r="29" fill="#202d27" stroke="#d5f78b" strokeWidth="1.5"/>
            <circle cx="490" cy="235" r="8" fill="#d5f78b" />
            <text x="143" y="27" textAnchor="middle" fill="#c5cbd4" fontSize="12">ACCOUNT</text>
            <text x="121" y="281" textAnchor="middle" fill="#aeb6c1" fontSize="12">TRANSFER</text>
            <text x="468" y="27" textAnchor="middle" fill="#c5cbd4" fontSize="12">MERCHANT</text>
            <text x="490" y="281" textAnchor="middle" fill="#d5f78b" fontSize="12">SHARED DEVICE</text>
          </svg>
          <span className="graph-float-label"><CircleDot size={12} /> ACCOUNT CLUSTER <strong>04 / LINKED</strong></span>
        </div>
        <div className="preview-signal-row">
          <span className="preview-alert-icon"><ShieldAlert size={21}/></span>
          <div className="preview-alert-copy"><span>REVIEW SUGGESTED <span className="preview-indicator">DEMO SIGNAL</span></span><strong>Shared device across multiple accounts</strong><small>Context matters. A flag is not a fraud verdict.</small></div>
          <ArrowUpRight size={18} className="preview-alert-arrow"/>
        </div>
        <div className="preview-tool-row">
          <span><Fingerprint size={14}/> Evidence-first</span>
          <span><GitBranch size={14}/> Connected entities</span>
          <Link href="/app/overview">Explore workspace <ChevronRight size={15}/></Link>
        </div>
      </div>
    </div>
  );
}
