// Ícones do Ciclo: desenhos a cores com o mesmo acabamento dos ícones da Home
// (gradiente, brilho e sombra suave). Gerado a partir de
// docs/mockups/ciclo-proposta.html (maqueta aprovada). Devolve SVG em texto.
// As fases (menstrual, folicular, ovulação, lútea) usam os glifos da Home.

const lg = (id: string, a: string, b: string) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rg = (id: string, a: string, b: string) => `<radialGradient id="${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const shine = (id: string) => `<radialGradient id="${id}" cx=".3" cy=".2" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
const soft = (id: string) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.5" flood-color="#0B1324" flood-opacity=".16"/></filter>`;
const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const heartAt = (x: number, y: number, s: number, fill: string) => `<path transform="translate(${x - 12 * s} ${y - 11.5 * s}) scale(${s})" d="${HEART}" fill="${fill}"/>`;
const drop = (x: number, y: number, s: number, fill: string) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-22c5 7.5 13 14.7 13 23.7C13 9 7.2 14.7 0 14.7S-13 9-13 1.7C-13-7.3-5-14.5 0-22Z" fill="${fill}"/>`;
const star4 = (x: number, y: number, r: number, fill: string) => `<path d="M${x} ${y - r}C${x + r * .18} ${y - r * .18} ${x + r * .18} ${y - r * .18} ${x + r} ${y}C${x + r * .18} ${y + r * .18} ${x + r * .18} ${y + r * .18} ${x} ${y + r}C${x - r * .18} ${y + r * .18} ${x - r * .18} ${y + r * .18} ${x - r} ${y}C${x - r * .18} ${y - r * .18} ${x - r * .18} ${y - r * .18} ${x} ${y - r}Z" fill="${fill}"/>`;
const ROSE = (u: string) => lg(u + "a", "#FF9BB2", "#E8284F");

const HG = (id: string, a: string, b: string) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const face = (u: string, a: string, b: string) => `<defs>${rg(u + "a", a, b)}${soft(u + "f")}</defs><g filter="url(#${u}f)"><circle cx="32" cy="34" r="19" fill="url(#${u}a)"/></g>`;
const ICONS = {
  calendario: (u: string) => `<defs>${lg(u + "a", "#FF9BB2", "#E8456B")}</defs>
    <rect x="10" y="14" width="44" height="40" rx="10" fill="#fff" stroke="#0B1324" stroke-width="3.4"/>
    <path d="M10 26h44" stroke="#0B1324" stroke-width="3.4"/><path d="M22 9v9M42 9v9" stroke="#0B1324" stroke-width="3.4" stroke-linecap="round"/>
    ${drop(32, 41, .42, `url(#${u}a)`)}`,
  colicas: (u: string) => `<defs>${lg(u + "a", "#FFB4C4", "#EC4C72")}${shine(u + "s")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">
      <rect x="27" y="7" width="10" height="9" rx="2.5" fill="#C7365B"/>
      <path d="M24 15h16c7 0 12 5.6 12 12.6v15.2C52 51 46 57 38 57H26c-8 0-14-6-14-14.2V27.6C12 20.6 17 15 24 15Z" fill="url(#${u}a)"/>
      <path d="M24 15h16c7 0 12 5.6 12 12.6v4H12v-4C12 20.6 17 15 24 15Z" fill="url(#${u}s)" opacity=".6"/>
      <path d="M21 36c3.6-2.6 7.4 2.6 11 0s7.4 2.6 11 0M21 44c3.6-2.6 7.4 2.6 11 0s7.4 2.6 11 0" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".85"/>
    </g>`,
  cabeca: (u: string) => `<defs>${rg(u + "a", "#FFE3D0", "#F4B48E")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">
      <circle cx="32" cy="36" r="17" fill="url(#${u}a)"/>
      <path d="M25.5 37.5q2-2 4 0M34.5 37.5q2-2 4 0" stroke="#8A4B2C" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M28.5 45q3.5-2 7 0" stroke="#8A4B2C" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    </g>
    <path d="M18 14l4 3-1 4 4 2M46 14l-4 3 1 4-4 2M32 7v5" stroke="#9D7BF5" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  inchaco: (u: string) => `<defs>${rg(u + "a", "#BEE6FF", "#3BA7E6")}${shine(u + "s")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">
      <ellipse cx="32" cy="28" rx="18" ry="20" fill="url(#${u}a)"/>
      <ellipse cx="25" cy="21" rx="5" ry="7.5" fill="url(#${u}s)" transform="rotate(-20 25 21)"/>
      <path d="M29.5 47.5h5l-2.5 4Z" fill="#2A8FD0"/>
    </g>
    <path d="M32 51c-3 3 3 5 0 8" stroke="#A3A09A" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
  desejos: (u: string) => `<defs>${lg(u + "a", "#9A5A3C", "#5C2E1B")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">
      <path d="M14 18c0-3.3 2.7-6 6-6h24c3.3 0 6 2.7 6 6v28c0 3.3-2.7 6-6 6H20c-3.3 0-6-2.7-6-6Z" fill="url(#${u}a)"/>
      <path d="M50 16a6 6 0 0 1-8.5 3.5A6 6 0 0 1 36 12h8a6 6 0 0 1 6 4Z" fill="#fff"/>
      <g stroke="#3F1D10" stroke-width="1.6" opacity=".55"><path d="M14 26h36M14 36h36M26 12v40M38 18v34"/></g>
      <g fill="#fff" opacity=".18"><rect x="16" y="28" width="8" height="6" rx="1.5"/><rect x="28" y="28" width="8" height="6" rx="1.5"/></g>
    </g>`,
  lombar: (u: string) => `<defs>${lg(u + "a", "#FFD9B8", "#F29A6B")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)" fill="url(#${u}a)">
      <rect x="25" y="8" width="14" height="8" rx="4"/><rect x="24" y="19" width="15" height="8" rx="4"/>
      <rect x="23" y="30" width="16" height="8" rx="4"/><rect x="24" y="41" width="16" height="8" rx="4"/>
    </g>
    <path d="M46 33c3 0 5 2 5 5M48 27c5 0 9 4 9 9" stroke="#EC4C72" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <circle cx="32" cy="55" r="2.6" fill="#F29A6B"/>`,
  cansaco: (u: string) => `<defs>${lg(u + "a", "#FFB199", "#F2664A")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">
      <rect x="9" y="20" width="40" height="25" rx="7" fill="#fff" stroke="#3A4150" stroke-width="3.2"/>
      <rect x="51" y="27" width="5" height="11" rx="2.5" fill="#3A4150"/>
      <rect x="14" y="25" width="10" height="15" rx="3.5" fill="url(#${u}a)"/>
    </g>
    <path d="M44 9h7l-7 7h7" stroke="#9D7BF5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  peito: (u: string) => `<defs>${lg(u + "a", "#FFC6D3", "#F0678A")}${shine(u + "s")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">${heartAt(32, 33, 1.9, `url(#${u}a)`)}</g>
    <ellipse cx="22.5" cy="24" rx="4" ry="5.5" fill="url(#${u}s)" transform="rotate(-25 22.5 24)"/>
    <path d="M51 13c2 3 2 6 0 9M55.5 10.5c3 4.5 3 9.5 0 14" stroke="#F0678A" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
  nausea: (u: string) => `<defs>${rg(u + "a", "#D2F5E3", "#5CC995")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><circle cx="32" cy="33" r="19" fill="url(#${u}a)"/></g>
    <path d="M32 33m-9 0a9 9 0 1 1 9 9 5 5 0 1 1 5-5" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  pele: (u: string) => `<defs>${rg(u + "a", "#FFE7D6", "#F5BE98")}${shine(u + "s")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><circle cx="32" cy="32" r="20" fill="url(#${u}a)"/></g>
    <ellipse cx="25" cy="24" rx="6" ry="8" fill="url(#${u}s)" transform="rotate(-25 25 24)"/>
    <circle cx="36" cy="30" r="3" fill="#F08A8A"/><circle cx="28" cy="40" r="2.2" fill="#F08A8A"/><circle cx="40" cy="41" r="1.8" fill="#F08A8A"/>`,
  sensivel: (u: string) => `<defs>${lg(u + "a", "#BFE4FF", "#4BA3EE")}${shine(u + "s")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">${drop(32, 34, 1.15, `url(#${u}a)`)}</g>
    <ellipse cx="26" cy="35" rx="3.4" ry="6.4" fill="url(#${u}s)" transform="rotate(18 26 35)"/>
    ${heartAt(35, 38, .42, "#fff")}`,
  ansiedade: (u: string) => `<defs>${lg(u + "a", "#E6ECF5", "#A9B7CC")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><path d="M18 42a10 10 0 0 1 .8-20A14 14 0 0 1 45.5 20 11 11 0 0 1 46 42Z" fill="url(#${u}a)"/></g>
    <path d="M20 49c3-2 6 2 9 0s6 2 9 0 6 2 9 0M24 55c3-2 6 2 9 0s6 2 9 0" stroke="#8B9AB3" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
  irritada: (u: string) => `<defs>${lg(u + "a", "#FFD27A", "#F2841F")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><path d="M36 6 16 36h13l-4 22 23-32H34Z" fill="url(#${u}a)"/></g>`,
  radiante: (u: string) => `<defs>${rg(u + "a", "#FFF3B0", "#F59E0B")}</defs>
    <g stroke="#F5B323" stroke-width="4" stroke-linecap="round"><path d="M32 5v6M32 53v6M5 32h6M53 32h6M12.9 12.9l4.3 4.3M46.8 46.8l4.3 4.3M12.9 51.1l4.3-4.3M46.8 17.2l4.3-4.3"/></g>
    <circle cx="32" cy="32" r="14" fill="url(#${u}a)"/>
    <path d="M26.5 34q5.5 5 11 0" stroke="#B4740A" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
  sono: (u: string) => `<defs>${lg(u + "a", "#C9D3FF", "#5B6BE8")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><path d="M36 12A22 22 0 1 0 54 42 18 18 0 0 1 36 12Z" fill="url(#${u}a)"/></g>
    <path d="M44 8h8l-8 9h8" stroke="#9D7BF5" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  desejo: (u: string) => `<defs>${ROSE(u)}${shine(u + "s")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">${heartAt(30, 36, 1.75, `url(#${u}a)`)}</g>
    <ellipse cx="21" cy="28" rx="4" ry="5.5" fill="url(#${u}s)" transform="rotate(-25 21 28)"/>
    ${star4(49, 15, 7, "#F5B323")}${star4(55, 29, 4, "#FFD27A")}`,
  intimidade: (u: string) => `<defs>${lg(u + "a", "#FFB4C4", "#EC4C72")}${lg(u + "b", "#C9B8FF", "#8B6CF0")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)">${heartAt(25, 34, 1.4, `url(#${u}b)`)}${heartAt(39, 30, 1.4, `url(#${u}a)`)}</g>`,
  manchas: (u: string) => `<defs>${ROSE(u)}</defs><circle cx="24" cy="30" r="4.5" fill="url(#${u}a)"/><circle cx="38" cy="26" r="3" fill="url(#${u}a)"/><circle cx="35" cy="40" r="3.6" fill="url(#${u}a)"/>`,
  fluxo1: (u: string) => `<defs>${ROSE(u)}</defs>${drop(32, 36, .9, `url(#${u}a)`)}`,
  fluxo2: (u: string) => `<defs>${ROSE(u)}</defs>${drop(23, 38, .75, `url(#${u}a)`)}${drop(41, 34, .75, `url(#${u}a)`)}`,
  fluxo3: (u: string) => `<defs>${ROSE(u)}</defs>${drop(18, 40, .6, `url(#${u}a)`)}${drop(32, 32, .7, `url(#${u}a)`)}${drop(46, 40, .6, `url(#${u}a)`)}`,
  cha: (u: string) => `<defs>${lg(u + "a", "#FFD9B8", "#F29A6B")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><path d="M12 28h34v10c0 9.4-7.6 17-17 17s-17-7.6-17-17Z" fill="url(#${u}a)"/>
    <path d="M46 32h3a7 7 0 0 1 0 14h-4" stroke="#F29A6B" stroke-width="3.4" fill="none"/></g>
    <path d="M22 9c-3 3 3 6 0 10M30 7c-3 3 3 6 0 10M38 9c-3 3 3 6 0 10" stroke="#C4B5FD" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
  partilha: (u: string) => `<defs>${lg(u + "a", "#FFB4C4", "#EC4C72")}${lg(u + "b", "#A9CCFF", "#3B82F6")}</defs>
    <circle cx="23" cy="24" r="9" fill="url(#${u}a)"/><circle cx="43" cy="24" r="9" fill="url(#${u}b)"/>
    <path d="M8 52c0-9 6.7-15 15-15s15 6 15 15Z" fill="url(#${u}a)"/><path d="M28 52c0-9 6.7-15 15-15s15 6 15 15Z" fill="url(#${u}b)" opacity=".9"/>`,
  mais: () => `<path d="M32 18v28M18 32h28" stroke="#7A7F8C" stroke-width="4" stroke-linecap="round"/>`,
  // ── Centro de Conhecimento (docs/mockups/conhecimento-proposta.html) ──
  ciclo: () => {
    const c = ["#E8456B", "#E8456B", "#E8456B", "#8CCCF2", "#8CCCF2", "#F2A91F", "#B9A6F7", "#B9A6F7", "#EAE6E0", "#EAE6E0", "#B9A6F7", "#E8456B"];
    return c.map((fill, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return `<circle cx="${32 + 22 * Math.cos(a)}" cy="${32 + 22 * Math.sin(a)}" r="4.6" fill="${fill}"/>`;
    }).join("") + `<circle cx="32" cy="32" r="7" fill="#0B1324"/>`;
  },
  fertil: (u: string) => `<defs>${lg(u + "a", "#B6F0D2", "#2FB67A")}${ROSE(u + "r")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><path d="M32 56V34" stroke="#2FB67A" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 36C31 25 23 18 12 18c0 11 8 18 20 18Z" fill="url(#${u}a)"/>
    <path d="M32 40c1-9 7.6-14.6 17.6-14.6 0 10-6.6 15.6-17.6 14.6Z" fill="url(#${u}a)"/></g>
    ${heartAt(32, 12, .55, `url(#${u}ra)`)}`,
  intima: (u: string) => `<defs>${lg(u + "a", "#FFC6D3", "#F0678A")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><path d="M32 6l20 7.5v16c0 12.6-8.3 23-20 27-11.7-4-20-14.4-20-27v-16Z" fill="url(#${u}a)"/></g>
    ${heartAt(32, 32, .95, "#fff")}`,
  gravidez: (u: string) => `<defs>${lg(u + "a", "#FFFFFF", "#E9E5DF")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)" transform="rotate(-35 32 32)"><rect x="25" y="4" width="14" height="56" rx="7" fill="url(#${u}a)" stroke="#CFCAC3" stroke-width="1.5"/>
    <rect x="28" y="24" width="8" height="14" rx="2.5" fill="#F7F5F2" stroke="#CFCAC3"/>
    <path d="M30.5 27v8M33.5 27v8" stroke="#E8456B" stroke-width="2" stroke-linecap="round"/>
    <rect x="25" y="44" width="14" height="16" rx="7" fill="#8CCCF2"/></g>`,
  pergunta: (u: string) => `<defs>${lg(u + "a", "#E6ECF5", "#A9B7CC")}${soft(u + "f")}</defs>
    <g filter="url(#${u}f)"><path d="M12 14c0-4 3-7 7-7h26c4 0 7 3 7 7v20c0 4-3 7-7 7H28l-9 8v-8c-4 0-7-3-7-7Z" fill="url(#${u}a)"/></g>
    <path d="M27 19.5c0-3 2.4-5 5.2-5s5 2 5 4.6c0 3.8-5 4-5 7.6" stroke="#0B1324" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <circle cx="32.2" cy="32.5" r="2.1" fill="#0B1324"/>`,
  lampada: (u: string) => `<defs>${rg(u + "a", "#FFF6C8", "#F5B323")}</defs>
    <path d="M32 8c-9.4 0-17 7.3-17 16.4 0 6 3.4 10 6.4 13.2 1.8 1.9 2.6 3.7 2.6 6V46h16v-2.4c0-2.3.8-4.1 2.6-6 3-3.2 6.4-7.2 6.4-13.2C49 15.3 41.4 8 32 8Z" fill="url(#${u}a)"/>
    <rect x="24" y="48" width="16" height="5" rx="2.5" fill="#3A4150"/><rect x="26" y="55" width="12" height="4" rx="2" fill="#3A4150"/>`,
  alerta: (u: string) => `<defs>${lg(u + "a", "#FFB4C4", "#E8456B")}</defs>
    <path d="M28.5 9.5c1.6-2.7 5.4-2.7 7 0L58 48c1.6 2.7-.3 6-3.5 6h-45C6.3 54 4.4 50.7 6 48Z" fill="url(#${u}a)"/>
    <path d="M32 23v13" stroke="#fff" stroke-width="4.4" stroke-linecap="round"/><circle cx="32" cy="44.5" r="2.8" fill="#fff"/>`,
  estrela: (u: string) => `<defs>${lg(u + "a", "#A9DCFF", "#3BA7E6")}</defs>
    <path d="M32 6l6.7 15 16.3 1.7-12.2 11 3.4 16L32 41.5 17.8 49.7l3.4-16L9 22.7l16.3-1.7Z" fill="url(#${u}a)"/>`,
  medico: (u: string) => `<defs>${lg(u + "a", "#D6C8FF", "#7C3AED")}</defs>
    <rect x="10" y="10" width="44" height="44" rx="14" fill="url(#${u}a)"/>
    <path d="M32 21v22M21 32h22" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`,
  casal: (u: string) => `<defs>${lg(u + "a", "#FFB4C4", "#EC4C72")}${lg(u + "b", "#A9CCFF", "#3B82F6")}</defs>
    ${heartAt(25, 34, 1.4, `url(#${u}a)`)}${heartAt(39, 30, 1.4, `url(#${u}b)`)}`,
  guardar: () => `<path d="M18 10h28v44L32 44 18 54Z" fill="none" stroke="#636978" stroke-width="4" stroke-linejoin="round"/>`,
  guardado: () => `<path d="M18 10h28v44L32 44 18 54Z" fill="#0B1324" stroke="#0B1324" stroke-width="4" stroke-linejoin="round"/>`,
  lupa: () => `<circle cx="28" cy="28" r="15" fill="none" stroke="#77736C" stroke-width="5"/><path d="M39 39l13 13" stroke="#77736C" stroke-width="5" stroke-linecap="round"/>`,
  // ── Mais sintomas e o carinho (docs/mockups/anel-proposta.html) ──

  pernas: (u: string) => `<defs>${lg(u+"a","#FFD9B8","#F29A6B")}${soft(u+"f")}</defs>
    <g filter="url(#${u}f)"><path d="M23 6h15v21c0 3.6 1 6.8 2.8 10l3.6 6.6c1.8 3.2 4.6 4.8 8.4 5.8 2.8.8 3.4 3.2 2.4 5.6H35c-2.6 0-4.2-1.2-5.2-3.6L24.4 44C23.4 41.4 23 38.8 23 36Z" fill="url(#${u}a)"/></g>
    <path d="M7 22l4.5 2-2 4 4.5 2M45 12l4.5 2-2 4 4.5 2" stroke="#9D7BF5" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  tontura: (u: string) => `${face(u, "#FFE3D0", "#F4B48E")}
    <circle cx="25" cy="33" r="3.6" fill="none" stroke="#8A4B2C" stroke-width="2"/><circle cx="25" cy="33" r="1.1" fill="#8A4B2C"/>
    <circle cx="39" cy="33" r="3.6" fill="none" stroke="#8A4B2C" stroke-width="2"/><circle cx="39" cy="33" r="1.1" fill="#8A4B2C"/>
    <path d="M25 43.5q2.3-2 4.6 0t4.6 0t4.6 0" stroke="#8A4B2C" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <ellipse cx="32" cy="12" rx="15" ry="4.2" fill="none" stroke="#F2A91F" stroke-width="2.2"/>${star4(17.5, 12, 3.6, "#F2A91F")}${star4(46, 10.5, 3, "#9D7BF5")}`,
  fraqueza: (u: string) => `<defs>${lg(u+"a","#FFB4C4","#EC4C72")}${shine(u+"s")}${soft(u+"f")}</defs>
    <path d="M22 57V36c0-11 7-18 17-18 4 0 7 1.4 8.6 3.6" stroke="#2FB67A" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <path d="M22 46c-7 0-11-4.4-11-10 6.6 0 11 4.4 11 10Z" fill="#2FB67A"/>
    <g filter="url(#${u}f)"><path d="M47.5 22c6 0 9.5 5 9.5 11 0 5-3 9.6-9.5 14-6.5-4.4-9.5-9-9.5-14 0-6 3.5-11 9.5-11Z" fill="url(#${u}a)"/></g>
    <ellipse cx="44.5" cy="30" rx="2.4" ry="4.2" fill="url(#${u}s)"/>`,
  gases: (u: string) => `<defs>${rg(u+"a","#D2F5E3","#5CC995")}${shine(u+"s")}</defs>
    <circle cx="25" cy="39" r="14" fill="url(#${u}a)"/><ellipse cx="20" cy="33" rx="4" ry="5.5" fill="url(#${u}s)" transform="rotate(-25 20 33)"/>
    <circle cx="43" cy="21" r="9" fill="url(#${u}a)"/><ellipse cx="40" cy="17.5" rx="2.6" ry="3.6" fill="url(#${u}s)" transform="rotate(-25 40 17.5)"/>
    <circle cx="47" cy="44" r="5.5" fill="url(#${u}a)"/>`,
  diarreia: (u: string) => `<defs>${lg(u+"a","#FFFFFF","#E3DED7")}${soft(u+"f")}</defs>
    <g filter="url(#${u}f)"><path d="M14 17v27c0 3 6 5.4 13.5 5.4S41 47 41 44V17Z" fill="url(#${u}a)" stroke="#D9D3CB" stroke-width="1.6"/>
    <ellipse cx="27.5" cy="17" rx="13.5" ry="5" fill="#fff" stroke="#D9D3CB" stroke-width="1.6"/><ellipse cx="27.5" cy="17" rx="4" ry="1.7" fill="#B9B2A8"/>
    <path d="M41 26h11v26H41Z" fill="#fff" stroke="#D9D3CB" stroke-width="1.6"/></g>
    <path d="M42.5 35h8M42.5 44h8" stroke="#D9D3CB" stroke-width="1.6" stroke-dasharray="2 2"/>`,
  prisao: (u: string) => `<defs>${lg(u+"a","#FFC6D3","#F0678A")}${shine(u+"s")}${soft(u+"f")}</defs>
    <g filter="url(#${u}f)"><path d="M25 7v8c0 4.4-7.5 6.4-9.6 14-2.8 10.4 3.6 22 15.6 23.6 10.4 1.4 19-4.6 19-14.2 0-7-5-10.4-9.4-10.4-3.4 0-5 2-6.2.2C33 25.8 35 22 35 18V7Z" fill="url(#${u}a)"/>
    <ellipse cx="22" cy="31" rx="3.4" ry="6" fill="url(#${u}s)" transform="rotate(20 22 31)"/></g>
    <path d="M27 41.5c-2.6-4 3.6-7 6-3.4s-3.6 6.4-6.4 2.6M33 38.5c2-1 5 0 6.5 2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
  fome: (u: string) => `<defs>${lg(u+"a","#FFD27A","#F2841F")}${soft(u+"f")}</defs>
    <path d="M24 8c-3 4 3 6 0 10M32 6c-3 4 3 6 0 10M40 8c-3 4 3 6 0 10" stroke="#C9C2B8" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <g filter="url(#${u}f)"><path d="M8 29h48c0 13.6-10.4 23-24 23S8 42.6 8 29Z" fill="url(#${u}a)"/><rect x="6" y="25.5" width="52" height="6" rx="3" fill="#E36A12"/></g>`,
  triste: (u: string) => `${face(u, "#CFE8FF", "#6FB2F0")}
    <circle cx="25" cy="31" r="2.4" fill="#1E4E86"/><circle cx="39" cy="31" r="2.4" fill="#1E4E86"/>
    <path d="M25 44.5q7-6 14 0" stroke="#1E4E86" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
  choro: (u: string) => `${face(u, "#CFE8FF", "#6FB2F0")}
    <path d="M21.5 30.5q3.5 2.6 7 0M35.5 30.5q3.5 2.6 7 0" stroke="#1E4E86" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M26 44q6-4.4 12 0" stroke="#1E4E86" stroke-width="2.6" stroke-linecap="round" fill="none"/>${drop(22, 41, .3, "#2F8FE0")}`,
  altos: (u: string) => `<defs>${HG(u+"a", "#FF8FAA", "#8B6CF0")}</defs>
    <path d="M7 38c6 0 7.5-20 14.5-20S30 46 37 46s8-24 14-24 6 8 6 8" stroke="url(#${u}a)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  abraco: (u: string) => `<defs>${lg(u+"a","#FFB4C4","#EC4C72")}${lg(u+"b","#A9CCFF","#3B82F6")}${soft(u+"f")}</defs>
    <g filter="url(#${u}f)">${heartAt(32, 30, 1.75, `url(#${u}a)`)}</g>
    <path d="M9 27c0 13.4 10 25 23 25M55 27c0 13.4-10 25-23 25" stroke="url(#${u}b)" stroke-width="5.4" stroke-linecap="round" fill="none"/>`,
  jantar: (u: string) => `<defs>${lg(u+"a","#FFFFFF","#ECE7E0")}${soft(u+"f")}</defs>
    <g filter="url(#${u}f)"><circle cx="32" cy="34" r="17" fill="url(#${u}a)" stroke="#D9D3CB" stroke-width="1.8"/><circle cx="32" cy="34" r="10" fill="none" stroke="#E4DED6" stroke-width="2"/></g>
    <path d="M8 14v11c0 2.4 1.4 3.6 3 3.6V54M11 14v10M14 14v11c0 2.4-1.4 3.6-3 3.6" stroke="#7A7F8C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M55 54V14c-4.4 2.2-5.6 9-5.6 16H55" stroke="#7A7F8C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  flor: (u: string) => `<defs>${lg(u+"a","#FFB4C4","#EC4C72")}${rg(u+"c","#FFF3B0","#F59E0B")}${soft(u+"f")}</defs>
    <path d="M32 34v22" stroke="#2FB67A" stroke-width="3.4" stroke-linecap="round"/><path d="M32 50c-7-.6-11-5-11-10.6 6.6 0 11 4.4 11 10.6Z" fill="#2FB67A"/>
    <g filter="url(#${u}f)">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${32 + 10 * Math.cos((a - 90) * Math.PI / 180)}" cy="${23 + 10 * Math.sin((a - 90) * Math.PI / 180)}" r="8" fill="url(#${u}a)"/>`).join("")}</g>
    <circle cx="32" cy="23" r="6" fill="url(#${u}c)"/>`,
};

export type CycleIconKind = keyof typeof ICONS;

export function cycleIconSvg(kind: CycleIconKind, size: number, u: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${ICONS[kind](u)}</svg>`;
}
