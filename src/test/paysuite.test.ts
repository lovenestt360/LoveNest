import { describe, expect, it } from "vitest";
import { amountsMatch, parsePaySuitePaymentResponse } from "../../supabase/functions/_shared/paysuite";

describe("PaySuite response parsing", () => {
  it("reads the documented nested create-payment response", () => {
    expect(parsePaySuitePaymentResponse({
      status: "success",
      data: {
        id: "pay_123",
        checkout_url: "https://paysuite.test/checkout/pay_123",
      },
    })).toEqual({
      externalId: "pay_123",
      checkoutUrl: "https://paysuite.test/checkout/pay_123",
    });
  });

  it("keeps compatibility with a flat payload", () => {
    expect(parsePaySuitePaymentResponse({
      id: "legacy_1",
      checkout_url: "https://example.test/pay",
    })).toEqual({
      externalId: "legacy_1",
      checkoutUrl: "https://example.test/pay",
    });
  });

  it("does not invent a checkout URL on malformed responses", () => {
    expect(parsePaySuitePaymentResponse({ status: "success", data: {} }).checkoutUrl).toBeNull();
  });
});

describe("PaySuite amount verification", () => {
  it("accepts equivalent numeric representations", () => {
    expect(amountsMatch("500.00", 500)).toBe(true);
  });

  it("rejects different or missing amounts", () => {
    expect(amountsMatch("500", 499.99)).toBe(false);
    expect(amountsMatch("500", undefined)).toBe(false);
  });
});
