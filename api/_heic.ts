// HEIC → JPEG no servidor. No browser do telemóvel o conversor (libheif em
// JS) falha ou demora demasiado; aqui corre em Node, num CPU de servidor.
import decode from "heic-decode";
import jpeg from "jpeg-js";

/** Lado maior da imagem final — chega para ecrã inteiro e mantém a resposta leve. */
const MAX_SIDE = 2560;

/** Reduz por média de blocos k×k (k inteiro): rápido e sem serrilhado. */
function shrink(data: Uint8ClampedArray, w: number, h: number, k: number) {
  const W = Math.floor(w / k), H = Math.floor(h / k), out = new Uint8Array(W * H * 4), n = k * k;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < k; dy++) {
        let i = ((y * k + dy) * w + x * k) * 4;
        for (let dx = 0; dx < k; dx++, i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
      }
      const o = (y * W + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { data: out, width: W, height: H };
}

export async function heicToJpeg(input: Uint8Array, quality = 85): Promise<Buffer> {
  const img = await decode({ buffer: input });
  const k = Math.ceil(Math.max(img.width, img.height) / MAX_SIDE);
  const frame = k > 1
    ? shrink(img.data, img.width, img.height, k)
    : { data: img.data, width: img.width, height: img.height };
  return jpeg.encode(frame, quality).data;
}

/** ftyp heic/heix/hevc/mif1/msf1 — reconhece HEIC pelo conteúdo, não pelo nome. */
export function looksLikeHeic(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  const box = String.fromCharCode(...b.subarray(4, 12));
  return /^ftyp(heic|heix|hevc|hevx|mif1|msf1)/.test(box);
}
