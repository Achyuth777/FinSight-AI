"use client";
import { useEffect, useRef } from "react";

// Settles an element into place once, the first time it is mostly on screen. Without script (or after hydration, for
// anything already in view) the element is simply visible: CSS hides it only after this effect marks it ready, and an
// element that is already in view is marked "in" in the same frame, so nothing flashes.
// Marks an element live only while it is on screen, so looping CSS animation inside it can pause offscreen.
export function Live({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.live = entry.isIntersecting ? "true" : "false";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} data-live="false">
      {children}
    </div>
  );
}

export function Reveal({ className, children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) {
      el.dataset.in = "true";
      return;
    }
    el.dataset.ready = "true";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.in = "true";
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-reveal role={label ? "img" : undefined} aria-label={label}>
      {children}
    </div>
  );
}
