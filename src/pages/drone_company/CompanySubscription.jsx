import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, Plus, Pencil, Trash2, AlertTriangle, CreditCard, Loader2, Building2, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

function useCountdown(endDateISO) {
  const [remaining, setRemaining] = React.useState(null);
  React.useEffect(() => {
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

export default function CompanySubscription() {
  const user = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    company_name: "",
    monthly_price_cop: 0,
    max_pilots: 10,
    max_drones: 20,
  });
  const [paying, setPaying] = useState(null);
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["company-subscriptions", user?.email],
    queryFn: () => {
      if (!user?.email) return [];
      return base44.entities.CompanySubscription.filter({ created_by: user?.email });
    },
    enabled: !!user?.email,
  });

  const { data: globalPrices = [] } = useQuery({
    queryKey: ["global-subscription-prices"],
    queryFn: () => base44.entities.Subscription.filter({ profile: "drone_company" }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanySubscription.create({
      ...data,
      monthly_price_cop: Number(data.monthly_price_cop),
      max_pilots: Number(data.max_pilots),
      max_drones: Number(data.max_drones),
      is_active: true,
      trial_start_date: new Date().toISOString(),
      trial_hours: 168,
      paid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-subscriptions", user?.email] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompanySubscription.update(id, {
      ...data,
      monthly_price_cop: Number(data.monthly_price_cop),
      max_pilots: Number(data.max_pilots),
      max_drones: Number(data.max_drones),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-subscriptions", user?.email] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CompanySubscription.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-subscriptions", user?.email] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ company_name: "", monthly_price_cop: 0, max_pilots: 10, max_drones: 20 });
  };

  const openEdit = (sub) => {
    setEditingId(sub.id);
    setForm({
      company_name: sub.company_name,
      monthly_price_cop: sub.monthly_price_cop,
      max_pilots: sub.max_pilots,
      max_drones: sub.max_drones,
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handlePay = async (subscription) => {
    setPaying(subscription.id);
    try {
      const reference = `VEXNY-CMPNY-${subscription.id}-${Date.now()}`;
      const amountInCents = subscription.monthly_price_cop * 100;

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
      setPaying(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suscripciones Empresariales</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus planes de acceso para equipos</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Nueva Suscripción
        </Button>
      </div>

      {/* Lista de suscripciones */}
      <div className="grid gap-4">
        {subscriptions.length === 0 && (
          <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay suscripciones empresariales</p>
          </div>
        )}

        {subscriptions.map((sub) => {
          const countdown = useCountdown(sub.paid_until);
          const isExpired = countdown?.expired;
          const isActive = sub.is_active && !isExpired;

          return (
            <div
              key={sub.id}
              className={cn(
                "rounded-xl border p-5 transition-all",
                isActive ? "border-indigo-500/30 bg-indigo-500/5" : isExpired ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-lg">{sub.company_name}</h3>
                    {isActive && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" /> Activa
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Vencida
                      </Badge>
                    )}
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground mt-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{sub.max_pilots} pilotos máx</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Drones: {sub.max_drones} máx</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>${sub.monthly_price_cop.toLocaleString("es-CO")} COP/mes</span>
                    </div>
                    {isActive && countdown && (
                      <div className="flex items-center gap-2 text-emerald-600 font-mono">
                        <Clock className="w-4 h-4" />
                        {pad(countdown.d)}d {pad(countdown.h)}h {pad(countdown.m)}m
                      </div>
                    )}
                  </div>

                  {isExpired && (
                    <p className="text-destructive text-sm mt-2">Vencida desde {format(new Date(sub.paid_until), "PPP", { locale: es })}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap justify-end">
                  {isActive ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(sub)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("¿Eliminar esta suscripción?")) {
                            deleteMutation.mutate(sub.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => handlePay(sub)}
                      disabled={paying === sub.id}
                    >
                      {paying === sub.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      Pagar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FORM DIALOG */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Suscripción" : "Nueva Suscripción Empresarial"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre de la Empresa *</label>
              <Input
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                placeholder="Ej: Drones Colombia SAS"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Precio Mensual (COP) *</label>
              <Input
                type="number"
                min="0"
                value={form.monthly_price_cop}
                onChange={e => setForm({ ...form, monthly_price_cop: e.target.value })}
                placeholder="0"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Máx. Pilotos</label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_pilots}
                  onChange={e => setForm({ ...form, max_pilots: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Máx. Drones</label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_drones}
                  onChange={e => setForm({ ...form, max_drones: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                {editingId ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}