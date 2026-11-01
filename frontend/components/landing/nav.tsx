"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";

const links = [
  { href: "#product", label: "Product" },
  { href: "#workflow", label: "Workflow" },
  { href: "#models", label: "Models" },
  { href: "#evidence", label: "Evidence" },
];

// Sticky bar. It gains a border and a solid ground once the page leaves the top (an IntersectionObserver on a sentinel,
// so there is no scroll listener). The mobile menu is a disclosure: Escape closes it and returns focus to its button.
export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 900 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <div ref={sentinel} className="lp-sentinel" aria-hidden="true" />
      <header className="lp-nav" data-scrolled={scrolled || open ? "true" : "false"}>
        <div className="lp-nav-inner">
          <Link href="/" className="lp-brand">
            <Brand />
          </Link>
          <nav className="lp-nav-links" aria-label="Sections">
            {links.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>
          <div className="lp-nav-actions">
            <Link prefetch={false} href="/app/overview" className="lp-btn lp-btn-quiet">
              Open workspace <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <button
              ref={toggle}
              type="button"
              className="lp-menu-button"
              aria-expanded={open}
              aria-controls="lp-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <nav id="lp-menu" className="lp-menu" aria-label="Sections" hidden={!open}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <Link prefetch={false} href="/app/overview" className="lp-btn lp-btn-primary" onClick={() => setOpen(false)}>
            Open workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>
    </>
  );
}
