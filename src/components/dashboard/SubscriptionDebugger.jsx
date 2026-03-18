import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Copy } from 'lucide-react';

export default function SubscriptionDebugger() {
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState('trader');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { data: allSubs = [] } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => base44.asServiceRole.entities.Subscription.list(),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('activateSubscriptionManual', {
        userEmail: email,
        profile: profile
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult({ type: 'success', data });
      setEmail('');
    },
    onError: (error) => {
      setResult({ type: 'error', message: error.message });
    }
  });

  const handleActivate = async () => {
    if (!email || !profile) {
      alert('Completa email y perfil');
      return;
    }
    activateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Panel de activación manual */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Activar suscripción manualmente</h3>
        <div className="space-y-3">
          <Input
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="trader">Trader</option>
            <option value="drone_pilot">Drone Pilot</option>
            <option value="startup">Startup</option>
            <option value="elite_human">Elite Human</option>
          </select>
          <Button
            onClick={handleActivate}
            disabled={activateMutation.isPending}
            className="w-full"
          >
            {activateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Activando...
              </>
            ) : (
              'Activar suscripción'
            )}
          </Button>
        </div>

        {result && (
          <div className={`mt-4 p-3 rounded-lg ${result.type === 'success' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
            {result.type === 'success' ? (
              <>
                <div className="flex gap-2 text-emerald-600 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">{result.data.message}</span>
                </div>
                <pre className="text-xs bg-background p-2 rounded mt-2 overflow-x-auto">
                  {JSON.stringify(result.data.subscription, null, 2)}
                </pre>
              </>
            ) : (
              <div className="flex gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{result.message}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Listado de suscripciones */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Estado de suscripciones (global)</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allSubs.map((sub) => (
            <div key={sub.id} className="p-3 bg-card border rounded-lg flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{sub.profile}</p>
                <p className={`text-xs ${sub.is_active ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {sub.is_active ? '✓ Activa' : '✗ Inactiva'}
                </p>
                {sub.paid_until && (
                  <p className="text-xs text-muted-foreground">
                    Hasta: {new Date(sub.paid_until).toLocaleDateString('es-CO')}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(sub, null, 2));
                  alert('Copiado al portapapeles');
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}