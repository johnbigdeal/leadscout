/**
 * USD-based exchange rates. rates[C] = units of currency C per 1 USD.
 * Used to normalize per-service costs (which can each be in a different
 * currency) to a common base for aggregation.
 */

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.93, CRC: 518, MXN: 18.5, COP: 4150,
  ARS: 870, CLP: 935, PEN: 3.75,
};

let cache: { rates: Record<string, number>; expiresAt: number } | null = null;

export async function getUsdRates(): Promise<Record<string, number>> {
  if (cache && cache.expiresAt > Date.now()) return cache.rates;
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      { next: { revalidate: 3600 } },
    );
    if (res.ok) {
      const data = await res.json();
      const raw: Record<string, number> | undefined = data?.usd;
      if (raw) {
        const mapped: Record<string, number> = { USD: 1 };
        for (const [key, val] of Object.entries(raw)) mapped[key.toUpperCase()] = val as number;
        cache = { rates: mapped, expiresAt: Date.now() + 3600_000 };
        return mapped;
      }
    }
  } catch {
    // fall through to fallback
  }
  if (cache) return cache.rates;
  return FALLBACK_RATES;
}

/** Convert an amount in `currency` to USD using USD-based rates. */
export function toUsd(amount: number, currency: string, rates: Record<string, number>): number {
  const rate = rates[(currency || "USD").toUpperCase()];
  if (!rate || rate <= 0) return amount; // unknown currency → assume already USD
  return amount / rate;
}
