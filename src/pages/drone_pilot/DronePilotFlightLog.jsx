import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Wind, Plane, Clock, CheckCircle, AlertCircle, Trash2, Pencil, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FlightHoursChart, FlightTypeDistribution, FlightMetrics, MaintenanceReminder } from "@/components/drone_pilot/FlightAnalytics";
import MissionPlanner from "@/components/drone_pilot/MissionPlanner";
import { useProfile } from "@/lib/ProfileContext";

const DRONE_MODELS = ["DJI Mini 3 Pro", "DJI Mavic 3", "DJI Air 3", "DJI Phantom 4", "Autel EVO", "Parrot Anafi", "Otro"];
const FLIGHT_TYPES = ["Fotografía aérea", "Video cinematográfico", "Inspección", "Mapeo/Fotogrametría", "Entrega", "Recreativo", "Entrenamiento", "Otro"];

const statusColors = {
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabels = { completed: "Completado", in_progress: "En vuelo", pending: "Programado", cancelled: "Cancelado" };

const emptyForm = {
  title: "", description: "", status: "completed",
  priority: "medium", estimated_hours: "", logged_hours: "",
  due_date: format(new Date(), "yyyy-MM-dd"), tags: [],
};

export default function DronePilotFlightLog() {
  const [showForm, setShowForm] = useState(false);
  const [editFlight, setEditFlight] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [droneModel, setDroneModel] = useState("DJI Mini 3 Pro");
  const [flightType, setFlightType] = useState("Fotografía aérea");
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { activeProfileId } = useProfile();

  const { data: flights = [] } = useQuery({
    queryKey: ["tasks", user?.email, activeProfileId],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email, profile_id: activeProfileId }, "-created_date"),
    enabled: !!user && !!activeProfileId,
  });

  const { data: missions = [] } = useQuery({
    queryKey: ["projects", user?.email, activeProfileId],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email, profile_id: activeProfileId }, "-created_date"),
    enabled: !!user && !!activeProfileId,
  });

  const createMissionMutation = useMutation({
    mutationFn: (d) => base44.entities.Project.create({ ...d, profile_id: activeProfileId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Task.create({ ...d, profile_id: activeProfileId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditFlight(null);
    setForm({ ...emptyForm });
    setDroneModel("DJI Mini 3 Pro");
    setFlightType("Fotografía aérea");
  };

  const openEdit = (flight) => {
    setEditFlight(flight);
    setForm({ ...flight });
    setDroneModel(flight.tags?.[0] || "DJI Mini 3 Pro");
    setFlightType(flight.tags?.[1] || "Fotografía aérea");
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      estimated_hours: Number(form.estimated_hours) || 0,
      logged_hours: Number(form.logged_hours) || 0,
      tags: [droneModel, flightType],
    };
    if (editFlight) updateMutation.mutate({ id: editFlight.id, data });
    else createMutation.mutate(data);
  };

  const totalHours = flights.reduce((s, f) => s + (f.logged_hours || 0), 0);
  const completedFlights = flights.filter(f => f.status === "completed").length;
  const filtered = flights.filter(f => filterStatus === "all" || f.status === filterStatus);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wind className="w-6 h-6 text-sky-500" />
          <h1 className="text-2xl font-bold tracking-tight">Bitácora de Vuelo</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4" /> Registrar Vuelo
        </Button>
      </div>

      {/* Metrics */}
      <FlightMetrics flights={flights} missions={missions} />

      {/* Maintenance Alert */}
      <MaintenanceReminder flights={flights} />

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FlightHoursChart flights={flights} />
        <FlightTypeDistribution flights={flights} />
      </div>

      {/* Mission Planner */}
      <MissionPlanner missions={missions} onPlanMission={(mission) => {
        createMissionMutation.mutate({
          name: mission.name,
          description: mission.location,
          status: "active",
          color: "#0ea5e9",
        });
      }} />

      {/* Recent Flights Header */}
      <h2 className="font-semibold text-lg">Historial de Vuelos</h2>

      {/* Filter */}
       <div className="flex gap-2 flex-wrap">
        {[
          { v: "all", l: "Todos" },
          { v: "completed", l: "Completados" },
          { v: "pending", l: "Programados" },
          { v: "in_progress", l: "En vuelo" },
          { v: "cancelled", l: "Cancelados" },
        ].map(f => (
          <button key={f.v} onClick={() => setFilterStatus(f.v)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterStatus === f.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Flight List */}
      <div className="space-y-2">
        {filtered.map(flight => (
          <div key={flight.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border group hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
              <Plane className="w-5 h-5 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{flight.title}</p>
                <Badge className={cn("text-xs", statusColors[flight.status] || "bg-muted")}>{statusLabels[flight.status] || flight.status}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {flight.tags?.[0] && <span className="text-xs text-muted-foreground flex items-center gap-1"><Plane className="w-3 h-3" />{flight.tags[0]}</span>}
                {flight.tags?.[1] && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{flight.tags[1]}</span>}
                {flight.logged_hours > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{flight.logged_hours}h</span>}
                {flight.due_date && <span className="text-xs text-muted-foreground">{format(new Date(flight.due_date), "d MMM yyyy", { locale: es })}</span>}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(flight)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(flight.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Wind className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay vuelos registrados</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editFlight ? "Editar Vuelo" : "Registrar Vuelo"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Nombre / Descripción del vuelo</Label>
              <Input placeholder="Ej: Toma aérea edificio centro comercial..." value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dron</Label>
                <Select value={droneModel} onValueChange={setDroneModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DRONE_MODELS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de vuelo</Label>
                <Select value={flightType} onValueChange={setFlightType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FLIGHT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Horas de vuelo</Label>
                <Input type="number" step="0.1" placeholder="0.5" value={form.logged_hours}
                  onChange={e => setForm({ ...form, logged_hours: e.target.value })} />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Programado</SelectItem>
                  <SelectItem value="in_progress">En vuelo</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas adicionales</Label>
              <textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Condiciones meteorológicas, observaciones..." rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{editFlight ? "Actualizar" : "Registrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}