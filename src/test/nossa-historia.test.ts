import { describe, expect, it } from "vitest";
import {
  buildTimeLabel,
  chapterNumbers,
  dayNumber,
  isSealedFor,
  isWaitingToBeOpened,
  milestonePhrase,
  nextMilestone,
  onThisDay,
  pastMilestones,
} from "@/features/relationship-events/story";
import type { RelationshipEvent } from "@/features/relationship-events/types";

const ev = (over: Partial<RelationshipEvent>): RelationshipEvent => ({
  id: "e",
  couple_space_id: "s",
  created_by: "ana",
  title: "t",
  description: null,
  event_type: "custom",
  event_date: "2025-09-03",
  image_path: null,
  created_at: "2025-09-03T10:00:00Z",
  updated_at: "2025-09-03T10:00:00Z",
  ...over,
});

const day = (iso: string) => new Date(iso + "T12:00:00");

describe("buildTimeLabel", () => {
  it("junta anos, meses e dias", () => {
    expect(buildTimeLabel(426)).toBe("1 ano, 2 meses e 1 dia");
    expect(buildTimeLabel(0)).toBe("0 dias");
    expect(buildTimeLabel(31)).toBe("1 mês e 1 dia");
    expect(buildTimeLabel(730)).toBe("2 anos");
  });
});

describe("nextMilestone", () => {
  it("mostra os 500 dias depois do primeiro ano", () => {
    // início 3 set 2025; hoje 3 nov 2026 = dia 426 desde o início
    const r = nextMilestone("2025-09-03", day("2026-11-03"))!;
    expect(r.next.label).toBe("500 dias juntos");
    expect(r.prev?.short).toBe("1 ano");
    expect(r.daysLeft).toBe(74);
    expect(r.progress).toBeGreaterThan(0.4);
    expect(r.progress).toBeLessThan(0.5);
  });

  it("no próprio dia do marco, faltam 0 dias", () => {
    const r = nextMilestone("2025-09-03", day("2026-09-03"))!;
    expect(r.next.label).toBe("1 ano juntos");
    expect(r.daysLeft).toBe(0);
  });

  it("no primeiro dia, o próximo é 1 semana e o anterior é o início", () => {
    const r = nextMilestone("2025-09-03", day("2025-09-03"))!;
    expect(r.next.short).toBe("1 semana");
    expect(r.prev).toBeNull();
    expect(r.progress).toBe(0);
  });

  it("não há marco antes do início", () => {
    expect(nextMilestone("2030-01-01", day("2026-01-01"))).toBeNull();
  });
});

describe("pastMilestones", () => {
  it("inclui os 100 dias e o ano", () => {
    const labels = pastMilestones("2025-09-03", day("2026-11-03")).map((m) => m.label);
    expect(labels).toContain("100 dias juntos");
    expect(labels).toContain("1 ano juntos");
    expect(labels).not.toContain("500 dias juntos");
  });
});

describe("dayNumber", () => {
  it("o dia de início é o dia 1", () => {
    expect(dayNumber("2025-09-03", "2025-09-03")).toBe(1);
    expect(dayNumber("2025-09-03", "2026-10-12")).toBe(405);
    expect(dayNumber("2025-09-03", "2025-09-01")).toBeNull();
    expect(dayNumber(null, "2025-09-03")).toBeNull();
  });
});

describe("capítulo surpresa", () => {
  const surprise = ev({ created_by: "rui", is_surprise: true, opened_at: null });
  it("fica selado só para quem o recebe", () => {
    expect(isSealedFor(surprise, "ana")).toBe(true);
    expect(isSealedFor(surprise, "rui")).toBe(false);
    expect(isWaitingToBeOpened(surprise, "rui")).toBe(true);
  });
  it("depois de aberto deixa de estar selado", () => {
    const opened = { ...surprise, opened_at: "2026-11-04T10:00:00Z" };
    expect(isSealedFor(opened, "ana")).toBe(false);
    expect(isWaitingToBeOpened(opened, "rui")).toBe(false);
  });
  it("sem a coluna (SQL por aplicar) nada fica selado", () => {
    expect(isSealedFor(ev({ created_by: "rui" }), "ana")).toBe(false);
  });
});

describe("chapterNumbers e onThisDay", () => {
  const a = ev({ id: "a", event_date: "2025-11-03" });
  const b = ev({ id: "b", event_date: "2025-09-03" });
  const c = ev({ id: "c", event_date: "2025-11-03", created_at: "2025-11-04T00:00:00Z" });

  it("numera pela data e depois por quando foi escrito", () => {
    const n = chapterNumbers([a, b, c]);
    expect(n.get("b")).toBe(1);
    expect(n.get("a")).toBe(2);
    expect(n.get("c")).toBe(3);
  });

  it("encontra o capítulo de há um ano neste dia", () => {
    const r = onThisDay([a, b], day("2026-11-03"))!;
    expect(r.event.id).toBe("a");
    expect(r.years).toBe(1);
    expect(onThisDay([a, b], day("2026-11-04"))).toBeNull();
  });
});

describe("milestonePhrase", () => {
  it("tem frase para os marcos conhecidos e para anos sem frase própria", () => {
    expect(milestonePhrase("1 mês juntos")).toBe("Trinta dias onde tudo se transformou.");
    expect(milestonePhrase("7 anos juntos")).toBe("7 anos de amor que continua a crescer.");
    expect(milestonePhrase("2000 dias juntos")).toBe("Mais um marco na vossa história.");
  });
});
