/** Desenha o cartão vertical (1080×1920) para partilhar nos Stories ou no WhatsApp. */

export type CardMode = "chap" | "days" | "nodate";

export interface CardInput {
  mode: CardMode;
  /** "Capítulo 9" */
  chapterLabel?: string;
  title?: string;
  /** "12 de outubro de 2026" */
  date?: string;
  photoUrl?: string | null;
  /** "1 ano, 2 meses e 1 dia" */
  timeLabel: string;
  /** "juntos desde 3 de setembro de 2025" */
  since?: string | null;
  /** "Ana & Rui" */
  names: string;
}

const W = 1080;
const H = 1920;
const SERIF = "Merriweather, Georgia, serif";
const SANS = "Nunito, ui-rounded, system-ui, -apple-system, 'Segoe UI', sans-serif";
const ACCENT = "#FF4F7B";
const ACCENT_INK = "#E8336A";
const INK = "#1C1A1D";
const GRAY = "#9A969E";
const HEART = "M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.6a4.3 4.3 0 017.5 2.9c0 5.4-7.5 10-7.5 10z";

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

async function loadImage(url: string): Promise<{ img: HTMLImageElement; release: () => void }> {
  // Via blob: o canvas não fica "sujo" e pode ser exportado.
  const blob = await (await fetch(url)).blob();
  const obj = URL.createObjectURL(blob);
  const img = new Image();
  img.src = obj;
  await img.decode();
  return { img, release: () => URL.revokeObjectURL(obj) };
}

function font(ctx: Ctx, f: string, spacing = 0) {
  ctx.font = f;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
}

function greedy(ctx: Ctx, words: string[], maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

/** Quebra em linhas equilibradas (sem uma palavra sozinha na última linha). */
function wrap(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  let lines = greedy(ctx, words, maxWidth);
  if (lines.length > 1 && lines.length <= maxLines) {
    let lo = maxWidth * 0.4, hi = maxWidth;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (greedy(ctx, words, mid).length === lines.length) hi = mid; else lo = mid;
    }
    lines = greedy(ctx, words, hi);
  }
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

function drawCover(ctx: Ctx, img: HTMLImageElement) {
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function drawHeart(ctx: Ctx, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = ACCENT;
  ctx.fill(new Path2D(HEART));
  ctx.restore();
}

/** Cartão branco e centrado (sem foto, ou "o nosso tempo"). */
function drawPlain(ctx: Ctx, kicker: string, big: string, bigSize: number, sub: string | null, brand: string) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";

  font(ctx, `700 ${bigSize}px ${SERIF}`, -1);
  const lines = wrap(ctx, big, 860, 4);
  const lh = Math.round(bigSize * 1.28);
  const block = 90 + 70 + lines.length * lh + (sub ? 80 : 0);
  let y = Math.round(H * 0.47 - block / 2);

  drawHeart(ctx, W / 2, y + 10, 84);
  y += 140;
  font(ctx, `800 30px ${SANS}`, 9);
  ctx.fillStyle = ACCENT_INK;
  ctx.fillText(kicker.toUpperCase(), W / 2, y);

  y += 40;
  font(ctx, `700 ${bigSize}px ${SERIF}`, -1);
  ctx.fillStyle = INK;
  for (const l of lines) { y += lh; ctx.fillText(l, W / 2, y); }

  if (sub) {
    y += 80;
    font(ctx, `600 34px ${SANS}`);
    ctx.fillStyle = GRAY;
    ctx.fillText(sub, W / 2, y);
  }

  font(ctx, `800 26px ${SANS}`, 7);
  ctx.fillStyle = GRAY;
  ctx.fillText(brand.toUpperCase(), W / 2, H - 130);
}

export async function renderStoryCard(d: CardInput): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts?.load(`700 80px Merriweather`),
      document.fonts?.load(`800 30px Nunito`),
    ]);
  } catch { /* usa a letra de reserva */ }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d") as Ctx;
  const brand = `${d.names} · LoveNest`;

  if (d.mode === "days") {
    drawPlain(ctx, "O livro da Nossa História", d.timeLabel, 92, d.since ?? null, brand);
  } else {
    const date = d.mode === "chap" ? d.date ?? null : null;
    let photo: Awaited<ReturnType<typeof loadImage>> | null = null;
    if (d.photoUrl) {
      try { photo = await loadImage(d.photoUrl); } catch { photo = null; }
    }

    if (!photo) {
      drawPlain(ctx, d.chapterLabel ?? "Nossa História", d.title ?? "", 78, date, brand);
    } else {
      drawCover(ctx, photo.img);
      photo.release();
      const g = ctx.createLinearGradient(0, H, 0, H * 0.42);
      g.addColorStop(0, "rgba(0,0,0,0.66)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "left";
      const x = 90;
      let y = H - 130;
      font(ctx, `800 26px ${SANS}`, 7);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(brand.toUpperCase(), x, y);

      y -= 92;
      if (date) {
        font(ctx, `600 36px ${SANS}`);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText(date, x, y);
        y -= 76;
      }

      font(ctx, `700 78px ${SERIF}`, -1);
      const lines = wrap(ctx, d.title ?? "", W - 180, 4);
      ctx.fillStyle = "#FFFFFF";
      for (let i = lines.length - 1; i >= 0; i--) { ctx.fillText(lines[i], x, y); y -= 98; }

      font(ctx, `800 28px ${SANS}`, 9);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillText((d.chapterLabel ?? "").toUpperCase(), x, y + 6);
    }
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível criar a imagem"))), "image/jpeg", 0.92),
  );
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
