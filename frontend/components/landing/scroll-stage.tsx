"use client";
import { useEffect, useRef } from "react";
import { PIN_QUERY } from "./pin";

// Scroll engine for the pinned product film (the only scroll-linked system on the page).
// Native scrolling and CSS `position: sticky` do the pinning. One passive scroll listener, throttled by
// requestAnimationFrame, turns scroll position into two things:
//   --p          0 to 1 progress through the pinned range, read by CSS for the continuous parts. It is written onto the
//                few elements marked data-p (a non-inheriting registered property), not onto the section, so a frame
//                restyles those elements and not the whole subtree.
//   data-reach   which scene is current (1 to N, by `cuts`), written on the section only when it changes, read by CSS
//                transitions for the discrete parts
// Both are pure functions of scroll position, so scrolling back up reverses everything exactly. No React state.
// Layout is measured once and when it can change (resize, content size), never per frame. The listener exists only
// while the section is near the viewport, and only in the pinned layout.
// The pinned layout is switched on with html[data-lp="pin"], the flow layout (everything visible, nothing pinned or
// animated by scroll) with html[data-lp="flow"]; without script neither is set and the flow layout applies.
export function ScrollStage({ id, cuts, className, labelledBy, children }: { id: string; cuts: number[]; className?: string; labelledBy: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const pinned = window.matchMedia(PIN_QUERY);
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
        root.dataset.lp = "pin";
        measure();
        update(); // correct state immediately, including when the page loads at an anchor below the section
        io.observe(el);
        ro.observe(root);
      } else {
        root.dataset.lp = "flow";
        io.disconnect();
        ro.disconnect();
        stop();
        delete el.dataset.p;
        el.dataset.reach = "1";
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
      delete root.dataset.lp; // client navigation to the workspace must not inherit the landing layout switch
    };
  }, [cuts]);

  return (
    <section ref={ref} id={id} className={className} aria-labelledby={labelledBy} data-reach="1">
      {children}
    </section>
  );
}
