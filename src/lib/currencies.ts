/** Supported currencies for service pricing (matches the exchange-rate set). */
export const CURRENCIES = [
  { code: "USD", name: "Dólar estadounidense", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "CRC", name: "Colón costarricense", symbol: "₡" },
  { code: "MXN", name: "Peso mexicano", symbol: "$" },
  { code: "COP", name: "Peso colombiano", symbol: "$" },
  { code: "ARS", name: "Peso argentino", symbol: "$" },
  { code: "CLP", name: "Peso chileno", symbol: "$" },
  { code: "PEN", name: "Sol peruano", symbol: "S/" },
] as const;

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

/** Format an amount in its own currency, e.g. 20 + "CRC" → "₡20". */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es", { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${amount} ${currency || "USD"}`;
  }
}
