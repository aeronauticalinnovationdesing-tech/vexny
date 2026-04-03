import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, UserCheck, CheckCircle, Clock, Search, Unlock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

const PROFILE_LABELS = {
  trader: "Trader Pro",
  drone_pilot: "Drone Pilot Pro",
  drone_company: "Empresa Drone Pro",
  startup: "Startup HQ Pro",
  elite_human: "Elite Human Pro",
};

const invoke = (action, params = {}) =>
  base44.functions.invoke("adminManageSubscription", { action, ...params }).then(r => r.data);

export default function AccessAndPaymentsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantProfile, setGrantProfile] = useState("trader");
  const [grantDays, setGrantDays] = useState("30");
  const [granting, setGranting] = useState(false);
  const [grantMsg, setGrantMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-subs-list"],
    queryFn: () => invoke("list"),
    refetchInterval: 15000,
  });

  const subs = data?.subs || [];
  const adminAccesses = data?.adminAccesses || [];

  const filtered = subs.filter(s =>
    !search ||
    s.created_by?.toLowerCase().includes(search.toLowerCase()) ||
    s.profile?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAdmin = adminAccesses.filter(a =>
    !search ||
    a.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.toLowerCase().includes(search.toLowerCase())
  );

  const handleActivate = async (sub) => {
    setActionLoading(sub.id);
    await invoke("activate", { subId: sub.id });
    refetch();
    setActionLoading(null);
  };

  const handleDeactivate = async (sub) => {
    setActionLoading(sub.id);
    await invoke("deactivate", { subId: sub.id });
    refetch();
    setActionLoading(null);
  };

  const handleRevokeAccess = async (access) => {
    setActionLoading(access.id);
    await invoke("revokeAccess", { accessId: access.id });
    refetch();
    setActionLoading(null);
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    setGranting(true);
    setGrantMsg("");
    try {
      await invoke("grant", { email: grantEmail, profile: grantProfile, days: grantDays });
      setGrantMsg(`✓ Acceso activado para ${grantEmail} (${PROFILE_LABELS[grantProfile]}) por ${grantDays} días`);
      setGrantEmail("");
      refetch();
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
            <div>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROFILE_LABELS).map(([id, label]) => (
                    <SelectItem key={id} value={id}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Días de acceso</label>
              <Input type="number" min="1" value={grantDays} onChange={e => setGrantDays(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={granting} className="gap-2">
            <UserCheck className="w-4 h-4" />
            {granting ? "Activando..." : "Activar Acceso"}
          </Button>
          {grantMsg && (
            <p className={`text-sm font-medium ${grantMsg.startsWith("✓") ? "text-emerald-600" : "text-destructive"}`}>
              {grantMsg}
            </p>
          )}
        </form>
      </div>

      {/* === ADMIN GRANTED ACCESSES === */}
      {filteredAdmin.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-base">Accesos otorgados por Admin</h3>
          </div>
          {filteredAdmin.map(access => {
            const isActive = access.is_active && access.paid_until && new Date(access.paid_until) > new Date();
            return (
              <div key={access.id} className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{access.user_email}</span>
                    <Badge variant="secondary" className="text-xs">{PROFILE_LABELS[access.profile] || access.profile}</Badge>
                    {isActive
                      ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">Activo</Badge>
                      : <Badge variant="outline" className="text-xs text-muted-foreground">Expirado</Badge>
                    }
                  </div>
                  {access.paid_until && (
                    <p className="text-xs text-muted-foreground">Vence: {format(new Date(access.paid_until), "dd/MM/yyyy HH:mm")}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading === access.id}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                  onClick={() => handleRevokeAccess(access)}
                >
                  {actionLoading === access.id ? "..." : "Revocar"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* === PAYMENTS LIST === */}
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
          <div className="text-center py-8 bg-muted/30 rounded-lg text-muted-foreground text-sm">No hay pagos registrados</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(sub => {
              const isActive = sub.is_active && sub.paid_until && new Date(sub.paid_until) > new Date();
              const loading = actionLoading === sub.id;
              return (
                <div key={sub.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{sub.created_by}</span>
                      <Badge variant="secondary" className="text-xs">{PROFILE_LABELS[sub.profile] || sub.profile}</Badge>
                      {isActive
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1"><CheckCircle className="w-3 h-3" /> Activo</Badge>
                        : <Badge variant="outline" className="text-xs gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> Inactivo</Badge>
                      }
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {sub.monthly_price_cop > 0 && <span>💰 ${sub.monthly_price_cop.toLocaleString("es-CO")} COP/mes</span>}
                      {sub.last_renewal_date && <span>Último pago: {format(new Date(sub.last_renewal_date), "dd/MM/yyyy HH:mm")}</span>}
                      {sub.paid_until && <span>Vence: {format(new Date(sub.paid_until), "dd/MM/yyyy HH:mm")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isActive ? (
                      <Button size="sm" variant="outline" disabled={loading}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                        onClick={() => handleDeactivate(sub)}>
                        {loading ? "..." : "Revocar"}
                      </Button>
                    ) : (
                      <Button size="sm" disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1"
                        onClick={() => handleActivate(sub)}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        {loading ? "..." : "Activar"}
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