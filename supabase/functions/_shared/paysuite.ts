export interface PaySuitePaymentResponse {
  externalId: string | null;
  checkoutUrl: string | null;
}

export function parsePaySuitePaymentResponse(payload: any): PaySuitePaymentResponse {
  const data = payload?.data ?? payload ?? {};
  return {
    externalId: data?.id != null ? String(data.id) : null,
    checkoutUrl: typeof data?.checkout_url === "string" && data.checkout_url.length > 0
      ? data.checkout_url
      : null,
  };
}

export function amountsMatch(expected: string | number | null | undefined, received: unknown): boolean {
  const a = Number(expected);
  const b = Number(received);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  // Compare at cent precision so "500", 500 and "500.00" are equivalent.
  return Math.round(a * 100) === Math.round(b * 100);
}
