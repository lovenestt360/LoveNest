export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Caixa de correio na web para o domínio do email, quando a conhecemos. */
export function webmailFor(email: string): { label: string; url: string } | null {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (["gmail.com", "googlemail.com"].includes(domain)) return { label: "Abrir o Gmail", url: "https://mail.google.com/mail/u/0/#inbox" };
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return { label: "Abrir o Outlook", url: "https://outlook.live.com/mail/" };
  if (/^yahoo\./.test(domain)) return { label: "Abrir o Yahoo Mail", url: "https://mail.yahoo.com" };
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) return { label: "Abrir o iCloud Mail", url: "https://www.icloud.com/mail" };
  return null;
}

/** 0 a 4, para o medidor da senha nova. */
export function passwordStrength(v: string) {
  if (!v) return 0;
  let n = 0;
  if (v.length >= 8) n++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++;
  if (/\d/.test(v)) n++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
  return Math.max(1, n);
}

export const ENVELOPE_SVG =
  '<svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="27" rx="5" fill="#fff" stroke="#0B1324" stroke-width="2"/><path d="M3 4.5 20 17 37 4.5" fill="none" stroke="#0B1324" stroke-width="2" stroke-linejoin="round"/><circle cx="31" cy="22" r="3.2" fill="#E5466D"/></svg>';
