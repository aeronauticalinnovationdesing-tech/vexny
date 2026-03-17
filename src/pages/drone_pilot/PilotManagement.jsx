import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, CheckCircle, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function PilotManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingPilot, setEditingPilot] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    cipu: "",
    license_number: "",
    license_category: "operador_remoto",
    rac_100_phase: "solicitud",
    rac_100_expiry_date: "",
    email: "",
    phone: "",
    sms_manager: "",
    role: "piloto",
    status: "activo",
  });
  const queryClient = useQueryClient();

  const { data: pilots = [] } = useQuery({
    queryKey: ["pilots"],
    queryFn: () => base44.entities.Pilot.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pilot.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilots"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pilot.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilots"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pilot.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pilots"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingPilot(null);
    setForm({
      full_name: "",
      cipu: "",
      license_number: "",
      license_category: "operador_remoto",
      rac_100_phase: "solicitud",
      rac_100_expiry_date: "",
      email: "",
      phone: "",
      sms_manager: "",
      role: "piloto",
      status: "activo",
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingPilot) {
      updateMutation.mutate({ id: editingPilot.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (pilot) => {
    setEditingPilot(pilot);
    setForm(pilot);
    setShowForm(true);
  };

  const getExpiryStatus = (expiryDate) => {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { status: "vencido", color: "text-red-600", icon: AlertTriangle };
    if (days <= 30) return { status: "próximo", color: "text-yellow-600", icon: AlertCircle };
    return { status: "vigente", color: "text-emerald-600", icon: CheckCircle };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Pilotos RAC 100</h1>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Agregar Piloto
        </Button>
      </div>

      <div className="grid gap-4">
        {pilots.map((pilot) => {
          const expiry = getExpiryStatus(pilot.rac_100_expiry_date);
          const ExpiryIcon = expiry.icon;
          return (
            <div key={pilot.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{pilot.full_name}</h3>
                    <Badge variant={pilot.role === "jefe_pilotos" ? "default" : "outline"}>
                      {pilot.role === "jefe_pilotos" ? "👔 Jefe" : "👨‍✈️ Piloto"}
                    </Badge>
                    <Badge variant={pilot.status === "activo" ? "default" : "destructive"}>
                      {pilot.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Licencia</p>
                      <p className="font-mono">{pilot.license_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoría</p>
                      <p>{pilot.license_category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p>{pilot.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Horas de Vuelo</p>
                      <p className="font-semibold">{pilot.hours_flown}h</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 p-3 bg-muted rounded-lg">
                    <ExpiryIcon className={cn("w-4 h-4", expiry.color)} />
                    <span className="text-sm">
                      <span className="font-semibold">RAC 100:</span>{" "}
                      {format(new Date(pilot.rac_100_expiry_date), "d MMM yyyy", { locale: es })}
                      <span className={cn("ml-2 font-semibold", expiry.color)}>({expiry.status})</span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(pilot)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" text-destructive onClick={() => deleteMutation.mutate(pilot.id)}>
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
            <DialogTitle>{editingPilot ? "Editar Piloto" : "Agregar Piloto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre Completo</label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Número de Licencia</label>
                <Input
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <Select value={form.license_category} onValueChange={(v) => setForm({ ...form, license_category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador_remoto">Operador Remoto</SelectItem>
                    <SelectItem value="piloto_basico">Piloto Básico</SelectItem>
                    <SelectItem value="piloto_avanzado">Piloto Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Vencimiento RAC 100</label>
              <Input
                type="date"
                value={form.rac_100_expiry_date}
                onChange={(e) => setForm({ ...form, rac_100_expiry_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rol</label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piloto">Piloto</SelectItem>
                    <SelectItem value="jefe_pilotos">Jefe de Pilotos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">{editingPilot ? "Actualizar" : "Agregar Piloto"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}