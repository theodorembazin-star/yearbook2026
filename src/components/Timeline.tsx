"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Section = { key: string; title: string; items: unknown[] };

export default function Timeline({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(`s-${s.key}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Frise chronologique" className="relative h-full">
      <div className="timeline-rail absolute left-3 top-0 h-full w-px" />
      <ul className="space-y-1">
        {sections.map((s) => {
          const isActive = active === `s-${s.key}`;
          return (
            <li key={s.key}>
              <a
                href={`#s-${s.key}`}
                className="group flex items-center gap-3 py-1.5 text-sm"
              >
                <span
                  className={cn(
                    "ml-1.5 inline-block h-2 w-2 rounded-full border border-ink/30 bg-cream transition",
                    isActive && "h-3 w-3 border-accent bg-accent",
                  )}
                />
                <span
                  className={cn(
                    "font-display tracking-tight transition",
                    isActive ? "text-ink" : "text-ink/40 group-hover:text-ink/80",
                  )}
                >
                  {s.title}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
