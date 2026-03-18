import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Search } from 'lucide-react';

export default function PaymentVerifier() {
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState('trader');
  const [result, setResult] = useState(null);

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('checkWompiPayment', {
        email: email.trim(),
        profile: profile
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult({ type: 'success', data });
    },
    onError: (error) => {
      setResult({ type: 'error', message: error.message });
    }
  });

  const handleCheck = async () => {
    if (!email) {
      alert('Ingresa un email');
      return;
    }
    checkMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          placeholder="usuario@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="trader">Trader</option>
          <option value="drone_pilot">Drone Pilot</option>
          <option value="startup">Startup</option>
          <option value="elite_human">Elite Human</option>
        </select>
        <Button
          onClick={handleCheck}
          disabled={checkMutation.isPending}
          className="w-full"
        >
          {checkMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Verificando...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Verificar pago
            </>
          )}
        </Button>
      </div>

      {result && (
        <Card className={`p-4 ${result.type === 'success' ? 'border-emerald-500/30' : 'border-destructive/30'}`}>
          {result.type === 'success' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {result.data.hasPaid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-600">✓ SÍ HA PAGADO</p>
                      <p className="text-sm text-muted-foreground">
                        Se encontraron {result.data.transactions.length} transacción(es) aprobada(s)
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-600">✗ NO HA PAGADO</p>
                      <p className="text-sm text-muted-foreground">
                        No se encontraron transacciones aprobadas para este email y perfil
                      </p>
                    </div>
                  </>
                )}
              </div>

              {result.data.transactions.length > 0 && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground">Transacciones:</p>
                  {result.data.transactions.map((tx) => (
                    <div key={tx.id} className="p-2 bg-card rounded text-xs border">
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-emerald-600">ID: {tx.id.slice(0, 12)}...</span>
                        <span className="text-muted-foreground">
                          ${(tx.amount_in_cents / 100).toLocaleString('es-CO')} COP
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {new Date(tx.created_at).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{result.message}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}