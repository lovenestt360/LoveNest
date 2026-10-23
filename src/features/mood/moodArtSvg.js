// Arte do Humor: a Faísca a sentir cada humor, as luas do sono e os quadradinhos das atividades.
// Gerado a partir de docs/mockups/humor-proposta.html (maqueta aprovada). Devolve SVG em texto.

// ponta, núcleo, corpo, borda, traços
const PAL = {
  feliz: ["#FFF6C2", "#FFE485", "#FFB830", "#EE760E", "#4A1F05"],
  tranquilo: ["#E4FFF5", "#AEF2DA", "#46CFA4", "#138C6A", "#0B3B2E"],
  apaixonado: ["#FFE9F0", "#FFC6D6", "#FF7FA3", "#DF3A6B", "#4E0B21"],
  ansioso: ["#F4F0FF", "#D9D0FF", "#A796FF", "#6A50E6", "#25186A"],
  triste: ["#EAF2FF", "#BDD5FF", "#6F9DFF", "#2D57D8", "#122560"],
  cansado: ["#F6F3FF", "#E0DBF0", "#B4AECB", "#716A8F", "#2A2540"],
  irritado: ["#FFE4CC", "#FFB580", "#FF6A3A", "#CF2B0E", "#4E1004"],
  grato: ["#FFF3E0", "#FFDBB2", "#FFAD68", "#E2722B", "#4E220A"],
};
// Silhuetas da chama (viewBox 64): viva, serena, eriçada, caída
const SHAPE = {
  viva: "M32 3.5C34.6 11.5 40.6 13 41.8 19.6 43.6 15.6 46.6 14.2 47.8 11.2 51.4 19.6 53.4 27.2 52.2 37A20.2 20.2 0 0 1 11.8 38.4C11 30.2 13.8 23.8 18 19.6 19.2 23.6 21.2 25.6 23.2 25.8 22 17.6 25.8 9.6 32 3.5Z",
  serena: "M32.6 7.5C36.4 13.6 43.6 15.6 46 21.6 49.8 25.8 52.2 31 52.2 37.2A20.2 20.2 0 0 1 11.8 37.6C11.6 30.6 14.8 25.4 19 22 20.8 24.8 22.6 25.8 24 25.2 23.6 18.4 27.2 12 32.6 7.5Z",
  ericada: "M33 1.5C35 9.6 38.8 12 40.8 16.8 42.8 12.8 45.8 9.6 49.2 6.6 50.4 15.6 54.2 24 52.4 36.4A20.2 20.2 0 0 1 11.8 38.4C10.8 30.2 12.8 21.8 15.8 14.8 17.8 19.8 19.8 21.8 22.8 22.8 22.6 14.8 26.8 7.6 33 1.5Z",
  sono: "M33.4 13.5C36.6 18 42.4 19.6 45.4 24 49.8 27.6 52.2 32 52.2 37.4A20.2 20.2 0 0 1 11.8 37.6C11.8 31.6 14.6 27.4 18.6 24.6 20.4 26.6 22.4 27.2 23.8 26.6 24.6 20.6 28.4 16.4 33.4 13.5Z",
  caida: "M47 11.5C42.6 14.4 35.6 14.6 33.4 20 39.2 20.4 46.4 24.4 50.2 30.2 52 33 52.4 35.4 52.2 38.2A20.2 20.2 0 0 1 11.8 38.4C11.8 31.4 15.8 26 21.8 22.2 26 19.4 32.4 16.4 37 14.4 40.6 13 44 12.4 47 11.5Z",
};

/** @param {string} key @param {number} size @param {string} u prefixo único dos ids */
export function moodFaceSvg(key, size, u) {
  if (!PAL[key]) key = "tranquilo";
  const [tip, core, body, edge, F] = PAL[key];
  const shape = { feliz: "viva", apaixonado: "viva", tranquilo: "serena", grato: "serena", ansioso: "viva", irritado: "ericada", triste: "caida", cansado: "sono" }[key];
  // olho da Faísca: grande, escuro, íris colorida e dois brilhos
  const eye = (x, y, rx = 4.3, ry = 5.2, look = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${u}e)"/>
    <ellipse cx="${x}" cy="${y + ry * .45}" rx="${rx * .72}" ry="${ry * .38}" fill="${edge}" opacity=".55"/>
    <circle cx="${x - rx * .3 + look}" cy="${y - ry * .38}" r="${rx * .42}" fill="#fff"/>
    <circle cx="${x + rx * .38 + look}" cy="${y + ry * .3}" r="${rx * .18}" fill="#fff" opacity=".9"/>`;
  // traços afilados (preenchidos, não linhas de espessura igual)
  const arcUp = (x, y, w = 9, h = 6.2, t = 2.6) => `<path d="M${x - w / 2} ${y}Q${x} ${y - h} ${x + w / 2} ${y}Q${x} ${y - h + t * 1.6} ${x - w / 2} ${y}Z" fill="${F}"/>`;
  const arcDown = (x, y, w = 9, h = 5, t = 2.4) => `<path d="M${x - w / 2} ${y}Q${x} ${y + h} ${x + w / 2} ${y}Q${x} ${y + h - t * 1.6} ${x - w / 2} ${y}Z" fill="${F}"/>`;
  const brow = (x1, y1, x2, y2, bend = 1.4) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - bend;
    return `<path d="M${x1} ${y1}Q${mx} ${my - 1.6} ${x2} ${y2}Q${mx} ${my + 0.4} ${x1} ${y1}Z" fill="${F}" stroke="${F}" stroke-width=".6" stroke-linejoin="round"/>`;
  };
  const smile = (x, y, w, h) => `<path d="M${x - w / 2} ${y}Q${x} ${y + h} ${x + w / 2} ${y}Q${x} ${y + h * .55} ${x - w / 2} ${y}Z" fill="${F}"/>`;
  const frown = (x, y, w, h) => `<path d="M${x - w / 2} ${y}Q${x} ${y - h} ${x + w / 2} ${y}Q${x} ${y - h * .55} ${x - w / 2} ${y}Z" fill="${F}"/>`;
  const openMouth = (x, y, w, h) => `<path d="M${x - w / 2} ${y}Q${x} ${y - 1} ${x + w / 2} ${y}Q${x + w * .42} ${y + h} ${x} ${y + h}Q${x - w * .42} ${y + h} ${x - w / 2} ${y}Z" fill="url(#${u}m)"/>
    <ellipse cx="${x}" cy="${y + h * .72}" rx="${w * .26}" ry="${h * .26}" fill="#FF8BA0"/>`;
  const blush = `<ellipse cx="20.5" cy="46" rx="4.4" ry="2.6" fill="#FF5A86" opacity=".38" filter="url(#${u}b)"/><ellipse cx="43.5" cy="46" rx="4.4" ry="2.6" fill="#FF5A86" opacity=".38" filter="url(#${u}b)"/>`;
  const heart = (x, y, s, fill = `url(#${u}h)`) => `<g transform="translate(${x - 12 * s} ${y - 11 * s}) scale(${s})"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="${fill}"/><ellipse cx="7.6" cy="7.4" rx="2.6" ry="1.7" fill="#fff" opacity=".8" transform="rotate(-30 7.6 7.4)"/></g>`;
  const drop = (x, y, s = 1) => `<path d="M${x} ${y}q${-3.4 * s} ${5 * s} 0 ${7.4 * s} ${3.4 * s} ${-2.4 * s} 0 ${-7.4 * s}Z" fill="url(#${u}t)"/><ellipse cx="${x - .8 * s}" cy="${y + 4.2 * s}" rx="${.7 * s}" ry="${1.3 * s}" fill="#fff" opacity=".85"/>`;
  const FEAT = {
    feliz: () => blush + arcUp(24.5, 41) + arcUp(39.5, 41) + openMouth(32, 45.5, 10, 6.2),
    tranquilo: () => blush + arcDown(24.5, 39.5) + arcDown(39.5, 39.5) + smile(32, 46, 6.5, 3.2),
    apaixonado: () => blush + heart(24.5, 40.5, .5) + heart(39.5, 40.5, .5) + openMouth(32, 46.5, 7.5, 4.6) + heart(32, -1, .36),
    ansioso: () => brow(19.5, 32, 27, 30.4, -1.2) + brow(44.5, 32, 37, 30.4, -1.2) + eye(24.5, 39.5, 3.9, 5, -.5) + eye(39.5, 39.5, 3.9, 5, -.5)
      + `<path d="M26.5 48.2q1.4-1.8 2.8 0t2.8 0t2.8 0t2.8 0" fill="none" stroke="${F}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>` + drop(49, 22, .9),
    triste: () => brow(19.5, 33.4, 27.5, 31.2, 1.4) + brow(44.5, 33.4, 36.5, 31.2, 1.4) + eye(24.5, 40.5, 4.3, 5.2) + eye(39.5, 40.5, 4.3, 5.2) + frown(32, 50, 7, 3.4) + drop(19.5, 45, .9),
    cansado: () => `<g>${eye(24.5, 41, 4.1, 4.6)}<path d="M19.9 41.4Q24.5 34.6 29.1 41.4Z" fill="${body}"/><path d="M19.9 41.2Q24.5 39.6 29.1 41.2" fill="none" stroke="${F}" stroke-width="1.7" stroke-linecap="round"/></g>
      <g>${eye(39.5, 41, 4.1, 4.6)}<path d="M34.9 41.4Q39.5 34.6 44.1 41.4Z" fill="${body}"/><path d="M34.9 41.2Q39.5 39.6 44.1 41.2" fill="none" stroke="${F}" stroke-width="1.7" stroke-linecap="round"/></g>
      <ellipse cx="32" cy="49" rx="2.4" ry="2.9" fill="url(#${u}m)"/>
      <path d="M44.5 13.5h5.4l-5.4 5.4h5.4" fill="none" stroke="${edge}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M52 7.5h3.6l-3.6 3.6h3.6" fill="none" stroke="${edge}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`,
    irritado: () => brow(18.5, 31.2, 28, 35, 0) + brow(45.5, 31.2, 36, 35, 0) + eye(24.5, 41.5, 3.9, 4.4) + eye(39.5, 41.5, 3.9, 4.4) + frown(32, 50.5, 9, 3.4)
      + `<g fill="#fff" opacity=".85"><circle cx="9" cy="30" r="2.2"/><circle cx="6.4" cy="27" r="1.6"/><circle cx="55" cy="30" r="2.2"/><circle cx="57.6" cy="27" r="1.6"/></g>`,
    grato: () => blush + arcUp(24.5, 41, 8.6, 5.4) + arcUp(39.5, 41, 8.6, 5.4) + smile(32, 46, 8, 4)
      + `<path d="M53 5l1.4 3.6 3.6 1.4-3.6 1.4L53 15l-1.4-3.6L48 10l3.6-1.4Z" fill="url(#${u}s)"/><path d="M10 16l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z" fill="url(#${u}s)"/>`,
  };
  const P = SHAPE[shape];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" style="overflow:visible">
    <defs>
      <radialGradient id="${u}g" cx=".5" cy=".7" r=".66"><stop offset="0" stop-color="${core}"/><stop offset=".5" stop-color="${body}"/><stop offset="1" stop-color="${edge}"/></radialGradient>
      <linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tip}" stop-opacity=".95"/><stop offset=".42" stop-color="${tip}" stop-opacity="0"/></linearGradient>
      <radialGradient id="${u}c" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="${core}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}e" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#3a2030"/><stop offset="1" stop-color="#12060c"/></radialGradient>
      <linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${F}"/><stop offset="1" stop-color="#14060a"/></linearGradient>
      <linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6A88"/><stop offset="1" stop-color="#C80E3E"/></linearGradient>
      <linearGradient id="${u}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2EAFF"/><stop offset="1" stop-color="#3F8CFF"/></linearGradient>
      <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6C4"/><stop offset="1" stop-color="#FFB000"/></linearGradient>
      <filter id="${u}b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>
      <filter id="${u}d" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
      <clipPath id="${u}x"><path d="${P}"/></clipPath>
    </defs>
    <ellipse cx="32" cy="60.5" rx="16" ry="2.6" fill="${body}" opacity=".55" filter="url(#${u}d)"/>
    <path d="${P}" fill="url(#${u}g)"/>
    <g clip-path="url(#${u}x)">
      <rect x="0" y="0" width="64" height="64" fill="url(#${u}p)"/>
      <ellipse cx="32" cy="47" rx="15" ry="11" fill="url(#${u}c)"/>
      <ellipse cx="20" cy="31" rx="6" ry="3.4" fill="url(#${u}l)" opacity=".75" transform="rotate(-38 20 31)"/>
      <path d="${P}" fill="none" stroke="${edge}" stroke-opacity=".5" stroke-width="2.2"/>
    </g>
    ${FEAT[key]()}
  </svg>`;
}

/** @param {0|1|2|3} level @param {number} size @param {string} u */
export function sleepMoonSvg(level, size, u) {
  const sky = [["#5B6175", "#2A2E3C"], ["#4A54A8", "#1E2358"], ["#4B5BE0", "#1B1F6B"], ["#6A5CFF", "#1A1660"]][level];
  const full = level === 3;
  const star = (x, y, r) => `<path d="M${x} ${y - r}l${r * .28} ${r * .72} ${r * .72} ${r * .28}-${r * .72} ${r * .28}-${r * .28} ${r * .72}-${r * .28}-${r * .72}-${r * .72}-${r * .28} ${r * .72}-${r * .28}Z" fill="#FFF6C9"/>`;
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" style="overflow:visible">
    <defs>
      <radialGradient id="${u}k" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></radialGradient>
      <radialGradient id="${u}m" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFFBE6"/><stop offset=".6" stop-color="${level ? "#FFE48A" : "#D9DCE6"}"/><stop offset="1" stop-color="${level ? "#F2B835" : "#A5ABBB"}"/></radialGradient>
      <radialGradient id="${u}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE48A" stop-opacity=".55"/><stop offset="1" stop-color="#FFE48A" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#C9CFDD"/></linearGradient>
      <filter id="${u}d" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
      <clipPath id="${u}x"><circle cx="32" cy="31" r="27"/></clipPath>
    </defs>
    <ellipse cx="32" cy="60" rx="18" ry="3" fill="${sky[1]}" opacity=".4" filter="url(#${u}d)"/>
    <circle cx="32" cy="31" r="27" fill="url(#${u}k)"/>
    <g clip-path="url(#${u}x)">
      ${level >= 2 ? `<circle cx="34" cy="30" r="${full ? 22 : 18}" fill="url(#${u}g)"/>` : ""}
      ${full ? `<circle cx="34" cy="30" r="12.5" fill="url(#${u}m)"/><circle cx="30" cy="27" r="2.2" fill="#F2C24E" opacity=".45"/><circle cx="38" cy="34" r="3" fill="#F2C24E" opacity=".4"/>`
             : `<path d="M38 15a15 15 0 1 0 6 26A12.5 12.5 0 0 1 38 15Z" fill="url(#${u}m)" opacity="${level === 1 ? .85 : 1}"/>`}
      ${level >= 1 ? star(16, 18, 2.4) : ""}${level >= 2 ? star(48, 14, 2) : ""}${full ? star(14, 42, 1.8) + star(50, 46, 2.4) + star(24, 10, 1.4) : ""}
      ${level === 0 ? `<path d="M10 44a7 7 0 0 1 9-9 9 9 0 0 1 17 1 6 6 0 0 1 3 12H14a5 5 0 0 1-4-4Z" fill="url(#${u}c)"/>` : ""}
    </g>
    <circle cx="32" cy="31" r="26.5" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1"/>
    <ellipse cx="22" cy="13.5" rx="11" ry="5.5" fill="url(#${u}l)" opacity=".7" transform="rotate(-24 22 13.5)"/>
  </svg>`;
}

const ACT = [
  ["Trabalho", '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'],
  ["Estudo", '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'],
  ["Treino", '<path d="M14.4 14.4 9.6 9.6"/><path d="M18.66 21.51a2 2 0 1 1-2.83-2.82l-1.77 1.76a2 2 0 1 1-2.83-2.82l6.37-6.37a2 2 0 1 1 2.82 2.83l-1.76 1.77a2 2 0 1 1 2.82 2.83z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.4 12.77a2 2 0 1 1-2.83-2.83l1.77-1.76a2 2 0 1 1-2.83-2.83l2.83-2.83a2 2 0 1 1 2.83 2.83l1.76-1.77a2 2 0 1 1 2.83 2.83z"/>'],
  ["Lazer", '<path d="M6 12h4M8 10v4"/><path d="M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="2"/>'],
  ["Namorar", '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'],
  ["Amigos", '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'],
  ["Família", '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
  ["Viagem", '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'],
  ["Saúde", '<path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>'],
  ["Compras", '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'],
  ["Limpeza", '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>'],
  ["Relaxar", '<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12M12 22c4.2 0 7-1.67 7-5-4.2 0-7 1.67-7 5ZM12 22c-4.2 0-7-1.67-7-5 4.2 0 7 1.67 7 5Z"/>'],
];
const ACT_COLORS = [["#5AC8FA", "#0A84FF"], ["#FFB340", "#FF8A00"], ["#4CD964", "#1FB141"], ["#D17BFF", "#A23FF0"], ["#FF6F8E", "#FF2D55"], ["#7D7AFF", "#5856D6"],
  ["#FFD54A", "#FFB800"], ["#5EE0E8", "#18B6C9"], ["#FF6B6B", "#E5352B"], ["#6EE2B8", "#20B887"], ["#B7A07E", "#8E7552"], ["#9FE870", "#4DBA2E"]];
const ACT_KEYS = ['trabalho', 'estudo', 'treino', 'lazer', 'namorar', 'amigos', 'familia', 'viagem', 'saude', 'compras', 'limpeza', 'relaxar'];
/** Por chave: glifo (SVG 24×24, traço) e as duas cores do quadradinho. */
export const ACTIVITY_ART = Object.fromEntries(ACT_KEYS.map((k, i) => [k, { path: ACT[i][1], colors: ACT_COLORS[i] }]));
export const MOOD_TINT = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, v[2]]));
