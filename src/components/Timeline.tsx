"use client";

import { useEffect, useMemo, useState } from "react";
import { cn, schoolYearOf, formatSchoolYear } from "@/lib/utils";

type Section = { key: string; title: string; items: unknown[] };

export default function Timeline({ sections }: { sections: Section[] }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (typeof window === "undefined" || sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const id = visible.target.id;
        const idx = sections.findIndex((s) => `s-${s.key}` === id);
        if (idx !== -1) setActiveIndex(idx);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(`s-${s.key}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  // Group sections by school year (Aug 20 cutoff).
  const groups = useMemo(() => {
    const out: { year: string; sections: { section: Section; index: number }[] }[] = [];
    sections.forEach((s, i) => {
      const year = schoolYearOf(s.key);
      const last = out[out.length - 1];
      if (last && last.year === year) last.sections.push({ section: s, index: i });
      else out.push({ year, sections: [{ section: s, index: i }] });
    });
    return out;
  }, [sections]);

  const activeYear =
    activeIndex >= 0 ? schoolYearOf(sections[activeIndex]?.key ?? "") : null;

  return (
    <nav aria-label="Frise chronologique">
      <ul className="space-y-5">
        {groups.map((g) => {
          const isActiveYear = g.year === activeYear;
          return (
            <li key={g.year}>
              <div
                className={cn(
                  "mb-3 font-display text-sm font-semibold uppercase tracking-[0.22em] transition-colors duration-300",
                  isActiveYear ? "text-ink" : "text-ink/35",
                )}
              >
                {formatSchoolYear(g.year)}
              </div>
              <ul className="space-y-2">
                {g.sections.map(({ section: s, index: i }) => {
                  const distance =
                    activeIndex === -1 ? 0 : Math.abs(i - activeIndex);
                  const size =
                    distance === 0
                      ? "text-3xl md:text-4xl font-display font-semibold leading-tight"
                      : distance === 1
                        ? "text-lg font-medium"
                        : distance === 2
                          ? "text-sm"
                          : "text-xs";
                  const tone =
                    distance === 0
                      ? "text-ink"
                      : distance === 1
                        ? "text-ink/65"
                        : distance === 2
                          ? "text-ink/40"
                          : "text-ink/25";
                  return (
                    <li key={s.key}>
                      <a
                        href={`#s-${s.key}`}
                        className={cn(
                          "block py-1 tracking-tight capitalize transition-all duration-300 hover:text-ink",
                          size,
                          tone,
                        )}
                      >
                        {/* Drop the year suffix — the school-year header above
                            already conveys the year context. */}
                        {s.title.replace(/\s+\d{4}$/, "")}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
