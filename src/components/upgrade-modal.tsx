"use client";

import { useRouter } from "@/i18n/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";

export function UpgradeModal({ open, onClose, feature }: { open: boolean; onClose: () => void; feature: string }) {
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-purple-600 shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">Función exclusiva Pro</DialogTitle>
          <DialogDescription className="text-center">
            {feature} está disponible solo para usuarios con plan Pro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200/50 bg-gradient-to-b from-amber-50 to-white p-4 text-sm">
            <p className="font-semibold text-amber-800 mb-2">Con Pro obtienes:</p>
            <ul className="space-y-1.5 text-amber-700">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Dominios personalizados propios</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Búsquedas ilimitadas</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Pipelines ilimitados</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Conexión Cloudflare</li>
            </ul>
          </div>
          <button
            onClick={() => {
              onClose();
              router.push("/dashboard/settings/plans");
            }}
            className="w-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-[length:300%_auto] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl animate-shimmer"
          >
            <Crown className="mr-2 inline h-4 w-4" />
            Ver planes y upgrade
          </button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
