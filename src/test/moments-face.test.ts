import { describe, expect, it } from "vitest";
import { EXPRESSION_NAMES, faceSvg } from "@/features/journey/moments/faceArt";

describe("rosto dos momentos", () => {
  it("todas as expressões desenham nas duas mascotes, sem valores inválidos", () => {
    for (const kind of ["G", "F"] as const) {
      for (const name of EXPRESSION_NAMES) {
        const svg = faceSvg(kind, name);
        expect(svg.length).toBeGreaterThan(100);
        expect(svg).not.toMatch(/NaN|undefined/);
      }
    }
  });

  it("a alegria tem os olhos fechados em arco e o piscar de olho só um olho aberto", () => {
    expect(faceSvg("G", "joy")).not.toContain("mo-eye");
    expect(faceSvg("G", "wink").match(/class="mo-eye"/g)).toHaveLength(1);
    expect(faceSvg("G", "smile").match(/class="mo-eye"/g)).toHaveLength(2);
  });
});
