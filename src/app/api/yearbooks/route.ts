import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { newRawToken, sign } from "@/lib/tokens";
import { nanoid } from "nanoid";

const Body = z.object({
  title: z.string().min(1).max(120),
  cover_emoji: z.string().min(1).max(6).default("📒"),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  if (!isServerConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured. Set env vars first." },
      { status: 503 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const baseSlug = slugify(parsed.data.title) || nanoid(6);
  let slug = baseSlug;

  // ensure slug uniqueness with up to 5 retries
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase
      .from("yearbooks")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${nanoid(4).toLowerCase()}`;
  }

  const inviteRaw = newRawToken();
  const adminRaw = newRawToken();

  const { data: yb, error } = await supabase
    .from("yearbooks")
    .insert({
      slug,
      title: parsed.data.title,
      cover_emoji: parsed.data.cover_emoji,
      invite_token: inviteRaw,
      admin_token: adminRaw,
    })
    .select()
    .single();

  if (error || !yb) {
    return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    slug: yb.slug,
    invite_token: sign(yb.id, "contributor", inviteRaw),
    admin_token: sign(yb.id, "admin", adminRaw),
  });
}
