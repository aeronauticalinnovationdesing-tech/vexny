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
import { Progress } from "@/components/ui/progress";
import { Plus, Map, Search, LayoutGrid, List, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusLabels = { planning: "Planeación", active: "Activa", paused: "Pausada", completed: "Completada" };
const statusColors = { planning: "bg-blue-100 text-blue-700", active: "bg-green-100 text-green-700", paused: "bg-yellow-100 text-yellow-700", completed: "bg-muted text-muted-foreground" };

export default function DroneMissions() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ name: "", description: "", status: "active", start_date: "", end_date: "", budget: "" });
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: missions = [] } = useQuery({
    queryKey: ["projects", user?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
  });
  const { data: flights = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Project.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowForm(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const filtered = missions.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-sky-500" />
          <h1 className="text-2xl font-bold tracking-tight">Proyectos / Misiones</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4" /> Nueva Misión
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[{ k: "all", l: "Todas" }, { k: "active", l: "Activas" }, { k: "planning", l: "Planeación" }, { k: "completed", l: "Completadas" }].map(t => (
          <button key={t.k} onClick={() => setFilterStatus(t.k)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterStatus === t.k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
            {t.l} <span className="ml-1 opacity-60">{t.k === "all" ? missions.length : missions.filter(m => m.status === t.k).length}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar misiones..." className="pl-9" />
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={cn("px-3 py-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={cn("px-3 py-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(mission => {
            const mFlights = flights.filter(f => f.project_id === mission.id);
            const completed = mFlights.filter(f => f.status === "completed").length;
            const progress = mFlights.length > 0 ? Math.round((completed / mFlights.length) * 100) : 0;
            return (
              <div key={mission.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: mission.color || "#0ea5e9" }} />
                  <Badge className={cn("text-xs", statusColors[mission.status])}>{statusLabels[mission.status]}</Badge>
                </div>
                <h3 className="font-bold text-sm mb-1">{mission.name}</h3>
                {mission.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mission.description}</p>}
                <Progress value={progress} className="h-1.5 mb-2 [&>div]:bg-sky-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{completed}/{mFlights.length} vuelos</span>
                  <span className="text-xs font-medium">{progress}%</span>
                </div>
                {mission.end_date && (
                  <p className="text-xs text-muted-foreground mt-2">Cierre: {format(new Date(mission.end_date), "d MMM yyyy", { locale: es })}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(mission => {
            const mFlights = flights.filter(f => f.project_id === mission.id);
            const completed = mFlights.filter(f => f.status === "completed").length;
            const progress = mFlights.length > 0 ? Math.round((completed / mFlights.length) * 100) : 0;
            return (
              <div key={mission.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:shadow-md transition-all group">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: mission.color || "#0ea5e9" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{mission.name}</p>
                    <Badge className={cn("text-xs", statusColors[mission.status])}>{statusLabels[mission.status]}</Badge>
                  </div>
                  <Progress value={progress} className="h-1 max-w-xs [&>div]:bg-sky-500" />
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">{progress}%</p>
                  <p className="text-xs text-muted-foreground">{completed}/{mFlights.length} vuelos</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => deleteMutation.mutate(mission.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Map className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No se encontraron misiones</p>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Misión / Proyecto</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, budget: Number(form.budget) || 0, color: "#0ea5e9" }); }} className="space-y-4">
            <div><Label>Nombre de la misión</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Descripción / Ubicación</Label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Fin estimado</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planeación</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit">Crear Misión</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}