// POST /api/heic — recebe uma foto HEIC (corpo binário) e devolve-a em JPEG.
// Só para quem tem sessão na LoveNest: a conversão gasta CPU.
import { heicToJpeg, looksLikeHeic } from "./_heic";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const fail = (status: number, error: string) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

async function hasSession(auth: string | null): Promise<boolean> {
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_KEY) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: auth },
  });
  return r.ok;
}

export async function POST(request: Request): Promise<Response> {
  if (!(await hasSession(request.headers.get("authorization")))) return fail(401, "Sessão inválida");

  const input = new Uint8Array(await request.arrayBuffer());
  if (!looksLikeHeic(input)) return fail(415, "Não é uma foto HEIC");

  try {
    const out = await heicToJpeg(input);
    return new Response(out, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch (e) {
    console.error("heic", e);
    return fail(422, "Não foi possível converter a foto");
  }
}
