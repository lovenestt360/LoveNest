import { describe, expect, it } from "vitest";
import { learnCycleStats, runCycleEngineFromProfile } from "@/features/cycle/engine";

const p = (start_date: string, end_date: string | null = null) => ({ start_date, end_date });

describe("learnCycleStats", () => {
  it("sem histórico não aprende nada", () => {
    const l = learnCycleStats([p("2026-10-08")]);
    expect(l.cycleLength).toBeNull();
    expect(l.cyclesUsed).toBe(0);
  });

  it("usa a mediana dos ciclos e dos períodos terminados", () => {
    const l = learnCycleStats([
      p("2026-10-08"),
      p("2026-09-09", "2026-09-13"), // 29 dias até 8 out, período de 5
      p("2026-08-09", "2026-08-14"), // 31 dias, período de 6
      p("2026-07-12", "2026-07-16"), // 28 dias, período de 5
    ]);
    expect(l.cycleLength).toBe(29);
    expect(l.periodLength).toBe(5);
    expect(l.cyclesUsed).toBe(3);
    expect(l.variation).toBe(2);
    expect(l.regular).toBe(true);
  });

  it("ignora intervalos impossíveis (registos duplicados ou esquecidos)", () => {
    const l = learnCycleStats([p("2026-10-08"), p("2026-10-02"), p("2026-09-04"), p("2026-05-01")]);
    expect(l.cycles.map((c) => c.length)).toEqual([28]);
  });

  it("as médias aprendidas mudam a previsão do motor", () => {
    const periods = [p("2026-10-08"), p("2026-09-04", "2026-09-08"), p("2026-07-31", "2026-08-04")];
    const engine = runCycleEngineFromProfile({ avg_cycle_length: 28 }, periods[0], periods)!;
    // ciclos de 34 e 35 dias: a mediana arredonda para 35
    expect(engine.cycleLength).toBe(35);
    expect(engine.nextPeriodStr).toBe("2026-11-12");
  });
});
