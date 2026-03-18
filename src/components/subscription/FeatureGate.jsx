import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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

  if (!hasAccess) {
    return (
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
          <Button className="w-full gap-2" size="lg">
            <CreditCard className="w-4 h-4" />
            Ver planes de suscripción
          </Button>
          <p className="text-xs text-muted-foreground">
            Contacta al administrador si tienes dudas
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}