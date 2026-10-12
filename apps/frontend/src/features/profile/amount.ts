const LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

const MAX_DIGITS = 12;

export function formatAmount(value: number | undefined, currency: string): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat(LOCALES[currency] ?? "en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function parseAmount(text: string): number | undefined {
  const digits = text.replace(/\D/g, "").slice(0, MAX_DIGITS);
  return digits ? Number(digits) : undefined;
}
