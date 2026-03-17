import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PROFILES } from "@/lib/ProfileContext";
import { CheckCircle, Clock, AlertTriangle, CreditCard, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function useCountdown(endDateISO) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!endDateISO) return;
    const endTime = new Date(endDateISO).getTime();
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) setRemaining({ expired: true, h: 0, m: 0, s: 0, d: 0 });
      else setRemaining({
        expired: false,
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDateISO]);
  return remaining;
}

const pad = (n) => String(n).padStart(2, "0");

function AppSubscriptionCard({ profile, sub, onPay, paying }) {
  const countdown = useCountdown(sub?.trial_start_date || null);
  const isPaid = sub?.is_active;
  const trialActive = sub?.trial_start_date && countdown && !countdown.expired;
  const trialExpired = sub?.trial_start_date && countdown?.expired;
  const Icon = profile.icon;
  const monthlyPrice = sub?.monthly_price_cop || 0;

  return (
    <div className={`rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
      isPaid
        ? "border-emerald-500/30 bg-emerald-500/5"
        : trialExpired
        ? "border-destructive/30 bg-destructive/5"
        : "border-border bg-card"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${profile.accent}20` }}>
            <Icon className="w-6 h-6" style={{ color: profile.accent }} />
          </div>
          <div>
            <h3 className="font-bold text-base">{profile.label}</h3>
            <p className="text-xs text-muted-foreground">{profile.description}</p>
          </div>
        </div>

        {isPaid && (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 flex-shrink-0">
            <CheckCircle className="w-3 h-3 mr-1" /> Activo
          </Badge>
        )}
        {!isPaid && trialActive && (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 flex-shrink-0">
            <Clock className="w-3 h-3 mr-1" /> Prueba
          </Badge>
        )}
        {!isPaid && trialExpired && (
          <Badge variant="destructive" className="flex-shrink-0">
            <AlertTriangle className="w-3 h-3 mr-1" /> Vencida
          </Badge>
        )}
        {!sub && (
          <Badge variant="secondary" className="flex-shrink-0">Sin iniciar</Badge>
        )}
      </div>

      {/* Status info */}
      <div className="text-sm">
        {isPaid && sub?.paid_until && (
          <p className="text-muted-foreground">
            Activo hasta:{" "}
            <span className="font-semibold text-foreground">
              {new Date(sub.paid_until).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </p>
        )}
        {!isPaid && trialActive && countdown && (
          <p className="text-muted-foreground">
            Prueba vence en:{" "}
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {pad(countdown.h)}h {pad(countdown.m)}m {pad(countdown.s)}s
            </span>
          </p>
        )}
        {!isPaid && trialExpired && (
          <p className="text-destructive font-medium text-sm">Tu prueba ha vencido. Suscríbete para continuar.</p>
        )}
        {!sub && (
          <p className="text-muted-foreground text-xs">Abre esta app para iniciar tu prueba gratuita de 48h.</p>
        )}
      </div>

      {/* Price + button */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-4">
        <div>
          <p className="text-2xl font-extrabold">
            ${monthlyPrice.toLocaleString("es-CO")}
            <span className="text-sm font-normal text-muted-foreground"> COP/mes</span>
          </p>
        </div>
        {!isPaid ? (
          <Button
            className="gap-2"
            onClick={() => onPay(profile.id, monthlyPrice)}
            disabled={paying === profile.id}
          >
            {paying === profile.id
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CreditCard className="w-4 h-4" />}
            Suscribirme
          </Button>
        ) : (
          <Button variant="outline" disabled className="text-emerald-600 border-emerald-500/30">
            <CheckCircle className="w-4 h-4 mr-2" /> Suscrito
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Subscription() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(null);

  const { data: allSubs = [] } = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: () => base44.entities.Subscription.list(),
  });

  // Check for Wompi redirect with transaction
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txId = params.get("id");
    const ref = params.get("reference") || params.get("sub_ref");

    if (txId && ref) {
      // Extract profile from reference: VEXNY-SUB-{profile}-{timestamp}
      const parts = ref.split("-");
      // reference format: VEXNY-SUB-drone_pilot-123 or VEXNY-SUB-trader-123
      const profileId = parts.slice(2, parts.length - 1).join("-");
      if (profileId) {
        base44.functions.invoke("activateSubscription", {
          transactionId: txId,
          reference: ref,
          profile: profileId,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["all-subscriptions"] });
          // Clean URL
          window.history.replaceState({}, "", "/Subscription");
        });
      }
    }
  }, []);

  const handlePay = async (profileId, monthlyPrice) => {
    setPaying(profileId);
    try {
      const reference = `VEXNY-SUB-${profileId}-${Date.now()}`;
      const amountInCents = monthlyPrice * 100;

      const res = await base44.functions.invoke("wompiSignature", {
        reference,
        amountInCents,
        currency: "COP",
      });

      const { signature, publicKey } = res.data;
      const redirectUrl = `${window.location.origin}/Subscription`;

      const params = new URLSearchParams({
        "public-key": publicKey,
        currency: "COP",
        "amount-in-cents": String(amountInCents),
        reference,
        "signature:integrity": signature,
        "redirect-url": redirectUrl,
      });

      window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`;
    } catch (err) {
      console.error(err);
      alert("Error al iniciar el pago. Intenta de nuevo.");
      setPaying(null);
    }
  };

  const getSubForProfile = (profileId) =>
    allSubs.find((s) => s.profile === profileId) || null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
       <div className="flex items-center gap-2">
         <Zap className="w-5 h-5 text-primary" />
         <h1 className="text-2xl font-bold">Suscripciones</h1>
       </div>
       <p className="text-muted-foreground">
         Cada app incluye <strong>48 horas de prueba gratuita</strong>. Activa tu suscripción mensual para acceso ilimitado.
       </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PROFILES.map((profile) => (
          <AppSubscriptionCard
            key={profile.id}
            profile={profile}
            sub={getSubForProfile(profile.id)}
            onPay={handlePay}
            paying={paying}
          />
        ))}
      </div>
    </div>
  );
}