import { describe, it, expect } from "vitest";
import { streakAtMonthEnd, replayLongest } from "../../supabase/functions/_shared/streak";

// Dados reais de produção (2026-10-08): dias com entrada streak_diario em
// lovepoints_ledger e couple_spaces.longest_streak calculado pelo update_streak
// real. Se a reconstrução replicar bem as regras (incluindo escudos), a
// sequência máxima reconstruída tem de bater com longest_streak.
const REAL = {
  anjinhos: { days: ["2026-08-19", "2026-08-20", "2026-09-11"], longest: 2 },
  bi: {
    days: ["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02", "2026-08-04", "2026-08-05", "2026-08-12"],
    longest: 6, // só dá 6 se um escudo tapou a falha de 08-03
  },
  quissico: { days: ["2026-07-24", "2026-08-01"], longest: 1 },
  rain: { days: ["2026-08-03", "2026-08-04"], longest: 2 },
  dhgg: { days: ["2026-07-03"], longest: 1 },
  lovenest0914: { days: ["2026-09-14"], longest: 1 },
};

describe("streak — reconstrução validada contra produção", () => {
  for (const [name, c] of Object.entries(REAL)) {
    it(`${name}: máximo reconstruído = longest_streak real (${c.longest})`, () => {
      expect(replayLongest(c.days)).toBe(c.longest);
    });
  }
});

describe("streakAtMonthEnd", () => {
  it("B & I: 6 no fim de 5 ago, escudo tapa 08-03", () => {
    expect(streakAtMonthEnd({ countedDays: REAL.bi.days, monthEnd: "2026-08-05" })).toBe(6);
  });

  it("B & I: agosto acaba a 0 (falhou 08-13..31, mais do que os escudos)", () => {
    expect(streakAtMonthEnd({ countedDays: REAL.bi.days, monthEnd: "2026-08-31" })).toBe(0);
  });

  it("Anjinhos: setembro acaba a 0 (último dia 09-11)", () => {
    expect(streakAtMonthEnd({ countedDays: REAL.anjinhos.days, monthEnd: "2026-09-30" })).toBe(0);
  });

  it("ignora dias depois do fim do mês (backfill feito mais tarde)", () => {
    expect(streakAtMonthEnd({ countedDays: ["2026-09-29", "2026-09-30", "2026-10-01"], monthEnd: "2026-09-30" })).toBe(2);
  });

  it("falhar só o último dia ainda cabe nos escudos", () => {
    expect(streakAtMonthEnd({ countedDays: ["2026-09-27", "2026-09-28", "2026-09-29"], monthEnd: "2026-09-30" })).toBe(3);
  });

  it("escudos gastos no mês contam para o fim do mês", () => {
    // gap de 3 (09-05..07) gasta os 3 escudos; falhar 09-30 já não cabe
    const days = ["2026-09-04", "2026-09-08", "2026-09-29"];
    expect(streakAtMonthEnd({ countedDays: days, monthEnd: "2026-09-29" })).toBe(1); // 09-29: gap 20 > 0 → recomeça
    expect(streakAtMonthEnd({ countedDays: ["2026-09-04", "2026-09-08", "2026-09-09"], monthEnd: "2026-09-10" })).toBe(0);
  });

  it("escudos repõem-se a 3 no mês seguinte", () => {
    expect(streakAtMonthEnd({ countedDays: ["2026-08-30", "2026-08-31"], monthEnd: "2026-09-02" })).toBe(2);
    expect(streakAtMonthEnd({ countedDays: ["2026-08-30", "2026-08-31"], monthEnd: "2026-09-04" })).toBe(0);
  });

  it("pré-ledger parado (Dd: 1 dia em abril) → 0, em vez do valor antigo", () => {
    expect(streakAtMonthEnd({ countedDays: [], monthEnd: "2026-08-31", currentStreak: 1, currentLastDate: "2026-04-25" })).toBe(0);
  });

  it("sem histórico → 0", () => {
    expect(streakAtMonthEnd({ countedDays: [], monthEnd: "2026-09-30" })).toBe(0);
  });
});
