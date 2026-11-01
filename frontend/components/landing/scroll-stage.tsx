"use client";
import { useEffect, useRef } from "react";

// Scroll engine for the pinned product reveal (the only scroll-linked system on the page).
// Native scrolling and CSS `position: sticky` do the pinning. One passive scroll listener, throttled by
// requestAnimationFrame, turns scroll position into two things on the section element:
//   --p          0 to 1 progress through the pinned range, read by CSS for the continuous parts. It is written onto the
//                few elements marked data-p (a non-inheriting registered property), not onto the section, so a frame
//                restyles those elements and not the whole subtree.
//   data-reach   which scene is current (1 to N, by `cuts`), written only when it changes, read by CSS transitions
// Both are pure functions of scroll position, so scrolling back up reverses everything exactly. No React state.
// Layout is measured once and when it can change (resize, content size), never per frame. The listener exists only
// while the section is near the viewport, and only in the pinned layout (wide, tall, motion allowed).
// Everywhere else the section is a static, fully revealed layout and this component does nothing.
export function ScrollStage({ id, cuts, className, children }: { id: string; cuts: number[]; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pinned = window.matchMedia("(min-width: 900px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let listening = false;
    let top = 0;
    let range = 0;
    const targets = Array.from(el.querySelectorAll<HTMLElement>("[data-p]"));

    const measure = () => {
      top = el.getBoundingClientRect().top + window.scrollY;
      range = el.offsetHeight - window.innerHeight;
    };
    const update = () => {
      frame = 0;
      const p = range > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / range)) : 1;
      const text = p.toFixed(4);
      if (el.dataset.p !== text) {
        el.dataset.p = text;
        for (const t of targets) t.style.setProperty("--p", text);
      }
      let reach = 1;
      for (const c of cuts) if (p >= c) reach++;
      const value = String(reach);
      if (el.dataset.reach !== value) el.dataset.reach = value;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const remeasure = () => {
      measure();
      schedule();
    };
    const start = () => {
      if (listening) return;
      listening = true;
      measure();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", remeasure);
      schedule();
    };
    const stop = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
    };
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { rootMargin: "200px 0px" });
    // Fonts and images above the section can move it; re-measure when the page height changes.
    const ro = new ResizeObserver(() => listening && remeasure());
    // Restoring from the back/forward cache keeps the old scroll position; recompute from it.
    const onShow = () => {
      if (pinned.matches) {
        measure();
        update();
      }
    };

    const mode = () => {
      if (pinned.matches) {
        measure();
        update(); // correct state immediately, including when the page loads at an anchor below the section
        io.observe(el);
        ro.observe(document.documentElement);
      } else {
        io.disconnect();
        ro.disconnect();
        stop();
        delete el.dataset.p;
        for (const t of targets) t.style.removeProperty("--p");
      }
    };
    mode();
    pinned.addEventListener("change", mode);
    window.addEventListener("pageshow", onShow);
    return () => {
      pinned.removeEventListener("change", mode);
      window.removeEventListener("pageshow", onShow);
      io.disconnect();
      ro.disconnect();
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [cuts]);

  return (
    <section ref={ref} id={id} className={className} aria-labelledby="product-title" data-reach="1">
      {children}
    </section>
  );
}
