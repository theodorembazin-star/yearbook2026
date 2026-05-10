import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// HMAC-signed tokens for the invite/admin URLs. No JWT lib needed — these are
// short-lived shareable URLs, not session tokens.

const SECRET = () => process.env.YEARBOOK_TOKEN_SECRET ?? "dev-secret-change-me";

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newRawToken() {
  return b64url(randomBytes(18));
}

export function sign(yearbookId: string, role: "contributor" | "admin", raw: string) {
  const payload = `${yearbookId}.${role}.${raw}`;
  const mac = createHmac("sha256", SECRET()).update(payload).digest();
  return `${b64url(Buffer.from(payload))}.${b64url(mac)}`;
}

export function verify(token: string): { yearbookId: string; role: "contributor" | "admin"; raw: string } | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  let payload: string;
  try {
    payload = Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
  } catch {
    return null;
  }
  const expected = b64url(createHmac("sha256", SECRET()).update(payload).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [yearbookId, role, raw] = payload.split(".");
  if (role !== "contributor" && role !== "admin") return null;
  return { yearbookId, role, raw };
}
