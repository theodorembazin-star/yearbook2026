"use client";

import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PeopleFilter({
  people,
  active,
  onChange,
}: {
  people: Person[];
  active: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(active.includes(id) ? active.filter((x) => x !== id) : [...active, id]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-white/60">Filtrer :</span>
      {people.map((p) => {
        const isActive = active.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition",
              isActive
                ? "border-white bg-white text-ink/70"
                : "border-white/20 bg-white/10 text-white/80 hover:bg-white/15",
            )}
          >
            {p.name}
          </button>
        );
      })}
      {active.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="ml-2 text-xs text-white/50 underline hover:text-white"
        >
          réinitialiser
        </button>
      )}
    </div>
  );
}
