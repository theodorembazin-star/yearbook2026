// Helpers pour le verrouillage global + journal des modifications.

import type { SupabaseClient } from "@supabase/supabase-js";
import { YEARBOOK_ID } from "./config";

/**
 * Vérifie si le yearbook est verrouillé (côté server).
 * Retourne true si verrouillé, false sinon. Ignore silencieusement les
 * erreurs (colonne pas encore migrée → considéré non verrouillé).
 */
export async function isYearbookLocked(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("yearbooks")
      .select("locked")
      .eq("id", YEARBOOK_ID)
      .maybeSingle();
    if (error) return false;
    return Boolean((data as { locked?: boolean } | null)?.locked);
  } catch {
    return false;
  }
}

/**
 * Vérifie le verrou pour une requête : si verrouillé ET non-admin → bloque.
 * Retourne true si l'action est autorisée à passer.
 */
export async function checkUnlocked(
  supabase: SupabaseClient,
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) return true;
  const locked = await isYearbookLocked(supabase);
  return !locked;
}

export type AuditAction =
  | "upload"
  | "delete_photo"
  | "edit_caption"
  | "edit_date"
  | "move"
  | "hide_photo"
  | "unhide_photo"
  | "create_event"
  | "delete_event"
  | "create_person"
  | "delete_person"
  | "lock"
  | "unlock";

/**
 * Écrit une entrée de log. Best-effort : on n'échoue pas la requête
 * principale si le log échoue (table peut-être pas encore migrée).
 */
export async function audit(
  supabase: SupabaseClient,
  entry: {
    userName?: string | null;
    action: AuditAction;
    targetId?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      yearbook_id: YEARBOOK_ID,
      user_name: entry.userName ?? null,
      action: entry.action,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    });
  } catch (e) {
    console.warn("audit insert failed (non-fatal):", e);
  }
}
