import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProfile } from '@/lib/ProfileContext';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import WompiWidget from '@/components/courses/WompiWidget';

const PROFILE_NAMES = {
  trader: 'Trader Pro',
  drone_pilot: 'Drone Pilot Pro',
  startup: 'Startup HQ Pro',
  elite_human: 'Elite Human Pro',
};

function useCountdown(trialStartISO, trialHours = 48) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!trialStartISO) return;
    const trialEnd = new Date(trialStartISO).getTime() + trialHours * 60 * 60 * 1000;
    const tick = () => {
      const diff = trialEnd - Date.now();
      setRemaining({
        expired: diff <= 0,
        h: Math.max(0, Math.floor(diff / 3600000)),
        m: Math.max(0, Math.floor((diff % 3600000) / 60000)),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trialStartISO, trialHours]);
  return remaining;
}

export default function FeatureGate({ children, featureName = 'Feature' }) {
  const user = useCurrentUser();
  const { activeProfileId } = useProfile();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  // Obtener perfil asociado al activeProfileId
  const profile = Object.keys(PROFILE_NAMES).find(p => {
    const pId = user?.[`profile_${p}_id`];
    return pId === activeProfileId;
  }) || 'trader';

  // Obtener suscripción global del perfil (solo 1, creada por admin)
  const { data: subs = [] } = useQuery({
    queryKey: ['subscription', profile],
    queryFn: () => base44.entities.Subscription.filter({ profile }),
    enabled: !!profile && !!user,
  });

  const sub = subs[0] || null;
  const trialHours = sub?.trial_hours ?? 48;
  const trialKey = `trial_start_${profile}`;
  const trialStartDate = user?.[trialKey];
  const countdown = useCountdown(trialStartDate, trialHours);

  // Determinar si tiene acceso
  const isPaid = sub?.is_active;
  const trialActive = trialStartDate && countdown && !countdown.expired;
  const hasAccess = isPaid || trialActive || user?.role === 'admin';

  if (!countdown) {
    return <>{children}</>;
  }

  const handlePay = async () => {
    if (!sub || !sub.monthly_price_cop || sub.monthly_price_cop <= 0) return;
    setPaying(true);
    try {
      const currentUser = await base44.auth.me();
      const email = currentUser?.email || 'unknown';
      const reference = `VEXNY-SUB-${profile}-${Date.now()}`;
      const amountInCents = Math.round(sub.monthly_price_cop * 100);

      const res = await base44.functions.invoke('wompiSignature', {
        reference,
        amountInCents,
        currency: 'COP',
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
      console.error('Error iniciando pago:', err);
      alert('Error al iniciar el pago. Intenta de nuevo.');
    } finally {
      setPaying(false);
    }
  };

  if (!hasAccess) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="max-w-md w-full mx-4 bg-card border border-destructive/30 rounded-2xl p-8 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Acceso bloqueado</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tu prueba gratuita de {PROFILE_NAMES[profile]} ha finalizado.
              </p>
            </div>
            <div className="bg-destructive/5 rounded-lg p-3 text-sm">
              <p className="text-foreground font-semibold mb-1">¿Qué pasó?</p>
              <p className="text-muted-foreground text-xs">
                Para seguir usando todas las herramientas avanzadas, necesitas activar una suscripción.
              </p>
            </div>
            <div className="mb-2">
              <p className="text-xs text-muted-foreground mb-2">Suscripción mensual</p>
              <p className="text-2xl font-bold">
                {sub?.monthly_price_cop > 0 ? `$${Number(sub.monthly_price_cop).toLocaleString('es-CO')} COP` : '—'}
              </p>
            </div>
            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={handlePay}
              disabled={paying || !sub?.monthly_price_cop}
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Activar suscripción
            </Button>
            <p className="text-xs text-muted-foreground">
              Contacta al administrador si tienes dudas
            </p>
          </div>
        </div>

        {/* Checkout Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar suscripción</DialogTitle>
              <DialogDescription>
                {PROFILE_NAMES[profile]} • ${Number(sub?.monthly_price_cop || 0).toLocaleString('es-CO')} COP/mes
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
                  profile={profile}
                  onSuccess={(success) => {
                    if (success) {
                      queryClient.invalidateQueries({ queryKey: ['subscription', profile] });
                      setDialogOpen(false);
                    }
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <>{children}</>;
}