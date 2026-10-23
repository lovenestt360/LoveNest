// Ícones das funcionalidades da Home: quadrado branco e desenho a cores (mesmo acabamento da Faísca).
// Gerado a partir de docs/mockups/icones-proposta.html (maqueta aprovada). Devolve SVG em texto.
import { moodFaceSvg, MOOD_TINT } from "@/features/mood/moodArtSvg";

const SQ = "M21.7 1h20.6C53.7 1 63 10.3 63 21.7v20.6C63 53.7 53.7 63 42.3 63H21.7C10.3 63 1 53.7 1 42.3V21.7C1 10.3 10.3 1 21.7 1Z";
const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const heartAt = (x, y, s, fill) => `<path transform="translate(${x - 12 * s} ${y - 11.5 * s}) scale(${s})" d="${HEART}" fill="${fill}"/>`;
const star4 = (x, y, r, fill) => `<path d="M${x} ${y - r}C${x + r * .18} ${y - r * .18} ${x + r * .18} ${y - r * .18} ${x + r} ${y}C${x + r * .18} ${y + r * .18} ${x + r * .18} ${y + r * .18} ${x} ${y + r}C${x - r * .18} ${y + r * .18} ${x - r * .18} ${y + r * .18} ${x - r} ${y}C${x - r * .18} ${y - r * .18} ${x - r * .18} ${y - r * .18} ${x} ${y - r}Z" fill="${fill}"/>`;

// fundo branco; o desenho a cores, com gradientes, luz e detalhe (mesmo acabamento da Faísca)
const lg = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const shine = (id) => `<radialGradient id="${id}" cx=".3" cy=".2" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
const soft = (id) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.5" flood-color="#0B1324" flood-opacity=".18"/></filter>`;
const ICONS = {
  chat: { glyph: (u) => `<defs>${lg(u + "a", "#FF8FAB", "#FF3D6E")}${lg(u + "b", "#FFE1E9", "#FFC2D2")}${shine(u + "s")}${soft(u + "f")}</defs>
      <g filter="url(#${u}f)">
        <path d="M30 17.5c0-5.5 5.6-9.5 12.5-9.5S55 12 55 17.5c0 3.4-2 6.3-5.2 8.1l.9 4.2c.2.7-.6 1.2-1.2.8l-4.6-3.3c-.8.1-1.6.2-2.4.2-6.9 0-12.5-4-12.5-9.5Z" fill="url(#${u}b)"/>
        <path d="M9 32.5C9 24.5 16.6 18.5 26 18.5S43 24.5 43 32.5 35.4 46.5 26 46.5c-1.7 0-3.3-.2-4.9-.6l-7.4 4.6c-.8.5-1.7-.2-1.5-1.1l1.4-5.9C10.8 41 9 36.9 9 32.5Z" fill="url(#${u}a)"/>
        <path d="M9 32.5C9 24.5 16.6 18.5 26 18.5S43 24.5 43 32.5Z" fill="url(#${u}s)" opacity=".5"/>
        ${heartAt(26, 33, .62, "#fff")}
        <circle cx="38" cy="17.6" r="1.5" fill="#FF6B8E"/><circle cx="42.6" cy="17.6" r="1.5" fill="#FF6B8E"/><circle cx="47.2" cy="17.6" r="1.5" fill="#FF6B8E"/>
      </g>` },
  agenda: { calendar: true },
  humor: { humor: true },
  espiritual: { glyph: (u) => `<defs>${lg(u + "a", "#8E8CFF", "#5148D6")}${lg(u + "p", "#FFFFFF", "#ECEBFF")}${lg(u + "q", "#F4F3FF", "#DCDAFF")}${soft(u + "f")}</defs>
      <g filter="url(#${u}f)">
        <path d="M32 21.5c-6-4.5-13.5-5.6-21-4.2-1 .2-1.7 1-1.7 2v25.6c0 1.3 1.2 2.2 2.4 2 7.2-1.2 14 .2 20.3 4.6 6.3-4.4 13.1-5.8 20.3-4.6 1.2.2 2.4-.7 2.4-2V19.3c0-1-.7-1.8-1.7-2-7.5-1.4-15-.3-21 4.2Z" fill="url(#${u}a)"/>
        <path d="M31 22.8c-5.3-3.7-11.6-4.6-18-3.6v24.6c6.3-.9 12.4.3 18 3.8Z" fill="url(#${u}p)"/>
        <path d="M33 22.8c5.3-3.7 11.6-4.6 18-3.6v24.6c-6.3-.9-12.4.3-18 3.8Z" fill="url(#${u}q)"/>
        <g stroke="#B9B6F5" stroke-width="1.3" stroke-linecap="round"><path d="M16.5 26c3.4-.4 6.8.2 10 1.8M16.5 31c3.4-.4 6.8.2 10 1.8M16.5 36c3.4-.4 6.8.2 10 1.8M37.5 27.8c3.2-1.6 6.6-2.2 10-1.8M37.5 32.8c3.2-1.6 6.6-2.2 10-1.8"/></g>
        <path d="M40 19.6v13l2.6-2 2.6 2V18.7c-1.8.1-3.5.4-5.2.9Z" fill="#FF5A7E"/>
        ${star4(32, 11.5, 4.2, "#FFC93C")}
      </g>` },
  conflitos: { glyph: (u) => `<defs>${lg(u + "a", "#FF8A80", "#E8283B")}${lg(u + "b", "#FFF3E8", "#FFD9BF")}${shine(u + "s")}${soft(u + "f")}</defs>
      <g filter="url(#${u}f)">
        ${heartAt(32, 34.5, 1.72, `url(#${u}a)`)}
        <ellipse cx="22.5" cy="21.5" rx="5.5" ry="3.4" fill="url(#${u}s)" transform="rotate(-30 22.5 21.5)"/>
        <g transform="rotate(-40 32 31)">
          <rect x="15" y="25.5" width="34" height="11" rx="5.5" fill="url(#${u}b)"/>
          <rect x="26.5" y="25.5" width="11" height="11" fill="#F6C4A3"/>
          <g fill="#E7A27E"><circle cx="29.5" cy="28.8" r=".95"/><circle cx="34.5" cy="28.8" r=".95"/><circle cx="29.5" cy="33.2" r=".95"/><circle cx="34.5" cy="33.2" r=".95"/><circle cx="32" cy="31" r=".95"/></g>
        </g>
      </g>` },
  historia: { glyph: (u) => `<defs>${lg(u + "a", "#FF8DB0", "#D9346A")}${lg(u + "e", "#FFFFFF", "#F1E8EC", 1, 0)}${shine(u + "s")}${soft(u + "f")}</defs>
      <g filter="url(#${u}f)">
        <path d="M21 13h22.5c2.5 0 4.5 2 4.5 4.5v26H21Z" fill="url(#${u}e)"/>
        <g stroke="#E6D6DD" stroke-width=".8"><path d="M46.2 16v26.5M44.6 16v26.5"/></g>
        <path d="M18.5 12h22c2.2 0 4 1.8 4 4v28.5c0 2.2-1.8 4-4 4h-22c-1.9 0-3.5-1.6-3.5-3.5V15.5c0-1.9 1.6-3.5 3.5-3.5Z" fill="url(#${u}a)"/>
        <path d="M15 44.5c0-1.9 1.6-3.5 3.5-3.5H48v6.5c0 1.4-1.1 2.5-2.5 2.5H18.5c-1.9 0-3.5-1.6-3.5-3.5Z" fill="url(#${u}e)"/>
        <path d="M20 12v29" stroke="#fff" stroke-opacity=".28" stroke-width="1.6"/>
        <path d="M15 15.5c0-1.9 1.6-3.5 3.5-3.5h22c2.2 0 4 1.8 4 4v6H15Z" fill="url(#${u}s)" opacity=".55"/>
        ${heartAt(30.5, 27, .78, "#fff")}
        <path d="M36 41v12l2.5-2 2.5 2V41Z" fill="#FFC93C"/>
      </g>` },
  capsula: { glyph: (u) => `<defs>${lg(u + "w", "#C79BFF", "#7E3FE0")}${lg(u + "g", "#F7EEFF", "#E6D3FF")}${lg(u + "s", "#FFD86B", "#F5A524")}${soft(u + "f")}</defs>
      <g filter="url(#${u}f)">
        <path d="M21.5 15h21c0 7.6-4.4 11.6-8 15.6l-.6.7c-.5.5-.5 1.3 0 1.8l.6.7c3.6 4 8 8 8 15.6h-21c0-7.6 4.4-11.6 8-15.6l.6-.7c.5-.5.5-1.3 0-1.8l-.6-.7c-3.6-4-8-8-8-15.6Z" fill="url(#${u}g)"/>
        <path d="M26.5 20h11c-1.1 3-3.3 5.2-5.5 7.6-2.2-2.4-4.4-4.6-5.5-7.6Z" fill="url(#${u}s)"/>
        <path d="M24.8 47c1.6-4.4 4.2-6.6 7.2-6.6s5.6 2.2 7.2 6.6Z" fill="url(#${u}s)"/>
        <path d="M32 31.5v8" stroke="#F5A524" stroke-width="1.4" stroke-linecap="round" stroke-dasharray=".1 2.6"/>
        <path d="M24.5 17.5c.3 3.6 1.8 6.2 3.6 8.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>
        <rect x="17" y="10" width="30" height="6" rx="3" fill="url(#${u}w)"/>
        <rect x="17" y="47.5" width="30" height="6" rx="3" fill="url(#${u}w)"/>
        <rect x="19" y="11" width="16" height="1.6" rx=".8" fill="#fff" opacity=".45"/>
      </g>` },
  desafios: { glyph: (u) => `<defs>${lg(u + "a", "#FFE27A", "#F0A20F")}${lg(u + "b", "#5BE38F", "#18A85C")}${shine(u + "s")}${soft(u + "f")}</defs>
      <g filter="url(#${u}f)">
        <path d="M21 16.5h-4.4c0 6.6 3 10.4 8 11.4M43 16.5h4.4c0 6.6-3 10.4-8 11.4" fill="none" stroke="#F0A20F" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M20.5 12h23v13c0 6.4-5.1 11.5-11.5 11.5S20.5 31.4 20.5 25Z" fill="url(#${u}a)"/>
        <path d="M20.5 12h23v6h-23Z" fill="url(#${u}s)" opacity=".6"/>
        <path d="M25 14.5v10.5c0 2.6 1.4 4.9 3.6 6.1" stroke="#fff" stroke-opacity=".6" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        ${star4(32, 23.5, 4.6, "#fff")}
        <path d="M29 36h6l.9 6h-7.8Z" fill="#E8961A"/>
        <rect x="21" y="42" width="22" height="9.5" rx="3" fill="url(#${u}b)"/>
        <rect x="25.5" y="45" width="13" height="3.4" rx="1.7" fill="#fff" opacity=".85"/>
      </g>` },
  wrapped: { glyph: (u) => `<defs>${lg(u + "a", "#FFC157", "#FF8A00")}${lg(u + "c", "#3A3F55", "#1B1F2E")}${shine(u + "s")}${soft(u + "f")}</defs>
      <g filter="url(#${u}f)">
        <path d="M12 23.5h40v20c0 3.6-2.9 6.5-6.5 6.5h-27c-3.6 0-6.5-2.9-6.5-6.5Z" fill="url(#${u}a)"/>
        <path d="M12 23.5h40v6H12Z" fill="url(#${u}s)" opacity=".55"/>
        <path d="M27.8 30.8v11.4c0 .9 1 1.4 1.7.9l8.6-5.7c.7-.4.7-1.4 0-1.8l-8.6-5.7c-.7-.5-1.7 0-1.7.9Z" fill="#fff"/>
        <g transform="rotate(-11 12 21)">
          <rect x="12" y="13" width="40" height="8.5" rx="2.4" fill="url(#${u}c)"/>
          <path d="M17 13h5l-3.6 8.5h-5ZM27 13h5l-3.6 8.5h-5ZM37 13h5l-3.6 8.5h-5ZM47 13h5l-3.6 8.5h-5Z" fill="#fff" opacity=".92"/>
        </g>
        <rect x="12" y="21.5" width="40" height="3.2" fill="url(#${u}c)"/>
      </g>` },
};
const DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/**
 * @param {string} kind chat | humor | agenda | espiritual | conflitos | historia | capsula | desafios | wrapped
 * @param {number} size
 * @param {string} u prefixo único dos ids
 * @param {{ mood?: string | null, date?: Date }} [opts]
 */
export function featureIconSvg(kind, size, u, opts = {}) {
  const def = ICONS[kind];
  if (!def) return "";
  const frame = (bgFill, inner, shadow) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" style="filter:drop-shadow(0 ${size * .1}px ${size * .14}px rgba(11,19,36,.10))">
    <defs>
      <linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1">${bgFill}</linearGradient>
      <radialGradient id="${u}h" cx=".3" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".86"/></linearGradient>
      <filter id="${u}s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".22"/></filter>
      <clipPath id="${u}c"><path d="${SQ}"/></clipPath>
    </defs>
    <path d="${SQ}" style="fill:var(--fi-bg,#fff)"/>
    ${inner}
    <path d="${SQ}" fill="none" style="stroke:var(--fi-line,#ECE8E3)" stroke-width="1.4"/>
  </svg>`;
  if (def.calendar) {
    const d = opts.date || new Date();
    return frame(`<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF"/>`, `
      <text x="32" y="20.5" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing=".6" fill="#F0365F">${DAYS[d.getDay()]}</text>
      <text x="32" y="50" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="29" font-weight="600" letter-spacing="-1.2" style="fill:var(--fi-ink,#0B1324)">${d.getDate()}</text>`, "rgba(11,19,36,.16)");
  }
  if (def.humor) {
    const m = opts.mood;
    const tint = m ? MOOD_TINT[m] : "#B8C0CE";
    const face = moodFaceSvg(m || "tranquilo", 48, u + "f").replace('<svg ', `<svg x="8" y="7" opacity="${m ? 1 : .45}" `);
    return frame(`<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF"/>`, face
      + (m ? "" : `<circle cx="49" cy="49" r="7" fill="#0B1324"/><path d="M49 45.8v6.4M45.8 49h6.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`), `${tint}55`);
  }
  return frame(`<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF"/>`,
    `<g transform="translate(32 32) scale(.84) translate(-32 -32)">${def.glyph(u + "x")}</g>`, "");
}
