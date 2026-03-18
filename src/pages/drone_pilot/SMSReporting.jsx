import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FileText, CheckCircle, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function SMSReporting() {
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [form, setForm] = useState({
    report_date: format(new Date(), "yyyy-MM-dd"),
    pilot_name: "",
    drone_model: "",
    flight_duration_minutes: "",
    altitude_max_meters: "",
    area_type: "rural",
    weather_conditions: "",
    incident_reported: false,
    incident_description: "",
    observers_count: "",
    status: "completado",
  });
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ["sms_reports"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SMSReport.filter({ created_by: user.email }, "-created_date");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SMSReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms_reports"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SMSReport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms_reports"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SMSReport.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sms_reports"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingReport(null);
    setForm({
      report_date: format(new Date(), "yyyy-MM-dd"),
      pilot_name: "",
      drone_model: "",
      flight_duration_minutes: "",
      altitude_max_meters: "",
      area_type: "rural",
      weather_conditions: "",
      incident_reported: false,
      incident_description: "",
      observers_count: "",
      status: "completado",
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      flight_duration_minutes: Number(form.flight_duration_minutes),
      altitude_max_meters: Number(form.altitude_max_meters),
      observers_count: Number(form.observers_count),
    };
    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (report) => {
    setEditingReport(report);
    setForm(report);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes SMS (Operaciones)</h1>
          <p className="text-sm text-muted-foreground">Sistema de Monitoreo de Seguridad RAC 100</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Reporte
        </Button>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">{report.pilot_name}</span>
                  <Badge variant={report.status === "completado" ? "default" : "secondary"}>
                    {report.status}
                  </Badge>
                  {report.incident_reported && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="w-3 h-3" /> Incidente
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Fecha</p>
                    <p>{format(new Date(report.report_date), "d MMM yyyy", { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dron</p>
                    <p>{report.drone_model}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duración Vuelo</p>
                    <p>{report.flight_duration_minutes} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Altitud Máx</p>
                    <p>{report.altitude_max_meters}m</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="bg-muted">Área: {report.area_type}</Badge>
                  <Badge variant="outline" className="bg-muted">Observadores: {report.observers_count}</Badge>
                  {report.weather_conditions && (
                    <Badge variant="outline" className="bg-muted">{report.weather_conditions}</Badge>
                  )}
                </div>

                {report.incident_reported && report.incident_description && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Descripción del Incidente:</p>
                    <p className="text-xs text-red-600 dark:text-red-300">{report.incident_description}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(report)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(report.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? "Editar Reporte SMS" : "Nuevo Reporte SMS"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={form.report_date}
                  onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nombre del Piloto</label>
                <Input
                  value={form.pilot_name}
                  onChange={(e) => setForm({ ...form, pilot_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Modelo de Dron</label>
                <Input
                  value={form.drone_model}
                  onChange={(e) => setForm({ ...form, drone_model: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de Área</label>
                <Select value={form.area_type} onValueChange={(v) => setForm({ ...form, area_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rural">Rural</SelectItem>
                    <SelectItem value="suburbana">Suburbana</SelectItem>
                    <SelectItem value="urbana">Urbana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Duración Vuelo (min)</label>
                <Input
                  type="number"
                  value={form.flight_duration_minutes}
                  onChange={(e) => setForm({ ...form, flight_duration_minutes: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Altitud Máxima (m)</label>
                <Input
                  type="number"
                  value={form.altitude_max_meters}
                  onChange={(e) => setForm({ ...form, altitude_max_meters: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Condiciones del Clima</label>
                <Input
                  value={form.weather_conditions}
                  onChange={(e) => setForm({ ...form, weather_conditions: e.target.value })}
                  placeholder="Ej: Despejado, viento 5 nudos"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Observadores</label>
                <Input
                  type="number"
                  value={form.observers_count}
                  onChange={(e) => setForm({ ...form, observers_count: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.incident_reported}
                onCheckedChange={(v) => setForm({ ...form, incident_reported: v })}
              />
              <label className="text-sm font-medium">¿Se reportó algún incidente?</label>
            </div>

            {form.incident_reported && (
              <div>
                <label className="text-sm font-medium">Descripción del Incidente</label>
                <Input
                  value={form.incident_description}
                  onChange={(e) => setForm({ ...form, incident_description: e.target.value })}
                  placeholder="Detalles del incidente..."
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="pendiente_revision">Pendiente Revisión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">{editingReport ? "Actualizar" : "Crear Reporte"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}