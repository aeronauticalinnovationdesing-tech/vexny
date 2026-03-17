import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PROFILES } from "@/lib/ProfileContext";
import { CheckCircle, AlertTriangle, CreditCard, Loader2, User, LogOut, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

export default function Profile() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [canceling, setCanceling] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || "");

  const { data: allSubs = [] } = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const getUserSub = () => {
    if (!user?.email) return null;
    return allSubs.find((s) => s.created_by === user.email) || null;
  };

  const sub = getUserSub();
  const profile = sub ? PROFILES.find((p) => p.id === sub.profile) : null;
  const paidCountdown = useCountdown(sub?.paid_until || null);
  const isPaid = sub?.is_active;
  const paidExpired = isPaid && paidCountdown?.expired;
  const paidActive = isPaid && paidCountdown && !paidCountdown.expired;

  const handleCancel = async () => {
    if (!confirm("¿Estás seguro? Se cancelará la renovación automática.")) return;
    setCanceling(sub.id);
    try {
      await base44.functions.invoke("cancelSubscription", {
        subscriptionId: sub.id,
      });
      queryClient.invalidateQueries({ queryKey: ["all-subscriptions"] });
    } catch (err) {
      console.error(err);
      alert("Error al cancelar la suscripción. Intenta de nuevo.");
    }
    setCanceling(null);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const handleSaveName = async () => {
    try {
      await base44.auth.updateMe({ full_name: editName });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el nombre. Intenta de nuevo.");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* User Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
        </div>
        
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Nombre</p>
              {editing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Tu nombre"
                />
              ) : (
                <p className="text-lg font-semibold">{user?.full_name || "Usuario"}</p>
              )}
            </div>
            {editing ? (
              <div className="flex gap-2 ml-3">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveName}
                  className="text-emerald-600 hover:bg-emerald-500/10"
                  title="Guardar"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setEditName(user?.full_name || "");
                  }}
                  className="text-muted-foreground hover:bg-muted"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:bg-muted ml-3"
                title="Editar nombre"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground mb-1">Email</p>
            <p className="text-lg font-semibold">{user?.email}</p>
          </div>
          
          <div className="border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground mb-1">Rol</p>
            <p className="text-lg font-semibold capitalize">{user?.role || "usuario"}</p>
          </div>
        </Card>
      </div>

      {/* Subscription Info */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Mi Suscripción</h2>
        
        {sub && profile ? (
          <Card className={`p-6 space-y-5 transition-all ${
            paidActive
              ? "border-emerald-500/30 bg-emerald-500/5"
              : paidExpired
              ? "border-destructive/30 bg-destructive/5"
              : "border-border"
          }`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${profile.accent}20` }}>
                  <profile.icon className="w-6 h-6" style={{ color: profile.accent }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{profile.label}</h3>
                  <p className="text-xs text-muted-foreground">{profile.description}</p>
                </div>
              </div>
              {paidActive && (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 flex-shrink-0">
                  <CheckCircle className="w-3 h-3 mr-1" /> Activo
                </Badge>
              )}
              {paidExpired && (
                <Badge variant="destructive" className="flex-shrink-0">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Vencida
                </Badge>
              )}
            </div>

            {/* Status */}
            <div className="text-sm border-t border-border/50 pt-4">
              {paidActive && paidCountdown && (
                <p className="text-muted-foreground">
                  Vence en:{" "}
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {pad(paidCountdown.d)}d {pad(paidCountdown.h)}h {pad(paidCountdown.m)}m
                  </span>
                </p>
              )}
              {paidExpired && (
                <p className="text-destructive font-medium">Tu suscripción ha vencido. Accede a Suscripciones para renovar.</p>
              )}
            </div>

            {/* Price + Button */}
            <div className="flex items-center justify-between pt-1 gap-4">
              <div>
                <p className="text-2xl font-extrabold">
                  ${sub.monthly_price_cop.toLocaleString("es-CO")}
                  <span className="text-sm font-normal text-muted-foreground"> COP/mes</span>
                </p>
              </div>
              {paidActive && (
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={canceling}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {canceling ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Cancelar Suscripción
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">No tienes suscripción activa</p>
            <Button className="gap-2">
              <CreditCard className="w-4 h-4" />
              Ver Suscripciones
            </Button>
          </Card>
        )}
      </div>

      {/* Logout */}
      <div className="pt-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}