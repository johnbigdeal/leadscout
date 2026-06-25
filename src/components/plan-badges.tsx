"use client";

import { Crown, Zap } from "lucide-react";

export function FreeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/50">
      <Zap className="h-3 w-3" />
      {children}
    </span>
  );
}

export function ProBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-[length:300%_auto] px-2.5 py-0.5 text-xs font-semibold text-white shadow-md shadow-amber-500/25 animate-shimmer">
      <Crown className="h-3 w-3" />
      {children}
    </span>
  );
}

export function SuperAdminBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-[length:300%_auto] px-2.5 py-0.5 text-xs font-semibold text-white shadow-md shadow-amber-500/25 animate-shimmer ring-2 ring-purple-500/60">
      <Crown className="h-3 w-3" />
      {children}
    </span>
  );
}

export function UpgradeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-[length:300%_auto] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl animate-shimmer"
    >
      <Crown className="h-4 w-4" />
      Upgrade a Pro
    </button>
  );
}
