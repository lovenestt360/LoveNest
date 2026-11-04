import { describe, expect, it } from "vitest";
import { levelUpCheck } from "@/features/streak/journeyLevels";

describe("levelUpCheck (A vossa chama evoluiu!)", () => {
  it("celebra quando a fase sobe acima da mais alta já vista", () => {
    expect(levelUpCheck(2, 3)).toEqual({ celebrate: true, store: 3 });
  });

  it("primeira vez neste aparelho (ou dados limpos): só guarda, não celebra", () => {
    expect(levelUpCheck(0, 4)).toEqual({ celebrate: false, store: 4 });
  });

  it("a mesma fase não volta a celebrar", () => {
    expect(levelUpCheck(3, 3)).toEqual({ celebrate: false, store: null });
  });

  it("se o streak cair, guarda a fase mais alta e não celebra ao voltar a subir", () => {
    expect(levelUpCheck(4, 1)).toEqual({ celebrate: false, store: null });
    expect(levelUpCheck(4, 3)).toEqual({ celebrate: false, store: null });
    expect(levelUpCheck(4, 5)).toEqual({ celebrate: true, store: 5 });
  });
});
