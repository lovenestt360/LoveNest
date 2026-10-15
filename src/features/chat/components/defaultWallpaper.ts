/**
 * Papel de parede por defeito do Chat, ao estilo do WhatsApp: fundo bege claro
 * com pequenos desenhos de linha (corações, estrelas, cartas…). Só é usado
 * quando a pessoa não escolheu um fundo próprio em Personalização.
 */

const ICONS: Record<string, string> = {
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  bubble: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  flower: '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
};

// [ícone, x, y, rotação, escala] num azulejo de 300×300.
const LAYOUT: [string, number, number, number, number][] = [
  ["heart", 18, 20, -12, 1.1],
  ["bubble", 112, 8, 8, 1],
  ["star", 214, 26, 14, 0.9],
  ["moon", 262, 104, -18, 0.9],
  ["mail", 160, 84, -6, 1],
  ["sparkle", 70, 92, 0, 0.85],
  ["flower", 8, 150, 10, 0.95],
  ["coffee", 106, 168, -10, 1],
  ["heart", 206, 172, 16, 0.8],
  ["music", 252, 236, 6, 0.95],
  ["cloud", 40, 242, -4, 1],
  ["sun", 146, 252, 0, 0.9],
  ["camera", 214, 270, -14, 0.85],
  ["star", 0, 82, -20, 0.6],
  ["heart", 132, 120, 22, 0.55],
];

const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><g fill="none" stroke="#D3C8B6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${LAYOUT.map(
  ([name, x, y, rotate, scale]) =>
    `<g transform="translate(${x} ${y}) rotate(${rotate} 12 12) scale(${scale})">${ICONS[name]}</g>`,
).join("")}</g></svg>`;

export const DEFAULT_CHAT_WALLPAPER = `url("data:image/svg+xml,${encodeURIComponent(tile)}")`;
