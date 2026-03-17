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
import { Plus, Activity, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LIFE_AREAS = [
  { value: "health", label: "🏋️ Salud" },
  { value: "career", label: "💼 Carrera" },
  { value: "finances", label: "💰 Finanzas" },
  { value: "relationships", label: "❤️ Relaciones" },
  { value: "learning", label: "🧠 Aprendizaje" },
  { value: "spiritual", label: "✨ Espiritual" },
  { value: "creativity", label: "🎨 Creatividad" },
];

const statusColors = { planning: "bg-blue-100 text-blue-700", active: "bg-green-100 text-green-700", paused: "bg-yellow-100 text-yellow-700", completed: "bg-muted text-muted-foreground" };
const statusLabels = { planning: "Planificando", active: "En curso", paused: "Pausado", completed: "Logrado" };

export default function EliteHumanProjects() {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ name: "", description: "", status: "active", color: "#f59e0b" });
  const [lifeArea, setLifeArea] = useState("health");
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
  });
  const { data: tasks = [] } = useQuery({
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

  const filtered = filterStatus === "all" ? projects : projects.filter(p => p.status === filterStatus);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Proyectos Vitales</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4" /> Nuevo Proyecto Vital
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ k: "all", l: "Todos" }, { k: "active", l: "En curso" }, { k: "planning", l: "Planificando" }, { k: "completed", l: "Logrados" }].map(t => (
          <button key={t.k} onClick={() => setFilterStatus(t.k)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterStatus === t.k ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
            )}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(project => {
          const pt = tasks.filter(t => t.project_id === project.id);
          const ct = pt.filter(t => t.status === "completed");
          const progress = pt.length > 0 ? Math.round((ct.length / pt.length) * 100) : 0;
          const area = LIFE_AREAS.find(a => project.tags?.includes(a.value));
          return (
            <div key={project.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-all group relative">
              <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={() => deleteMutation.mutate(project.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: `${project.color || "#f59e0b"}20` }}>
                  {area?.label.split(" ")[0] || "🎯"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{project.name}</h3>
                  {area && <p className="text-xs text-muted-foreground">{area.label}</p>}
                </div>
                <Badge className={cn("text-xs flex-shrink-0", statusColors[project.status])}>{statusLabels[project.status]}</Badge>
              </div>
              {project.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{ct.length} de {pt.length} metas completadas</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" style={{ "--tw-progress-bar-color": project.color || "#f59e0b" }} />
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay proyectos vitales</p>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Proyecto Vital</DialogTitle></DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            createMutation.mutate({ ...form, color: "#f59e0b", tags: [lifeArea] });
          }} className="space-y-4">
            <div><Label>¿Qué quieres transformar?</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Transformar mi salud en 90 días..." required />
            </div>
            <div><Label>Área de vida</Label>
              <Select value={lifeArea} onValueChange={setLifeArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LIFE_AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descripción / Propósito</Label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="¿Por qué este proyecto es importante para tu vida?"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
            </div>
            <div><Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planificando</SelectItem>
                  <SelectItem value="active">En curso</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">Crear Proyecto Vital</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}