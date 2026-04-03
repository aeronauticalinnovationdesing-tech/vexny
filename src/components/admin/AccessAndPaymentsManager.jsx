import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, UserCheck, CheckCircle, Clock, Search, Unlock } from "lucide-react";
import { format } from "date-fns";

const PROFILE_LABELS = {
  trader: "Trader Pro",
  drone_pilot: "Drone Pilot Pro",
  drone_company: "Empresa Drone Pro",
  startup: "Startup HQ Pro",
  elite_human: "Elite Human Pro",
};

export default function AccessAndPaymentsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Grant access form
  const [grantEmail, setGrantEmail] = useState("");
  const [grantProfile, setGrantProfile] = useState("trader");
  const [grantDays, setGrantDays] = useState("30");
  const [granting, setGranting] = useState(false);
  const [grantMsg, setGrantMsg] = useState("");

  // All user subscriptions that have payment activity (paid_until set OR is_active)
  const { data: allSubs = [], isLoading } = useQuery({
    queryKey: ["admin-all-subscriptions"],
    queryFn: () => base44.asServiceRole.entities.Subscription.list("-updated_date", 200),
    refetchInterval: 15000,
  });

  // Only show subscriptions belonging to users (have created_by email)
  const paymentSubs = allSubs.filter(s =>
    s.created_by &&
    s.created_by.includes("@") &&
    (s.paid_until || s.is_active || s.last_renewal_date)
  );

  const filtered = paymentSubs.filter(s =>
    !search ||
    s.created_by?.toLowerCase().includes(search.toLowerCase()) ||
    s.profile?.toLowerCase().includes(search.toLowerCase())
  );

  const handleActivate = async (sub) => {
    const now = new Date();
    const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await base44.asServiceRole.entities.Subscription.update(sub.id, {
      is_active: true,
      paid_until: paidUntil.toISOString(),
      last_renewal_date: now.toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-all-subscriptions"] });
  };

  const handleDeactivate = async (sub) => {
    await base44.asServiceRole.entities.Subscription.update(sub.id, { is_active: false });
    queryClient.invalidateQueries({ queryKey: ["admin-all-subscriptions"] });
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    setGranting(true);
    setGrantMsg("");
    try {
      const days = parseInt(grantDays) || 30;
      const now = new Date();
      const paidUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // Check if user has a subscription for this profile
      const existing = allSubs.filter(s => s.created_by === grantEmail && s.profile === grantProfile);

      if (existing.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
          is_active: true,
          paid_until: paidUntil.toISOString(),
          last_renewal_date: now.toISOString(),
        });
        setGrantMsg(`✓ Acceso activado para ${grantEmail} (${PROFILE_LABELS[grantProfile]}) por ${days} días`);
      } else {
        // Get global price
        const globalSubs = await base44.asServiceRole.entities.Subscription.filter({ profile: grantProfile });
        const price = globalSubs.find(s => !s.created_by || !s.created_by.includes("@"))?.monthly_price_cop ?? 0;

        await base44.asServiceRole.entities.Subscription.create({
          profile: grantProfile,
          monthly_price_cop: price,
          is_active: true,
          paid_until: paidUntil.toISOString(),
          last_renewal_date: now.toISOString(),
          // NOTE: created_by will be service role, but we tag admin_granted
          admin_granted_email: grantEmail,
        });
        setGrantMsg(`✓ Suscripción creada para ${grantEmail} (${PROFILE_LABELS[grantProfile]}) por ${days} días.\n⚠️ Nota: El usuario debe tener al menos una suscripción propia para que se detecte automáticamente. Si no funciona, pídele que abra la app y regresa para confirmar.`);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-all-subscriptions"] });
    } catch (err) {
      setGrantMsg("✗ Error: " + err.message);
    }
    setGranting(false);
  };

  return (
    <div className="space-y-8">

      {/* === GRANT ACCESS === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Unlock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Dar Acceso Manual</h2>
        </div>
        <p className="text-sm text-muted-foreground">Activa el acceso a una app para cualquier usuario por su correo.</p>

        <form onSubmit={handleGrantAccess} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email del usuario</label>
              <Input
                type="email"
                placeholder="usuario@correo.com"
                value={grantEmail}
                onChange={e => setGrantEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">App / Perfil</label>
              <Select value={grantProfile} onValueChange={setGrantProfile}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROFILE_LABELS).map(([id, label]) => (
                    <SelectItem key={id} value={id}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Días de acceso</label>
              <Input
                type="number"
                min="1"
                value={grantDays}
                onChange={e => setGrantDays(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={granting} className="gap-2">
              <UserCheck className="w-4 h-4" />
              {granting ? "Activando..." : "Activar Acceso"}
            </Button>
          </div>
          {grantMsg && (
            <p className={`text-sm font-medium whitespace-pre-line ${grantMsg.startsWith("✓") ? "text-emerald-600" : "text-destructive"}`}>
              {grantMsg}
            </p>
          )}
        </form>
      </div>

      {/* === PAYMENTS / SUBSCRIPTIONS === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Historial de Pagos y Suscripciones</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por correo o app..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg text-muted-foreground text-sm">
            No hay pagos registrados
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(sub => {
              const isActive = sub.is_active && sub.paid_until && new Date(sub.paid_until) > new Date();
              return (
                <div key={sub.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{sub.created_by}</span>
                      <Badge variant="secondary" className="text-xs">
                        {PROFILE_LABELS[sub.profile] || sub.profile}
                      </Badge>
                      {isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                          <CheckCircle className="w-3 h-3" /> Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" /> Inactivo
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {sub.monthly_price_cop > 0 && (
                        <span>💰 ${sub.monthly_price_cop.toLocaleString("es-CO")} COP/mes</span>
                      )}
                      {sub.last_renewal_date && (
                        <span>Último pago: {format(new Date(sub.last_renewal_date), "dd/MM/yyyy HH:mm")}</span>
                      )}
                      {sub.paid_until && (
                        <span>Vence: {format(new Date(sub.paid_until), "dd/MM/yyyy HH:mm")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                        onClick={() => handleDeactivate(sub)}
                      >
                        Revocar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1"
                        onClick={() => handleActivate(sub)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Activar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}