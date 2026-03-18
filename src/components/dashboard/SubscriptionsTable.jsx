import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROFILES } from "@/lib/ProfileContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PROFILE_LABELS = {
  trader: "Trader Pro",
  drone_pilot: "Drone Pilot Pro",
  startup: "Startup HQ Pro",
  elite_human: "Elite Human Pro",
};

const TRIAL_KEYS = {
  trader: "trial_start_trader",
  drone_pilot: "trial_start_drone_pilot",
  startup: "trial_start_startup",
  elite_human: "trial_start_elite_human",
};

function getTrialStatus(user, profile, trialHours = 48) {
  const key = TRIAL_KEYS[profile];
  const trialStart = user[key];
  if (!trialStart) return { label: "Sin iniciar", color: "secondary" };
  const end = new Date(trialStart).getTime() + trialHours * 3600000;
  const expired = Date.now() > end;
  if (expired) return { label: "Vencida", color: "destructive" };
  const hoursLeft = Math.max(0, Math.floor((end - Date.now()) / 3600000));
  return { label: `Activa (${hoursLeft}h restantes)`, color: "outline" };
}

export default function SubscriptionsTable() {
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: subs = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["all-subscriptions-admin"],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const isLoading = loadingUsers || loadingSubs;

  // Construir filas: un usuario puede tener múltiples perfiles activos
  const rows = [];
  for (const user of users) {
    for (const profile of PROFILES) {
      const trialKey = TRIAL_KEYS[profile.id];
      if (!user[trialKey]) continue; // solo mostrar si inició el trial

      const sub = subs.find((s) => s.profile === profile.id) || null;
      const trialHours = sub?.trial_hours ?? 48;
      const trialStatus = getTrialStatus(user, profile.id, trialHours);
      const isPaid = sub?.is_active;

      rows.push({
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        profile: profile.id,
        profileLabel: PROFILE_LABELS[profile.id],
        profileAccent: profile.accent,
        isPaid,
        trialStart: user[trialKey],
        trialStatus,
        paidUntil: sub?.paid_until,
        price: sub?.monthly_price_cop,
      });
    }
  }

  const paidCount = rows.filter((r) => r.isPaid).length;
  const trialCount = rows.filter((r) => !r.isPaid && r.trialStatus.color !== "destructive").length;
  const expiredCount = rows.filter((r) => !r.isPaid && r.trialStatus.color === "destructive").length;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-base">Usuarios y Suscripciones</h2>
          <p className="text-xs text-muted-foreground">Control de perfiles activos y estado de suscripción</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          {paidCount} pagados
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <Clock className="w-3.5 h-3.5" />
          {trialCount} en prueba
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
          <XCircle className="w-3.5 h-3.5" />
          {expiredCount} vencidos
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Cargando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Ningún usuario ha iniciado un perfil aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 pr-4 font-medium">Usuario</th>
                <th className="text-left py-2 pr-4 font-medium">Perfil</th>
                <th className="text-left py-2 pr-4 font-medium">Estado</th>
                <th className="text-left py-2 pr-4 font-medium">Inicio prueba</th>
                <th className="text-left py-2 font-medium">Precio mensual</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.userId}-${row.profile}`} className={`border-b border-border/40 ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium truncate max-w-[160px]">{row.userName}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{row.userEmail}</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${row.profileAccent}20`, color: row.profileAccent }}
                    >
                      {row.profileLabel}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    {row.isPaid ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Pagado
                      </Badge>
                    ) : (
                      <Badge variant={row.trialStatus.color} className="text-xs">
                        {row.trialStatus.label}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {row.trialStart
                      ? format(new Date(row.trialStart), "d MMM yyyy, HH:mm", { locale: es })
                      : "—"}
                  </td>
                  <td className="py-2.5 text-xs font-medium">
                    {row.price > 0
                      ? `$${Number(row.price).toLocaleString("es-CO")} COP`
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}