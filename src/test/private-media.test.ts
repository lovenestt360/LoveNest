import { describe, expect, it } from "vitest";
import { storagePath } from "@/lib/privateMedia";

describe("storagePath", () => {
  it("extracts the path from legacy public chat URLs", () => {
    expect(storagePath("chat-media",
      "https://project.supabase.co/storage/v1/object/public/chat-media/user-1/1792102657150.webm"
    )).toBe("user-1/1792102657150.webm");
  });

  it("extracts the path from signed URLs and drops the token", () => {
    expect(storagePath("photos",
      "https://project.supabase.co/storage/v1/object/sign/photos/capsules/a%20b.jpg?token=x"
    )).toBe("capsules/a b.jpg");
  });

  it("keeps bare object paths", () => {
    expect(storagePath("chat-media", "user-1/123.jpg")).toBe("user-1/123.jpg");
  });

  it("ignores local previews, placeholders, other buckets and external URLs", () => {
    expect(storagePath("chat-media", "blob:https://app/123")).toBeNull();
    expect(storagePath("chat-media", "pending")).toBeNull();
    expect(storagePath("chat-media", "https://project.supabase.co/storage/v1/object/public/avatars/u/a.jpg")).toBeNull();
    expect(storagePath("chat-media", "https://example.com/a.jpg")).toBeNull();
    expect(storagePath("chat-media", null)).toBeNull();
  });
});
