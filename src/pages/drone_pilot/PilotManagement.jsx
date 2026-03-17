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

  const getPhaseLabel = (phase) => {
    const labels = {
      solicitud: "Solicitud",
      evaluacion: "Evaluación",
      capacitacion: "Capacitación",
      examen: "Examen",
      certificacion: "Certificación",
      licencia_emitida: "Licencia Emitida"
    };
    return labels[phase] || phase;
  };

  // Alertas
  const alerts = pilots.filter(p => {
    const expiry = getExpiryStatus(p.rac_100_expiry_date);
    const medicalExpiry = p.medical_certificate_expiry ? getExpiryStatus(p.medical_certificate_expiry) : null;
    return expiry.status !== "vigente" || (medicalExpiry && medicalExpiry.status !== "vigente") || p.status === "suspendido";
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Pilotos RAC 100</h1>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Agregar Piloto
        </Button>
      </div>

      {/* Sección de Alertas */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-100">{alerts.length} Alerta{alerts.length !== 1 ? 's' : ''} Activa{alerts.length !== 1 ? 's' : ''}</h3>
          </div>
          <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
            {alerts.map(pilot => (
              <li key={pilot.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full" />
                <strong>{pilot.full_name}</strong>
                {pilot.status === "suspendido" && <span>- Estado suspendido</span>}
                {pilot.status !== "suspendido" && getExpiryStatus(pilot.rac_100_expiry_date).status !== "vigente" && <span>- RAC 100 {getExpiryStatus(pilot.rac_100_expiry_date).status}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                      <p className="text-muted-foreground">CIPU</p>
                      <p className="font-mono text-xs">{pilot.cipu || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Licencia</p>
                      <p className="font-mono text-xs">{pilot.license_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoría</p>
                      <p>{pilot.license_category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="text-xs">{pilot.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-3">
                    <div>
                      <p className="text-muted-foreground">Fase RAC 100</p>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">{getPhaseLabel(pilot.rac_100_phase)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Horas de Vuelo</p>
                      <p className="font-semibold">{pilot.hours_flown}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gerente SMS</p>
                      <p className="text-xs">{pilot.sms_manager || "—"}</p>
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
          <form onSubmit={handleSave} className="space-y-4 max-h-96 overflow-y-auto">
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
                <label className="text-sm font-medium">CIPU</label>
                <Input
                  value={form.cipu || ""}
                  onChange={(e) => setForm({ ...form, cipu: e.target.value })}
                  placeholder="Certificado de Identificación..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Número de Licencia</label>
                <Input
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="text-sm font-medium">Fase RAC 100</label>
                <Select value={form.rac_100_phase || "solicitud"} onValueChange={(v) => setForm({ ...form, rac_100_phase: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solicitud">Solicitud</SelectItem>
                    <SelectItem value="evaluacion">Evaluación</SelectItem>
                    <SelectItem value="capacitacion">Capacitación</SelectItem>
                    <SelectItem value="examen">Examen</SelectItem>
                    <SelectItem value="certificacion">Certificación</SelectItem>
                    <SelectItem value="licencia_emitida">Licencia Emitida</SelectItem>
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
                <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Gerente de SMS</label>
              <Input
                value={form.sms_manager || ""}
                onChange={(e) => setForm({ ...form, sms_manager: e.target.value })}
                placeholder="Nombre o email del gerente responsable"
              />
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