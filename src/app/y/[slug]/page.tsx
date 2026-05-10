import { notFound } from "next/navigation";
import { demoPeople, demoPhotos, demoYearbook } from "@/lib/mock";
import YearbookView from "@/components/YearbookView";

export default async function YearbookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // For now we only serve the demo. When the API is wired up:
  // const yb = await fetchYearbookBySlug(slug, token)
  if (slug !== demoYearbook.slug) {
    // Render demo anyway so the showcase works for any slug while building.
  }

  const yearbook = { ...demoYearbook, slug };
  return (
    <YearbookView
      yearbook={yearbook}
      photos={demoPhotos}
      people={demoPeople}
    />
  );
}
