"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BusinessCard } from "@/components/business-card";
import { Loader2 } from "lucide-react";

export default function MagicSearchPage() {
  const { token } = useParams() as { token: string };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/magic/search/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 410 ? "Link expirado" : "No encontrado");
        setData(await res.json());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-500">Error</h1>
          <p className="mt-2 text-zinc-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="font-display text-xl font-semibold">Resultados compartidos</h1>
          <p className="text-sm text-zinc-500">
            {data.search.keywords} — {data.search.location}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((biz: any) => (
            <div key={biz.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <BusinessCard business={biz} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
