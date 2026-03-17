import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Clock, AlertTriangle, CheckCircle, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function useCountdown(trialStartISO) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!trialStartISO) return;
    const trialEnd = new Date(trialStartISO).getTime() + 48 * 60 * 60 * 1000;
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
  }, [trialStartISO]);
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

  const { data: subs = [] } = useQuery({
    queryKey: ["subscription", profile],
    queryFn: () => base44.entities.Subscription.filter({ profile }),
    enabled: !!profile,
  });

  const sub = subs[0] || null;
  const countdown = useCountdown(sub?.trial_start_date || null);

  const createSub = useMutation({
    mutationFn: (data) => base44.entities.Subscription.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription", profile] }),
  });

  // Para usuario regular: crear registro de trial si no existe
  useEffect(() => {
    if (!user || subs.length > 0) return;
    createSub.mutate({
      profile,
      monthly_price_cop: 0,
      is_active: false,
      trial_start_date: new Date().toISOString(),
    });
  }, [user, subs.length, profile]);

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
        throw new Error('Missing signature or publicKey from wompiSignature');
      }

      const redirectUrl = `${window.location.origin}/Dashboard`;

      // Construir URL de Wompi Checkout con parámetros correctos
      const checkoutUrl = new URL('https://checkout.wompi.co/p/');
      checkoutUrl.searchParams.append('public-key', publicKey);
      checkoutUrl.searchParams.append('currency', 'COP');
      checkoutUrl.searchParams.append('amount-in-cents', String(amountInCents));
      checkoutUrl.searchParams.append('reference', reference);
      checkoutUrl.searchParams.append('signature:integrity', signature);
      checkoutUrl.searchParams.append('redirect-url', redirectUrl);

      window.location.href = checkoutUrl.toString();
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

  return (
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
               : "Prueba gratuita de 48 horas"}
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
  );
}