import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function DroneRegistry() {
  const user = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingDrone, setEditingDrone] = useState(null);
  const [form, setForm] = useState({
    serial_number: "",
    model: "",
    manufacturer: "",
    weight_grams: "",
    registration_number: "",
    registration_expiry: "",
    purchase_date: "",
    maintenance_status: "operativo",
  });
  const queryClient = useQueryClient();

  const { data: drones = [] } = useQuery({
    queryKey: ["drones", user?.email],
    queryFn: () => base44.entities.Drone.filter({ created_by: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Drone.create({ ...data, weight_grams: Number(data.weight_grams) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drones", user?.email] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Drone.update(id, { ...data, weight_grams: Number(data.weight_grams) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drones", user?.email] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Drone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drones", user?.email] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingDrone(null);
    setForm({
      serial_number: "",
      model: "",
      manufacturer: "",
      weight_grams: "",
      registration_number: "",
      registration_expiry: "",
      purchase_date: "",
      maintenance_status: "operativo",
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editingDrone && drones.length >= 3) {
      alert("⚠️ Límite de drones alcanzado (máximo 3)");
      return;
    }
    if (editingDrone) {
      updateMutation.mutate({ id: editingDrone.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (drone) => {
    setEditingDrone(drone);
    setForm(drone);
    setShowForm(true);
  };

  const getMaintenanceStatus = (expiry) => {
    if (!expiry) return { status: "pendiente", color: "text-yellow-600", icon: AlertTriangle };
    const days = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { status: "vencida", color: "text-red-600", icon: AlertTriangle };
    if (days <= 30) return { status: "próxima", color: "text-yellow-600", icon: AlertTriangle };
    return { status: "ok", color: "text-emerald-600", icon: CheckCircle };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Registro de Drones</h1>
        <Button 
          onClick={() => setShowForm(true)} 
          disabled={drones.length >= 3}
          className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Agregar Dron {drones.length >= 3 && "(Límite alcanzado)"}
        </Button>
      </div>

      <div className="grid gap-4">
        {drones.map((drone) => {
          const maintenance = getMaintenanceStatus(drone.next_maintenance_due);
          const MaintenanceIcon = maintenance.icon;
          return (
            <div key={drone.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{drone.model}</h3>
                    <Badge variant={drone.maintenance_status === "operativo" ? "default" : "destructive"}>
                      {drone.maintenance_status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Serial</p>
                      <p className="font-mono text-xs">{drone.serial_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fabricante</p>
                      <p>{drone.manufacturer}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Peso</p>
                      <p>{drone.weight_grams}g</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Horas de Vuelo</p>
                      <p className="font-semibold">{drone.flight_hours || 0}h</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-3 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground">Registro AAC: {drone.registration_number}</p>
                      {drone.registration_expiry && (
                        <p className="text-xs">
                          Vence: {format(new Date(drone.registration_expiry), "d MMM yyyy", { locale: es })}
                        </p>
                      )}
                    </div>
                    {drone.next_maintenance_due && (
                      <div className={cn("flex items-center gap-2 p-2 rounded", maintenance.color === "text-red-600" ? "bg-red-50 dark:bg-red-950" : maintenance.color === "text-yellow-600" ? "bg-yellow-50 dark:bg-yellow-950" : "bg-emerald-50 dark:bg-emerald-950")}>
                        <MaintenanceIcon className={cn("w-4 h-4", maintenance.color)} />
                        <span className="text-xs">
                          Próximo mantenimiento:{" "}
                          {format(new Date(drone.next_maintenance_due), "d MMM yyyy", { locale: es })} ({maintenance.status})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(drone)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(drone.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDrone ? "Editar Dron" : "Agregar Dron"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Modelo</label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="DJI Air 3"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fabricante</label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  placeholder="DJI"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Número de Serie</label>
              <Input
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Peso (gramos)</label>
                <Input
                  type="number"
                  value={form.weight_grams}
                  onChange={(e) => setForm({ ...form, weight_grams: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Número de Registro AAC</label>
                <Input
                  value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Vencimiento Registro</label>
              <Input
                type="date"
                value={form.registration_expiry}
                onChange={(e) => setForm({ ...form, registration_expiry: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha de Compra</label>
                <Input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={form.maintenance_status}
                  onValueChange={(v) => setForm({ ...form, maintenance_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operativo">Operativo</SelectItem>
                    <SelectItem value="en_mantenimiento">En Mantenimiento</SelectItem>
                    <SelectItem value="no_operativo">No Operativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">{editingDrone ? "Actualizar" : "Agregar Dron"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}