import { describe, expect, it } from "vitest";
import { isHeicFile, isHeicUrl, displayableUrl } from "@/lib/heic";

describe("heic", () => {
  it("detects HEIC files by type or extension", () => {
    expect(isHeicFile(new File([""], "IMG_1.HEIC", { type: "" }))).toBe(true);
    expect(isHeicFile(new File([""], "foto", { type: "image/heif" }))).toBe(true);
    expect(isHeicFile(new File([""], "foto.jpg", { type: "image/jpeg" }))).toBe(false);
  });

  it("detects HEIC signed URLs, ignoring the token", () => {
    expect(isHeicUrl("https://x.supabase.co/storage/v1/object/sign/memories/a/b.heic?token=abc.def")).toBe(true);
    expect(isHeicUrl("https://x.supabase.co/storage/v1/object/sign/memories/a/b.jpg?token=x.heic")).toBe(false);
    expect(isHeicUrl(null)).toBe(false);
  });

  it("passes non-HEIC URLs through untouched", async () => {
    await expect(displayableUrl("https://x/a.png?token=1")).resolves.toBe("https://x/a.png?token=1");
  });
});
