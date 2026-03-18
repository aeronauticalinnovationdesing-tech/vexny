import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard, Users, Building2, AlertTriangle, CheckCircle, Clock, Plus, Trash2, Mail
} from "lucide-react";
import { format, differenceInHours } from "date-fns";

function useCountdown(endDateISO) {
  const [remaining, setRemaining] = React.useState(null);
  React.useEffect(() => {
    if (!endDateISO) return;
    const endTime = new Date(endDateISO).getTime();
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) setRemaining({ expired: true, days: 0, hours: 0 });
      else setRemaining({
        expired: false,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDateISO]);
  return remaining;
}

export default function CompanySubscription() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("piloto");
  const [paying, setPaying] = useState(false);

  // Obtener empresa del usuario actual
  const { data: company } = useQuery({
    queryKey: ["company", user?.email],
    queryFn: () => {
      if (!user?.email) return null;
      // Buscar empresa donde el usuario es admin o jefe de pilotos
      return base44.entities.Company.filter({}).then(companies => 
        companies.find(c => c.sms_manager_email === user.email) || null
      );
    },
    enabled: !!user?.email,
  });

  // Obtener suscripción de la empresa
  const { data: subscription } = useQuery({
    queryKey: ["company-subscription", company?.id],
    queryFn: () => {
      if (!company?.id) return null;
      return base44.entities.CompanySubscription.filter({ company_id: company.id }).then(subs => subs[0] || null);
    },
    enabled: !!company?.id,
  });

  // Obtener pilotos asignados
  const { data: pilots = [] } = useQuery({
    queryKey: ["company-pilots", company?.id],
    queryFn: () => {
      if (!company?.id) return [];
      return base44.entities.Pilot.filter({ company_id: company.id });
    },
    enabled: !!company?.id,
  });

  // Obtener usuarios de la empresa
  const { data: companyUsers = [] } = useQuery({
    queryKey: ["company-users", company?.id],
    queryFn: () => {
      if (!company?.id) return [];
      return base44.entities.User.list();
    },
    enabled: !!company?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: async (email) => {
      // Invitar usuario como piloto de la empresa
      const role = inviteRole === "jefe_pilotos" ? "admin" : "user";
      await base44.users.inviteUser(email, role);
      
      // Si es piloto, se puede crear automáticamente
      if (inviteRole === "piloto") {
        // Preparar para que el usuario cree su perfil de piloto
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      setInviteEmail("");
      setShowInviteForm(false);
    },
  });

  const handlePay = async () => {
    if (!subscription) return;
    setPaying(true);
    try {
      const reference = `VEXNY-COMP-${company.id}-${Date.now()}`;
      const amountInCents = (subscription.monthly_price_cop || 99900) * 100;

      const res = await base44.functions.invoke("wompiSignature", {
        reference,
        amountInCents,
        currency: "COP",
      });

      const { signature, publicKey } = res.data;
      const redirectUrl = `${window.location.origin}/CompanySubscription`;

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

  if (!company) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-lg">No se encontró empresa</h2>
            <p className="text-sm text-muted-foreground mt-1">Debes ser gerente SMS o jefe de pilotos de una empresa para acceder.</p>
          </div>
        </div>
      </div>
    );
  }

  const countdown = useCountdown(subscription?.paid_until);
  const isPaid = subscription?.is_active && countdown && !countdown.expired;
  const isPastDue = subscription?.is_active && countdown?.expired;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-500" />
            Suscripción de Empresa
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{company.name}</p>
        </div>
      </div>

      {/* Subscription Status */}
      {subscription ? (
        <div className={`rounded-2xl border p-6 ${
          isPaid 
            ? "border-emerald-500/30 bg-emerald-500/5" 
            : isPastDue
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-card"
        }`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Plan Drone Pilot PRO
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hasta {subscription.max_pilots} pilotos · Hasta {subscription.max_drones} drones
              </p>
            </div>
            {isPaid && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> Activo
              </Badge>
            )}
            {isPastDue && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" /> Vencida
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Precio Mensual</p>
              <p className="text-2xl font-bold">${(subscription.monthly_price_cop || 99900).toLocaleString('es-CO')}</p>
            </div>
            {isPaid && countdown && (
              <div>
                <p className="text-xs text-muted-foreground uppercase">Vence en</p>
                <p className="text-lg font-bold text-emerald-600">{countdown.days}d {countdown.hours}h</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase">Pilotos Activos</p>
              <p className="text-2xl font-bold">{pilots.length}/{subscription.max_pilots}</p>
            </div>
          </div>

          {isPaid || isPastDue ? null : (
            <Button onClick={handlePay} disabled={paying} className="gap-2 w-full">
              {paying ? <Clock className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {paying ? "Procesando..." : "Suscribirse Ahora"}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-muted-foreground mb-4">No hay suscripción activa. Contáctanos para configurar tu plan de empresa.</p>
        </div>
      )}

      {/* Team Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo de Pilotos ({pilots.length})
          </h2>
          {subscription?.is_active && (
            <Button onClick={() => setShowInviteForm(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Invitar Usuario
            </Button>
          )}
        </div>

        {pilots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay pilotos asignados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pilots.map(pilot => (
              <div key={pilot.id} className="border border-border rounded-lg p-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{pilot.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{pilot.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">{pilot.license_category}</Badge>
                    {pilot.status === "activo" && <Badge className="text-xs bg-emerald-100 text-emerald-700">Activo</Badge>}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-mono">{pilot.hours_flown || 0} horas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invitar Usuario a Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={inviteRole === "piloto"} onCheckedChange={() => setInviteRole("piloto")} />
                  <span className="text-sm">Piloto</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={inviteRole === "jefe_pilotos"} onCheckedChange={() => setInviteRole("jefe_pilotos")} />
                  <span className="text-sm">Jefe de Pilotos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={inviteRole === "gerente_sms"} onCheckedChange={() => setInviteRole("gerente_sms")} />
                  <span className="text-sm">Gerente SMS</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteForm(false)}>Cancelar</Button>
            <Button onClick={() => inviteMutation.mutate(inviteEmail)} disabled={!inviteEmail || inviteMutation.isPending}>
              Enviar Invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}