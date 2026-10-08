import { describe, expect, it } from "vitest";
import { receiptObjectPath } from "@/lib/receiptStorage";

describe("receiptObjectPath", () => {
  it("keeps new private object paths", () => {
    expect(receiptObjectPath("user-id/house/receipt.jpg")).toBe("user-id/house/receipt.jpg");
  });

  it("extracts legacy public receipt URLs", () => {
    expect(receiptObjectPath(
      "https://project.supabase.co/storage/v1/object/public/receipts/house_123.jpg"
    )).toBe("house_123.jpg");
  });

  it("rejects unrelated external URLs", () => {
    expect(receiptObjectPath("https://example.com/file.jpg")).toBeNull();
  });
});
