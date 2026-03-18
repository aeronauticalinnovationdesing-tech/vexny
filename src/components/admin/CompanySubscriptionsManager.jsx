import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function CompanySubscriptionsManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    company_name: "",
    monthly_price_cop: 99900,
    max_pilots: 10,
    max_drones: 20,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date"),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["company-subscriptions"],
    queryFn: () => base44.entities.CompanySubscription.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanySubscription.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-subscriptions"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompanySubscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-subscriptions"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CompanySubscription.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-subscriptions"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({
      company_name: "",
      monthly_price_cop: 99900,
      max_pilots: 10,
      max_drones: 20,
    });
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

  const handleSave = (e) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Suscripciones de Empresa</h2>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Suscripción
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-lg">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No hay suscripciones de empresa</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subscriptions.map(sub => (
            <div key={sub.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">{sub.company_name}</h3>
                  {sub.is_active && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Activa</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Precio Mensual</p>
                    <p className="font-semibold">${sub.monthly_price_cop.toLocaleString('es-CO')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Capacidad</p>
                    <p className="font-semibold">{sub.max_pilots} pilotos · {sub.max_drones} drones</p>
                  </div>
                  {sub.paid_until && (
                    <div>
                      <p className="text-xs text-muted-foreground">Vence</p>
                      <p className="font-semibold">{format(new Date(sub.paid_until), 'dd/MM/yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(sub)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(sub.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {editingId ? "Editar Suscripción" : "Nueva Suscripción de Empresa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre de la Empresa</label>
              <Input
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                placeholder="AeroOps Colombia S.A.S."
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Precio Mensual (COP)</label>
              <Input
                type="number"
                value={form.monthly_price_cop}
                onChange={e => setForm({ ...form, monthly_price_cop: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Máximo de Pilotos</label>
                <Input
                  type="number"
                  value={form.max_pilots}
                  onChange={e => setForm({ ...form, max_pilots: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Máximo de Drones</label>
                <Input
                  type="number"
                  value={form.max_drones}
                  onChange={e => setForm({ ...form, max_drones: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{editingId ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}