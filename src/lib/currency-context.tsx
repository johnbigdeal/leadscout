"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type CurrencyContextType = {
  currency: string;
  convertAmount: (usdAmount: number) => number;
  refreshCurrency: () => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  convertAmount: (n: number) => n,
  refreshCurrency: async () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesLoaded, setRatesLoaded] = useState(false);

  const loadRates = useCallback(async () => {
    const res = await fetch("/api/settings/exchange-rate");
    if (res.ok) {
      const data = await res.json();
      setRates(data.rates || { USD: 1 });
      setRatesLoaded(true);
    } else {
      setRates({ USD: 1 });
      setRatesLoaded(true);
    }
  }, []);

  const refreshCurrency = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const [statusRes] = await Promise.all([
      fetch("/api/auth/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
      !ratesLoaded ? loadRates() : Promise.resolve(),
    ]);
    if (statusRes.ok) {
      const data = await statusRes.json();
      setCurrency(data.currency || "USD");
    }
  }, [loadRates, ratesLoaded]);

  const convertAmount = useCallback(
    (usdAmount: number) => {
      const rate = rates[currency] ?? 1;
      return usdAmount * rate;
    },
    [currency, rates],
  );

  useEffect(() => { loadRates(); }, [loadRates]);
  useEffect(() => { refreshCurrency(); }, [refreshCurrency]);

  return (
    <CurrencyContext.Provider value={{ currency, convertAmount, refreshCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
