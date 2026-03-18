import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Clock, AlertTriangle, CheckCircle, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import WompiWidget from "../courses/WompiWidget";

function useCountdown(trialStartISO, trialHours = 48) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!trialStartISO) return;
    const trialEnd = new Date(trialStartISO).getTime() + trialHours * 60 * 60 * 1000;
    const tick = () => {
      const diff = trialEnd - Date.now();
      if (diff <= 0) {
        setRemaining({ expired: true, h: 0, m: 0, s: 0 });
      } else {
        setRemaining({
          expired: false,
          h: Math.floor(diff / 3600000),
          m: Math.floor((diff % 3600000) / 60000),
          s: Math.floor((diff % 60000) / 1000),
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trialStartISO, trialHours]);
  return remaining;
}

const pad = (n) => String(n).padStart(2, "0");

const PROFILE_NAMES = {
  trader: "Trader Pro",
  drone_pilot: "Drone Pilot Pro",
  startup: "Startup HQ Pro",
  elite_human: "Elite Human Pro",
};

export default function TrialBanner({ profile }) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  // Sub global del perfil (solo 1, creado por admin)
  const { data: subs = [] } = useQuery({
    queryKey: ["subscription", profile],
    queryFn: () => base44.entities.Subscription.filter({ profile }),
    enabled: !!profile,
  });

  const sub = subs[0] || null;
  const trialHours = sub?.trial_hours ?? 48;

  // trial_start_date se guarda en el usuario, no en Subscription
  const trialKey = `trial_start_${profile}`;
  const trialStartDate = user?.[trialKey] || null;
  const countdown = useCountdown(trialStartDate, trialHours);

  // Si el usuario no tiene trial_start aún, iniciarlo en su propio registro
  useEffect(() => {
    if (!user || user[trialKey]) return;
    base44.auth.updateMe({ [trialKey]: new Date().toISOString() });
  }, [user?.email, profile]);

  const handlePay = async () => {
    if (!sub || !sub.monthly_price_cop || sub.monthly_price_cop <= 0) return;
    setPaying(true);
    try {
      const currentUser = await base44.auth.me();
      const email = currentUser?.email || "unknown";
      const reference = `VEXNY-SUB-${profile}-${Date.now()}`;
      const amountInCents = Math.round(sub.monthly_price_cop * 100);

      const res = await base44.functions.invoke("wompiSignature", {
        reference,
        amountInCents,
        currency: "COP",
      });

      const { signature, publicKey } = res.data;
      if (!signature || !publicKey) {
        throw new Error('Missing signature or publicKey');
      }

      const redirectUrl = `${window.location.origin}/Dashboard`;

      setCheckoutData({
        reference,
        amountInCents,
        signature,
        publicKey,
        email,
        redirectUrl,
      });
      setDialogOpen(true);
    } catch (err) {
      console.error("Error iniciando pago:", err);
      alert("Error al iniciar el pago. Intenta de nuevo.");
    } finally {
      setPaying(false);
    }
  };

  if (!sub && !user) return null;

  const isPaid = sub?.is_active;
  const trialActive = sub?.trial_start_date && countdown && !countdown.expired;
  const trialExpired = sub?.trial_start_date && countdown?.expired;
  const hasPrice = sub?.monthly_price_cop > 0;

  // Bloqueo total al expirar (para usuarios no admin no pagados)
  if (trialExpired && !isPaid && user?.role !== "admin") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="max-w-md w-full mx-4 bg-card border border-destructive/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Prueba gratuita terminada</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Tu período de prueba ha finalizado. Suscríbete para seguir usando {PROFILE_NAMES[profile]}.
          </p>
          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-1">Suscripción mensual</p>
            <p className="text-2xl font-bold">
              {hasPrice ? `$${Number(sub.monthly_price_cop).toLocaleString("es-CO")} COP` : "—"}
            </p>
          </div>
          <Button
            className="w-full gap-2"
            onClick={handlePay}
            disabled={paying || !hasPrice}
            title={!hasPrice ? "El precio aún no ha sido configurado" : ""}
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Activar suscripción
          </Button>
          {!hasPrice && (
            <p className="text-xs text-muted-foreground mt-3">El administrador aún no ha configurado el precio.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-2xl border p-5 ${
        isPaid
          ? "bg-emerald-500/5 border-emerald-500/20"
          : trialExpired
          ? "bg-destructive/5 border-destructive/30"
          : "bg-amber-500/5 border-amber-500/20"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Status left */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isPaid ? "bg-emerald-500/15" : trialExpired ? "bg-destructive/15" : "bg-amber-500/15"
            }`}>
              {isPaid ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : trialExpired ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <Clock className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${
                isPaid ? "text-emerald-600 dark:text-emerald-400"
                : trialExpired ? "text-destructive"
                : "text-amber-600 dark:text-amber-400"
              }`}>
                {isPaid ? `✓ ${PROFILE_NAMES[profile]} — Activo`
                 : trialExpired ? "Prueba vencida — activa tu plan"
                 : `Prueba gratuita de ${trialHours}h`}
              </p>
              {!isPaid && trialActive && countdown && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tiempo restante:{" "}
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {pad(countdown.h)}h {pad(countdown.m)}m {pad(countdown.s)}s
                  </span>
                </p>
              )}
              {!isPaid && trialExpired && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Suscríbete para seguir usando {PROFILE_NAMES[profile]}
                </p>
              )}
            </div>
          </div>

          {/* Right: price + action */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Price display */}
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Suscripción mensual</p>
              <p className="font-bold text-base">
                {hasPrice ? `$${Number(sub.monthly_price_cop).toLocaleString("es-CO")} COP` : "—"}
              </p>
            </div>

            {/* Action button */}
            {!isPaid && (
              <Button
                size="sm"
                className="gap-2"
                onClick={handlePay}
                disabled={paying || !hasPrice}
                title={!hasPrice ? "El precio aún no ha sido configurado" : ""}
              >
                {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                Suscribirme
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar suscripción</DialogTitle>
            <DialogDescription>
              {PROFILE_NAMES[profile]} • ${Number(sub?.monthly_price_cop || 0).toLocaleString("es-CO")} COP/mes
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {checkoutData && (
              <WompiWidget
                publicKey={checkoutData.publicKey}
                reference={checkoutData.reference}
                amountInCents={checkoutData.amountInCents}
                signature={checkoutData.signature}
                customerEmail={checkoutData.email}
                redirectUrl={checkoutData.redirectUrl}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}