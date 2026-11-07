// Rosto animado da mascote. Todas as expressões usam a mesma grelha, em coordenadas de 1024 x 1024.

export type MascotKey = "G" | "F";
export type Expression = "smile" | "up" | "joy" | "read" | "wow" | "proud" | "love" | "wink" | "gaze";

interface FaceGrid {
  axis: number; dx: number; ey: number; rx: number; ry: number;
  by: number; my: number; bly: number; bldx: number; fy: number;
  iris: string; fore: string; line: string; brow: string; tongue: string; skin: string;
}

const FACE: Record<MascotKey, FaceGrid> = {
  G: { axis: 470, dx: 80, ey: 498, rx: 46, ry: 50, by: 420, my: 574, bly: 556, bldx: 122, fy: 414, iris: "mo-iris-b", fore: "mo-fore-g", line: "#0D1B5E", brow: "#1551D6", tongue: "#FF5B7A", skin: "#3AA0FA" },
  F: { axis: 504, dx: 88, ey: 585, rx: 50, ry: 56, by: 498, my: 662, bly: 648, bldx: 132, fy: 474, iris: "mo-iris-r", fore: "mo-fore-f", line: "#5B0B26", brow: "#E03E68", tongue: "#FF4C74", skin: "#FFB0BE" },
};

export const HEART_PATH = "M12 21s-7.5-4.6-10-9.5C.4 8 2.2 4 6 4c2.400 0 4.200 1.400 6 3.600C13.800 5.400 15.600 4 18 4c3.800 0 5.600 4 4 7.500-2.500 4.900-10 9.500-10 9.500z";

let uid = 0;
const nextId = () => `mo${uid++}`;

interface EyeOptions { wide?: boolean; pupil?: [number, number]; lid?: boolean; look?: string }

function eye(c: FaceGrid, side: number, o: EyeOptions = {}) {
  const x = c.axis + side * c.dx, y = c.ey, rx = c.rx, ry = c.ry, id = nextId();
  const r = ry * (o.wide ? 0.92 : 0.8);
  const [px, py] = o.pupil ?? [0, 0];
  const lid = o.lid
    ? `<path d="M${x - rx - 4} ${y - ry * 0.02} Q${x} ${y - ry * 0.42} ${x + rx + 4} ${y - ry * 0.02} V${y - ry - 8} H${x - rx - 4}Z" fill="${c.skin}"/>`
    : "";
  const top = o.lid
    ? `<path d="M${x - rx} ${y - ry * 0.04} Q${x} ${y - ry * 0.42} ${x + rx} ${y - ry * 0.04}" fill="none" stroke="${c.line}" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M${x - rx} ${y - ry * 0.2} Q${x} ${y - ry * 1.22} ${x + rx} ${y - ry * 0.2}" fill="none" stroke="${c.line}" stroke-width="6" stroke-linecap="round"/>`;
  return `<g class="mo-eye" style="transform-origin:${x}px ${y}px">
    <clipPath id="${id}"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/></clipPath>
    <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff"/>
    <g clip-path="url(#${id})"><g class="${o.look ?? ""}"><g transform="translate(${px} ${py})">
      <circle cx="${x}" cy="${y + ry * 0.05}" r="${r}" fill="url(#${c.iris})"/>
      <circle cx="${x}" cy="${y + ry * 0.05}" r="${r * 0.56}" fill="#060A22"/>
      <circle cx="${x - rx * 0.26}" cy="${y - ry * 0.26}" r="${ry * 0.24}" fill="#fff"/>
      <circle cx="${x + rx * 0.28}" cy="${y + ry * 0.3}" r="${ry * 0.1}" fill="#fff" opacity="0.9"/>
    </g></g>${lid}</g>
    ${top}
  </g>`;
}

function arc(c: FaceGrid, side: number) {
  const x = c.axis + side * c.dx;
  return `<path d="M${x - c.rx * 0.84} ${c.ey + 12} Q${x} ${c.ey - c.ry * 0.86} ${x + c.rx * 0.84} ${c.ey + 12}" fill="none" stroke="${c.line}" stroke-width="12" stroke-linecap="round"/>`;
}

function heartEye(c: FaceGrid, side: number) {
  const x = c.axis + side * c.dx, s = c.ry * 0.082;
  return `<g class="mo-lovebeat"><path transform="translate(${x - 12 * s} ${c.ey - 12.5 * s}) scale(${s})" d="${HEART_PATH}" fill="#FF2F68"/><ellipse cx="${x - 4.8 * s}" cy="${c.ey - 5.5 * s}" rx="${2.4 * s}" ry="${1.8 * s}" fill="#fff" opacity="0.95"/></g>`;
}

function brows(c: FaceGrid, lift = 0, tilt = 0, liftR = lift, tiltR = tilt) {
  return ([[-1, lift, tilt], [1, liftR, tiltR]] as const).map(([side, l, t]) => {
    const x = c.axis + side * c.dx, y = c.by - l;
    const inner = y - t * 9, outer = y + t * 9;
    return `<path d="M${x - side * 36} ${inner + 6} Q${x} ${y - 14} ${x + side * 36} ${outer + 6}" fill="none" stroke="${c.brow}" stroke-width="12" stroke-linecap="round"/>`;
  }).join("");
}

const smile = (c: FaceGrid, w: number, h: number) =>
  `<path d="M${c.axis - w} ${c.my - h * 0.3} Q${c.axis} ${c.my + h} ${c.axis + w} ${c.my - h * 0.3}" fill="none" stroke="${c.line}" stroke-width="10" stroke-linecap="round"/>`;

const smirk = (c: FaceGrid) =>
  `<path d="M${c.axis - 28} ${c.my + 2} Q${c.axis + 2} ${c.my + 18} ${c.axis + 32} ${c.my - 8}" fill="none" stroke="${c.line}" stroke-width="10" stroke-linecap="round"/>`;

const ooh = (c: FaceGrid) =>
  `<ellipse cx="${c.axis}" cy="${c.my + 4}" rx="17" ry="21" fill="${c.line}"/><ellipse cx="${c.axis}" cy="${c.my + 12}" rx="10" ry="9" fill="${c.tongue}"/>`;

function openMouth(c: FaceGrid, w: number, h: number, teeth: boolean) {
  const id = nextId(), x = c.axis, y = c.my;
  const d = `M${x - w} ${y - 14} Q${x} ${y - 6} ${x + w} ${y - 14} Q${x + w * 0.92} ${y + h} ${x} ${y + h} Q${x - w * 0.92} ${y + h} ${x - w} ${y - 14}Z`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${c.line}"/><g clip-path="url(#${id})"><ellipse cx="${x}" cy="${y + h}" rx="${w * 0.64}" ry="${h * 0.48}" fill="${c.tongue}"/>${teeth ? `<rect x="${x - w}" y="${y - 20}" width="${w * 2}" height="17" fill="#fff"/>` : ""}</g>`;
}

const blush = (c: FaceGrid, op: number) =>
  [-1, 1].map((s) => `<ellipse cx="${c.axis + s * c.bldx}" cy="${c.bly}" rx="42" ry="26" fill="url(#mo-blush)" opacity="${op}"/>`).join("");

const tear = (c: FaceGrid) =>
  `<path class="mo-tear" d="M${c.axis - c.dx} ${c.ey + 22} q-13 22 0 33 q13 -11 0 -33z" fill="#D6F1FF" stroke="#fff" stroke-width="2.5"/>`;

const EXPRESSIONS: Record<Expression, (c: FaceGrid) => string> = {
  smile: (c) => blush(c, 0.55) + brows(c, 2) + eye(c, -1) + eye(c, 1) + smile(c, 30, 22),
  up: (c) => blush(c, 0.55) + brows(c, 14, 0.5) + eye(c, -1, { pupil: [0, -14] }) + eye(c, 1, { pupil: [0, -14] }) + smile(c, 22, 18),
  joy: (c) => blush(c, 0.85) + brows(c, 18) + arc(c, -1) + arc(c, 1) + openMouth(c, 40, 42, true),
  read: (c) => blush(c, 0.45) + brows(c, -4, -0.4) + eye(c, -1, { look: "mo-reading", lid: true, pupil: [0, 10] }) + eye(c, 1, { look: "mo-reading", lid: true, pupil: [0, 10] }) + smile(c, 14, 10),
  wow: (c) => blush(c, 0.65) + brows(c, 22, 0.5) + eye(c, -1, { wide: true }) + eye(c, 1, { wide: true }) + ooh(c),
  proud: (c) => blush(c, 0.9) + brows(c, 8, 0.8) + arc(c, -1) + arc(c, 1) + tear(c) + smile(c, 32, 26),
  love: (c) => blush(c, 0.95) + brows(c, 16) + heartEye(c, -1) + heartEye(c, 1) + openMouth(c, 28, 30, false),
  wink: (c) => blush(c, 0.75) + brows(c, 0, 0, 16, 0.4) + arc(c, -1) + eye(c, 1) + smirk(c),
  gaze: (c) => blush(c, 0.55) + brows(c, 6, 0.3) + eye(c, -1, { pupil: [5, 12] }) + eye(c, 1, { pupil: [-5, 12] }) + smile(c, 18, 13),
};

export function faceSvg(key: MascotKey, expression: Expression): string {
  const c = FACE[key];
  return `<ellipse cx="${c.axis}" cy="${c.fy}" rx="112" ry="34" fill="url(#${c.fore})"/>${EXPRESSIONS[expression](c)}`;
}

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS) as Expression[];

const BOOK_PAGE_RIGHT = "M640 668 Q565 642 490 680 L490 792 Q565 756 640 782Z";

export const BOOK_SVG = `<g class="mo-book-open"><path d="M340 668 Q415 642 490 680 L490 792 Q415 756 340 782Z" fill="#FFF8E9" stroke="#C99A62" stroke-width="4"/><path d="${BOOK_PAGE_RIGHT}" fill="#FFFDF5" stroke="#C99A62" stroke-width="4"/><path d="M364 690q50 -16 104 6M364 712q50 -16 104 6M364 734q50 -16 104 6M512 696q54 -22 104 -6M512 718q54 -22 104 -6M512 740q54 -22 104 -6" stroke="#CDBB9C" stroke-width="5" fill="none" stroke-linecap="round"/><g class="mo-flip"><path d="${BOOK_PAGE_RIGHT}" fill="#F4E7CC" stroke="#C99A62" stroke-width="3"/></g><path d="M336 662 Q415 638 490 672 Q565 638 644 662 L644 672 Q565 648 490 684 Q415 648 336 672Z" fill="#6D2BD9"/></g><g class="mo-book-shut"><rect x="374" y="628" width="212" height="176" rx="14" fill="url(#mo-cover)" stroke="#F3C76E" stroke-width="5" transform="rotate(-3 480 716)"/><path transform="translate(442 666) scale(3.2) rotate(-3 12 12)" d="${HEART_PATH}" fill="#FFD27A"/></g><ellipse cx="346" cy="690" rx="30" ry="25" fill="#2F8EF5"/><ellipse cx="636" cy="704" rx="30" ry="25" fill="#2F8EF5"/>`;
