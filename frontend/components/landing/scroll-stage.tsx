"use client";
import { useEffect, useRef } from "react";

// Scroll engine for the pinned workflow section. It never touches React state: one passive scroll listener, throttled by
// requestAnimationFrame, writes two things onto the section element: --p (0 to 1 progress through the pinned range,
// read by CSS for the continuous parts) and data-reach (which of the four steps is current, written only when it changes).
// Both are pure functions of scroll position, so scrolling back up reverses everything exactly.
// The listener exists only while the section is on screen, and only in the pinned layout (wide screens, motion allowed).
// Everywhere else the section is a static, fully revealed layout and this component does nothing.
export function ScrollStage({ steps, className, children }: { steps: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pinned = window.matchMedia("(min-width: 900px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let listening = false;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 1;
      el.style.setProperty("--p", p.toFixed(4));
      const reach = String(Math.min(steps, Math.floor(p * steps) + 1));
      if (el.dataset.reach !== reach) el.dataset.reach = reach;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const start = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    };
    const stop = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", onScroll);
    };
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { rootMargin: "100px 0px" });

    const mode = () => {
      if (pinned.matches) {
        io.observe(el);
      } else {
        io.disconnect();
        stop();
        el.style.removeProperty("--p");
      }
    };
    mode();
    pinned.addEventListener("change", mode);
    return () => {
      pinned.removeEventListener("change", mode);
      io.disconnect();
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [steps]);

  return (
    <section ref={ref} id="workflow" className={className} aria-labelledby="workflow-title" data-reach="1">
      {children}
    </section>
  );
}
