import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.93, CRC: 518, MXN: 18.5, COP: 4150,
  ARS: 870, CLP: 935, PEN: 3.75,
};

let cache: { rates: Record<string, number>; expiresAt: number } | null = null;

async function fetchAllRates(): Promise<Record<string, number>> {
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
        for (const [key, val] of Object.entries(raw)) {
          mapped[key.toUpperCase()] = val as number;
        }
        cache = { rates: mapped, expiresAt: Date.now() + 3600_000 };
        return mapped;
      }
    }
  } catch {
    // fallback
  }

  if (cache) return cache.rates;
  return FALLBACK_RATES;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rates = await fetchAllRates();

  const to = searchParams.get("to");
  if (to) {
    const rate = rates[to.toUpperCase()];
    if (rate === undefined) {
      return NextResponse.json({ error: `Unsupported currency: ${to}` }, { status: 400 });
    }
    return NextResponse.json({ from: "USD", to: to.toUpperCase(), rate, timestamp: Date.now() });
  }

  return NextResponse.json({ from: "USD", rates, timestamp: Date.now() });
}
