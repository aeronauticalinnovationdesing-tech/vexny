import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfile } from "@/lib/ProfileContext";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, CreditCard, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Rutas siempre permitidas aunque la prueba haya vencido
const ALLOWED_PATHS = ["/Subscription", "/Profile", "/DronePilotSubscription", "/CompanySubscription", "/CompanySubscriptionEnterprise"];

function useTrialStatus(profile, user) {
  const trialKey = `trial_start_${profile}`;
  const trialStartDate = user?.[trialKey] || null;

  const { data: userSubs = [], isLoading: loadingSub } = useQuery({
    queryKey: ["subscription", profile, user?.email],
    queryFn: () => base44.entities.Subscription.filter({ profile, created_by: user.email }),
    enabled: !!profile && !!user?.email,
    refetchInterval: 5000,
  });

  const { data: globalSubs = [] } = useQuery({
    queryKey: ["subscription-global", profile],
    queryFn: () => base44.asServiceRole.entities.Subscription.filter({ profile }),
    enabled: !!profile,
  });

  const userSub = userSubs[0] || null;
  const globalSub = globalSubs[0] || null;
  const sub = userSub || globalSub || null;
  const trialHours = sub?.trial_hours ?? 48;

  const isPaid = !!sub?.is_active;

  let trialExpired = false;
  if (trialStartDate && !isPaid) {
    const trialEnd = new Date(trialStartDate).getTime() + trialHours * 60 * 60 * 1000;
    trialExpired = Date.now() > trialEnd;
  }

  const isBlocked = trialExpired && !isPaid;

  return { isBlocked, sub, isPaid, trialExpired, loadingSub };
}

export default function SubscriptionGate({ children }) {
  const user = useCurrentUser();
  const { activeProfileId } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  const { isBlocked, sub, loadingSub } = useTrialStatus(activeProfileId, user);

  const isAllowedPath = ALLOWED_PATHS.some(p => location.pathname.startsWith(p));

  // If not blocked or on allowed path or admin, render children normally
  if (!user || !activeProfileId || loadingSub || !isBlocked || isAllowedPath || user?.role === 'admin') {
    return children;
  }

  const hasPrice = sub?.monthly_price_cop > 0;
  const profileName = {
    trader: "Trader Pro",
    drone_pilot: "Drone Pilot Pro",
    drone_company: "Empresa Drone Pro",
    startup: "Startup HQ Pro",
    elite_human: "Elite Human Pro",
  }[activeProfileId] || "Pro";

  const handlePay = async () => {
    if (!hasPrice) return;
    setPaying(true);
    try {
      const reference = `VEXNY-SUB-${activeProfileId}-${Date.now()}`;
      const amountInCents = Math.round(sub.monthly_price_cop * 100);
      const res = await base44.functions.invoke("wompiSignature", { reference, amountInCents, currency: "COP" });
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
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Lock icon */}
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-destructive" />
        </div>

        {/* Message */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Prueba gratuita vencida</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tu período de prueba ha finalizado. Activa tu suscripción <strong>{profileName}</strong> para continuar usando todas las funcionalidades.
          </p>
        </div>

        {/* Price */}
        {hasPrice && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Suscripción mensual</p>
            <p className="text-3xl font-bold text-primary">
              ${Number(sub.monthly_price_cop).toLocaleString("es-CO")}
              <span className="text-base font-normal text-muted-foreground ml-1">COP/mes</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">Acceso completo · Cancela cuando quieras</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={handlePay}
            disabled={paying || !hasPrice}
          >
            {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            {hasPrice ? "Suscribirme ahora" : "Precio no configurado aún"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => navigate("/Subscription")}
          >
            Ver detalles del plan
          </Button>
        </div>

        {!hasPrice && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>El administrador aún no ha configurado el precio. Contacta soporte.</span>
          </div>
        )}
      </div>

    </div>
  );
}